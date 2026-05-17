using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace SeaTachys.Api.Controllers;

[ApiController]
[Route("api/addresses")]
[Authorize]
public class AddressesController : ControllerBase
{
    private readonly DatabaseConnectionString _databaseConnectionString;

    public AddressesController(DatabaseConnectionString databaseConnectionString)
    {
        _databaseConnectionString = databaseConnectionString;
    }

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        return Ok(await AddressStore.ListAsync(
            _databaseConnectionString.Value,
            userId.Value,
            HttpContext.RequestAborted
        ));
    }

    [HttpGet("default")]
    public async Task<IActionResult> GetDefault()
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var address = await AddressStore.GetDefaultAsync(
            _databaseConnectionString.Value,
            userId.Value,
            HttpContext.RequestAborted
        );

        return address is null ? NoContent() : Ok(address);
    }

    [HttpPost]
    public async Task<IActionResult> Create(SaveAddressRequest request)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        if (!IsValid(request))
        {
            return BadRequest("Street and city are required.");
        }

        return Ok(await AddressStore.CreateAsync(
            _databaseConnectionString.Value,
            userId.Value,
            request,
            HttpContext.RequestAborted
        ));
    }

    [HttpPut("{addressId:guid}")]
    public async Task<IActionResult> Update(Guid addressId, SaveAddressRequest request)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        if (!IsValid(request))
        {
            return BadRequest("Street and city are required.");
        }

        var updated = await AddressStore.UpdateAsync(
            _databaseConnectionString.Value,
            userId.Value,
            addressId,
            request,
            HttpContext.RequestAborted
        );

        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpPut("{addressId:guid}/default")]
    public async Task<IActionResult> SetDefault(Guid addressId)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var updated = await AddressStore.SetDefaultAsync(
            _databaseConnectionString.Value,
            userId.Value,
            addressId,
            HttpContext.RequestAborted
        );

        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{addressId:guid}")]
    public async Task<IActionResult> Delete(Guid addressId)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        return await AddressStore.DeleteAsync(
            _databaseConnectionString.Value,
            userId.Value,
            addressId,
            HttpContext.RequestAborted
        )
            ? NoContent()
            : NotFound();
    }

    private Guid? GetUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userId, out var parsed) ? parsed : null;
    }

    private static bool IsValid(SaveAddressRequest request) =>
        !string.IsNullOrWhiteSpace(request.Street) &&
        !string.IsNullOrWhiteSpace(request.City);
}

public record SaveAddressRequest(
    string? Label,
    string Street,
    string? Barangay,
    string City,
    string? Province,
    string? ZipCode,
    decimal? Latitude,
    decimal? Longitude,
    bool IsDefault
);

public record AddressDto(
    Guid Id,
    string? Label,
    string Street,
    string? Barangay,
    string City,
    string? Province,
    string? ZipCode,
    decimal? Latitude,
    decimal? Longitude,
    bool IsDefault,
    DateTimeOffset CreatedAt
);

internal static class AddressStore
{
    internal static async Task<List<AddressDto>> ListAsync(
        string connectionString,
        Guid userId,
        CancellationToken cancellationToken
    )
    {
        await using var connection = await OpenAsync(connectionString, cancellationToken);
        await using var command = CreateCommand(connection, """
            SELECT id, label, street, barangay, city, province, zip_code, latitude, longitude, is_default, created_at
            FROM addresses
            WHERE user_id = @user_id
            ORDER BY is_default DESC, created_at DESC
            """);
        command.Parameters.AddWithValue("user_id", userId);

        var addresses = new List<AddressDto>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            addresses.Add(ReadAddress(reader));
        }

        return addresses;
    }

    internal static async Task<AddressDto?> GetDefaultAsync(
        string connectionString,
        Guid userId,
        CancellationToken cancellationToken
    )
    {
        await using var connection = await OpenAsync(connectionString, cancellationToken);
        await using var command = CreateCommand(connection, """
            SELECT id, label, street, barangay, city, province, zip_code, latitude, longitude, is_default, created_at
            FROM addresses
            WHERE user_id = @user_id AND is_default
            ORDER BY created_at DESC
            LIMIT 1
            """);
        command.Parameters.AddWithValue("user_id", userId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? ReadAddress(reader) : null;
    }

    internal static async Task<AddressDto> CreateAsync(
        string connectionString,
        Guid userId,
        SaveAddressRequest request,
        CancellationToken cancellationToken
    )
    {
        var shouldSetDefault = request.IsDefault || !await HasAnyAsync(connectionString, userId, cancellationToken);
        var addressId = Guid.CreateVersion7();
        var createdAt = DateTimeOffset.UtcNow;

        await using var connection = await OpenAsync(connectionString, cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        if (shouldSetDefault)
        {
            await ClearDefaultsAsync(connection, userId, cancellationToken);
        }

        await using var command = CreateCommand(connection, """
            INSERT INTO addresses (
                id,
                user_id,
                label,
                street,
                barangay,
                city,
                province,
                zip_code,
                latitude,
                longitude,
                is_default,
                created_at
            )
            VALUES (
                @id,
                @user_id,
                @label,
                @street,
                @barangay,
                @city,
                @province,
                @zip_code,
                @latitude,
                @longitude,
                @is_default,
                @created_at
            )
            RETURNING id, label, street, barangay, city, province, zip_code, latitude, longitude, is_default, created_at
            """);
        AddAddressParameters(command, addressId, userId, request, shouldSetDefault, createdAt);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        await reader.ReadAsync(cancellationToken);
        var created = ReadAddress(reader);
        await reader.DisposeAsync();
        await transaction.CommitAsync(cancellationToken);
        return created;
    }

    internal static async Task<AddressDto?> UpdateAsync(
        string connectionString,
        Guid userId,
        Guid addressId,
        SaveAddressRequest request,
        CancellationToken cancellationToken
    )
    {
        await using var connection = await OpenAsync(connectionString, cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        if (request.IsDefault)
        {
            await ClearDefaultsAsync(connection, userId, cancellationToken);
        }

        await using var command = CreateCommand(connection, """
            UPDATE addresses
            SET label = @label,
                street = @street,
                barangay = @barangay,
                city = @city,
                province = @province,
                zip_code = @zip_code,
                latitude = @latitude,
                longitude = @longitude,
                is_default = CASE WHEN @is_default THEN TRUE ELSE is_default END
            WHERE id = @id AND user_id = @user_id
            RETURNING id, label, street, barangay, city, province, zip_code, latitude, longitude, is_default, created_at
            """);
        AddAddressParameters(command, addressId, userId, request, request.IsDefault, DateTimeOffset.UtcNow);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        var updated = ReadAddress(reader);
        await reader.DisposeAsync();
        await transaction.CommitAsync(cancellationToken);
        return updated;
    }

    internal static async Task<AddressDto?> SetDefaultAsync(
        string connectionString,
        Guid userId,
        Guid addressId,
        CancellationToken cancellationToken
    )
    {
        await using var connection = await OpenAsync(connectionString, cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
        await ClearDefaultsAsync(connection, userId, cancellationToken);

        await using var command = CreateCommand(connection, """
            UPDATE addresses
            SET is_default = TRUE
            WHERE id = @id AND user_id = @user_id
            RETURNING id, label, street, barangay, city, province, zip_code, latitude, longitude, is_default, created_at
            """);
        command.Parameters.AddWithValue("id", addressId);
        command.Parameters.AddWithValue("user_id", userId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        var updated = ReadAddress(reader);
        await reader.DisposeAsync();
        await transaction.CommitAsync(cancellationToken);
        return updated;
    }

    internal static async Task<bool> DeleteAsync(
        string connectionString,
        Guid userId,
        Guid addressId,
        CancellationToken cancellationToken
    )
    {
        await using var connection = await OpenAsync(connectionString, cancellationToken);
        await using var command = CreateCommand(connection, """
            DELETE FROM addresses
            WHERE id = @id AND user_id = @user_id
            """);
        command.Parameters.AddWithValue("id", addressId);
        command.Parameters.AddWithValue("user_id", userId);

        return await command.ExecuteNonQueryAsync(cancellationToken) > 0;
    }

    private static async Task<bool> HasAnyAsync(
        string connectionString,
        Guid userId,
        CancellationToken cancellationToken
    )
    {
        await using var connection = await OpenAsync(connectionString, cancellationToken);
        await using var command = CreateCommand(connection, """
            SELECT EXISTS (
                SELECT 1
                FROM addresses
                WHERE user_id = @user_id
            )
            """);
        command.Parameters.AddWithValue("user_id", userId);
        return (bool?)await command.ExecuteScalarAsync(cancellationToken) ?? false;
    }

    private static async Task ClearDefaultsAsync(
        NpgsqlConnection connection,
        Guid userId,
        CancellationToken cancellationToken
    )
    {
        await using var command = CreateCommand(connection, """
            UPDATE addresses
            SET is_default = FALSE
            WHERE user_id = @user_id AND is_default
            """);
        command.Parameters.AddWithValue("user_id", userId);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static void AddAddressParameters(
        NpgsqlCommand command,
        Guid addressId,
        Guid userId,
        SaveAddressRequest request,
        bool isDefault,
        DateTimeOffset createdAt
    )
    {
        command.Parameters.AddWithValue("id", addressId);
        command.Parameters.AddWithValue("user_id", userId);
        command.Parameters.AddWithValue("label", ToDbValue(request.Label));
        command.Parameters.AddWithValue("street", request.Street.Trim());
        command.Parameters.AddWithValue("barangay", ToDbValue(request.Barangay));
        command.Parameters.AddWithValue("city", request.City.Trim());
        command.Parameters.AddWithValue("province", ToDbValue(request.Province));
        command.Parameters.AddWithValue("zip_code", ToDbValue(request.ZipCode));
        command.Parameters.AddWithValue("latitude", request.Latitude is null ? DBNull.Value : request.Latitude);
        command.Parameters.AddWithValue("longitude", request.Longitude is null ? DBNull.Value : request.Longitude);
        command.Parameters.AddWithValue("is_default", isDefault);
        command.Parameters.AddWithValue("created_at", createdAt);
    }

    private static object ToDbValue(string? value) =>
        string.IsNullOrWhiteSpace(value) ? DBNull.Value : value.Trim();

    private static AddressDto ReadAddress(NpgsqlDataReader reader) =>
        new(
            reader.GetGuid(0),
            reader.IsDBNull(1) ? null : reader.GetString(1),
            reader.GetString(2),
            reader.IsDBNull(3) ? null : reader.GetString(3),
            reader.GetString(4),
            reader.IsDBNull(5) ? null : reader.GetString(5),
            reader.IsDBNull(6) ? null : reader.GetString(6),
            reader.IsDBNull(7) ? null : reader.GetDecimal(7),
            reader.IsDBNull(8) ? null : reader.GetDecimal(8),
            reader.GetBoolean(9),
            reader.GetFieldValue<DateTimeOffset>(10)
        );

    private static async Task<NpgsqlConnection> OpenAsync(string connectionString, CancellationToken cancellationToken)
    {
        var connectionBuilder = new NpgsqlConnectionStringBuilder(connectionString)
        {
            Pooling = false,
            Timeout = 5,
            CommandTimeout = 8,
            Multiplexing = false,
            MaxAutoPrepare = 0
        };

        var connection = new NpgsqlConnection(connectionBuilder.ConnectionString);
        await connection.OpenAsync(cancellationToken);
        return connection;
    }

    private static NpgsqlCommand CreateCommand(NpgsqlConnection connection, string text)
    {
        var command = connection.CreateCommand();
        command.CommandTimeout = 8;
        command.CommandText = text;
        return command;
    }
}

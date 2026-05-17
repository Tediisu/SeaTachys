using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace SeaTachys.Api.Controllers;

[ApiController]
[Route("api/rider/profile")]
[Authorize(Roles = "rider")]
public class RiderProfileController : ControllerBase
{
    private readonly DatabaseConnectionString _databaseConnectionString;

    public RiderProfileController(DatabaseConnectionString databaseConnectionString)
    {
        _databaseConnectionString = databaseConnectionString;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var riderId = GetRiderId();
        if (riderId is null) return Unauthorized();

        return Ok(await RiderProfileStore.GetAsync(
            _databaseConnectionString.Value,
            riderId.Value,
            HttpContext.RequestAborted
        ));
    }

    [HttpPut]
    public async Task<IActionResult> Upsert(UpdateRiderProfileRequest request)
    {
        var riderId = GetRiderId();
        if (riderId is null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.MotorModel))
        {
            return BadRequest("Motor model is required.");
        }

        if (string.IsNullOrWhiteSpace(request.ContactNumber))
        {
            return BadRequest("Contact number is required.");
        }

        return Ok(await RiderProfileStore.UpsertAsync(
            _databaseConnectionString.Value,
            riderId.Value,
            request,
            HttpContext.RequestAborted
        ));
    }

    private Guid? GetRiderId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userId, out var parsed) ? parsed : null;
    }
}

public record UpdateRiderProfileRequest(
    string MotorModel,
    string ContactNumber
);

public record RiderProfileDto(
    Guid UserId,
    string FullName,
    string MotorModel,
    string ContactNumber,
    DateTimeOffset UpdatedAt
);

internal static class RiderProfileStore
{
    internal static async Task<RiderProfileDto?> GetAsync(
        string connectionString,
        Guid riderId,
        CancellationToken cancellationToken
    )
    {
        await using var connection = await OpenAsync(connectionString, cancellationToken);
        await using var command = CreateCommand(connection, """
            SELECT
                profile.user_id,
                rider.full_name,
                profile.motor_model,
                profile.contact_number,
                profile.updated_at
            FROM rider_profiles AS profile
            INNER JOIN users AS rider ON rider.id = profile.user_id
            WHERE profile.user_id = @rider_id
            LIMIT 1
            """);
        command.Parameters.AddWithValue("rider_id", riderId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? ReadProfile(reader) : null;
    }

    internal static async Task<RiderProfileDto> UpsertAsync(
        string connectionString,
        Guid riderId,
        UpdateRiderProfileRequest request,
        CancellationToken cancellationToken
    )
    {
        var now = DateTimeOffset.UtcNow;
        await using var connection = await OpenAsync(connectionString, cancellationToken);
        await using var command = CreateCommand(connection, """
            INSERT INTO rider_profiles (user_id, motor_model, contact_number, updated_at)
            VALUES (@rider_id, @motor_model, @contact_number, @updated_at)
            ON CONFLICT (user_id) DO UPDATE
            SET motor_model = EXCLUDED.motor_model,
                contact_number = EXCLUDED.contact_number,
                updated_at = EXCLUDED.updated_at
            RETURNING user_id, motor_model, contact_number, updated_at
            """);
        command.Parameters.AddWithValue("rider_id", riderId);
        command.Parameters.AddWithValue("motor_model", request.MotorModel.Trim());
        command.Parameters.AddWithValue("contact_number", request.ContactNumber.Trim());
        command.Parameters.AddWithValue("updated_at", now);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        await reader.ReadAsync(cancellationToken);

        var userId = reader.GetGuid(0);
        var motorModel = reader.GetString(1);
        var contactNumber = reader.GetString(2);
        var updatedAt = reader.GetFieldValue<DateTimeOffset>(3);
        await reader.DisposeAsync();

        await using var nameCommand = CreateCommand(connection, """
            SELECT full_name
            FROM users
            WHERE id = @rider_id
            LIMIT 1
            """);
        nameCommand.Parameters.AddWithValue("rider_id", riderId);
        var fullName = (string?)await nameCommand.ExecuteScalarAsync(cancellationToken) ?? "Rider";

        return new RiderProfileDto(userId, fullName, motorModel, contactNumber, updatedAt);
    }

    private static RiderProfileDto ReadProfile(NpgsqlDataReader reader) =>
        new(
            reader.GetGuid(0),
            reader.GetString(1),
            reader.GetString(2),
            reader.GetString(3),
            reader.GetFieldValue<DateTimeOffset>(4)
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

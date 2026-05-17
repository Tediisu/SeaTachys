using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace SeaTachys.Api.Controllers;

[ApiController]
[Route("api/orders/{orderId:guid}/messages")]
[Authorize]
public class OrderMessagesController : ControllerBase
{
    private readonly DatabaseConnectionString _databaseConnectionString;

    public OrderMessagesController(DatabaseConnectionString databaseConnectionString)
    {
        _databaseConnectionString = databaseConnectionString;
    }

    [HttpGet]
    public async Task<IActionResult> List(Guid orderId)
    {
        var access = GetAccessContext();
        if (access is null) return Unauthorized();

        if (!await OrderMessageStore.CanAccessOrderAsync(
                _databaseConnectionString.Value,
                orderId,
                access.Value.UserId,
                access.Value.Role,
                HttpContext.RequestAborted
            ))
        {
            return NotFound();
        }

        return Ok(await OrderMessageStore.ListAsync(
            _databaseConnectionString.Value,
            orderId,
            HttpContext.RequestAborted
        ));
    }

    [HttpPost]
    public async Task<IActionResult> Send(Guid orderId, SendOrderMessageRequest request)
    {
        var access = GetAccessContext();
        if (access is null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.Message))
        {
            return BadRequest("Message is required.");
        }

        if (request.Message.Trim().Length > 500)
        {
            return BadRequest("Message cannot exceed 500 characters.");
        }

        if (!await OrderMessageStore.CanAccessOrderAsync(
                _databaseConnectionString.Value,
                orderId,
                access.Value.UserId,
                access.Value.Role,
                HttpContext.RequestAborted
            ))
        {
            return NotFound();
        }

        return Ok(await OrderMessageStore.SendAsync(
            _databaseConnectionString.Value,
            orderId,
            access.Value.UserId,
            access.Value.Role,
            request.Message.Trim(),
            HttpContext.RequestAborted
        ));
    }

    private (Guid UserId, string Role)? GetAccessContext()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var role = User.FindFirstValue(ClaimTypes.Role);

        return Guid.TryParse(userId, out var parsedUserId) && !string.IsNullOrWhiteSpace(role)
            ? (parsedUserId, role)
            : null;
    }
}

public record SendOrderMessageRequest(string Message);

public record OrderMessageDto(
    Guid Id,
    Guid OrderId,
    Guid SenderId,
    string SenderRole,
    string SenderName,
    string Message,
    DateTimeOffset SentAt
);

internal static class OrderMessageStore
{
    internal static async Task<bool> CanAccessOrderAsync(
        string connectionString,
        Guid orderId,
        Guid userId,
        string role,
        CancellationToken cancellationToken
    )
    {
        await using var connection = await OpenAsync(connectionString, cancellationToken);
        await using var command = CreateCommand(connection, role switch
        {
            "customer" => """
                SELECT EXISTS (
                    SELECT 1
                    FROM orders
                    WHERE id = @order_id AND customer_id = @user_id
                )
                """,
            "rider" => """
                SELECT EXISTS (
                    SELECT 1
                    FROM orders
                    WHERE id = @order_id AND rider_id = @user_id
                )
                """,
            "admin" => """
                SELECT EXISTS (
                    SELECT 1
                    FROM orders
                    WHERE id = @order_id
                )
                """,
            _ => "SELECT FALSE"
        });
        command.Parameters.AddWithValue("order_id", orderId);
        command.Parameters.AddWithValue("user_id", userId);

        return (bool?)await command.ExecuteScalarAsync(cancellationToken) ?? false;
    }

    internal static async Task<List<OrderMessageDto>> ListAsync(
        string connectionString,
        Guid orderId,
        CancellationToken cancellationToken
    )
    {
        await using var connection = await OpenAsync(connectionString, cancellationToken);
        await using var command = CreateCommand(connection, """
            SELECT
                message.id,
                message.order_id,
                message.sender_id,
                message.sender_role::text,
                sender.full_name,
                message.message,
                message.sent_at
            FROM order_messages AS message
            INNER JOIN users AS sender ON sender.id = message.sender_id
            WHERE message.order_id = @order_id
            ORDER BY message.sent_at ASC, message.id ASC
            """);
        command.Parameters.AddWithValue("order_id", orderId);

        var messages = new List<OrderMessageDto>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            messages.Add(ReadMessage(reader));
        }

        return messages;
    }

    internal static async Task<OrderMessageDto> SendAsync(
        string connectionString,
        Guid orderId,
        Guid senderId,
        string senderRole,
        string message,
        CancellationToken cancellationToken
    )
    {
        var id = Guid.CreateVersion7();
        var sentAt = DateTimeOffset.UtcNow;

        await using var connection = await OpenAsync(connectionString, cancellationToken);
        await using var command = CreateCommand(connection, """
            INSERT INTO order_messages (id, order_id, sender_id, sender_role, message, sent_at)
            VALUES (@id, @order_id, @sender_id, @sender_role::user_role, @message, @sent_at)
            RETURNING id, order_id, sender_id, sender_role::text, message, sent_at
            """);
        command.Parameters.AddWithValue("id", id);
        command.Parameters.AddWithValue("order_id", orderId);
        command.Parameters.AddWithValue("sender_id", senderId);
        command.Parameters.AddWithValue("sender_role", senderRole);
        command.Parameters.AddWithValue("message", message);
        command.Parameters.AddWithValue("sent_at", sentAt);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        await reader.ReadAsync(cancellationToken);

        var inserted = new
        {
            Id = reader.GetGuid(0),
            OrderId = reader.GetGuid(1),
            SenderId = reader.GetGuid(2),
            SenderRole = reader.GetString(3),
            Message = reader.GetString(4),
            SentAt = reader.GetFieldValue<DateTimeOffset>(5),
        };
        await reader.DisposeAsync();

        await using var nameCommand = CreateCommand(connection, """
            SELECT full_name
            FROM users
            WHERE id = @sender_id
            LIMIT 1
            """);
        nameCommand.Parameters.AddWithValue("sender_id", senderId);
        var senderName = (string?)await nameCommand.ExecuteScalarAsync(cancellationToken) ?? "User";

        return new OrderMessageDto(
            inserted.Id,
            inserted.OrderId,
            inserted.SenderId,
            inserted.SenderRole,
            senderName,
            inserted.Message,
            inserted.SentAt
        );
    }

    private static OrderMessageDto ReadMessage(NpgsqlDataReader reader) =>
        new(
            reader.GetGuid(0),
            reader.GetGuid(1),
            reader.GetGuid(2),
            reader.GetString(3),
            reader.GetString(4),
            reader.GetString(5),
            reader.GetFieldValue<DateTimeOffset>(6)
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

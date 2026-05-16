using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using NpgsqlTypes;
using SeaTachys.Api.Services;
using SeaTachys.Domain.Enums;

namespace SeaTachys.Api.Controllers;

[ApiController]
[Route("api/admin/orders")]
[Authorize(Roles = "admin")]
public class AdminOrdersController : ControllerBase
{
    private readonly DatabaseConnectionString _databaseConnectionString;

    public AdminOrdersController(DatabaseConnectionString databaseConnectionString)
    {
        _databaseConnectionString = databaseConnectionString;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] OrderStatus? status = null)
    {
        var orders = await AdminOrderStore.GetOrdersAsync(
            _databaseConnectionString.Value,
            status,
            HttpContext.RequestAborted
        );

        return Ok(orders);
    }

    [HttpPost("{orderId:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid orderId, UpdateOrderStatusRequest req)
    {
        var currentStatus = await AdminOrderStore.GetStatusAsync(
            _databaseConnectionString.Value,
            orderId,
            HttpContext.RequestAborted
        );

        if (currentStatus is null)
        {
            return NotFound();
        }

        if (!OrderStatusRules.CanTransition(currentStatus.Value, req.Status))
        {
            return BadRequest($"Invalid transition: {currentStatus} -> {req.Status}");
        }

        var updated = await AdminOrderStore.UpdateStatusAsync(
            _databaseConnectionString.Value,
            orderId,
            req,
            HttpContext.RequestAborted
        );

        return updated is null ? NotFound() : Ok(updated);
    }
}

public record UpdateOrderStatusRequest(
    OrderStatus Status,
    Guid? RiderId
);

public record AdminOrderOptionDto(
    string GroupLabel,
    string ChoiceName,
    decimal AdditionalPrice
);

public record AdminOrderItemDto(
    Guid Id,
    Guid MenuItemId,
    string ItemName,
    decimal UnitPrice,
    int Quantity,
    decimal Subtotal,
    string? SpecialInstructions,
    List<AdminOrderOptionDto> Options
);

public record AdminOrderDto(
    Guid Id,
    string OrderNumber,
    Guid CustomerId,
    Guid? RiderId,
    OrderStatus Status,
    string DeliveryStreet,
    string? DeliveryBarangay,
    string DeliveryCity,
    decimal Subtotal,
    decimal DeliveryFee,
    decimal DiscountAmount,
    decimal TotalAmount,
    string? CustomerNote,
    DateTimeOffset PlacedAt,
    DateTimeOffset? ConfirmedAt,
    DateTimeOffset? ReadyAt,
    DateTimeOffset? PickedUpAt,
    DateTimeOffset? DeliveredAt,
    DateTimeOffset? CancelledAt,
    DateTimeOffset UpdatedAt,
    List<AdminOrderItemDto> Items
);

public record AdminOrderStatusDto(
    Guid Id,
    OrderStatus Status,
    Guid? RiderId,
    DateTimeOffset? ConfirmedAt,
    DateTimeOffset? ReadyAt,
    DateTimeOffset? PickedUpAt,
    DateTimeOffset? DeliveredAt,
    DateTimeOffset? CancelledAt,
    DateTimeOffset UpdatedAt
);

internal static class AdminOrderStore
{
    internal static async Task<List<AdminOrderDto>> GetOrdersAsync(
        string connectionString,
        OrderStatus? status,
        CancellationToken cancellationToken
    )
    {
        await using var connection = await OpenAsync(connectionString, cancellationToken);
        var orderSql = status is null
            ? """
            SELECT
                id,
                order_number,
                customer_id,
                rider_id,
                status::text,
                delivery_street,
                delivery_barangay,
                delivery_city,
                subtotal,
                delivery_fee,
                discount_amount,
                total_amount,
                customer_note,
                placed_at,
                confirmed_at,
                ready_at,
                picked_up_at,
                delivered_at,
                cancelled_at,
                updated_at
            FROM orders
            ORDER BY placed_at DESC
            """
            : """
            SELECT
                id,
                order_number,
                customer_id,
                rider_id,
                status::text,
                delivery_street,
                delivery_barangay,
                delivery_city,
                subtotal,
                delivery_fee,
                discount_amount,
                total_amount,
                customer_note,
                placed_at,
                confirmed_at,
                ready_at,
                picked_up_at,
                delivered_at,
                cancelled_at,
                updated_at
            FROM orders
            WHERE status = @status::order_status
            ORDER BY placed_at DESC
            """;
        await using var orderCommand = CreateCommand(connection, orderSql);
        if (status is not null)
        {
            orderCommand.Parameters.AddWithValue("status", status.Value.ToString());
        }

        var orders = new List<AdminOrderDto>();
        await using (var reader = await orderCommand.ExecuteReaderAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                orders.Add(ReadOrder(reader));
            }
        }

        if (orders.Count == 0)
        {
            return orders;
        }

        var orderIds = orders.Select(order => order.Id).ToArray();
        await using var itemCommand = CreateCommand(connection, """
            SELECT
                item.id,
                item.order_id,
                item.menu_item_id,
                item.item_name,
                item.unit_price,
                item.quantity,
                item.subtotal,
                item.special_instructions,
                option.group_label,
                option.choice_name,
                option.additional_price
            FROM order_items AS item
            LEFT JOIN order_item_options AS option ON option.order_item_id = item.id
            WHERE item.order_id = ANY(@order_ids)
            ORDER BY item.order_id, item.id, option.id
            """);
        itemCommand.Parameters.AddWithValue("order_ids", NpgsqlDbType.Array | NpgsqlDbType.Uuid, orderIds);

        var itemsByOrder = new Dictionary<Guid, Dictionary<Guid, AdminOrderItemDto>>();
        await using (var reader = await itemCommand.ExecuteReaderAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                var itemId = reader.GetGuid(0);
                var orderId = reader.GetGuid(1);

                if (!itemsByOrder.TryGetValue(orderId, out var orderItems))
                {
                    orderItems = new Dictionary<Guid, AdminOrderItemDto>();
                    itemsByOrder[orderId] = orderItems;
                }

                if (!orderItems.TryGetValue(itemId, out var item))
                {
                    item = new AdminOrderItemDto(
                        itemId,
                        reader.GetGuid(2),
                        reader.GetString(3),
                        reader.GetDecimal(4),
                        reader.GetInt32(5),
                        reader.GetDecimal(6),
                        reader.IsDBNull(7) ? null : reader.GetString(7),
                        []
                    );
                    orderItems[itemId] = item;
                }

                if (!reader.IsDBNull(8))
                {
                    item.Options.Add(new AdminOrderOptionDto(
                        reader.GetString(8),
                        reader.GetString(9),
                        reader.GetDecimal(10)
                    ));
                }
            }
        }

        return orders
            .Select(order => order with
            {
                Items = itemsByOrder.TryGetValue(order.Id, out var orderItems)
                    ? orderItems.Values.ToList()
                    : []
            })
            .ToList();
    }

    internal static async Task<OrderStatus?> GetStatusAsync(
        string connectionString,
        Guid orderId,
        CancellationToken cancellationToken
    )
    {
        await using var connection = await OpenAsync(connectionString, cancellationToken);
        await using var command = CreateCommand(connection, """
            SELECT status::text
            FROM orders
            WHERE id = @id
            """);
        command.Parameters.AddWithValue("id", orderId);

        var rawStatus = await command.ExecuteScalarAsync(cancellationToken);
        return rawStatus is string status
            ? Enum.Parse<OrderStatus>(status, ignoreCase: true)
            : null;
    }

    internal static async Task<AdminOrderStatusDto?> UpdateStatusAsync(
        string connectionString,
        Guid orderId,
        UpdateOrderStatusRequest request,
        CancellationToken cancellationToken
    )
    {
        var now = DateTimeOffset.UtcNow;
        await using var connection = await OpenAsync(connectionString, cancellationToken);
        await using var command = CreateCommand(connection, """
            UPDATE orders
            SET status = @status::order_status,
                rider_id = COALESCE(@rider_id, rider_id),
                confirmed_at = CASE WHEN @status = 'confirmed' THEN @now ELSE confirmed_at END,
                ready_at = CASE WHEN @status = 'ready_for_pickup' THEN @now ELSE ready_at END,
                picked_up_at = CASE WHEN @status = 'picked_up' THEN @now ELSE picked_up_at END,
                delivered_at = CASE WHEN @status = 'delivered' THEN @now ELSE delivered_at END,
                cancelled_at = CASE WHEN @status = 'cancelled' THEN @now ELSE cancelled_at END,
                updated_at = @now
            WHERE id = @id
            RETURNING id, status::text, rider_id, confirmed_at, ready_at, picked_up_at, delivered_at, cancelled_at, updated_at
            """);
        command.Parameters.AddWithValue("id", orderId);
        command.Parameters.AddWithValue("status", request.Status.ToString());
        command.Parameters.AddWithValue("rider_id", request.RiderId is null ? DBNull.Value : request.RiderId);
        command.Parameters.AddWithValue("now", now);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return new AdminOrderStatusDto(
            reader.GetGuid(0),
            Enum.Parse<OrderStatus>(reader.GetString(1), ignoreCase: true),
            reader.IsDBNull(2) ? null : reader.GetGuid(2),
            reader.IsDBNull(3) ? null : reader.GetFieldValue<DateTimeOffset>(3),
            reader.IsDBNull(4) ? null : reader.GetFieldValue<DateTimeOffset>(4),
            reader.IsDBNull(5) ? null : reader.GetFieldValue<DateTimeOffset>(5),
            reader.IsDBNull(6) ? null : reader.GetFieldValue<DateTimeOffset>(6),
            reader.IsDBNull(7) ? null : reader.GetFieldValue<DateTimeOffset>(7),
            reader.GetFieldValue<DateTimeOffset>(8)
        );
    }

    private static AdminOrderDto ReadOrder(NpgsqlDataReader reader) =>
        new(
            reader.GetGuid(0),
            reader.GetValue(1).ToString() ?? string.Empty,
            reader.GetGuid(2),
            reader.IsDBNull(3) ? null : reader.GetGuid(3),
            Enum.Parse<OrderStatus>(reader.GetString(4), ignoreCase: true),
            reader.GetString(5),
            reader.IsDBNull(6) ? null : reader.GetString(6),
            reader.GetString(7),
            reader.GetDecimal(8),
            reader.GetDecimal(9),
            reader.GetDecimal(10),
            reader.GetDecimal(11),
            reader.IsDBNull(12) ? null : reader.GetString(12),
            reader.GetFieldValue<DateTimeOffset>(13),
            reader.IsDBNull(14) ? null : reader.GetFieldValue<DateTimeOffset>(14),
            reader.IsDBNull(15) ? null : reader.GetFieldValue<DateTimeOffset>(15),
            reader.IsDBNull(16) ? null : reader.GetFieldValue<DateTimeOffset>(16),
            reader.IsDBNull(17) ? null : reader.GetFieldValue<DateTimeOffset>(17),
            reader.IsDBNull(18) ? null : reader.GetFieldValue<DateTimeOffset>(18),
            reader.GetFieldValue<DateTimeOffset>(19),
            []
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

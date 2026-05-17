using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using SeaTachys.Domain.Entities;
using SeaTachys.Domain.Enums;
using SeaTachys.Infrastructure.Persistence;
using System.Security.Claims;

namespace SeaTachys.Api.Controllers;

[ApiController]
[Route("api/orders")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _cfg;
    private readonly DatabaseConnectionString _databaseConnectionString;

    public OrdersController(AppDbContext db, IConfiguration cfg, DatabaseConnectionString databaseConnectionString)
    {
        _db = db;
        _cfg = cfg;
        _databaseConnectionString = databaseConnectionString;
    }

    [HttpPost("quote")]
    public async Task<IActionResult> Quote(QuoteOrderRequest req)
    {
        if (req.Items == null || req.Items.Count == 0)
            return BadRequest("Order must have at least one item.");

        var quote = await BuildQuote(req.Items, req.FulfillmentType);
        if (quote.Error != null) return BadRequest(quote.Error);

        return Ok(new
        {
            quote.Subtotal,
            quote.DeliveryFee,
            DiscountAmount = 0m,
            quote.TotalAmount
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateOrderRequest req)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userIdStr)) return Unauthorized();

        if (req.Items == null || req.Items.Count == 0)
            return BadRequest("Order must have at least one item.");

        var userId = Guid.Parse(userIdStr);

        var isPickup = IsPickup(req.FulfillmentType);
        var defaultAddress = isPickup
            ? null
            : await AddressStore.GetDefaultAsync(
                _databaseConnectionString.Value,
                userId,
                HttpContext.RequestAborted
            );
        if (!isPickup && defaultAddress is null)
            return BadRequest("Set a default address before placing a delivery order.");

        var order = new Order
        {
            Id = Guid.CreateVersion7(),
            CustomerId = userId,
            Status = OrderStatus.pending,
            DeliveryStreet = isPickup ? string.Empty : defaultAddress!.Street,
            DeliveryBarangay = isPickup ? null : defaultAddress!.Barangay,
            DeliveryCity = isPickup ? string.Empty : defaultAddress!.City,
            DeliveryLat = req.DeliveryLat,
            DeliveryLng = req.DeliveryLng,
            CustomerNote = req.CustomerNote,
            PlacedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        var quote = await BuildQuote(req.Items, req.FulfillmentType);
        if (quote.Error != null) return BadRequest(quote.Error);

        foreach (var preparedItem in quote.PreparedItems)
        {
            var orderItem = new OrderItem
            {
                Id = Guid.CreateVersion7(),
                MenuItemId = preparedItem.MenuItemId,
                ItemName = preparedItem.ItemName,
                UnitPrice = preparedItem.UnitPrice,
                Quantity = preparedItem.Quantity,
                Subtotal = preparedItem.Subtotal,
                SpecialInstructions = preparedItem.SpecialInstructions
            };

            foreach (var option in preparedItem.Options)
            {
                orderItem.Options.Add(new OrderItemOption
                {
                    Id = Guid.CreateVersion7(),
                    GroupLabel = option.GroupLabel,
                    ChoiceName = option.ChoiceName,
                    AdditionalPrice = option.AdditionalPrice
                });
            }

            order.Items.Add(orderItem);
        }

        order.Subtotal = quote.Subtotal;
        order.DeliveryFee = quote.DeliveryFee;
        order.DiscountAmount = 0m;
        order.TotalAmount = quote.TotalAmount;

        _db.Orders.Add(order);

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (IsDuplicateOrderPrimaryKey(ex) || IsTransientOrderWriteTimeout(ex))
        {
            // A remote commit can succeed even when the acknowledgment is late or lost.
            // Give PostgreSQL a brief moment to make that committed row visible before
            // treating the checkout as failed.
            _db.ChangeTracker.Clear();

            var committedOrder = await TryGetCommittedOrderAsync(
                _databaseConnectionString.Value,
                order.Id,
                HttpContext.RequestAborted
            );
            if (committedOrder is null)
                throw;

            order = committedOrder;
        }

        return Ok(new
        {
            order.Id,
            order.OrderNumber,
            order.Status,
            order.Subtotal,
            order.DeliveryFee,
            order.TotalAmount
        });
    }

    [HttpGet]
    public async Task<IActionResult> MyOrders()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userIdStr)) return Unauthorized();

        var userId = Guid.Parse(userIdStr);
        return Ok(await CustomerOrderStore.GetOrdersAsync(
            _databaseConnectionString.Value,
            userId,
            HttpContext.RequestAborted
        ));
    }

    [HttpGet("{orderId:guid}")]
    public async Task<IActionResult> GetById(Guid orderId)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userIdStr)) return Unauthorized();

        var order = await CustomerOrderStore.GetOrderAsync(
            _databaseConnectionString.Value,
            Guid.Parse(userIdStr),
            orderId,
            HttpContext.RequestAborted
        );

        return order is null ? NotFound() : Ok(order);
    }

    private async Task<QuoteBuildResult> BuildQuote(List<CreateOrderItemRequest> items, string? fulfillmentType)
    {
        var itemIds = items.Select(i => i.MenuItemId).Distinct().ToList();

        var menuItems = await QuoteMenuReader.GetItemsAsync(
            _databaseConnectionString.Value,
            itemIds,
            HttpContext.RequestAborted
        );

        if (menuItems.Count != itemIds.Count)
            return QuoteBuildResult.Fail("One or more menu items were not found.");

        var menuById = menuItems.ToDictionary(i => i.Id);
        var preparedItems = new List<PreparedOrderItem>();
        decimal subtotal = 0m;

        foreach (var reqItem in items)
        {
            if (reqItem.Quantity <= 0)
                return QuoteBuildResult.Fail("Quantity must be at least 1.");

            var menuItem = menuById[reqItem.MenuItemId];
            if (!menuItem.IsAvailable)
                return QuoteBuildResult.Fail($"{menuItem.Name} is not available.");

            var optionIds = reqItem.OptionChoiceIds?.Distinct().ToList() ?? new List<Guid>();

            var groups = menuItem.OptionGroups.ToList();
            var groupById = groups.ToDictionary(g => g.Id);
            var choiceById = groups.SelectMany(g => g.Choices).ToDictionary(c => c.Id);

            foreach (var choiceId in optionIds)
            {
                if (!choiceById.TryGetValue(choiceId, out var choice))
                    return QuoteBuildResult.Fail("Invalid option selection.");

                if (!choice.IsAvailable)
                    return QuoteBuildResult.Fail($"Option '{choice.Name}' is not available.");
            }

            foreach (var group in groups)
            {
                var selectedInGroup = optionIds.Where(id => choiceById[id].GroupId == group.Id).ToList();

                if (group.IsRequired && selectedInGroup.Count == 0)
                    return QuoteBuildResult.Fail($"{menuItem.Name}: {group.Label} is required.");

                if (selectedInGroup.Count > group.MaxSelections)
                    return QuoteBuildResult.Fail($"{menuItem.Name}: too many selections for {group.Label}.");
            }

            var preparedOptions = optionIds.Select(id => new PreparedOrderItemOption(
                groupById[choiceById[id].GroupId].Label,
                choiceById[id].Name,
                choiceById[id].AdditionalPrice
            )).ToList();

            var optionsTotal = preparedOptions.Sum(option => option.AdditionalPrice);
            var itemSubtotal = (menuItem.Price + optionsTotal) * reqItem.Quantity;
            subtotal += itemSubtotal;

            preparedItems.Add(new PreparedOrderItem(
                menuItem.Id,
                menuItem.Name,
                menuItem.Price,
                reqItem.Quantity,
                reqItem.SpecialInstructions,
                itemSubtotal,
                preparedOptions
            ));
        }

        var deliveryFee = IsPickup(fulfillmentType)
            ? 0m
            : _cfg.GetValue<decimal>("Pricing:DeliveryFee", 50m);
        return QuoteBuildResult.Success(preparedItems, subtotal, deliveryFee);
    }

    private static bool IsDuplicateOrderPrimaryKey(DbUpdateException ex)
    {
        return ex.InnerException is PostgresException
        {
            SqlState: PostgresErrorCodes.UniqueViolation,
            ConstraintName: "orders_pkey"
        };
    }

    private static async Task<Order?> TryGetCommittedOrderAsync(
        string connectionString,
        Guid orderId,
        CancellationToken cancellationToken
    )
    {
        for (var attempt = 0; attempt < 4; attempt++)
        {
            var committedOrder = await ReadCommittedOrderAsync(connectionString, orderId, cancellationToken);

            if (committedOrder is not null)
                return committedOrder;

            if (attempt < 3)
                await Task.Delay(TimeSpan.FromMilliseconds(250), cancellationToken);
        }

        return null;
    }

    private static async Task<Order?> ReadCommittedOrderAsync(
        string connectionString,
        Guid orderId,
        CancellationToken cancellationToken
    )
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandTimeout = 5;
        command.CommandText = """
            SELECT
                id,
                order_number,
                customer_id,
                rider_id,
                status::text,
                delivery_street,
                delivery_barangay,
                delivery_city,
                delivery_lat,
                delivery_lng,
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
            WHERE id = @id
            LIMIT 1
            """;
        command.Parameters.AddWithValue("id", orderId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
            return null;

        return new Order
        {
            Id = reader.GetGuid(0),
            OrderNumber = reader.GetString(1),
            CustomerId = reader.GetGuid(2),
            RiderId = reader.IsDBNull(3) ? null : reader.GetGuid(3),
            Status = Enum.Parse<OrderStatus>(reader.GetString(4)),
            DeliveryStreet = reader.GetString(5),
            DeliveryBarangay = reader.IsDBNull(6) ? null : reader.GetString(6),
            DeliveryCity = reader.GetString(7),
            DeliveryLat = reader.IsDBNull(8) ? null : reader.GetDecimal(8),
            DeliveryLng = reader.IsDBNull(9) ? null : reader.GetDecimal(9),
            Subtotal = reader.GetDecimal(10),
            DeliveryFee = reader.GetDecimal(11),
            DiscountAmount = reader.GetDecimal(12),
            TotalAmount = reader.GetDecimal(13),
            CustomerNote = reader.IsDBNull(14) ? null : reader.GetString(14),
            PlacedAt = reader.GetFieldValue<DateTimeOffset>(15),
            ConfirmedAt = reader.IsDBNull(16) ? null : reader.GetFieldValue<DateTimeOffset>(16),
            ReadyAt = reader.IsDBNull(17) ? null : reader.GetFieldValue<DateTimeOffset>(17),
            PickedUpAt = reader.IsDBNull(18) ? null : reader.GetFieldValue<DateTimeOffset>(18),
            DeliveredAt = reader.IsDBNull(19) ? null : reader.GetFieldValue<DateTimeOffset>(19),
            CancelledAt = reader.IsDBNull(20) ? null : reader.GetFieldValue<DateTimeOffset>(20),
            UpdatedAt = reader.GetFieldValue<DateTimeOffset>(21)
        };
    }

    private static bool IsTransientOrderWriteTimeout(DbUpdateException ex)
    {
        for (Exception? current = ex; current is not null; current = current.InnerException)
        {
            if (current is TimeoutException)
                return true;
        }

        return false;
    }

    private static bool IsPickup(string? fulfillmentType) =>
        string.Equals(fulfillmentType, "pickup", StringComparison.OrdinalIgnoreCase);
}

public record QuoteOrderRequest(
    List<CreateOrderItemRequest> Items,
    string? FulfillmentType
);

public record CreateOrderRequest(
    string? FulfillmentType,
    string DeliveryStreet,
    string? DeliveryBarangay,
    string DeliveryCity,
    decimal? DeliveryLat,
    decimal? DeliveryLng,
    string? CustomerNote,
    List<CreateOrderItemRequest> Items
);

public record CreateOrderItemRequest(
    Guid MenuItemId,
    int Quantity,
    List<Guid> OptionChoiceIds,
    string? SpecialInstructions
);

public record PreparedOrderItemOption(
    string GroupLabel,
    string ChoiceName,
    decimal AdditionalPrice
);

public record PreparedOrderItem(
    Guid MenuItemId,
    string ItemName,
    decimal UnitPrice,
    int Quantity,
    string? SpecialInstructions,
    decimal Subtotal,
    List<PreparedOrderItemOption> Options
);

public record QuoteBuildResult(
    bool IsValid,
    string? Error,
    List<PreparedOrderItem> PreparedItems,
    decimal Subtotal,
    decimal DeliveryFee,
    decimal TotalAmount
)
{
    public static QuoteBuildResult Fail(string error) => new(false, error, new List<PreparedOrderItem>(), 0m, 0m, 0m);
    public static QuoteBuildResult Success(List<PreparedOrderItem> preparedItems, decimal subtotal, decimal deliveryFee)
        => new(true, null, preparedItems, subtotal, deliveryFee, subtotal + deliveryFee);
}

public record CustomerOrderOptionDto(
    string GroupLabel,
    string ChoiceName,
    decimal AdditionalPrice
);

public record CustomerOrderItemDto(
    Guid Id,
    Guid MenuItemId,
    string ItemName,
    decimal UnitPrice,
    int Quantity,
    decimal Subtotal,
    string? SpecialInstructions,
    List<CustomerOrderOptionDto> Options
);

public record RiderSummaryDto(
    string FullName,
    string? MotorModel,
    string? ContactNumber
);

public record CustomerOrderDto(
    Guid Id,
    string OrderNumber,
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
    RiderSummaryDto? Rider,
    List<CustomerOrderItemDto> Items
);

internal static class CustomerOrderStore
{
    internal static async Task<List<CustomerOrderDto>> GetOrdersAsync(
        string connectionString,
        Guid customerId,
        CancellationToken cancellationToken
    )
    {
        await using var connection = await OpenAsync(connectionString, cancellationToken);
        var orders = await ReadOrdersAsync(connection, customerId, null, cancellationToken);
        return await AttachItemsAsync(connection, orders, cancellationToken);
    }

    internal static async Task<CustomerOrderDto?> GetOrderAsync(
        string connectionString,
        Guid customerId,
        Guid orderId,
        CancellationToken cancellationToken
    )
    {
        await using var connection = await OpenAsync(connectionString, cancellationToken);
        var orders = await ReadOrdersAsync(connection, customerId, orderId, cancellationToken);
        return (await AttachItemsAsync(connection, orders, cancellationToken)).FirstOrDefault();
    }

    private static async Task<List<CustomerOrderDto>> ReadOrdersAsync(
        NpgsqlConnection connection,
        Guid customerId,
        Guid? orderId,
        CancellationToken cancellationToken
    )
    {
        var sql = orderId is null
            ? """
            SELECT
                orders.id,
                orders.order_number,
                orders.rider_id,
                orders.status::text,
                orders.delivery_street,
                orders.delivery_barangay,
                orders.delivery_city,
                orders.subtotal,
                orders.delivery_fee,
                orders.discount_amount,
                orders.total_amount,
                orders.customer_note,
                orders.placed_at,
                orders.confirmed_at,
                orders.ready_at,
                orders.picked_up_at,
                orders.delivered_at,
                orders.cancelled_at,
                orders.updated_at,
                rider.full_name,
                profile.motor_model,
                profile.contact_number
            FROM orders
            LEFT JOIN users AS rider ON rider.id = orders.rider_id
            LEFT JOIN rider_profiles AS profile ON profile.user_id = orders.rider_id
            WHERE orders.customer_id = @customer_id
            ORDER BY orders.placed_at DESC
            """
            : """
            SELECT
                orders.id,
                orders.order_number,
                orders.rider_id,
                orders.status::text,
                orders.delivery_street,
                orders.delivery_barangay,
                orders.delivery_city,
                orders.subtotal,
                orders.delivery_fee,
                orders.discount_amount,
                orders.total_amount,
                orders.customer_note,
                orders.placed_at,
                orders.confirmed_at,
                orders.ready_at,
                orders.picked_up_at,
                orders.delivered_at,
                orders.cancelled_at,
                orders.updated_at,
                rider.full_name,
                profile.motor_model,
                profile.contact_number
            FROM orders
            LEFT JOIN users AS rider ON rider.id = orders.rider_id
            LEFT JOIN rider_profiles AS profile ON profile.user_id = orders.rider_id
            WHERE orders.customer_id = @customer_id AND orders.id = @order_id
            ORDER BY orders.placed_at DESC
            """;

        await using var command = CreateCommand(connection, sql);
        command.Parameters.AddWithValue("customer_id", customerId);
        if (orderId is not null)
        {
            command.Parameters.AddWithValue("order_id", orderId.Value);
        }

        var orders = new List<CustomerOrderDto>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            orders.Add(ReadOrder(reader));
        }

        return orders;
    }

    private static async Task<List<CustomerOrderDto>> AttachItemsAsync(
        NpgsqlConnection connection,
        List<CustomerOrderDto> orders,
        CancellationToken cancellationToken
    )
    {
        if (orders.Count == 0)
        {
            return orders;
        }

        var orderIds = orders.Select(order => order.Id).ToArray();
        await using var command = CreateCommand(connection, """
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
        command.Parameters.AddWithValue("order_ids", NpgsqlTypes.NpgsqlDbType.Array | NpgsqlTypes.NpgsqlDbType.Uuid, orderIds);

        var itemsByOrder = new Dictionary<Guid, Dictionary<Guid, CustomerOrderItemDto>>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var itemId = reader.GetGuid(0);
            var owningOrderId = reader.GetGuid(1);

            if (!itemsByOrder.TryGetValue(owningOrderId, out var orderItems))
            {
                orderItems = new Dictionary<Guid, CustomerOrderItemDto>();
                itemsByOrder[owningOrderId] = orderItems;
            }

            if (!orderItems.TryGetValue(itemId, out var item))
            {
                item = new CustomerOrderItemDto(
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
                item.Options.Add(new CustomerOrderOptionDto(
                    reader.GetString(8),
                    reader.GetString(9),
                    reader.GetDecimal(10)
                ));
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

    private static CustomerOrderDto ReadOrder(NpgsqlDataReader reader) =>
        new(
            reader.GetGuid(0),
            reader.GetValue(1).ToString() ?? string.Empty,
            reader.IsDBNull(2) ? null : reader.GetGuid(2),
            Enum.Parse<OrderStatus>(reader.GetString(3), ignoreCase: true),
            reader.GetString(4),
            reader.IsDBNull(5) ? null : reader.GetString(5),
            reader.GetString(6),
            reader.GetDecimal(7),
            reader.GetDecimal(8),
            reader.GetDecimal(9),
            reader.GetDecimal(10),
            reader.IsDBNull(11) ? null : reader.GetString(11),
            reader.GetFieldValue<DateTimeOffset>(12),
            reader.IsDBNull(13) ? null : reader.GetFieldValue<DateTimeOffset>(13),
            reader.IsDBNull(14) ? null : reader.GetFieldValue<DateTimeOffset>(14),
            reader.IsDBNull(15) ? null : reader.GetFieldValue<DateTimeOffset>(15),
            reader.IsDBNull(16) ? null : reader.GetFieldValue<DateTimeOffset>(16),
            reader.IsDBNull(17) ? null : reader.GetFieldValue<DateTimeOffset>(17),
            reader.GetFieldValue<DateTimeOffset>(18),
            reader.IsDBNull(2)
                ? null
                : new RiderSummaryDto(
                    reader.IsDBNull(19) ? "Assigned rider" : reader.GetString(19),
                    reader.IsDBNull(20) ? null : reader.GetString(20),
                    reader.IsDBNull(21) ? null : reader.GetString(21)
                ),
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

internal static class QuoteMenuReader
{
    internal static async Task<List<MenuItem>> GetItemsAsync(
        string connectionString,
        List<Guid> itemIds,
        CancellationToken cancellationToken
    )
    {
        var connectionBuilder = new NpgsqlConnectionStringBuilder(connectionString)
        {
            Pooling = false,
            Timeout = 5,
            CommandTimeout = 8,
            Multiplexing = false,
            MaxAutoPrepare = 0
        };

        await using var connection = new NpgsqlConnection(connectionBuilder.ConnectionString);
        await connection.OpenAsync(cancellationToken);

        var items = new List<MenuItem>();
        var itemsById = new Dictionary<Guid, MenuItem>();

        await using (var command = connection.CreateCommand())
        {
            command.CommandTimeout = 8;
            command.CommandText = """
                SELECT id, category_id, name, description, price, image_url, is_available, is_featured, display_order
                FROM menu_items
                WHERE id = ANY(@ids)
                """;
            command.Parameters.AddWithValue("ids", itemIds.ToArray());

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var item = new MenuItem
                {
                    Id = reader.GetGuid(0),
                    CategoryId = reader.IsDBNull(1) ? null : reader.GetGuid(1),
                    Name = reader.GetString(2),
                    Description = reader.IsDBNull(3) ? null : reader.GetString(3),
                    Price = reader.GetDecimal(4),
                    ImageUrl = reader.IsDBNull(5) ? null : reader.GetString(5),
                    IsAvailable = reader.GetBoolean(6),
                    IsFeatured = reader.GetBoolean(7),
                    DisplayOrder = reader.GetInt32(8)
                };

                items.Add(item);
                itemsById[item.Id] = item;
            }
        }

        if (items.Count == 0)
        {
            return items;
        }

        var groupsById = new Dictionary<Guid, MenuItemOptionGroup>();
        await using (var command = connection.CreateCommand())
        {
            command.CommandTimeout = 8;
            command.CommandText = """
                SELECT
                    g.id,
                    g.menu_item_id,
                    g.label,
                    g.is_required,
                    g.max_selections,
                    g.display_order,
                    c.id,
                    c.group_id,
                    c.name,
                    c.additional_price,
                    c.is_available
                FROM menu_item_option_groups AS g
                LEFT JOIN menu_item_option_choices AS c
                    ON c.group_id = g.id
                WHERE g.menu_item_id = ANY(@ids)
                ORDER BY g.display_order, g.id, c.id
                """;
            command.Parameters.AddWithValue("ids", itemIds.ToArray());

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var groupId = reader.GetGuid(0);
                if (!groupsById.TryGetValue(groupId, out var group))
                {
                    group = new MenuItemOptionGroup
                    {
                        Id = groupId,
                        MenuItemId = reader.GetGuid(1),
                        Label = reader.GetString(2),
                        IsRequired = reader.GetBoolean(3),
                        MaxSelections = reader.GetInt32(4),
                        DisplayOrder = reader.GetInt32(5)
                    };
                    groupsById[groupId] = group;

                    if (itemsById.TryGetValue(group.MenuItemId, out var menuItem))
                    {
                        menuItem.OptionGroups.Add(group);
                    }
                }

                if (!reader.IsDBNull(6))
                {
                    group.Choices.Add(new MenuItemOptionChoice
                    {
                        Id = reader.GetGuid(6),
                        GroupId = reader.GetGuid(7),
                        Name = reader.GetString(8),
                        AdditionalPrice = reader.GetDecimal(9),
                        IsAvailable = reader.GetBoolean(10)
                    });
                }
            }
        }

        return items;
    }
}

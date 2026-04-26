using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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

    public OrdersController(AppDbContext db, IConfiguration cfg)
    {
        _db = db;
        _cfg = cfg;
    }

    [HttpPost("quote")]
    public async Task<IActionResult> Quote(QuoteOrderRequest req)
    {
        if (req.Items == null || req.Items.Count == 0)
            return BadRequest("Order must have at least one item.");

        var quote = await BuildQuote(req.Items);
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

        var order = new Order
        {
            CustomerId = userId,
            Status = OrderStatus.pending,
            DeliveryStreet = req.DeliveryStreet,
            DeliveryBarangay = req.DeliveryBarangay,
            DeliveryCity = req.DeliveryCity,
            DeliveryLat = req.DeliveryLat,
            DeliveryLng = req.DeliveryLng,
            CustomerNote = req.CustomerNote,
            PlacedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        var quote = await BuildQuote(req.Items);
        if (quote.Error != null) return BadRequest(quote.Error);

        foreach (var preparedItem in quote.PreparedItems)
        {
            var orderItem = new OrderItem
            {
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
        await _db.SaveChangesAsync();

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

        var orders = await _db.Orders
        .Where(o => o.CustomerId == userId)
        .OrderByDescending(o => o.PlacedAt)
        .Select(o => new
        {
            o.Id,
            o.OrderNumber,
            o.Status,
            o.Subtotal,
            o.DeliveryFee,
            o.DiscountAmount,
            o.TotalAmount,
            o.DeliveryStreet,
            o.DeliveryBarangay,
            o.DeliveryCity,
            o.DeliveryLat,
            o.DeliveryLng,
            o.CustomerNote,
            o.PlacedAt,
            o.ConfirmedAt,
            o.ReadyAt,
            o.PickedUpAt,
            o.DeliveredAt,
            o.CancelledAt,
            Items = o.Items.Select(i => new
            {
                i.Id,
                i.MenuItemId,
                i.ItemName,
                i.UnitPrice,
                i.Quantity,
                i.Subtotal,
                i.SpecialInstructions,
                Options = i.Options.Select(opt => new
                {
                    opt.GroupLabel,
                    opt.ChoiceName,
                    opt.AdditionalPrice
                })
            })
        })
        .ToListAsync();

        return Ok(orders);
    }

    private async Task<QuoteBuildResult> BuildQuote(List<CreateOrderItemRequest> items)
    {
        var itemIds = items.Select(i => i.MenuItemId).Distinct().ToList();

        var menuItems = await _db.MenuItems
            .Include(i => i.OptionGroups)
                .ThenInclude(g => g.Choices)
            .Where(i => itemIds.Contains(i.Id))
            .ToListAsync();

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

        var deliveryFee = _cfg.GetValue<decimal>("Pricing:DeliveryFee", 50m);
        return QuoteBuildResult.Success(preparedItems, subtotal, deliveryFee);
    }
}

public record QuoteOrderRequest(
    List<CreateOrderItemRequest> Items
);

public record CreateOrderRequest(
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

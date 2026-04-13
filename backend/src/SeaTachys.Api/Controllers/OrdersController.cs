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

    [HttpPost]
    public async Task<IActionResult> Create(CreateOrderRequest req)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userIdStr)) return Unauthorized();

        if (req.Items == null || req.Items.Count == 0)
            return BadRequest("Order must have at least one item.");

        var userId = Guid.Parse(userIdStr);

        var itemIds = req.Items.Select(i => i.MenuItemId).Distinct().ToList();

        var menuItems = await _db.MenuItems
            .Include(i => i.OptionGroups)
                .ThenInclude(g => g.Choices)
            .Where(i => itemIds.Contains(i.Id))
            .ToListAsync();

        if (menuItems.Count != itemIds.Count)
            return BadRequest("One or more menu items were not found.");

        var menuById = menuItems.ToDictionary(i => i.Id);

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

        decimal subtotal = 0m;

        foreach (var reqItem in req.Items)
        {
            if (reqItem.Quantity <= 0)
                return BadRequest("Quantity must be at least 1.");

            var menuItem = menuById[reqItem.MenuItemId];
            if (!menuItem.IsAvailable)
                return BadRequest($"{menuItem.Name} is not available.");

            var optionIds = reqItem.OptionChoiceIds?.Distinct().ToList() ?? new List<Guid>();

            var groups = menuItem.OptionGroups.ToList();
            var groupById = groups.ToDictionary(g => g.Id);

            var choiceById = groups
                .SelectMany(g => g.Choices)
                .ToDictionary(c => c.Id);

            foreach (var choiceId in optionIds)
            {
                if (!choiceById.TryGetValue(choiceId, out var choice))
                    return BadRequest("Invalid option selection.");

                if (!choice.IsAvailable)
                    return BadRequest($"Option '{choice.Name}' is not available.");
            }

            foreach (var group in groups)
            {
                var selectedInGroup = optionIds
                    .Where(id => choiceById[id].GroupId == group.Id)
                    .ToList();

                if (group.IsRequired && selectedInGroup.Count == 0)
                    return BadRequest($"{menuItem.Name}: {group.Label} is required.");

                if (selectedInGroup.Count > group.MaxSelections)
                    return BadRequest($"{menuItem.Name}: too many selections for {group.Label}.");
            }

            var optionsTotal = optionIds.Sum(id => choiceById[id].AdditionalPrice);
            var itemSubtotal = (menuItem.Price + optionsTotal) * reqItem.Quantity;
            subtotal += itemSubtotal;

            var orderItem = new OrderItem
            {
                MenuItemId = menuItem.Id,
                ItemName = menuItem.Name,
                UnitPrice = menuItem.Price,
                Quantity = reqItem.Quantity,
                Subtotal = itemSubtotal,
                SpecialInstructions = reqItem.SpecialInstructions
            };

            foreach (var choiceId in optionIds)
            {
                var choice = choiceById[choiceId];
                var groupLabel = groupById[choice.GroupId].Label;

                orderItem.Options.Add(new OrderItemOption
                {
                    GroupLabel = groupLabel,
                    ChoiceName = choice.Name,
                    AdditionalPrice = choice.AdditionalPrice
                });
            }

            order.Items.Add(orderItem);
        }

        var deliveryFee = _cfg.GetValue<decimal>("Pricing:DeliveryFee", 50m);
        var discount = 0m;

        order.Subtotal = subtotal;
        order.DeliveryFee = deliveryFee;
        order.DiscountAmount = discount;
        order.TotalAmount = subtotal + deliveryFee - discount;

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
            .Include(o => o.Items)
            .ThenInclude(i => i.Options)
            .Where(o => o.CustomerId == userId)
            .OrderByDescending(o => o.PlacedAt)
            .ToListAsync();

        return Ok(orders);
    }
}

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

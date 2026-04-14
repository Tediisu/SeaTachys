using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SeaTachys.Api.Services;
using SeaTachys.Domain.Enums;
using SeaTachys.Infrastructure.Persistence;

namespace SeaTachys.Api.Controllers;

[ApiController]
[Route("api/admin/orders")]
[Authorize(Roles = "admin")]
public class AdminOrdersController : ControllerBase
{
    private readonly AppDbContext _db;
    public AdminOrdersController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] OrderStatus ? status = null)
    {
        var q = _db.Orders
        .Include(o => o.Items)
        .ThenInclude(i => i.Options)
        .AsQueryable();

        if(status != null)
        {
            q = q.Where(o => o.Status == status);
        }

        var orders = await q.OrderByDescending(o => o.PlacedAt).ToListAsync();
        return Ok(orders);

    }

    [HttpPost("{orderId:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid orderId, UpdateOrderStatusRequest req)
    {
        var order = await _db.Orders.FindAsync(orderId);
        if(order == null) return NotFound();

        var newStatus = req.Status;

        if (!OrderStatusRules.CanTransition(order.Status, newStatus))
            return BadRequest($"Invalid transition: {order.Status} → {newStatus}");

        order.Status = newStatus;
        order.UpdatedAt = DateTimeOffset.UtcNow;

        if(newStatus == OrderStatus.confirmed)
            order.ConfirmedAt = DateTimeOffset.UtcNow;

        if(newStatus == OrderStatus.preparing) 
            order.ReadyAt = null;
        
        if (newStatus == OrderStatus.ready_for_pickup)
            order.DeliveredAt = DateTimeOffset.UtcNow;
        
        if (newStatus == OrderStatus.picked_up)
            order.PickedUpAt = DateTimeOffset.UtcNow;
        
        if (newStatus == OrderStatus.delivered)
            order.DeliveredAt = DateTimeOffset.UtcNow;

        if (newStatus == OrderStatus.cancelled)
            order.CancelledAt = DateTimeOffset.UtcNow;
        
        if(req.RiderId == null) 
            order.RiderId = req.RiderId;
        
        await _db.SaveChangesAsync();

        return Ok(new
        {
            order.Id,
            order.Status,
            order.ConfirmedAt,
            order.ReadyAt,
            order.PickedUpAt,
            order.DeliveredAt,
            order.CancelledAt
        });
    }
}

public record UpdateOrderStatusRequest(
    OrderStatus Status,
    Guid? RiderId
);

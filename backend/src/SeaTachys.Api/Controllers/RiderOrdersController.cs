using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SeaTachys.Api.Services;
using SeaTachys.Domain.Enums;

namespace SeaTachys.Api.Controllers;

[ApiController]
[Route("api/rider/orders")]
[Authorize(Roles = "rider")]
public class RiderOrdersController : ControllerBase
{
    private static readonly OrderStatus[] ActiveDeliveryStatuses =
    [
        OrderStatus.ready_for_pickup,
        OrderStatus.picked_up,
        OrderStatus.on_the_way
    ];

    private readonly DatabaseConnectionString _databaseConnectionString;

    public RiderOrdersController(DatabaseConnectionString databaseConnectionString)
    {
        _databaseConnectionString = databaseConnectionString;
    }

    [HttpGet("available")]
    public async Task<IActionResult> Available()
    {
        var orders = await AdminOrderStore.GetOrdersAsync(
            _databaseConnectionString.Value,
            OrderStatus.ready_for_pickup,
            HttpContext.RequestAborted
        );

        return Ok(orders.Where(order =>
            order.RiderId is null &&
            !string.IsNullOrWhiteSpace(order.DeliveryStreet)));
    }

    [HttpGet("mine")]
    public async Task<IActionResult> Mine()
    {
        var riderId = GetRiderId();
        if (riderId is null) return Unauthorized();

        var orders = await AdminOrderStore.GetOrdersAsync(
            _databaseConnectionString.Value,
            null,
            HttpContext.RequestAborted
        );

        return Ok(orders.Where(order =>
            order.RiderId == riderId &&
            ActiveDeliveryStatuses.Contains(order.Status)));
    }

    [HttpPost("{orderId:guid}/accept")]
    public async Task<IActionResult> Accept(Guid orderId)
    {
        var riderId = GetRiderId();
        if (riderId is null) return Unauthorized();

        var accepted = await AdminOrderStore.AcceptAsync(
            _databaseConnectionString.Value,
            orderId,
            riderId.Value,
            HttpContext.RequestAborted
        );

        return accepted is null
            ? Conflict("This delivery is no longer available.")
            : Ok(accepted);
    }

    [HttpPost("{orderId:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid orderId, [FromBody] RiderOrderStatusRequest request)
    {
        var riderId = GetRiderId();
        if (riderId is null) return Unauthorized();

        var orders = await AdminOrderStore.GetOrdersAsync(
            _databaseConnectionString.Value,
            null,
            HttpContext.RequestAborted
        );
        var order = orders.FirstOrDefault(candidate => candidate.Id == orderId && candidate.RiderId == riderId);

        if (order is null)
        {
            return NotFound();
        }

        if (!OrderStatusRules.CanTransition(order.Status, request.Status))
        {
            return BadRequest($"Invalid transition: {order.Status} -> {request.Status}");
        }

        if (request.Status is not (OrderStatus.picked_up or OrderStatus.on_the_way or OrderStatus.delivered))
        {
            return BadRequest("Riders can only mark orders as picked up, on the way, or delivered.");
        }

        var updated = await AdminOrderStore.UpdateStatusAsync(
            _databaseConnectionString.Value,
            orderId,
            new UpdateOrderStatusRequest(request.Status, riderId),
            HttpContext.RequestAborted
        );

        return updated is null ? NotFound() : Ok(updated);
    }

    private Guid? GetRiderId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userId, out var parsed) ? parsed : null;
    }
}

public record RiderOrderStatusRequest(OrderStatus Status);

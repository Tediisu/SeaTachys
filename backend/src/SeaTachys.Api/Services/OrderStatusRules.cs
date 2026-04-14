using SeaTachys.Domain.Enums;

namespace SeaTachys.Api.Services;

public static class OrderStatusRules
{
    public static bool CanTransition(OrderStatus from, OrderStatus to)
    {
        return (from, to) switch
        {
            (OrderStatus.pending, OrderStatus.confirmed) => true,
            (OrderStatus.confirmed, OrderStatus.preparing) => true,
            (OrderStatus.preparing, OrderStatus.ready_for_pickup) => true,
            (OrderStatus.ready_for_pickup, OrderStatus.picked_up) => true,
            (OrderStatus.picked_up, OrderStatus.on_the_way) => true,
            (OrderStatus.on_the_way, OrderStatus.delivered) => true,

            // cancel allowed only before picked_up
            (OrderStatus.pending, OrderStatus.cancelled) => true,
            (OrderStatus.confirmed, OrderStatus.cancelled) => true,
            (OrderStatus.preparing, OrderStatus.cancelled) => true,
            (OrderStatus.ready_for_pickup, OrderStatus.cancelled) => true,

            _ => false
        };
    }
}

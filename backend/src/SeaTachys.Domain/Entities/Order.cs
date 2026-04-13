using SeaTachys.Domain.Enums;

namespace SeaTachys.Domain.Entities;

public class Order
{
    public Guid Id { get; set; }
    public string OrderNumber { get; set; } = "";
    public Guid CustomerId { get; set; }
    public Guid? RiderId { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.pending;

    public string DeliveryStreet { get; set; } = "";
    public string? DeliveryBarangay { get; set; }
    public string DeliveryCity { get; set; } = "";
    public decimal? DeliveryLat { get; set; }
    public decimal? DeliveryLng { get; set; }

    public decimal Subtotal { get; set; }
    public decimal DeliveryFee { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }

    public string? CustomerNote { get; set; }
    public string? CancellationReason { get; set; }

    public DateTimeOffset PlacedAt { get; set; }
    public DateTimeOffset? ConfirmedAt { get; set; }
    public DateTimeOffset? ReadyAt { get; set; }
    public DateTimeOffset? PickedUpAt { get; set; }
    public DateTimeOffset? DeliveredAt { get; set; }
    public DateTimeOffset? CancelledAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
}
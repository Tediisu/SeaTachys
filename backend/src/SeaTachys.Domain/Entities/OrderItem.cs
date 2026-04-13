using SeaTachys.Domain.Enums;

namespace SeaTachys.Domain.Entities;

public class OrderItem
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public Guid MenuItemId { get; set; }
    public string ItemName { get; set; } = "";
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
    public decimal Subtotal { get; set; }
    public string? SpecialInstructions { get; set; }
    public Order Order { get; set; } = null!;
    public ICollection<OrderItemOption> Options { get; set; } = new List<OrderItemOption>();
}
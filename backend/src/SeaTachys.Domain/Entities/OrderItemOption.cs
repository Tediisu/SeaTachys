using SeaTachys.Domain.Enums;

namespace SeaTachys.Domain.Entities;

public class OrderItemOption
{
    public Guid Id { get; set; }
    public Guid OrderItemId { get; set; }
    public string GroupLabel { get; set; } = "";
    public string ChoiceName { get; set; } = "";
    public decimal AdditionalPrice { get; set; }
    public OrderItem OrderItem { get; set; } = null!;
}
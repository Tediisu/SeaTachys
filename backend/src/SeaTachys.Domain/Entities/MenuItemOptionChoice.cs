using SeaTachys.Domain.Enums;

namespace SeaTachys.Domain.Entities;

public class MenuItemOptionChoice
{
    public Guid Id { get; set; }
    public Guid GroupId { get; set; }
    public string Name { get; set; } = "";
    public decimal AdditionalPrice { get; set; }
    public bool IsAvailable { get; set; } = true;
    public MenuItemOptionGroup Group { get; set; } = null!;
}
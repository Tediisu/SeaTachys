using SeaTachys.Domain.Enums;

namespace SeaTachys.Domain.Entities;

public class MenuItem
{
    public Guid Id { get; set; }
    public Guid? CategoryId { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public string? ImageUrl { get; set; }
    public bool IsAvailable { get; set; } = true;
    public bool IsFeatured { get; set; }
    public int DisplayOrder { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public MenuCategory? Category { get; set; }
    public ICollection<MenuItemOptionGroup> OptionGroups { get; set; } = new List<MenuItemOptionGroup>();
}
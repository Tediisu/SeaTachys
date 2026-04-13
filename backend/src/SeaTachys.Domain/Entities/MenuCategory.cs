using SeaTachys.Domain.Enums;

namespace SeaTachys.Domain.Entities;

public class MenuCategory
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
    public ICollection<MenuItem> Items { get; set; } = new List<MenuItem>();
}
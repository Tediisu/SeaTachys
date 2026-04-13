using SeaTachys.Domain.Enums;

namespace SeaTachys.Domain.Entities;

public class MenuItemOptionGroup
{
    public Guid Id { get; set; }
    public Guid MenuItemId { get; set; }
    public string Label { get; set; } = "";
    public bool IsRequired { get; set; }
    public int MaxSelections { get; set; } = 1;
    public int DisplayOrder { get; set; }
    public MenuItem MenuItem { get; set; } = null!;
    public ICollection<MenuItemOptionChoice> Choices { get; set; } = new List<MenuItemOptionChoice>();
}
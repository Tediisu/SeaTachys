using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SeaTachys.Infrastructure.Persistence;

namespace SeaTachys.Api.Controllers;

[ApiController]
[Route("api/menu")]
public class MenuController : ControllerBase
{
    private readonly AppDbContext _db;
    public MenuController(AppDbContext db) => _db = db;

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()    
    {
        var categories = await _db.MenuCategories
            .AsNoTracking()
            .Where(c => c.IsActive)
            .OrderBy(c => c.DisplayOrder)
            .ToListAsync();

        return Ok(categories.Select(category => new MenuCategoryDto(
            category.Id,
            category.Name,
            category.Description,
            category.ImageUrl,
            category.DisplayOrder,
            category.IsActive
        )));
    }

    [HttpGet("items")]
    public async Task<IActionResult> GetItems()
    {
        var items = await _db.MenuItems
            .AsNoTracking()
            .AsSplitQuery()
            .Include(i => i.OptionGroups)
            .ThenInclude(g => g.Choices)
            .Where(i => i.IsAvailable)
            .OrderBy(i => i.DisplayOrder)
            .ToListAsync();

        return Ok(items.Select(MapMenuItem));
    }

    [HttpGet("items/{id:guid}")]
    public async Task<IActionResult> GetItem(Guid id)
    {
        var item = await _db.MenuItems
            .AsNoTracking()
            .AsSplitQuery()
            .Include(i => i.OptionGroups.OrderBy(g => g.DisplayOrder))
            .ThenInclude(g => g.Choices.Where(c => c.IsAvailable))
            .FirstOrDefaultAsync(i => i.Id == id && i.IsAvailable);

        if (item == null) return NotFound();

        return Ok(MapMenuItemDetail(item));
    }

    private static MenuItemDto MapMenuItem(Domain.Entities.MenuItem item) =>
        new(
            item.Id,
            item.CategoryId,
            item.Name,
            item.Description,
            item.Price,
            item.ImageUrl,
            item.IsAvailable,
            item.IsFeatured,
            item.DisplayOrder
        );

    private static MenuItemDetailDto MapMenuItemDetail(Domain.Entities.MenuItem item) =>
        new(
            item.Id,
            item.CategoryId,
            item.Name,
            item.Description,
            item.Price,
            item.ImageUrl,
            item.IsAvailable,
            item.IsFeatured,
            item.DisplayOrder,
            item.OptionGroups
                .OrderBy(group => group.DisplayOrder)
                .Select(group => new MenuItemOptionGroupDto(
                    group.Id,
                    group.MenuItemId,
                    group.Label,
                    group.IsRequired,
                    group.MaxSelections,
                    group.DisplayOrder,
                    group.Choices
                        .Where(choice => choice.IsAvailable)
                        .Select(choice => new MenuItemOptionChoiceDto(
                            choice.Id,
                            choice.GroupId,
                            choice.Name,
                            choice.AdditionalPrice,
                            choice.IsAvailable
                        ))
                        .ToList()
                ))
                .ToList()
        );
}

public record MenuCategoryDto(
    Guid Id,
    string Name,
    string? Description,
    string? ImageUrl,
    int DisplayOrder,
    bool IsActive
);

public record MenuItemDto(
    Guid Id,
    Guid? CategoryId,
    string Name,
    string? Description,
    decimal Price,
    string? ImageUrl,
    bool IsAvailable,
    bool IsFeatured,
    int DisplayOrder
);

public record MenuItemOptionChoiceDto(
    Guid Id,
    Guid GroupId,
    string Name,
    decimal AdditionalPrice,
    bool IsAvailable
);

public record MenuItemOptionGroupDto(
    Guid Id,
    Guid MenuItemId,
    string Label,
    bool IsRequired,
    int MaxSelections,
    int DisplayOrder,
    List<MenuItemOptionChoiceDto> Choices
);

public record MenuItemDetailDto(
    Guid Id,
    Guid? CategoryId,
    string Name,
    string? Description,
    decimal Price,
    string? ImageUrl,
    bool IsAvailable,
    bool IsFeatured,
    int DisplayOrder,
    List<MenuItemOptionGroupDto> OptionGroups
);

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SeaTachys.Domain.Entities;
using SeaTachys.Infrastructure.Persistence;

namespace SeaTachys.Api.Controllers;

[ApiController]
[Route("api/admin/menu")]
[Authorize(Roles = "admin")]
public class AdminMenuController : ControllerBase
{
    private readonly AppDbContext _db;
    public AdminMenuController(AppDbContext db) => _db = db;

    // ===== CATEGORIES =====

    [HttpPost("categories")]
    public async Task<IActionResult> CreateCategory(CreateCategoryRequest req)
    {
        var category = new MenuCategory
        {
            Name = req.Name.Trim(),
            Description = req.Description,
            ImageUrl = req.ImageUrl,
            DisplayOrder = req.DisplayOrder,
            IsActive = req.IsActive,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _db.MenuCategories.Add(category);
        await _db.SaveChangesAsync();
        return Ok(category);
    }

    [HttpPut("categories/{id:guid}")]
    public async Task<IActionResult> UpdateCategory(Guid id, UpdateCategoryRequest req)
    {
        var category = await _db.MenuCategories.FindAsync(id);
        if (category == null) return NotFound();

        category.Name = req.Name.Trim();
        category.Description = req.Description;
        category.ImageUrl = req.ImageUrl;
        category.DisplayOrder = req.DisplayOrder;
        category.IsActive = req.IsActive;

        await _db.SaveChangesAsync();
        return Ok(category);
    }

    [HttpDelete("categories/{id:guid}")]
    public async Task<IActionResult> DeleteCategory(Guid id)
    {
        var category = await _db.MenuCategories.FindAsync(id);
        if (category == null) return NotFound();

        _db.MenuCategories.Remove(category);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ===== ITEMS =====

    [HttpPost("items")]
    public async Task<IActionResult> CreateItem(CreateMenuItemRequest req)
    {
        if (req.Price <= 0) return BadRequest("Price must be greater than 0.");

        var item = new MenuItem
        {
            CategoryId = req.CategoryId,
            Name = req.Name.Trim(),
            Description = req.Description,
            Price = req.Price,
            ImageUrl = req.ImageUrl,
            IsAvailable = req.IsAvailable,
            IsFeatured = req.IsFeatured,
            DisplayOrder = req.DisplayOrder,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        _db.MenuItems.Add(item);
        await _db.SaveChangesAsync();
        return Ok(item);
    }

    [HttpPut("items/{id:guid}")]
    public async Task<IActionResult> UpdateItem(Guid id, UpdateMenuItemRequest req)
    {
        var item = await _db.MenuItems.FindAsync(id);
        if (item == null) return NotFound();

        if (req.Price <= 0) return BadRequest("Price must be greater than 0.");

        item.CategoryId = req.CategoryId;
        item.Name = req.Name.Trim();
        item.Description = req.Description;
        item.Price = req.Price;
        item.ImageUrl = req.ImageUrl;
        item.IsAvailable = req.IsAvailable;
        item.IsFeatured = req.IsFeatured;
        item.DisplayOrder = req.DisplayOrder;
        item.UpdatedAt = DateTimeOffset.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(item);
    }

    [HttpDelete("items/{id:guid}")]
    public async Task<IActionResult> DeleteItem(Guid id)
    {
        var item = await _db.MenuItems.FindAsync(id);
        if (item == null) return NotFound();

        _db.MenuItems.Remove(item);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ===== OPTION GROUPS =====

    [HttpPost("items/{itemId:guid}/option-groups")]
    public async Task<IActionResult> CreateOptionGroup(Guid itemId, CreateOptionGroupRequest req)
    {
        if (req.MaxSelections < 1) return BadRequest("MaxSelections must be at least 1.");

        var itemExists = await _db.MenuItems.AnyAsync(i => i.Id == itemId);
        if (!itemExists) return BadRequest("Menu item not found.");

        var group = new MenuItemOptionGroup
        {
            MenuItemId = itemId,
            Label = req.Label.Trim(),
            IsRequired = req.IsRequired,
            MaxSelections = req.MaxSelections,
            DisplayOrder = req.DisplayOrder
        };

        _db.MenuItemOptionGroups.Add(group);
        await _db.SaveChangesAsync();
        return Ok(group);
    }

    [HttpDelete("option-groups/{groupId:guid}")]
    public async Task<IActionResult> DeleteOptionGroup(Guid groupId)
    {
        var group = await _db.MenuItemOptionGroups.FindAsync(groupId);
        if (group == null) return NotFound();

        _db.MenuItemOptionGroups.Remove(group);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ===== OPTION CHOICES =====

    [HttpPost("option-groups/{groupId:guid}/choices")]
    public async Task<IActionResult> CreateOptionChoice(Guid groupId, CreateOptionChoiceRequest req)
    {
        var groupExists = await _db.MenuItemOptionGroups.AnyAsync(g => g.Id == groupId);
        if (!groupExists) return BadRequest("Option group not found.");

        var choice = new MenuItemOptionChoice
        {
            GroupId = groupId,
            Name = req.Name.Trim(),
            AdditionalPrice = req.AdditionalPrice,
            IsAvailable = req.IsAvailable
        };

        _db.MenuItemOptionChoices.Add(choice);
        await _db.SaveChangesAsync();
        return Ok(choice);
    }

    [HttpDelete("option-choices/{choiceId:guid}")]
    public async Task<IActionResult> DeleteOptionChoice(Guid choiceId)
    {
        var choice = await _db.MenuItemOptionChoices.FindAsync(choiceId);
        if (choice == null) return NotFound();

        _db.MenuItemOptionChoices.Remove(choice);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

public record CreateCategoryRequest(
    string Name,
    string? Description,
    string? ImageUrl,
    int DisplayOrder,
    bool IsActive
);

public record UpdateCategoryRequest(
    string Name,
    string? Description,
    string? ImageUrl,
    int DisplayOrder,
    bool IsActive
);

public record CreateMenuItemRequest(
    Guid? CategoryId,
    string Name,
    string? Description,
    decimal Price,
    string? ImageUrl,
    bool IsAvailable,
    bool IsFeatured,
    int DisplayOrder
);

public record UpdateMenuItemRequest(
    Guid? CategoryId,
    string Name,
    string? Description,
    decimal Price,
    string? ImageUrl,
    bool IsAvailable,
    bool IsFeatured,
    int DisplayOrder
);

public record CreateOptionGroupRequest(
    string Label,
    bool IsRequired,
    int MaxSelections,
    int DisplayOrder
);

public record CreateOptionChoiceRequest(
    string Name,
    decimal AdditionalPrice,
    bool IsAvailable
);

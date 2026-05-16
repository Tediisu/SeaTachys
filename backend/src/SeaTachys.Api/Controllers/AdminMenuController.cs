using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using SeaTachys.Domain.Entities;
using SeaTachys.Infrastructure.Persistence;

namespace SeaTachys.Api.Controllers;

[ApiController]
[Route("api/admin/menu")]
[Authorize(Roles = "admin")]
public class AdminMenuController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly DatabaseConnectionString _databaseConnectionString;

    public AdminMenuController(AppDbContext db, DatabaseConnectionString databaseConnectionString)
    {
        _db = db;
        _databaseConnectionString = databaseConnectionString;
    }

    // ===== CATEGORIES =====

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        return Ok(await AdminMenuStore.GetCategoriesAsync(_databaseConnectionString.Value, HttpContext.RequestAborted));
    }

    [HttpPost("categories")]
    public async Task<IActionResult> CreateCategory(CreateCategoryRequest req)
    {
        var category = await AdminMenuStore.CreateCategoryAsync(
            _databaseConnectionString.Value,
            req,
            HttpContext.RequestAborted
        );
        return Ok(category);
    }

    [HttpPut("categories/{id:guid}")]
    public async Task<IActionResult> UpdateCategory(Guid id, UpdateCategoryRequest req)
    {
        var category = await AdminMenuStore.UpdateCategoryAsync(
            _databaseConnectionString.Value,
            id,
            req,
            HttpContext.RequestAborted
        );
        return category is null ? NotFound() : Ok(category);
    }

    [HttpDelete("categories/{id:guid}")]
    public async Task<IActionResult> DeleteCategory(Guid id)
    {
        var deleted = await AdminMenuStore.DeleteCategoryAsync(
            _databaseConnectionString.Value,
            id,
            HttpContext.RequestAborted
        );
        return deleted ? NoContent() : NotFound();
    }

    // ===== ITEMS =====

    [HttpGet("items")]
    public async Task<IActionResult> GetItems()
    {
        return Ok(await AdminMenuStore.GetItemsAsync(_databaseConnectionString.Value, HttpContext.RequestAborted));
    }

    [HttpPost("items")]
    public async Task<IActionResult> CreateItem(CreateMenuItemRequest req)
    {
        if (req.Price <= 0) return BadRequest("Price must be greater than 0.");

        var item = await AdminMenuStore.CreateItemAsync(
            _databaseConnectionString.Value,
            req,
            HttpContext.RequestAborted
        );
        return Ok(item);
    }

    [HttpPut("items/{id:guid}")]
    public async Task<IActionResult> UpdateItem(Guid id, UpdateMenuItemRequest req)
    {
        if (req.Price <= 0) return BadRequest("Price must be greater than 0.");

        var item = await AdminMenuStore.UpdateItemAsync(
            _databaseConnectionString.Value,
            id,
            req,
            HttpContext.RequestAborted
        );
        return item is null ? NotFound() : Ok(item);
    }

    [HttpDelete("items/{id:guid}")]
    public async Task<IActionResult> DeleteItem(Guid id)
    {
        var deleted = await AdminMenuStore.DeleteItemAsync(
            _databaseConnectionString.Value,
            id,
            HttpContext.RequestAborted
        );
        return deleted ? NoContent() : NotFound();
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

    private static AdminMenuCategoryDto MapCategory(MenuCategory category) =>
        new(
            category.Id,
            category.Name,
            category.Description,
            category.ImageUrl,
            category.DisplayOrder,
            category.IsActive,
            category.CreatedAt
        );

    private static AdminMenuItemDto MapMenuItem(MenuItem item) =>
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
            item.CreatedAt,
            item.UpdatedAt,
            item.Category == null ? null : MapCategory(item.Category)
        );
}

public record AdminMenuCategoryDto(
    Guid Id,
    string Name,
    string? Description,
    string? ImageUrl,
    int DisplayOrder,
    bool IsActive,
    DateTimeOffset CreatedAt
);

public record AdminMenuItemDto(
    Guid Id,
    Guid? CategoryId,
    string Name,
    string? Description,
    decimal Price,
    string? ImageUrl,
    bool IsAvailable,
    bool IsFeatured,
    int DisplayOrder,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    AdminMenuCategoryDto? Category
);

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

internal static class AdminMenuStore
{
    internal static async Task<List<AdminMenuCategoryDto>> GetCategoriesAsync(
        string connectionString,
        CancellationToken cancellationToken
    )
    {
        await using var connection = await OpenAsync(connectionString, cancellationToken);
        await using var command = CreateCommand(connection, """
            SELECT id, name, description, image_url, display_order, is_active, created_at
            FROM menu_categories
            ORDER BY display_order, id
            """);

        var categories = new List<AdminMenuCategoryDto>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            categories.Add(ReadCategory(reader));
        }

        return categories;
    }

    internal static async Task<AdminMenuCategoryDto> CreateCategoryAsync(
        string connectionString,
        CreateCategoryRequest req,
        CancellationToken cancellationToken
    )
    {
        await using var connection = await OpenAsync(connectionString, cancellationToken);
        await using var command = CreateCommand(connection, """
            INSERT INTO menu_categories (id, name, description, image_url, display_order, is_active, created_at)
            VALUES (@id, @name, @description, @image_url, @display_order, @is_active, @created_at)
            RETURNING id, name, description, image_url, display_order, is_active, created_at
            """);
        command.Parameters.AddWithValue("id", Guid.NewGuid());
        command.Parameters.AddWithValue("name", req.Name.Trim());
        command.Parameters.AddWithValue("description", DbValue(req.Description));
        command.Parameters.AddWithValue("image_url", DbValue(req.ImageUrl));
        command.Parameters.AddWithValue("display_order", req.DisplayOrder);
        command.Parameters.AddWithValue("is_active", req.IsActive);
        command.Parameters.AddWithValue("created_at", DateTimeOffset.UtcNow);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        await reader.ReadAsync(cancellationToken);
        return ReadCategory(reader);
    }

    internal static async Task<AdminMenuCategoryDto?> UpdateCategoryAsync(
        string connectionString,
        Guid id,
        UpdateCategoryRequest req,
        CancellationToken cancellationToken
    )
    {
        await using var connection = await OpenAsync(connectionString, cancellationToken);
        await using var command = CreateCommand(connection, """
            UPDATE menu_categories
            SET name = @name,
                description = @description,
                image_url = @image_url,
                display_order = @display_order,
                is_active = @is_active
            WHERE id = @id
            RETURNING id, name, description, image_url, display_order, is_active, created_at
            """);
        command.Parameters.AddWithValue("id", id);
        command.Parameters.AddWithValue("name", req.Name.Trim());
        command.Parameters.AddWithValue("description", DbValue(req.Description));
        command.Parameters.AddWithValue("image_url", DbValue(req.ImageUrl));
        command.Parameters.AddWithValue("display_order", req.DisplayOrder);
        command.Parameters.AddWithValue("is_active", req.IsActive);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? ReadCategory(reader) : null;
    }

    internal static async Task<bool> DeleteCategoryAsync(
        string connectionString,
        Guid id,
        CancellationToken cancellationToken
    )
    {
        await using var connection = await OpenAsync(connectionString, cancellationToken);
        await using var command = CreateCommand(connection, "DELETE FROM menu_categories WHERE id = @id");
        command.Parameters.AddWithValue("id", id);
        return await command.ExecuteNonQueryAsync(cancellationToken) > 0;
    }

    internal static async Task<List<AdminMenuItemDto>> GetItemsAsync(
        string connectionString,
        CancellationToken cancellationToken
    )
    {
        await using var connection = await OpenAsync(connectionString, cancellationToken);
        await using var command = CreateCommand(connection, """
            SELECT
                i.id,
                i.category_id,
                i.name,
                i.description,
                i.price,
                i.image_url,
                i.is_available,
                i.is_featured,
                i.display_order,
                i.created_at,
                i.updated_at,
                c.id,
                c.name,
                c.description,
                c.image_url,
                c.display_order,
                c.is_active,
                c.created_at
            FROM menu_items AS i
            LEFT JOIN menu_categories AS c ON c.id = i.category_id
            ORDER BY i.display_order, i.id
            """);

        var items = new List<AdminMenuItemDto>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(ReadItem(reader, includeCategory: true));
        }

        return items;
    }

    internal static async Task<AdminMenuItemDto> CreateItemAsync(
        string connectionString,
        CreateMenuItemRequest req,
        CancellationToken cancellationToken
    )
    {
        await using var connection = await OpenAsync(connectionString, cancellationToken);
        await using var command = CreateCommand(connection, """
            INSERT INTO menu_items (
                id,
                category_id,
                name,
                description,
                price,
                image_url,
                is_available,
                is_featured,
                display_order,
                created_at,
                updated_at
            )
            VALUES (
                @id,
                @category_id,
                @name,
                @description,
                @price,
                @image_url,
                @is_available,
                @is_featured,
                @display_order,
                @created_at,
                @updated_at
            )
            RETURNING
                id,
                category_id,
                name,
                description,
                price,
                image_url,
                is_available,
                is_featured,
                display_order,
                created_at,
                updated_at
            """);
        AddItemParameters(command, req);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        await reader.ReadAsync(cancellationToken);
        return ReadItem(reader, includeCategory: false);
    }

    internal static async Task<AdminMenuItemDto?> UpdateItemAsync(
        string connectionString,
        Guid id,
        UpdateMenuItemRequest req,
        CancellationToken cancellationToken
    )
    {
        await using var connection = await OpenAsync(connectionString, cancellationToken);
        await using var command = CreateCommand(connection, """
            UPDATE menu_items
            SET category_id = @category_id,
                name = @name,
                description = @description,
                price = @price,
                image_url = @image_url,
                is_available = @is_available,
                is_featured = @is_featured,
                display_order = @display_order,
                updated_at = @updated_at
            WHERE id = @id
            RETURNING
                id,
                category_id,
                name,
                description,
                price,
                image_url,
                is_available,
                is_featured,
                display_order,
                created_at,
                updated_at
            """);
        command.Parameters.AddWithValue("id", id);
        AddItemParameters(command, req, includeIdAndCreatedAt: false);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? ReadItem(reader, includeCategory: false) : null;
    }

    internal static async Task<bool> DeleteItemAsync(
        string connectionString,
        Guid id,
        CancellationToken cancellationToken
    )
    {
        await using var connection = await OpenAsync(connectionString, cancellationToken);
        await using var command = CreateCommand(connection, "DELETE FROM menu_items WHERE id = @id");
        command.Parameters.AddWithValue("id", id);
        return await command.ExecuteNonQueryAsync(cancellationToken) > 0;
    }

    private static async Task<NpgsqlConnection> OpenAsync(string connectionString, CancellationToken cancellationToken)
    {
        var connectionBuilder = new NpgsqlConnectionStringBuilder(connectionString)
        {
            Pooling = false,
            Timeout = 5,
            CommandTimeout = 8,
            Multiplexing = false,
            MaxAutoPrepare = 0
        };

        var connection = new NpgsqlConnection(connectionBuilder.ConnectionString);
        await connection.OpenAsync(cancellationToken);
        return connection;
    }

    private static NpgsqlCommand CreateCommand(NpgsqlConnection connection, string text)
    {
        var command = connection.CreateCommand();
        command.CommandTimeout = 8;
        command.CommandText = text;
        return command;
    }

    private static object DbValue<T>(T? value) => value is null ? DBNull.Value : value;

    private static void AddItemParameters(
        NpgsqlCommand command,
        CreateMenuItemRequest req,
        bool includeIdAndCreatedAt = true
    )
    {
        if (includeIdAndCreatedAt)
        {
            command.Parameters.AddWithValue("id", Guid.NewGuid());
            command.Parameters.AddWithValue("created_at", DateTimeOffset.UtcNow);
        }

        AddItemParameterValues(
            command,
            req.CategoryId,
            req.Name,
            req.Description,
            req.Price,
            req.ImageUrl,
            req.IsAvailable,
            req.IsFeatured,
            req.DisplayOrder
        );
    }

    private static void AddItemParameters(
        NpgsqlCommand command,
        UpdateMenuItemRequest req,
        bool includeIdAndCreatedAt = true
    )
    {
        if (includeIdAndCreatedAt)
        {
            command.Parameters.AddWithValue("id", Guid.NewGuid());
            command.Parameters.AddWithValue("created_at", DateTimeOffset.UtcNow);
        }

        AddItemParameterValues(
            command,
            req.CategoryId,
            req.Name,
            req.Description,
            req.Price,
            req.ImageUrl,
            req.IsAvailable,
            req.IsFeatured,
            req.DisplayOrder
        );
    }

    private static void AddItemParameterValues(
        NpgsqlCommand command,
        Guid? categoryId,
        string name,
        string? description,
        decimal price,
        string? imageUrl,
        bool isAvailable,
        bool isFeatured,
        int displayOrder
    )
    {
        command.Parameters.AddWithValue("category_id", DbValue(categoryId));
        command.Parameters.AddWithValue("name", name.Trim());
        command.Parameters.AddWithValue("description", DbValue(description));
        command.Parameters.AddWithValue("price", price);
        command.Parameters.AddWithValue("image_url", DbValue(imageUrl));
        command.Parameters.AddWithValue("is_available", isAvailable);
        command.Parameters.AddWithValue("is_featured", isFeatured);
        command.Parameters.AddWithValue("display_order", displayOrder);
        command.Parameters.AddWithValue("updated_at", DateTimeOffset.UtcNow);
    }

    private static AdminMenuCategoryDto ReadCategory(NpgsqlDataReader reader, int offset = 0) =>
        new(
            reader.GetGuid(offset),
            reader.GetString(offset + 1),
            reader.IsDBNull(offset + 2) ? null : reader.GetString(offset + 2),
            reader.IsDBNull(offset + 3) ? null : reader.GetString(offset + 3),
            reader.GetInt32(offset + 4),
            reader.GetBoolean(offset + 5),
            reader.GetFieldValue<DateTimeOffset>(offset + 6)
        );

    private static AdminMenuItemDto ReadItem(NpgsqlDataReader reader, bool includeCategory)
    {
        var category = includeCategory && !reader.IsDBNull(11)
            ? ReadCategory(reader, 11)
            : null;

        return new AdminMenuItemDto(
            reader.GetGuid(0),
            reader.IsDBNull(1) ? null : reader.GetGuid(1),
            reader.GetString(2),
            reader.IsDBNull(3) ? null : reader.GetString(3),
            reader.GetDecimal(4),
            reader.IsDBNull(5) ? null : reader.GetString(5),
            reader.GetBoolean(6),
            reader.GetBoolean(7),
            reader.GetInt32(8),
            reader.GetFieldValue<DateTimeOffset>(9),
            reader.GetFieldValue<DateTimeOffset>(10),
            category
        );
    }
}

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using SeaTachys.Infrastructure.Persistence;

namespace SeaTachys.Api.Controllers;

[ApiController]
[Route("api/menu")]
[AllowAnonymous]
[EnableRateLimiting("public-read")]
public class MenuController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly DatabaseConnectionString _databaseConnectionString;

    public MenuController(AppDbContext db, DatabaseConnectionString databaseConnectionString)
    {
        _db = db;
        _databaseConnectionString = databaseConnectionString;
    }

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
        var item = await MenuItemDetailReader.FindAsync(
            _databaseConnectionString.Value,
            id,
            HttpContext.RequestAborted
        );

        if (item == null) return NotFound();

        return Ok(item);
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

internal static class MenuItemDetailReader
{
    internal static async Task<MenuItemDetailDto?> FindAsync(
        string connectionString,
        Guid id,
        CancellationToken cancellationToken
    )
    {
        var connectionBuilder = new NpgsqlConnectionStringBuilder(connectionString)
        {
            Pooling = false,
            Timeout = 5,
            CommandTimeout = 8,
            Multiplexing = false,
            MaxAutoPrepare = 0
        };

        await using var connection = new NpgsqlConnection(connectionBuilder.ConnectionString);
        await connection.OpenAsync(cancellationToken);

        MenuItemDto? item = null;
        await using (var command = connection.CreateCommand())
        {
            command.CommandTimeout = 8;
            command.CommandText = """
                SELECT id, category_id, name, description, price, image_url, is_available, is_featured, display_order
                FROM menu_items
                WHERE id = @id AND is_available
                LIMIT 1
                """;
            command.Parameters.AddWithValue("id", id);

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
            {
                return null;
            }

            item = new MenuItemDto(
                reader.GetGuid(0),
                reader.IsDBNull(1) ? null : reader.GetGuid(1),
                reader.GetString(2),
                reader.IsDBNull(3) ? null : reader.GetString(3),
                reader.GetDecimal(4),
                reader.IsDBNull(5) ? null : reader.GetString(5),
                reader.GetBoolean(6),
                reader.GetBoolean(7),
                reader.GetInt32(8)
            );
        }

        var groups = new List<MenuItemOptionGroupDto>();
        var groupIndexes = new Dictionary<Guid, int>();

        await using (var command = connection.CreateCommand())
        {
            command.CommandTimeout = 8;
            command.CommandText = """
                SELECT
                    g.id,
                    g.menu_item_id,
                    g.label,
                    g.is_required,
                    g.max_selections,
                    g.display_order,
                    c.id,
                    c.group_id,
                    c.name,
                    c.additional_price,
                    c.is_available
                FROM menu_item_option_groups AS g
                LEFT JOIN menu_item_option_choices AS c
                    ON c.group_id = g.id AND c.is_available
                WHERE g.menu_item_id = @id
                ORDER BY g.display_order, g.id, c.id
                """;
            command.Parameters.AddWithValue("id", id);

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var groupId = reader.GetGuid(0);
                if (!groupIndexes.TryGetValue(groupId, out var groupIndex))
                {
                    groupIndex = groups.Count;
                    groupIndexes[groupId] = groupIndex;
                    groups.Add(new MenuItemOptionGroupDto(
                        groupId,
                        reader.GetGuid(1),
                        reader.GetString(2),
                        reader.GetBoolean(3),
                        reader.GetInt32(4),
                        reader.GetInt32(5),
                        []
                    ));
                }

                if (!reader.IsDBNull(6))
                {
                    groups[groupIndex].Choices.Add(new MenuItemOptionChoiceDto(
                        reader.GetGuid(6),
                        reader.GetGuid(7),
                        reader.GetString(8),
                        reader.GetDecimal(9),
                        reader.GetBoolean(10)
                    ));
                }
            }
        }

        return new MenuItemDetailDto(
            item.Id,
            item.CategoryId,
            item.Name,
            item.Description,
            item.Price,
            item.ImageUrl,
            item.IsAvailable,
            item.IsFeatured,
            item.DisplayOrder,
            groups
        );
    }
}

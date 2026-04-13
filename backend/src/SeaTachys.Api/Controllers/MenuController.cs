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
            .Where(c => c.IsActive)
            .OrderBy(c => c.DisplayOrder)
            .ToListAsync();
        return Ok(categories);
    }

    [HttpGet("items")]
    public async Task<IActionResult> GetItems()
    {
        var items = await _db.MenuItems
            .Include(i => i.OptionGroups)
            .ThenInclude(g => g.Choices)
            .Where(i => i.IsAvailable)
            .OrderBy(i => i.DisplayOrder)
            .ToListAsync();
        return Ok(items);
    }
}

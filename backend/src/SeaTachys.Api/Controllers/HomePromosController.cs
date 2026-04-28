using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SeaTachys.Domain.Entities;
using SeaTachys.Infrastructure.Persistence;

namespace SeaTachys.Api.Controllers;

[ApiController]
[Route("api/home/promos")]
public class HomePromosController : ControllerBase
{
    private readonly AppDbContext _db;

    public HomePromosController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetPromos()
    {
        var promos = await HomePromoSettingsStore.ReadAsync(_db);
        if (promos.Count > 0)
        {
            return Ok(promos);
        }

        return Ok(await HomePromoSettingsStore.BuildFallbackAsync(_db));
    }
}

[ApiController]
[Route("api/admin/home-promos")]
[Authorize(Roles = "admin")]
public class AdminHomePromosController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdminHomePromosController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetPromos()
    {
        var promos = await HomePromoSettingsStore.ReadAsync(_db);
        if (promos.Count > 0)
        {
            return Ok(promos);
        }

        return Ok(await HomePromoSettingsStore.BuildFallbackAsync(_db));
    }

    [HttpPut]
    public async Task<IActionResult> UpsertPromos([FromBody] UpdateHomePromosRequest request)
    {
        if (request.Slides.Count == 0)
        {
            return BadRequest("At least one promo slide is required.");
        }

        var normalized = request.Slides
            .OrderBy(slide => slide.Position)
            .Take(3)
            .Select(HomePromoSettingsStore.Normalize)
            .ToList();

        if (normalized.Any(slide =>
                string.IsNullOrWhiteSpace(slide.Badge) ||
                string.IsNullOrWhiteSpace(slide.Title) ||
                string.IsNullOrWhiteSpace(slide.StatLabel) ||
                string.IsNullOrWhiteSpace(slide.StatValue)))
        {
            return BadRequest("Badge, title, stat label, and stat value are required for every slide.");
        }

        var setting = await _db.StoreSettings.FirstOrDefaultAsync(s => s.Key == HomePromoSettingsStore.Key);

        if (setting == null)
        {
            setting = new StoreSetting
            {
                Id = Guid.NewGuid(),
                Key = HomePromoSettingsStore.Key,
                Description = "Customer home promo slider content"
            };
            _db.StoreSettings.Add(setting);
        }

        setting.Value = JsonSerializer.Serialize(normalized, HomePromoSettingsStore.JsonOptions);
        setting.UpdatedAt = DateTimeOffset.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(normalized);
    }
}

public record HomePromoSlideDto(
    int Position,
    string Badge,
    string Eyebrow,
    string Title,
    string Subtitle,
    string StatLabel,
    string StatValue,
    string? ImageUrl
);

public record UpdateHomePromosRequest(List<HomePromoSlideDto> Slides);

internal static class HomePromoSettingsStore
{
    internal const string Key = "home_promos";

    internal static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = false
    };

    internal static async Task<List<HomePromoSlideDto>> ReadAsync(AppDbContext db)
    {
        var raw = await db.StoreSettings
            .AsNoTracking()
            .Where(setting => setting.Key == Key)
            .Select(setting => setting.Value)
            .FirstOrDefaultAsync();

        if (string.IsNullOrWhiteSpace(raw))
        {
            return [];
        }

        try
        {
            var slides = JsonSerializer.Deserialize<List<HomePromoSlideDto>>(raw, JsonOptions);
            return slides?
                .OrderBy(slide => slide.Position)
                .Take(3)
                .Select(Normalize)
                .ToList() ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    internal static HomePromoSlideDto Normalize(HomePromoSlideDto slide) =>
        new(
            Math.Max(1, slide.Position),
            slide.Badge.Trim(),
            slide.Eyebrow.Trim(),
            slide.Title.Trim(),
            slide.Subtitle.Trim(),
            slide.StatLabel.Trim(),
            slide.StatValue.Trim(),
            string.IsNullOrWhiteSpace(slide.ImageUrl) ? null : slide.ImageUrl.Trim()
        );

    internal static async Task<List<HomePromoSlideDto>> BuildFallbackAsync(AppDbContext db)
    {
        var items = await db.MenuItems
            .AsNoTracking()
            .Where(item => item.IsAvailable)
            .OrderBy(item => item.DisplayOrder)
            .Select(item => new
            {
                item.Name,
                item.Description,
                item.Price,
                item.ImageUrl,
                item.IsFeatured
            })
            .ToListAsync();

        var featured = items.Where(item => item.IsFeatured).ToList();
        var spotlight = featured.FirstOrDefault() ?? items.FirstOrDefault();
        var limited = items.Skip(1).FirstOrDefault() ?? spotlight;

        return
        [
            new HomePromoSlideDto(
                1,
                "Discounts",
                "TODAY",
                "Fresh seafood deals",
                "Hot picks at lighter prices.",
                "Savings",
                "Up to 20%",
                null
            ),
            new HomePromoSlideDto(
                2,
                "Limited",
                "SMALL BATCH",
                limited?.Name ?? "Fresh picks",
                limited?.Description ?? "Small-batch menu for today.",
                "Starts at",
                limited is null ? "P199" : $"P{decimal.Truncate(limited.Price)}",
                limited?.ImageUrl
            ),
            new HomePromoSlideDto(
                3,
                "Featured",
                "CHEF PICK",
                spotlight?.Name ?? "Chef favorites",
                spotlight?.Description ?? "Popular picks ready to order.",
                "Featured",
                $"{Math.Max(featured.Count, 1)} live",
                spotlight?.ImageUrl
            )
        ];
    }
}

using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using SeaTachys.Domain.Entities;
using SeaTachys.Infrastructure.Persistence;

namespace SeaTachys.Api.Controllers;

[ApiController]
[Route("api/home/promos")]
[AllowAnonymous]
[EnableRateLimiting("public-read")]
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
[Route("api/home/banner")]
[AllowAnonymous]
[EnableRateLimiting("public-read")]
public class HomeBannerController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly DatabaseConnectionString _databaseConnectionString;

    public HomeBannerController(AppDbContext db, DatabaseConnectionString databaseConnectionString)
    {
        _db = db;
        _databaseConnectionString = databaseConnectionString;
    }

    [HttpGet]
    public async Task<IActionResult> GetBanner()
    {
        var banner = await HomeTopBannerSettingsStore.ReadAsync(
            _databaseConnectionString.Value,
            HttpContext.RequestAborted
        );
        if (banner is not null)
        {
            return Ok(banner);
        }

        return Ok(await HomeTopBannerSettingsStore.BuildFallbackAsync(_db));
    }
}

[ApiController]
[Route("api/admin/home-promos")]
[Authorize(Roles = "admin")]
public class AdminHomePromosController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly DatabaseConnectionString _databaseConnectionString;

    public AdminHomePromosController(AppDbContext db, DatabaseConnectionString databaseConnectionString)
    {
        _db = db;
        _databaseConnectionString = databaseConnectionString;
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

        await StoreSettingWriter.UpsertAsync(
            _db,
            _databaseConnectionString.Value,
            HomePromoSettingsStore.Key,
            JsonSerializer.Serialize(normalized, HomePromoSettingsStore.JsonOptions),
            "Customer home promo slider content",
            HttpContext.RequestAborted
        );

        return Ok(normalized);
    }
}

 [ApiController]
[Route("api/admin/home-banner")]
[Authorize(Roles = "admin")]
public class AdminHomeBannerController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly DatabaseConnectionString _databaseConnectionString;

    public AdminHomeBannerController(AppDbContext db, DatabaseConnectionString databaseConnectionString)
    {
        _db = db;
        _databaseConnectionString = databaseConnectionString;
    }

    [HttpGet]
    public async Task<IActionResult> GetBanner()
    {
        var banner = await HomeTopBannerSettingsStore.ReadAsync(
            _databaseConnectionString.Value,
            HttpContext.RequestAborted
        );
        if (banner is not null)
        {
            return Ok(banner);
        }

        return Ok(await HomeTopBannerSettingsStore.BuildFallbackAsync(_db));
    }

    [HttpPut]
    public async Task<IActionResult> UpsertBanner([FromBody] UpdateHomeTopBannerRequest request)
    {
        var normalized = HomeTopBannerSettingsStore.Normalize(request.Banner);

        if (string.IsNullOrWhiteSpace(normalized.Badge) ||
            string.IsNullOrWhiteSpace(normalized.Title) ||
            string.IsNullOrWhiteSpace(normalized.CtaLabel))
        {
            return BadRequest("Badge, title, and CTA label are required.");
        }

        await StoreSettingWriter.UpsertAsync(
            _db,
            _databaseConnectionString.Value,
            HomeTopBannerSettingsStore.Key,
            JsonSerializer.Serialize(normalized, HomePromoSettingsStore.JsonOptions),
            "Customer home top promo banner content",
            HttpContext.RequestAborted
        );

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

public record HomeTopBannerDto(
    string Badge,
    string Title,
    string CtaLabel,
    string AccentText,
    string? ImageUrl,
    int? DurationHours,
    DateTimeOffset? EndsAt
);

public record UpdateHomePromosRequest(List<HomePromoSlideDto> Slides);
public record UpdateHomeTopBannerRequest(HomeTopBannerDto Banner);
public sealed record DatabaseConnectionString(string Value);

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

internal static class HomeTopBannerSettingsStore
{
    internal const string Key = "home_top_banner";

    internal static async Task<HomeTopBannerDto?> ReadAsync(string connectionString, CancellationToken cancellationToken)
    {
        var raw = await StoreSettingReader.ReadValueAsync(connectionString, Key, cancellationToken);

        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        try
        {
            var banner = JsonSerializer.Deserialize<HomeTopBannerDto>(raw, HomePromoSettingsStore.JsonOptions);
            return banner is null ? null : Normalize(banner);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    internal static HomeTopBannerDto Normalize(HomeTopBannerDto banner) =>
        new(
            banner.Badge.Trim(),
            banner.Title.Trim(),
            banner.CtaLabel.Trim(),
            banner.AccentText.Trim(),
            string.IsNullOrWhiteSpace(banner.ImageUrl) ? null : banner.ImageUrl.Trim(),
            banner.DurationHours is > 0 ? banner.DurationHours : null,
            banner.EndsAt
        );

    internal static async Task<HomeTopBannerDto> BuildFallbackAsync(AppDbContext db)
    {
        return new HomeTopBannerDto(
            "PROMO",
            "30% off 12-month plan",
            "Subscribe now!",
            "Premium",
            null,
            null,
            null
        );
    }
}

internal static class StoreSettingReader
{
    internal static async Task<string?> ReadValueAsync(
        string connectionString,
        string key,
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

        await using var command = connection.CreateCommand();
        command.CommandTimeout = 8;
        command.CommandText = """
            SELECT value
            FROM store_settings
            WHERE key = @key
            LIMIT 1
            """;
        command.Parameters.AddWithValue("key", key);

        return await command.ExecuteScalarAsync(cancellationToken) as string;
    }
}

internal static class StoreSettingWriter
{
    internal static async Task UpsertAsync(
        AppDbContext db,
        string connectionString,
        string key,
        string value,
        string description,
        CancellationToken cancellationToken
    )
    {
        var id = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

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

        await using var command = connection.CreateCommand();
        command.CommandTimeout = 8;
        command.CommandText = """
            WITH updated AS (
                UPDATE store_settings
                SET value = @value,
                    description = @description,
                    updated_at = @updated_at
                WHERE key = @key
                RETURNING 1
            )
            INSERT INTO store_settings (id, key, value, description, updated_at)
            SELECT @id, @key, @value, @description, @updated_at
            WHERE NOT EXISTS (SELECT 1 FROM updated)
            """;
        command.Parameters.AddWithValue("id", id);
        command.Parameters.AddWithValue("key", key);
        command.Parameters.AddWithValue("value", value);
        command.Parameters.AddWithValue("description", description);
        command.Parameters.AddWithValue("updated_at", now);

        await command.ExecuteNonQueryAsync(cancellationToken);
    }
}

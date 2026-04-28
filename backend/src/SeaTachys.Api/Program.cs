using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using Npgsql.NameTranslation;
using SeaTachys.Domain.Enums;
using SeaTachys.Infrastructure.Persistence;
using System.Text;
using System.Text.Json.Serialization;

LoadDotEnv(Path.Combine(Directory.GetCurrentDirectory(), ".env"));

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers().AddJsonOptions(o => 
    o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var connString = ResolveConnectionString(builder.Configuration);
var jwtKey = builder.Configuration["Jwt:Key"];

if (string.IsNullOrWhiteSpace(connString))
{
    throw new InvalidOperationException(
        "Missing ConnectionStrings__Default or DATABASE_URL. Set it in the backend .env file or environment variables.");
}

if (string.IsNullOrWhiteSpace(jwtKey))
{
    throw new InvalidOperationException(
        "Missing Jwt__Key. Set it in the backend .env file or environment variables.");
}

builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(connString, npgsql =>
        npgsql.MapEnum<UserRole>("user_role")
              .MapEnum<OrderStatus>("order_status")
              .MapEnum<PaymentMethod>("payment_method")
              .MapEnum<PaymentStatus>("payment_status")
              .MapEnum<RiderStatus>("rider_status")
    ));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

if (builder.Configuration.GetValue<bool>("Database:ApplySchemaOnStartup"))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    // Useful when pointing the app at a brand-new Supabase database.
    await db.Database.EnsureCreatedAsync();
}

app.UseSwagger();
app.UseSwaggerUI();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();

static string? ResolveConnectionString(IConfiguration configuration)
{
    var raw = configuration.GetConnectionString("Default");

    if (string.IsNullOrWhiteSpace(raw))
    {
        raw = configuration["DATABASE_URL"];
    }

    if (string.IsNullOrWhiteSpace(raw))
    {
        return raw;
    }

    return NormalizeConnectionString(raw);
}

static string NormalizeConnectionString(string rawConnectionString)
{
    var trimmed = rawConnectionString.Trim().Trim('"', '\'');
    var builder = trimmed.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
                  trimmed.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase)
        ? BuildConnectionStringFromUri(trimmed)
        : new NpgsqlConnectionStringBuilder(trimmed);

    if (builder.SslMode == SslMode.Prefer && IsRemoteHost(builder.Host))
    {
        builder.SslMode = SslMode.Require;
    }

    return builder.ConnectionString;
}

static NpgsqlConnectionStringBuilder BuildConnectionStringFromUri(string uriString)
{
    var uri = new Uri(uriString);
    var userInfo = uri.UserInfo.Split(':', 2);
    var builder = new NpgsqlConnectionStringBuilder
    {
        Host = uri.Host,
        Port = uri.IsDefaultPort ? 5432 : uri.Port,
        Database = uri.AbsolutePath.Trim('/'),
        Username = userInfo.Length > 0 ? Uri.UnescapeDataString(userInfo[0]) : string.Empty,
        Password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty
    };

    foreach (var pair in uri.Query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
    {
        var parts = pair.Split('=', 2);
        var key = Uri.UnescapeDataString(parts[0]).Replace("_", " ").Trim().ToLowerInvariant();
        var value = parts.Length > 1 ? Uri.UnescapeDataString(parts[1]) : string.Empty;

        switch (key)
        {
            case "sslmode":
            case "ssl mode":
                if (Enum.TryParse<SslMode>(value, true, out var sslMode))
                {
                    builder.SslMode = sslMode;
                }
                break;
            case "trust server certificate":
                if (bool.TryParse(value, out var trustServerCertificate))
                {
                    builder.TrustServerCertificate = trustServerCertificate;
                }
                break;
            case "pooling":
                if (bool.TryParse(value, out var pooling))
                {
                    builder.Pooling = pooling;
                }
                break;
        }
    }

    return builder;
}

static bool IsRemoteHost(string? host) =>
    !string.IsNullOrWhiteSpace(host) &&
    !string.Equals(host, "localhost", StringComparison.OrdinalIgnoreCase) &&
    host != "127.0.0.1" &&
    host != "::1";

static void LoadDotEnv(string path)
{
    if (!File.Exists(path)) return;

    foreach (var rawLine in File.ReadAllLines(path))
    {
        var line = rawLine.Trim();

        if (string.IsNullOrWhiteSpace(line) || line.StartsWith('#'))
        {
            continue;
        }

        var separatorIndex = line.IndexOf('=');
        if (separatorIndex <= 0) continue;

        var key = line[..separatorIndex].Trim();
        var value = line[(separatorIndex + 1)..].Trim();

        if (string.IsNullOrWhiteSpace(key) || Environment.GetEnvironmentVariable(key) is not null)
        {
            continue;
        }

        if (value.Length >= 2 &&
            ((value.StartsWith('"') && value.EndsWith('"')) ||
             (value.StartsWith('\'') && value.EndsWith('\''))))
        {
            value = value[1..^1];
        }

        Environment.SetEnvironmentVariable(key, value);
    }
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using SeaTachys.Domain.Entities;
using SeaTachys.Domain.Enums;
using SeaTachys.Infrastructure.Persistence;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace SeaTachys.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _cfg;
    private readonly DatabaseConnectionString _databaseConnectionString;
    private readonly PasswordHasher<User> _hasher = new();

    public AuthController(AppDbContext db, IConfiguration cfg, DatabaseConnectionString databaseConnectionString)
    {
        _db = db;
        _cfg = cfg;
        _databaseConnectionString = databaseConnectionString;
    }

    [HttpPost("register")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Register(RegisterRequest req)
    {
        var normalizedEmail = req.Email.Trim().ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(req.FullName) ||
            string.IsNullOrWhiteSpace(normalizedEmail) ||
            string.IsNullOrWhiteSpace(req.Password))
        {
            return BadRequest("Full name, email, and password are required.");
        }

        if (req.Password.Length < 8)
        {
            return BadRequest("Password must be at least 8 characters.");
        }

        var exists = await _db.Users.AnyAsync(u => u.Email == normalizedEmail);
        if (exists) return BadRequest("Email already in use.");

        var user = new User
        {
            Id = Guid.CreateVersion7(),
            FullName = req.FullName.Trim(),
            Email = normalizedEmail,
            PhoneNumber = req.PhoneNumber,
            Role = UserRole.customer,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        user.PasswordHash = _hasher.HashPassword(user, req.Password);

        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return Ok(new { user.Id, user.FullName, user.Email });
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Login(LoginRequest req)
    {
        var normalizedEmail = req.Email.Trim().ToLowerInvariant();
        var user = await AuthUserReader.FindByEmailAsync(_databaseConnectionString.Value, normalizedEmail, HttpContext.RequestAborted);
        if (user == null) return Unauthorized("Invalid credentials.");
        if (!user.IsActive) return Unauthorized("This account is inactive.");

        var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, req.Password);
        if (result == PasswordVerificationResult.Failed) return Unauthorized("Invalid credentials.");

        var token = GenerateJwt(user, DateTime.UtcNow.AddDays(7));
        return Ok(new AuthResponseDto(
            token,
            user.Id,
            user.FullName,
            user.Email,
            user.Role.ToString()));
    }

    [HttpPost("lookup-email")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> LookupEmail(EmailLookupRequest req)
    {
        var normalizedEmail = req.Email.Trim().ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(normalizedEmail))
        {
            return BadRequest("Email is required.");
        }

        var user = await AuthUserReader.FindByEmailAsync(_databaseConnectionString.Value, normalizedEmail, HttpContext.RequestAborted);

        if (user == null)
        {
            return NotFound("No account found for this email.");
        }

        if (!user.IsActive)
        {
            return Unauthorized("This account is inactive.");
        }

        return Ok(new EmailLookupResponseDto(
            user.Id,
            user.FullName,
            user.Email,
            user.Role.ToString()));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        var email = User.FindFirstValue(ClaimTypes.Email)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Email);
        var role = User.FindFirstValue(ClaimTypes.Role);

        var user = await _db.Users.FindAsync(Guid.Parse(userId!));
        if (user == null || !user.IsActive) return Unauthorized();

        return Ok(new { userId, email, role, fullName = user?.FullName });
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest req)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await _db.Users.FindAsync(Guid.Parse(userId!));
        if (user == null || !user.IsActive) return Unauthorized();

        var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, req.CurrentPassword);
        if (result == PasswordVerificationResult.Failed)
            return BadRequest("Current password is incorrect.");

        if (req.NewPassword.Length < 8)
            return BadRequest("Password must be at least 8 characters.");

        user.PasswordHash = _hasher.HashPassword(user, req.NewPassword);
        user.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    private string GenerateJwt(User user, DateTime expiresAtUtc)
    {
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim("full_name", user.FullName)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_cfg["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _cfg["Jwt:Issuer"],
            audience: _cfg["Jwt:Audience"],
            claims: claims,
            expires: expiresAtUtc,
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

public record RegisterRequest(string FullName, string Email, string Password, string? PhoneNumber);
public record LoginRequest(string Email, string Password);
public record EmailLookupRequest(string Email);
public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
public record EmailLookupResponseDto(Guid UserId, string FullName, string Email, string Role);
public record AuthResponseDto(string Token, Guid UserId, string FullName, string Email, string Role);

internal static class AuthUserReader
{
    internal static async Task<User?> FindByEmailAsync(
        string connectionString,
        string email,
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
            SELECT id, full_name, email, password_hash, role::text, is_active
            FROM users
            WHERE email = @email
            LIMIT 1
            """;
        command.Parameters.AddWithValue("email", email);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return new User
        {
            Id = reader.GetGuid(0),
            FullName = reader.GetString(1),
            Email = reader.GetString(2),
            PasswordHash = reader.GetString(3),
            Role = Enum.Parse<UserRole>(reader.GetString(4), ignoreCase: true),
            IsActive = reader.GetBoolean(5)
        };
    }
}

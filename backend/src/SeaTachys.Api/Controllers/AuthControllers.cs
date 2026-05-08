using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SeaTachys.Domain.Entities;
using SeaTachys.Domain.Enums;
using SeaTachys.Infrastructure.Persistence;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Cryptography;
using System.Security.Claims;
using System.Text;

namespace SeaTachys.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _cfg;
    private readonly PasswordHasher<User> _hasher = new();

    public AuthController(AppDbContext db, IConfiguration cfg)
    {
        _db = db;
        _cfg = cfg;
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
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);
        if (user == null) return Unauthorized("Invalid credentials.");
        if (!user.IsActive) return Unauthorized("This account is inactive.");

        var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, req.Password);
        if (result == PasswordVerificationResult.Failed) return Unauthorized("Invalid credentials.");

        var response = await IssueTokensAsync(user);
        return Ok(response);
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Refresh(RefreshRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.RefreshToken))
        {
            return BadRequest("Refresh token is required.");
        }

        var hashedToken = HashRefreshToken(req.RefreshToken);
        var existing = await _db.RefreshTokens
            .Include(token => token.User)
            .FirstOrDefaultAsync(token => token.Token == hashedToken);

        if (existing == null || existing.RevokedAt != null || existing.ExpiresAt <= DateTimeOffset.UtcNow)
        {
            return Unauthorized("Refresh token is invalid or expired.");
        }

        if (existing.User == null || !existing.User.IsActive)
        {
            return Unauthorized("This account is inactive.");
        }

        existing.RevokedAt = DateTimeOffset.UtcNow;
        var response = await IssueTokensAsync(existing.User);
        await _db.SaveChangesAsync();

        return Ok(response);
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout(LogoutRequest req)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        var activeTokens = await _db.RefreshTokens
            .Where(token =>
                token.UserId == Guid.Parse(userId) &&
                token.RevokedAt == null)
            .ToListAsync();

        if (activeTokens.Count > 0)
        {
            foreach (var token in activeTokens)
            {
                token.RevokedAt = DateTimeOffset.UtcNow;
            }

            await _db.SaveChangesAsync();
        }

        return NoContent();
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var email = User.FindFirstValue(ClaimTypes.Email);
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

    private async Task<AuthResponseDto> IssueTokensAsync(User user)
    {
        await RevokeExpiredRefreshTokensAsync(user.Id);

        var accessTokenExpiresAt = DateTimeOffset.UtcNow.AddMinutes(_cfg.GetValue<int?>("Auth:AccessTokenMinutes") ?? 15);
        var refreshTokenExpiresAt = DateTimeOffset.UtcNow.AddDays(_cfg.GetValue<int?>("Auth:RefreshTokenDays") ?? 30);
        var rawRefreshToken = GenerateRefreshToken();

        _db.RefreshTokens.Add(new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Token = HashRefreshToken(rawRefreshToken),
            CreatedAt = DateTimeOffset.UtcNow,
            ExpiresAt = refreshTokenExpiresAt
        });

        await _db.SaveChangesAsync();

        var accessToken = GenerateJwt(user, accessTokenExpiresAt.UtcDateTime);
        return new AuthResponseDto(
            accessToken,
            accessToken,
            rawRefreshToken,
            accessTokenExpiresAt,
            refreshTokenExpiresAt
        );
    }

    private async Task RevokeExpiredRefreshTokensAsync(Guid userId)
    {
        var expiredTokens = await _db.RefreshTokens
            .Where(token =>
                token.UserId == userId &&
                token.RevokedAt == null &&
                token.ExpiresAt <= DateTimeOffset.UtcNow)
            .ToListAsync();

        if (expiredTokens.Count == 0)
        {
            return;
        }

        foreach (var token in expiredTokens)
        {
            token.RevokedAt = DateTimeOffset.UtcNow;
        }
    }

    private string GenerateJwt(User user, DateTime expiresAtUtc)
    {
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email)
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

    private static string GenerateRefreshToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes);
    }

    private static string HashRefreshToken(string refreshToken)
    {
        var bytes = Encoding.UTF8.GetBytes(refreshToken);
        var hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}

public record RegisterRequest(string FullName, string Email, string Password, string? PhoneNumber);
public record LoginRequest(string Email, string Password);
public record RefreshRequest(string RefreshToken);
public record LogoutRequest(string? RefreshToken);
public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
public record AuthResponseDto(
    string Token,
    string AccessToken,
    string RefreshToken,
    DateTimeOffset AccessTokenExpiresAt,
    DateTimeOffset RefreshTokenExpiresAt
);

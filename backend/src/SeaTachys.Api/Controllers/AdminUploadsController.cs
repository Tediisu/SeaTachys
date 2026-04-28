using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace SeaTachys.Api.Controllers;

[ApiController]
[Route("api/admin/uploads")]
[Authorize(Roles = "admin")]
public class AdminUploadsController : ControllerBase
{
    private readonly IConfiguration _configuration;

    public AdminUploadsController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    [HttpPost("cloudinary-signature")]
    public IActionResult CreateCloudinarySignature([FromBody] CreateCloudinarySignatureRequest? req)
    {
        var cloudName = _configuration["Cloudinary:CloudName"];
        var apiKey = _configuration["Cloudinary:ApiKey"];
        var apiSecret = _configuration["Cloudinary:ApiSecret"];
        var baseFolder = _configuration["Cloudinary:Folder"] ?? "seatachys";

        if (string.IsNullOrWhiteSpace(cloudName) ||
            string.IsNullOrWhiteSpace(apiKey) ||
            string.IsNullOrWhiteSpace(apiSecret))
        {
            return StatusCode(StatusCodes.Status500InternalServerError,
                "Cloudinary is not configured on the backend.");
        }

        var targetFolder = req?.Kind?.Trim().ToLowerInvariant() switch
        {
            "category" => $"{baseFolder}/categories",
            "promo" => $"{baseFolder}/promos",
            _ => $"{baseFolder}/products"
        };

        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var signaturePayload = $"folder={targetFolder}&timestamp={timestamp}{apiSecret}";
        var signature = ComputeSha1(signaturePayload);

        return Ok(new CloudinarySignatureDto(
            cloudName,
            apiKey,
            targetFolder,
            timestamp,
            signature
        ));
    }

    private static string ComputeSha1(string input)
    {
        var bytes = Encoding.UTF8.GetBytes(input);
        var hash = SHA1.HashData(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}

public record CreateCloudinarySignatureRequest(string Kind);

public record CloudinarySignatureDto(
    string CloudName,
    string ApiKey,
    string Folder,
    long Timestamp,
    string Signature
);

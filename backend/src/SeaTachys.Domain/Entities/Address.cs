using SeaTachys.Domain.Enums;

namespace SeaTachys.Domain.Entities;

public class Address
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string? Label { get; set; }
    public string Street { get; set; } = "";
    public string? Barangay { get; set; }
    public string City { get; set; } = "Cebu City";
    public string? Province { get; set; } = "Cebu";
    public string? ZipCode { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public bool IsDefault { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public User User { get; set; } = null!;
}
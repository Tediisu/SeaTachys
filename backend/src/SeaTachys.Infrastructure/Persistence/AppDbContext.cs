using Microsoft.EntityFrameworkCore;
using SeaTachys.Domain.Entities;
using SeaTachys.Domain.Enums;

namespace SeaTachys.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) {}

    public DbSet<User> Users => Set<User>();
    public DbSet<Address> Addresses => Set<Address>();
    public DbSet<MenuCategory> MenuCategories => Set<MenuCategory>();
    public DbSet<MenuItem> MenuItems => Set<MenuItem>();
    public DbSet<MenuItemOptionGroup> MenuItemOptionGroups => Set<MenuItemOptionGroup>();
    public DbSet<MenuItemOptionChoice> MenuItemOptionChoices => Set<MenuItemOptionChoice>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<OrderItemOption> OrderItemOptions => Set<OrderItemOption>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.HasPostgresEnum<UserRole>("user_role");
        b.HasPostgresEnum<OrderStatus>("order_status");
        b.HasPostgresEnum<PaymentMethod>("payment_method");
        b.HasPostgresEnum<PaymentStatus>("payment_status");
        b.HasPostgresEnum<RiderStatus>("rider_status");

        b.Entity<User>(e =>
        {
            e.ToTable("users");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.FullName).HasColumnName("full_name");
            e.Property(x => x.Email).HasColumnName("email");
            e.Property(x => x.PhoneNumber).HasColumnName("phone_number");
            e.Property(x => x.PasswordHash).HasColumnName("password_hash");
            e.Property(x => x.Role).HasColumnName("role").HasColumnType("user_role");
            e.Property(x => x.ProfileImage).HasColumnName("profile_image");
            e.Property(x => x.IsVerified).HasColumnName("is_verified");
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        });

        b.Entity<Address>(e =>
        {
            e.ToTable("addresses");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.Label).HasColumnName("label");
            e.Property(x => x.Street).HasColumnName("street");
            e.Property(x => x.Barangay).HasColumnName("barangay");
            e.Property(x => x.City).HasColumnName("city");
            e.Property(x => x.Province).HasColumnName("province");
            e.Property(x => x.ZipCode).HasColumnName("zip_code");
            e.Property(x => x.Latitude).HasColumnName("latitude");
            e.Property(x => x.Longitude).HasColumnName("longitude");
            e.Property(x => x.IsDefault).HasColumnName("is_default");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.HasOne(x => x.User).WithMany(x => x.Addresses).HasForeignKey(x => x.UserId);
        });

        b.Entity<MenuCategory>(e =>
        {
            e.ToTable("menu_categories");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Name).HasColumnName("name");
            e.Property(x => x.Description).HasColumnName("description");
            e.Property(x => x.ImageUrl).HasColumnName("image_url");
            e.Property(x => x.DisplayOrder).HasColumnName("display_order");
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });

        b.Entity<MenuItem>(e =>
        {
            e.ToTable("menu_items");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CategoryId).HasColumnName("category_id");
            e.Property(x => x.Name).HasColumnName("name");
            e.Property(x => x.Description).HasColumnName("description");
            e.Property(x => x.Price).HasColumnName("price");
            e.Property(x => x.ImageUrl).HasColumnName("image_url");
            e.Property(x => x.IsAvailable).HasColumnName("is_available");
            e.Property(x => x.IsFeatured).HasColumnName("is_featured");
            e.Property(x => x.DisplayOrder).HasColumnName("display_order");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.HasOne(x => x.Category).WithMany(x => x.Items).HasForeignKey(x => x.CategoryId);
        });

        b.Entity<MenuItemOptionGroup>(e =>
        {
            e.ToTable("menu_item_option_groups");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.MenuItemId).HasColumnName("menu_item_id");
            e.Property(x => x.Label).HasColumnName("label");
            e.Property(x => x.IsRequired).HasColumnName("is_required");
            e.Property(x => x.MaxSelections).HasColumnName("max_selections");
            e.Property(x => x.DisplayOrder).HasColumnName("display_order");
            e.HasOne(x => x.MenuItem).WithMany(x => x.OptionGroups).HasForeignKey(x => x.MenuItemId);
        });

        b.Entity<MenuItemOptionChoice>(e =>
        {
            e.ToTable("menu_item_option_choices");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.GroupId).HasColumnName("group_id");
            e.Property(x => x.Name).HasColumnName("name");
            e.Property(x => x.AdditionalPrice).HasColumnName("additional_price");
            e.Property(x => x.IsAvailable).HasColumnName("is_available");
            e.HasOne(x => x.Group).WithMany(x => x.Choices).HasForeignKey(x => x.GroupId);
        });

        b.Entity<Order>(e =>
        {
            e.ToTable("orders");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.OrderNumber).HasColumnName("order_number").ValueGeneratedOnAdd();
            e.Property(x => x.CustomerId).HasColumnName("customer_id");
            e.Property(x => x.RiderId).HasColumnName("rider_id");
            e.Property(x => x.Status).HasColumnName("status").HasColumnType("order_status");
            e.Property(x => x.DeliveryStreet).HasColumnName("delivery_street");
            e.Property(x => x.DeliveryBarangay).HasColumnName("delivery_barangay");
            e.Property(x => x.DeliveryCity).HasColumnName("delivery_city");
            e.Property(x => x.DeliveryLat).HasColumnName("delivery_lat");
            e.Property(x => x.DeliveryLng).HasColumnName("delivery_lng");
            e.Property(x => x.Subtotal).HasColumnName("subtotal");
            e.Property(x => x.DeliveryFee).HasColumnName("delivery_fee");
            e.Property(x => x.DiscountAmount).HasColumnName("discount_amount");
            e.Property(x => x.TotalAmount).HasColumnName("total_amount");
            e.Property(x => x.CustomerNote).HasColumnName("customer_note");
            e.Property(x => x.CancellationReason).HasColumnName("cancellation_reason");
            e.Property(x => x.PlacedAt).HasColumnName("placed_at");
            e.Property(x => x.ConfirmedAt).HasColumnName("confirmed_at");
            e.Property(x => x.ReadyAt).HasColumnName("ready_at");
            e.Property(x => x.PickedUpAt).HasColumnName("picked_up_at");
            e.Property(x => x.DeliveredAt).HasColumnName("delivered_at");
            e.Property(x => x.CancelledAt).HasColumnName("cancelled_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        });

        b.Entity<OrderItem>(e =>
        {
            e.ToTable("order_items");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.OrderId).HasColumnName("order_id");
            e.Property(x => x.MenuItemId).HasColumnName("menu_item_id");
            e.Property(x => x.ItemName).HasColumnName("item_name");
            e.Property(x => x.UnitPrice).HasColumnName("unit_price");
            e.Property(x => x.Quantity).HasColumnName("quantity");
            e.Property(x => x.Subtotal).HasColumnName("subtotal");
            e.Property(x => x.SpecialInstructions).HasColumnName("special_instructions");
            e.HasOne(x => x.Order).WithMany(x => x.Items).HasForeignKey(x => x.OrderId);
        });

        b.Entity<OrderItemOption>(e =>
        {
            e.ToTable("order_item_options");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.OrderItemId).HasColumnName("order_item_id");
            e.Property(x => x.GroupLabel).HasColumnName("group_label");
            e.Property(x => x.ChoiceName).HasColumnName("choice_name");
            e.Property(x => x.AdditionalPrice).HasColumnName("additional_price");
            e.HasOne(x => x.OrderItem).WithMany(x => x.Options).HasForeignKey(x => x.OrderItemId);
        });
    }
}

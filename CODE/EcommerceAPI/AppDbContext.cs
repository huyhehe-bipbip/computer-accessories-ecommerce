
using Microsoft.EntityFrameworkCore;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    // Bảng danh mục
    public DbSet<Category> categories { get; set; }

    // Bảng sản phẩm
    public DbSet<Product> products { get; set; }

    // Bảng người dùng Member
    public DbSet<User> users { get; set; }

    // Bảng đơn hàng
    public DbSet<Order> orders { get; set; }

    // Bảng chi tiết đơn hàng
    public DbSet<OrderItem> order_items { get; set; }
}

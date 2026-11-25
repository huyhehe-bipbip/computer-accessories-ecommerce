using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("products")]
public class Product
{
    [Key]
    public int product_id { get; set; }

    [Required]
    [MaxLength(200)]
    public string product_name { get; set; } = string.Empty;

    public string? description { get; set; }

    [MaxLength(500)]
    public string? image_url { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal guest_price { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal member_price { get; set; }

    public int stock_quantity { get; set; }

    public int category_id { get; set; }
}
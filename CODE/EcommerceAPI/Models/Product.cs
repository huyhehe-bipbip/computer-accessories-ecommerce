using System.ComponentModel.DataAnnotations;

public class Product
{
    [Key]
    public int product_id { get; set; }
    public string product_name { get; set; } = string.Empty;
    public string? description { get; set; }
    public string? image_url { get; set; }
    public decimal guest_price { get; set; }
    public decimal member_price { get; set; }
    public int stock_quantity { get; set; }
    public int category_id { get; set; }
}

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("order_items")]
public class OrderItem
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int order_item_id { get; set; }

    public int? order_id { get; set; }

    public int? product_id { get; set; }

    public int quantity { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal unit_price { get; set; }
}

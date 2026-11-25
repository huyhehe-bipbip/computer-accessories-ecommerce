
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("orders")]
public class Order
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int order_id { get; set; }

    [Required]
    [MaxLength(100)]
    public string customer_name { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string phone_number { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string shipping_address { get; set; } = string.Empty;

    [Column(TypeName = "decimal(18,2)")]
    public decimal total_amount { get; set; }

    [MaxLength(50)]
    public string? order_status { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? created_at { get; set; }
}

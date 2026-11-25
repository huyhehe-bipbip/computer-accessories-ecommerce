using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("categories")]
public class Category
{
    [Key]
    public int category_id { get; set; }

    [Required]
    [MaxLength(100)]
    public string category_name { get; set; } = string.Empty;
}
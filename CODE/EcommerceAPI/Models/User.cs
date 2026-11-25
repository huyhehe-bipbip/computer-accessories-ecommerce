using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("users")]
public class User
{
    [Key]
    public int user_id { get; set; }

    [Required]
    [MaxLength(100)]
    public string full_name { get; set; } = string.Empty;

    [Required]
    [MaxLength(150)]
    public string email { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    public string password_hash { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? phone_number { get; set; }

    public DateTime? created_at { get; set; } = DateTime.Now;

    // Phan quyen tai khoan
    [Required]
    [MaxLength(20)]
    public string role { get; set; } = "Member";
}
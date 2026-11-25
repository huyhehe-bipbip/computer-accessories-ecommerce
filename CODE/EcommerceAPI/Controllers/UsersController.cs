
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.ComponentModel.DataAnnotations;
using System.Text;

[Route("api/[controller]")]
[ApiController]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;

    private readonly PasswordHasher<User> _passwordHasher = new();

    public UsersController(
        AppDbContext context,
        IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    // ==========================================
    // 1. REGISTER - DANG KY MEMBER
    // POST: api/users/register
    // ==========================================
    [HttpPost("register")]
    public async Task<IActionResult> Register(
        [FromBody] RegisterRequest request)
    {
        if (request == null ||
            string.IsNullOrWhiteSpace(request.full_name) ||
            string.IsNullOrWhiteSpace(request.email) ||
            string.IsNullOrWhiteSpace(request.password))
        {
            return BadRequest(new
            {
                message = "Vui long nhap day du thong tin."
            });
        }

        var fullName = request.full_name.Trim();
        var email = request.email.Trim().ToLowerInvariant();
        var phoneNumber = request.phone_number?.Trim();

        // Kiem tra do dai thong tin
        if (fullName.Length > 100 ||
            email.Length > 150 ||
            (phoneNumber != null && phoneNumber.Length > 20))
        {
            return BadRequest(new
            {
                message = "Thong tin vuot qua do dai cho phep."
            });
        }

        // Kiem tra dinh dang email
        if (!new EmailAddressAttribute().IsValid(email))
        {
            return BadRequest(new
            {
                message = "Email khong hop le."
            });
        }

        // Kiem tra do dai mat khau
        if (request.password.Length < 8 ||
            request.password.Length > 128)
        {
            return BadRequest(new
            {
                message = "Mat khau phai tu 8 den 128 ky tu."
            });
        }

        // Kiem tra email da ton tai
        var existingUser = await _context.users
            .FirstOrDefaultAsync(u => u.email == email);

        if (existingUser != null)
        {
            return BadRequest(new
            {
                message = "Email da duoc su dung."
            });
        }

        // Tao tai khoan Member
        var user = new User
        {
            full_name = fullName,
            email = email,
            phone_number = phoneNumber,
            created_at = DateTime.Now,
            role = "Member"
        };

        // Bam mat khau bang PasswordHasher
        user.password_hash = _passwordHasher.HashPassword(
            user,
            request.password
        );

        _context.users.Add(user);

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            if (await _context.users.AnyAsync(
                u => u.email == email))
            {
                return BadRequest(new
                {
                    message = "Email da duoc su dung."
                });
            }

            throw;
        }

        return Ok(new
        {
            message = "Dang ky tai khoan thanh cong.",
            user_id = user.user_id,
            full_name = user.full_name,
            email = user.email,
            role = user.role
        });
    }

    // ==========================================
    // 2. LOGIN - DANG NHAP VA TAO JWT TOKEN
    // POST: api/users/login
    // ==========================================
    [HttpPost("login")]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequest request)
    {
        if (request == null ||
            string.IsNullOrWhiteSpace(request.email) ||
            string.IsNullOrWhiteSpace(request.password))
        {
            return BadRequest(new
            {
                message = "Vui long nhap email va mat khau."
            });
        }

        var email = request.email.Trim().ToLowerInvariant();

        var user = await _context.users
            .FirstOrDefaultAsync(u => u.email == email);

        if (user == null)
        {
            return Unauthorized(new
            {
                message = "Email hoac mat khau khong chinh xac."
            });
        }

        // Kiem tra mat khau SHA256 cu
        if (user.password_hash.Length == 64 &&
            user.password_hash.All(Uri.IsHexDigit))
        {
            var oldHash = SHA256.HashData(
                Encoding.UTF8.GetBytes(request.password)
            );

            var storedHash = Convert.FromHexString(
                user.password_hash
            );

            if (!CryptographicOperations.FixedTimeEquals(
                oldHash, storedHash))
            {
                return Unauthorized(new
                {
                    message = "Email hoac mat khau khong chinh xac."
                });
            }

            // Tu dong nang cap mat khau cu
            user.password_hash = _passwordHasher.HashPassword(
                user,
                request.password
            );

            await _context.SaveChangesAsync();
        }
        else
        {
            // Kiem tra mat khau theo phuong phap moi
            PasswordVerificationResult result;

            try
            {
                result = _passwordHasher.VerifyHashedPassword(
                    user,
                    user.password_hash,
                    request.password
                );
            }
            catch (FormatException)
            {
                result = PasswordVerificationResult.Failed;
            }

            if (result == PasswordVerificationResult.Failed)
            {
                return Unauthorized(new
                {
                    message = "Email hoac mat khau khong chinh xac."
                });
            }

            // Nang cap hash neu can thiet
            if (result ==
                PasswordVerificationResult.SuccessRehashNeeded)
            {
                user.password_hash = _passwordHasher.HashPassword(
                    user,
                    request.password
                );

                await _context.SaveChangesAsync();
            }
        }

        // Tao JWT Token
        var token = GenerateJwtToken(user);

        return Ok(new
        {
            message = "Dang nhap thanh cong.",
            user_id = user.user_id,
            full_name = user.full_name,
            email = user.email,
            role = user.role,
            token = token
        });
    }

    // ==========================================
    // 3. PROFILE - KIEM TRA TOKEN
    // GET: api/users/profile
    // ==========================================
    [HttpGet("profile")]
    [Authorize]
    public IActionResult GetProfile()
    {
        return Ok(new
        {
            message = "Xac thuc Token thanh cong.",

            user_id = User.FindFirst(
                ClaimTypes.NameIdentifier)?.Value,

            full_name = User.Identity?.Name,

            email = User.FindFirst(
                ClaimTypes.Email)?.Value,

            role = User.FindFirst(
                ClaimTypes.Role)?.Value
        });
    }

    // ==========================================
    // 4. GENERATE JWT TOKEN
    // ==========================================
    private string GenerateJwtToken(User user)
    {
        var key = _configuration["Jwt:Key"]
            ?? throw new InvalidOperationException(
                "Thieu cau hinh Jwt:Key"
            );

        var issuer = _configuration["Jwt:Issuer"];
        var audience = _configuration["Jwt:Audience"];

        var claims = new[]
        {
            new Claim(
                ClaimTypes.NameIdentifier,
                user.user_id.ToString()
            ),

            new Claim(
                ClaimTypes.Name,
                user.full_name
            ),

            new Claim(
                ClaimTypes.Email,
                user.email
            ),

            new Claim(
                ClaimTypes.Role,
                user.role
            )
        };

        var securityKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(key)
        );

        var credentials = new SigningCredentials(
            securityKey,
            SecurityAlgorithms.HmacSha256
        );

        var expires = DateTime.UtcNow.AddMinutes(
            _configuration.GetValue<int>(
                "Jwt:ExpiresInMinutes", 60
            )
        );

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: expires,
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler()
            .WriteToken(token);
    }
}

// ==========================================
// REGISTER REQUEST
// ==========================================
public class RegisterRequest
{
    public string full_name { get; set; } = string.Empty;

    public string email { get; set; } = string.Empty;

    public string password { get; set; } = string.Empty;

    public string? phone_number { get; set; }
}

// ==========================================
// LOGIN REQUEST
// ==========================================
public class LoginRequest
{
    public string email { get; set; } = string.Empty;

    public string password { get; set; } = string.Empty;
}


using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

[Route("api/[controller]")]
[ApiController]
public class ProductsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IWebHostEnvironment _environment;

    public ProductsController(
        AppDbContext context,
        IWebHostEnvironment environment)
    {
        _context = context;
        _environment = environment;
    }

    // ==========================================
    // 1. LAY DANH SACH SAN PHAM
    // GET: api/products
    // ==========================================
    [HttpGet]
    public async Task<IActionResult> GetProducts()
    {
        bool isMember = User.IsInRole("Member");

        var products = await _context.products
            .Select(p => new
            {
                product_id = p.product_id,
                product_name = p.product_name,
                description = p.description,
                image_url = p.image_url,
                guest_price = p.guest_price,
                member_price = p.member_price,
                display_price = isMember
                    ? p.member_price
                    : p.guest_price,
                stock_quantity = p.stock_quantity,
                category_id = p.category_id
            })
            .ToListAsync();

        return Ok(products);
    }

    // ==========================================
    // 2. CHI TIET SAN PHAM
    // GET: api/products/{id}
    // ==========================================
    [HttpGet("{id}")]
    public async Task<IActionResult> GetProductById(int id)
    {
        bool isMember = User.IsInRole("Member");

        var product = await _context.products
            .Where(p => p.product_id == id)
            .Select(p => new
            {
                product_id = p.product_id,
                product_name = p.product_name,
                description = p.description,
                image_url = p.image_url,
                guest_price = p.guest_price,
                member_price = p.member_price,
                display_price = isMember
                    ? p.member_price
                    : p.guest_price,
                stock_quantity = p.stock_quantity,
                category_id = p.category_id
            })
            .FirstOrDefaultAsync();

        if (product == null)
            return NotFound(new { message = "Khong tim thay san pham." });

        return Ok(product);
    }

    // ==========================================
    // 3. THEM SAN PHAM - ADMIN
    // POST: api/products
    // ==========================================
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateProduct(
        [FromBody] Product product)
    {
        if (product == null ||
            string.IsNullOrWhiteSpace(product.product_name))
        {
            return BadRequest(new
            {
                message = "Vui long nhap ten san pham."
            });
        }

        if (product.guest_price < 0 ||
            product.member_price < 0 ||
            product.stock_quantity < 0)
        {
            return BadRequest(new
            {
                message = "Gia va so luong khong duoc am."
            });
        }

        bool categoryExists = await _context.categories
            .AnyAsync(c => c.category_id == product.category_id);

        if (!categoryExists)
            return BadRequest(new { message = "Danh muc khong ton tai." });

        product.product_id = 0;

        _context.products.Add(product);
        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetProductById),
            new { id = product.product_id },
            new
            {
                message = "Them san pham thanh cong.",
                product_id = product.product_id
            });
    }

    // ==========================================
    // 4. CAP NHAT SAN PHAM - ADMIN
    // PUT: api/products/{id}
    // ==========================================
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateProduct(
        int id,
        [FromBody] Product request)
    {
        if (request == null ||
            string.IsNullOrWhiteSpace(request.product_name))
        {
            return BadRequest(new
            {
                message = "Vui long nhap ten san pham."
            });
        }

        if (request.guest_price < 0 ||
            request.member_price < 0 ||
            request.stock_quantity < 0)
        {
            return BadRequest(new
            {
                message = "Gia va so luong khong duoc am."
            });
        }

        var product = await _context.products
            .FirstOrDefaultAsync(p => p.product_id == id);

        if (product == null)
            return NotFound(new { message = "Khong tim thay san pham." });

        bool categoryExists = await _context.categories
            .AnyAsync(c => c.category_id == request.category_id);

        if (!categoryExists)
            return BadRequest(new { message = "Danh muc khong ton tai." });

        product.product_name = request.product_name.Trim();
        product.description = request.description;
        product.image_url = request.image_url;
        product.guest_price = request.guest_price;
        product.member_price = request.member_price;
        product.stock_quantity = request.stock_quantity;
        product.category_id = request.category_id;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Cap nhat san pham thanh cong."
        });
    }

    // ==========================================
    // 5. TAI ANH SAN PHAM - CHI ADMIN
    // POST: api/products/{id}/image
    // Form field: image
    // ==========================================
    [HttpPost("{id}/image")]
    [Authorize(Roles = "Admin")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadProductImage(
        int id,
        IFormFile image)
    {
        var product = await _context.products
            .FirstOrDefaultAsync(p => p.product_id == id);

        if (product == null)
        {
            return NotFound(new
            {
                message = "Khong tim thay san pham."
            });
        }

        if (image == null || image.Length == 0)
        {
            return BadRequest(new
            {
                message = "Vui long chon anh."
            });
        }

        // Gioi han dung luong 5 MB
        if (image.Length > 5 * 1024 * 1024)
        {
            return BadRequest(new
            {
                message = "Anh khong duoc vuot qua 5 MB."
            });
        }

        // Chi cho phep cac dinh dang anh thong dung
        var allowedExtensions = new[]
        {
            ".jpg", ".jpeg", ".png", ".webp"
        };

        string extension = Path.GetExtension(image.FileName)
            .ToLowerInvariant();

        if (!allowedExtensions.Contains(extension))
        {
            return BadRequest(new
            {
                message = "Chi chap nhan JPG, JPEG, PNG va WEBP."
            });
        }

        string imageFolder = Path.Combine(
            _environment.WebRootPath ?? Path.Combine(_environment.ContentRootPath, "wwwroot"),
            "images"
        );

        Directory.CreateDirectory(imageFolder);

        // Tao ten file ngau nhien de tranh trung ten
        string fileName = $"{Guid.NewGuid()}{extension}";

        string filePath = Path.Combine(imageFolder, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await image.CopyToAsync(stream);
        }

        // Xoa anh cu neu anh cu nam trong thu muc images
        if (!string.IsNullOrWhiteSpace(product.image_url))
        {
            string oldFileName = Path.GetFileName(
                product.image_url
            );

            string oldFilePath = Path.Combine(
                imageFolder,
                oldFileName
            );

            if (System.IO.File.Exists(oldFilePath))
            {
                System.IO.File.Delete(oldFilePath);
            }
        }

        // Luu duong dan anh vao SQL Server
        product.image_url = $"/images/{fileName}";

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Tai anh san pham thanh cong.",
            product_id = product.product_id,
            image_url = product.image_url
        });
    }

    // ==========================================
    // 6. XOA SAN PHAM - ADMIN
    // DELETE: api/products/{id}
    // ==========================================
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteProduct(int id)
    {
        var product = await _context.products
            .FirstOrDefaultAsync(p => p.product_id == id);

        if (product == null)
            return NotFound(new { message = "Khong tim thay san pham." });

        _context.products.Remove(product);

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return BadRequest(new
            {
                message = "Khong the xoa san pham dang duoc su dung."
            });
        }

        return Ok(new
        {
            message = "Xoa san pham thanh cong.",
            product_id = id
        });
    }
}

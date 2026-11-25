
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

[Route("api/[controller]")]
[ApiController]
public class ProductsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ProductsController(AppDbContext context)
    {
        _context = context;
    }

    // ==========================================
    // 1. LAY DANH SACH SAN PHAM
    // GET: api/products
    // Guest: guest_price
    // Member: member_price
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
    // 2. LAY CHI TIET SAN PHAM
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
        {
            return NotFound(new
            {
                message = "Khong tim thay san pham."
            });
        }

        return Ok(product);
    }

    // ==========================================
    // 3. THEM SAN PHAM
    // POST: api/products
    // CHI ADMIN DUOC THUC HIEN
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
                message = "Gia va so luong ton kho khong duoc am."
            });
        }

        var categoryExists = await _context.categories
            .AnyAsync(c => c.category_id == product.category_id);

        if (!categoryExists)
        {
            return BadRequest(new
            {
                message = "Danh muc san pham khong ton tai."
            });
        }

        product.product_id = 0;

        _context.products.Add(product);
        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetProductById),
            new { id = product.product_id },
            new
            {
                message = "Them san pham thanh cong.",
                product_id = product.product_id,
                product_name = product.product_name
            });
    }

    // ==========================================
    // 4. CAP NHAT SAN PHAM
    // PUT: api/products/{id}
    // CHI ADMIN DUOC THUC HIEN
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
                message = "Gia va so luong ton kho khong duoc am."
            });
        }

        var product = await _context.products
            .FirstOrDefaultAsync(p => p.product_id == id);

        if (product == null)
        {
            return NotFound(new
            {
                message = "Khong tim thay san pham."
            });
        }

        var categoryExists = await _context.categories
            .AnyAsync(c => c.category_id == request.category_id);

        if (!categoryExists)
        {
            return BadRequest(new
            {
                message = "Danh muc san pham khong ton tai."
            });
        }

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
            message = "Cap nhat san pham thanh cong.",
            product_id = product.product_id,
            product_name = product.product_name
        });
    }

    // ==========================================
    // 5. XOA SAN PHAM
    // DELETE: api/products/{id}
    // CHI ADMIN DUOC THUC HIEN
    // ==========================================
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteProduct(int id)
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

        _context.products.Remove(product);

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return BadRequest(new
            {
                message = "Khong the xoa san pham vi san pham dang duoc su dung trong don hang hoac du lieu khac."
            });
        }

        return Ok(new
        {
            message = "Xoa san pham thanh cong.",
            product_id = id
        });
    }
}

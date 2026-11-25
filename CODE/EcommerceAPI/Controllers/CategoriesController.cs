using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[Route("api/[controller]")]
[ApiController]
public class CategoriesController : ControllerBase
{
    private readonly AppDbContext _context;

    public CategoriesController(AppDbContext context)
    {
        _context = context;
    }

    // ==========================================
    // 1. LAY DANH SACH DANH MUC
    // GET: api/categories
    // Guest, Member, Admin deu duoc xem
    // ==========================================
    [HttpGet]
    public async Task<IActionResult> GetCategories()
    {
        var categories = await _context.categories.ToListAsync();

        return Ok(categories);
    }

    // ==========================================
    // 2. LAY DANH MUC THEO ID
    // GET: api/categories/{id}
    // ==========================================
    [HttpGet("{id}")]
    public async Task<IActionResult> GetCategory(int id)
    {
        var category = await _context.categories.FindAsync(id);

        if (category == null)
        {
            return NotFound(new
            {
                message = "Khong tim thay danh muc."
            });
        }

        return Ok(category);
    }

    // ==========================================
    // 3. THEM DANH MUC
    // POST: api/categories
    // CHI ADMIN DUOC THUC HIEN
    // ==========================================
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateCategory(
        [FromBody] Category category)
    {
        if (category == null ||
            string.IsNullOrWhiteSpace(category.category_name))
        {
            return BadRequest(new
            {
                message = "Ten danh muc khong duoc de trong."
            });
        }

        category.category_id = 0;
        category.category_name = category.category_name.Trim();

        _context.categories.Add(category);

        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetCategory),
            new { id = category.category_id },
            category
        );
    }

    // ==========================================
    // 4. CAP NHAT DANH MUC
    // PUT: api/categories/{id}
    // CHI ADMIN DUOC THUC HIEN
    // ==========================================
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateCategory(
        int id,
        [FromBody] Category updatedCategory)
    {
        if (updatedCategory == null ||
            string.IsNullOrWhiteSpace(updatedCategory.category_name))
        {
            return BadRequest(new
            {
                message = "Ten danh muc khong duoc de trong."
            });
        }

        var category = await _context.categories.FindAsync(id);

        if (category == null)
        {
            return NotFound(new
            {
                message = "Khong tim thay danh muc."
            });
        }

        category.category_name = updatedCategory.category_name.Trim();

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Cap nhat danh muc thanh cong.",
            category
        });
    }

    // ==========================================
    // 5. XOA DANH MUC
    // DELETE: api/categories/{id}
    // CHI ADMIN DUOC THUC HIEN
    // ==========================================
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteCategory(int id)
    {
        var category = await _context.categories.FindAsync(id);

        if (category == null)
        {
            return NotFound(new
            {
                message = "Khong tim thay danh muc."
            });
        }

        bool hasProducts = await _context.products
            .AnyAsync(p => p.category_id == id);

        if (hasProducts)
        {
            return BadRequest(new
            {
                message = "Khong the xoa danh muc dang co san pham."
            });
        }

        _context.categories.Remove(category);

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Xoa danh muc thanh cong.",
            category_id = id
        });
    }
}

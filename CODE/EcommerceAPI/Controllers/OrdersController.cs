
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "Admin")]
public class OrdersController : ControllerBase
{
    private readonly AppDbContext _context;

    public OrdersController(AppDbContext context)
    {
        _context = context;
    }

    // ==========================================
    // 1. LAY DANH SACH DON HANG
    // GET: api/orders
    // CHI ADMIN DUOC XEM
    // ==========================================
    [HttpGet]
    public async Task<IActionResult> GetOrders()
    {
        var orders = await _context.orders
            .OrderByDescending(o => o.created_at)
            .Select(o => new
            {
                order_id = o.order_id,
                customer_name = o.customer_name,
                phone_number = o.phone_number,
                shipping_address = o.shipping_address,
                total_amount = o.total_amount,
                order_status = o.order_status,
                created_at = o.created_at
            })
            .ToListAsync();

        return Ok(orders);
    }

    // ==========================================
    // 2. XEM CHI TIET DON HANG
    // GET: api/orders/{id}
    // CHI ADMIN DUOC XEM
    // ==========================================
    [HttpGet("{id}")]
    public async Task<IActionResult> GetOrderById(int id)
    {
        var order = await _context.orders
            .Where(o => o.order_id == id)
            .Select(o => new
            {
                order_id = o.order_id,
                customer_name = o.customer_name,
                phone_number = o.phone_number,
                shipping_address = o.shipping_address,
                total_amount = o.total_amount,
                order_status = o.order_status,
                created_at = o.created_at,

                order_items = _context.order_items
                    .Where(oi => oi.order_id == o.order_id)
                    .Select(oi => new
                    {
                        order_item_id = oi.order_item_id,
                        product_id = oi.product_id,

                        product_name = _context.products
                            .Where(p => p.product_id == oi.product_id)
                            .Select(p => p.product_name)
                            .FirstOrDefault(),

                        quantity = oi.quantity,
                        unit_price = oi.unit_price
                    })
                    .ToList()
            })
            .FirstOrDefaultAsync();

        if (order == null)
        {
            return NotFound(new
            {
                message = "Khong tim thay don hang."
            });
        }

        return Ok(order);
    }

    // ==========================================
    // 3. CAP NHAT TRANG THAI DON HANG
    // PUT: api/orders/{id}/status
    // CHI ADMIN DUOC THUC HIEN
    // ==========================================
    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateOrderStatus(
        int id,
        [FromBody] UpdateOrderStatusRequest request)
    {
        if (request == null ||
            string.IsNullOrWhiteSpace(request.order_status))
        {
            return BadRequest(new
            {
                message = "Vui long nhap trang thai don hang."
            });
        }

        var allowedStatuses = new[]
        {
            "Pending",
            "Processing",
            "Shipping",
            "Completed",
            "Cancelled"
        };

        var newStatus = request.order_status.Trim();

        if (!allowedStatuses.Contains(
            newStatus,
            StringComparer.OrdinalIgnoreCase))
        {
            return BadRequest(new
            {
                message = "Trang thai don hang khong hop le.",
                allowed_statuses = allowedStatuses
            });
        }

        var order = await _context.orders
            .FirstOrDefaultAsync(o => o.order_id == id);

        if (order == null)
        {
            return NotFound(new
            {
                message = "Khong tim thay don hang."
            });
        }

        order.order_status = allowedStatuses.First(
            s => string.Equals(
                s,
                newStatus,
                StringComparison.OrdinalIgnoreCase));

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Cap nhat trang thai don hang thanh cong.",
            order_id = order.order_id,
            order_status = order.order_status
        });
    }
}

// ==========================================
// REQUEST CAP NHAT TRANG THAI DON HANG
// ==========================================
public class UpdateOrderStatusRequest
{
    public string order_status { get; set; } = string.Empty;
}

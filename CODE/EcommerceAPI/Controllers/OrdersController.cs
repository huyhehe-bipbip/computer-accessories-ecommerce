
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

[Route("api/[controller]")]
[ApiController]
public class OrdersController : ControllerBase
{
    private readonly AppDbContext _context;

    public OrdersController(AppDbContext context)
    {
        _context = context;
    }

    // ==========================================
    // 1. GUEST / MEMBER TAO DON HANG
    // POST: api/orders
    // ==========================================

    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> CreateOrder(
        [FromBody] CreateOrderRequest request)
    {
        if (request == null ||
            string.IsNullOrWhiteSpace(request.customer_name) ||
            string.IsNullOrWhiteSpace(request.phone_number) ||
            string.IsNullOrWhiteSpace(request.shipping_address))
        {
            return BadRequest(new
            {
                message = "Vui long nhap day du thong tin giao hang."
            });
        }

        if (request.customer_name.Trim().Length > 100 ||
            request.phone_number.Trim().Length > 20 ||
            request.shipping_address.Trim().Length > 500)
        {
            return BadRequest(new
            {
                message = "Thong tin giao hang vuot qua do dai cho phep."
            });
        }

        if (!System.Text.RegularExpressions.Regex.IsMatch(
            request.phone_number.Trim(), @"^0[0-9]{9}$"))
        {
            return BadRequest(new
            {
                message = "So dien thoai khong hop le."
            });
        }

        if (request.items == null || request.items.Count == 0)
        {
            return BadRequest(new
            {
                message = "Don hang khong co san pham."
            });
        }

        if (request.items.Any(i =>
            i.product_id < 1 || i.quantity < 1))
        {
            return BadRequest(new
            {
                message = "San pham hoac so luong khong hop le."
            });
        }

        if (request.items
            .GroupBy(i => i.product_id)
            .Any(g => g.Count() > 1))
        {
            return BadRequest(new
            {
                message = "Don hang co san pham bi trung lap."
            });
        }

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        try
        {
            decimal subtotal = 0;
            var orderItems = new List<OrderItem>();

            foreach (var item in request.items)
            {
                var product = await _context.products
                    .FirstOrDefaultAsync(p =>
                        p.product_id == item.product_id);

                if (product == null)
                {
                    return NotFound(new
                    {
                        message = $"Khong tim thay san pham ID {item.product_id}."
                    });
                }

                if (product.stock_quantity < item.quantity)
                {
                    return BadRequest(new
                    {
                        message = $"San pham {product.product_name} khong du ton kho."
                    });
                }

                // Guest checkout: su dung gia guest_price.
                decimal unitPrice = product.guest_price;

                if (unitPrice < 0)
                {
                    return BadRequest(new
                    {
                        message = "Gia san pham khong hop le."
                    });
                }

                subtotal += unitPrice * item.quantity;

                orderItems.Add(new OrderItem
                {
                    product_id = product.product_id,
                    quantity = item.quantity,
                    unit_price = unitPrice
                });

                // Tru ton kho khi dat hang.
                product.stock_quantity -= item.quantity;
            }

            // Phi van chuyen: 30.000 VND.
            decimal shippingFee = 30000m;
            decimal totalAmount = subtotal + shippingFee;

            var order = new Order
            {
                customer_name = request.customer_name.Trim(),
                phone_number = request.phone_number.Trim(),
                shipping_address = request.shipping_address.Trim(),
                total_amount = totalAmount,
                order_status = "Pending",
                created_at = DateTime.Now
            };

            _context.orders.Add(order);

            await _context.SaveChangesAsync();

            foreach (var item in orderItems)
            {
                item.order_id = order.order_id;
            }

            _context.order_items.AddRange(orderItems);

            await _context.SaveChangesAsync();

            await transaction.CommitAsync();

            return Ok(new
            {
                order_id = order.order_id,
                customer_name = order.customer_name,
                phone_number = order.phone_number,
                shipping_address = order.shipping_address,
                total_amount = order.total_amount,
                order_status = order.order_status,
                created_at = order.created_at,
                message = "Tao don hang thanh cong."
            });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();

            return StatusCode(500, new
            {
                message = "Khong the tao don hang.",
                detail = ex.Message
            });
        }
    }

    // ==========================================
    // 2. ADMIN XEM DANH SACH DON HANG
    // GET: api/orders
    // ==========================================

    [HttpGet]
    [Authorize(Roles = "Admin")]
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
    // 3. ADMIN XEM CHI TIET DON HANG
    // GET: api/orders/{id}
    // ==========================================

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin")]
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
    // 4. ADMIN CAP NHAT TRANG THAI DON HANG
    // PUT: api/orders/{id}/status
    // ==========================================

    [HttpPut("{id}/status")]
    [Authorize(Roles = "Admin")]
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

        newStatus = allowedStatuses.First(s =>
            string.Equals(
                s,
                newStatus,
                StringComparison.OrdinalIgnoreCase));

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        try
        {
            var order = await _context.orders
                .FirstOrDefaultAsync(o => o.order_id == id);

            if (order == null)
            {
                return NotFound(new
                {
                    message = "Khong tim thay don hang."
                });
            }

            string currentStatus = order.order_status ?? "Pending";

            // Don da huy: khong hoan kho lan thu hai.
            if (string.Equals(
                currentStatus,
                "Cancelled",
                StringComparison.OrdinalIgnoreCase))
            {
                if (newStatus == "Cancelled")
                {
                    return Ok(new
                    {
                        message = "Don hang da duoc huy truoc do.",
                        order_id = order.order_id,
                        order_status = order.order_status
                    });
                }

                return BadRequest(new
                {
                    message = "Don hang da huy, khong the cap nhat lai."
                });
            }

            // Neu don da hoan thanh thi khong cho huy.
            if (string.Equals(
                currentStatus,
                "Completed",
                StringComparison.OrdinalIgnoreCase)
                && newStatus == "Cancelled")
            {
                return BadRequest(new
                {
                    message = "Don hang da hoan thanh, khong the huy."
                });
            }

            // ==================================
            // HOAN LAI TON KHO KHI HUY DON
            // ==================================

            if (newStatus == "Cancelled")
            {
                var orderItems = await _context.order_items
                    .Where(oi => oi.order_id == id)
                    .ToListAsync();

                if (orderItems.Count == 0)
                {
                    return BadRequest(new
                    {
                        message = "Don hang khong co chi tiet san pham."
                    });
                }

                foreach (var item in orderItems)
                {
                    if (item.product_id == null ||
                        item.quantity <= 0)
                    {
                        return BadRequest(new
                        {
                            message = "Chi tiet san pham trong don hang khong hop le."
                        });
                    }

                    var product = await _context.products
                        .FirstOrDefaultAsync(p =>
                            p.product_id == item.product_id.Value);

                    if (product == null)
                    {
                        return BadRequest(new
                        {
                            message = $"Khong tim thay san pham ID {item.product_id} de hoan kho."
                        });
                    }

                    // Cong lai so luong da mua.
                    product.stock_quantity += item.quantity;
                }
            }

            // Cap nhat trang thai don hang.
            order.order_status = newStatus;

            await _context.SaveChangesAsync();

            await transaction.CommitAsync();

            return Ok(new
            {
                message = newStatus == "Cancelled"
                    ? "Huy don hang va hoan kho thanh cong."
                    : "Cap nhat trang thai don hang thanh cong.",

                order_id = order.order_id,
                order_status = order.order_status
            });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();

            return StatusCode(500, new
            {
                message = "Co loi xay ra khi cap nhat don hang.",
                detail = ex.Message
            });
        }
    }
}

// ==========================================
// REQUEST TAO DON HANG
// ==========================================

public class CreateOrderRequest
{
    [Required]
    public string customer_name { get; set; } = string.Empty;

    [Required]
    public string phone_number { get; set; } = string.Empty;

    [Required]
    public string shipping_address { get; set; } = string.Empty;

    [Required]
    public List<CreateOrderItemRequest> items { get; set; } = new();
}

public class CreateOrderItemRequest
{
    public int product_id { get; set; }

    public int quantity { get; set; }
}

// ==========================================
// REQUEST CAP NHAT TRANG THAI
// ==========================================

public class UpdateOrderStatusRequest
{
    public string order_status { get; set; } = string.Empty;
}

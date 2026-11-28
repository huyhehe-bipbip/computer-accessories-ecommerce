using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.Data;

[Route("api/checkout")]
[ApiController]
public class CheckoutController : ControllerBase
{
    private readonly AppDbContext _context;

    private const decimal ShippingFee = 30000m;

    public CheckoutController(AppDbContext context)
    {
        _context = context;
    }

    [AllowAnonymous]
    [HttpPost]
    public async Task<IActionResult> CreateOrder(
        [FromBody] CheckoutRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.customer_name) ||
            string.IsNullOrWhiteSpace(request.phone_number) ||
            string.IsNullOrWhiteSpace(request.shipping_address))
        {
            return BadRequest(new
            {
                message = "Customer information is required."
            });
        }

        if (request.items == null || request.items.Count == 0)
        {
            return BadRequest(new
            {
                message = "Your cart is empty."
            });
        }

        if (request.items.Any(item =>
            item.product_id <= 0 || item.quantity <= 0))
        {
            return BadRequest(new
            {
                message = "Invalid product or quantity."
            });
        }

        if (request.items
            .GroupBy(item => item.product_id)
            .Any(group => group.Count() > 1))
        {
            return BadRequest(new
            {
                message = "Duplicate products are not allowed."
            });
        }

        await using var transaction =
            await _context.Database.BeginTransactionAsync(
                IsolationLevel.Serializable);

        try
        {
            decimal subtotal = 0;

            var orderItems = new List<OrderItem>();

            foreach (var item in request.items
                .OrderBy(item => item.product_id))
            {
                var product = await _context.products
                    .FirstOrDefaultAsync(p =>
                        p.product_id == item.product_id);

                if (product == null)
                {
                    return NotFound(new
                    {
                        message = "Product not found.",
                        product_id = item.product_id
                    });
                }

                if (item.quantity > product.stock_quantity)
                {
                    return Conflict(new
                    {
                        message =
                            $"{product.product_name}: insufficient stock."
                    });
                }

                decimal unitPrice = product.guest_price;

                if (unitPrice < 0)
                {
                    return BadRequest(new
                    {
                        message = "Invalid product price."
                    });
                }

                subtotal += unitPrice * item.quantity;

                orderItems.Add(new OrderItem
                {
                    product_id = product.product_id,
                    quantity = item.quantity,
                    unit_price = unitPrice
                });

                product.stock_quantity -= item.quantity;
            }

            var order = new Order
            {
                customer_name = request.customer_name.Trim(),
                phone_number = request.phone_number.Trim(),
                shipping_address =
                    request.shipping_address.Trim(),

                total_amount = subtotal + ShippingFee,
                order_status = "Pending",
                created_at = DateTime.Now
            };

            _context.orders.Add(order);

            await _context.SaveChangesAsync();

            foreach (var item in orderItems)
            {
                item.order_id = order.order_id;

                _context.order_items.Add(item);
            }

            await _context.SaveChangesAsync();

            await transaction.CommitAsync();

            return StatusCode(201, new
            {
                message = "Order placed successfully.",
                order_id = order.order_id,
                customer_name = order.customer_name,
                subtotal,
                shipping_fee = ShippingFee,
                total_amount = order.total_amount,
                order_status = order.order_status,
                payment_method = "COD"
            });
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();

            return StatusCode(500, new
            {
                message = "Unable to create order."
            });
        }
    }
}

public class CheckoutRequest
{
    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string customer_name { get; set; } = string.Empty;

    [Required]
    [RegularExpression(@"^0[0-9]{9}$")]
    public string phone_number { get; set; } = string.Empty;

    [Required]
    [StringLength(500, MinimumLength = 5)]
    public string shipping_address { get; set; } = string.Empty;

    [Required]
    [MinLength(1)]
    [MaxLength(100)]
    public List<CheckoutItemRequest> items { get; set; } = new();
}

public class CheckoutItemRequest
{
    [Range(1, int.MaxValue)]
    public int product_id { get; set; }

    [Range(1, int.MaxValue)]
    public int quantity { get; set; }
}
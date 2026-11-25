"use strict";

// =========================================
// TECHGEAR - CHECKOUT API INTEGRATION
// =========================================

const CART_STORAGE_KEY = "techgear_cart";
const SHIPPING_FEE = 30000;

const $ = id => document.getElementById(id);

let cart = [];
let isSubmitting = false;
let isReady = false;

// =========================================
// CART STORAGE
// =========================================

function getCart() {
    try {
        const data = JSON.parse(
            localStorage.getItem(CART_STORAGE_KEY) || "[]"
        );

        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("Cart storage error:", error);
        return [];
    }
}

// =========================================
// PRICE CALCULATION
// =========================================

function formatPrice(price) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND"
    }).format(price);
}

function getUnitPrice(item) {
    return Number(item.price);
}

function calculateQuantity() {
    return cart.reduce((total, item) => {
        return total + Number(item.quantity);
    }, 0);
}

function calculateSubtotal() {
    return cart.reduce((total, item) => {
        return total +
            getUnitPrice(item) * Number(item.quantity);
    }, 0);
}

function calculateTotals() {
    const subtotal = calculateSubtotal();
    const shipping = cart.length > 0 ? SHIPPING_FEE : 0;

    return {
        subtotal,
        discount: 0,
        shipping,
        total: subtotal + shipping
    };
}

// =========================================
// NOTIFICATIONS
// =========================================

function showMessage(message, isError = false) {
    $("checkoutMessage").textContent = message;

    $("checkoutMessage").classList.toggle(
        "error",
        isError
    );

    $("checkoutMessage").hidden = false;
}

// =========================================
// CUSTOMER INFORMATION
// =========================================

function initializeCustomer() {
    $("customerType").textContent = "Guest Checkout";

    $("customerNotice").textContent =
        "You can place an order without creating an account.";

    // Features awaiting backend integration.
    $("couponCode").disabled = true;
    $("applyCoupon").disabled = true;
    $("removeCoupon").hidden = true;

    $("couponMessage").textContent =
        "Coupons are currently unavailable.";

    $("email").disabled = true;
    $("notes").disabled = true;

    const bankTransfer = document.querySelector(
        'input[name="payment"][value="BANK_TRANSFER"]'
    );

    if (bankTransfer) {
        bankTransfer.disabled = true;
    }

    const cod = document.querySelector(
        'input[name="payment"][value="COD"]'
    );

    if (cod) {
        cod.checked = true;
    }
}

// =========================================
// REFRESH PRODUCTS FROM DATABASE
// =========================================

async function refreshCartProducts() {
    const products = await TechGearAPI.getProducts();

    const updatedCart = cart.map(item => {
        if (item.source !== "api") {
            throw new Error(
                "Please remove demo products and add products from the database."
            );
        }

        const product = products.find(product =>
            String(product.id) === String(item.productId)
        );

        if (!product) {
            throw new Error(
                `${item.name} is no longer available.`
            );
        }

        return {
            ...item,
            name: product.name,
            price: product.guestPrice,
            memberPrice: product.memberPrice,
            stock: product.stock,
            image: product.image
        };
    });

    cart = updatedCart;
}

// =========================================
// STOCK VALIDATION
// =========================================

function validateStock() {
    if (cart.length === 0) {
        return "Your cart is empty.";
    }

    const seenProducts = new Set();

    for (const item of cart) {
        const productId = Number(item.productId);
        const quantity = Number(item.quantity);
        const stock = Number(item.stock);
        const price = Number(item.price);

        if (
            item.source !== "api" ||
            !Number.isInteger(productId) ||
            productId < 1 ||
            !Number.isInteger(quantity) ||
            quantity < 1 ||
            !Number.isInteger(stock) ||
            stock < 0 ||
            !Number.isFinite(price) ||
            price < 0
        ) {
            return "Invalid product information in your cart.";
        }

        if (seenProducts.has(productId)) {
            return "Duplicate product entries.";
        }

        seenProducts.add(productId);

        if (quantity > stock) {
            return `${item.name}: quantity exceeds available stock.`;
        }
    }

    return null;
}

// =========================================
// RENDER ORDER ITEMS
// =========================================

function renderOrderItems() {
    const container = $("orderItems");

    container.replaceChildren();

    cart.forEach(item => {
        const row = document.createElement("div");
        row.className = "order-item";

        const imageBox = document.createElement("div");
        imageBox.className = "order-image";

        if (item.image) {
            const image = document.createElement("img");

            image.src = item.image;
            image.alt = item.name;

            image.addEventListener("error", () => {
                imageBox.textContent = item.icon || "📦";
            });

            imageBox.appendChild(image);
        } else {
            imageBox.textContent = item.icon || "📦";
        }

        const info = document.createElement("div");
        info.className = "order-info";

        const name = document.createElement("h3");
        name.textContent = item.name;

        const quantity = document.createElement("p");
        quantity.textContent = `Quantity: ${item.quantity}`;

        const unitPrice = document.createElement("p");
        unitPrice.textContent = formatPrice(
            getUnitPrice(item)
        );

        info.append(name, quantity, unitPrice);

        const price = document.createElement("div");
        price.className = "order-price";

        price.textContent = formatPrice(
            getUnitPrice(item) * Number(item.quantity)
        );

        row.append(imageBox, info, price);
        container.appendChild(row);
    });
}

// =========================================
// RENDER ORDER SUMMARY
// =========================================

function updateSummary() {
    const totals = calculateTotals();
    const quantity = calculateQuantity();

    $("cartCount").textContent = quantity;
    $("totalItems").textContent = quantity;

    $("pricingType").textContent = "Guest Price";

    $("subtotal").textContent =
        formatPrice(totals.subtotal);

    $("discount").textContent =
        "- " + formatPrice(totals.discount);

    $("shippingFee").textContent =
        formatPrice(totals.shipping);

    $("finalTotal").textContent =
        formatPrice(totals.total);
}

function renderCheckout() {
    $("placeOrder").disabled = true;

    if (cart.length === 0) {
        $("checkoutLayout").hidden = true;
        $("emptyCheckout").hidden = false;
        $("cartCount").textContent = "0";

        return;
    }

    $("emptyCheckout").hidden = true;
    $("checkoutLayout").hidden = false;

    renderOrderItems();
    updateSummary();

    const stockError = validateStock();

    if (stockError) {
        showMessage(stockError, true);
        return;
    }

    $("placeOrder").disabled =
        !isReady || isSubmitting;
}

// =========================================
// CUSTOMER FORM VALIDATION
// =========================================

function getCustomerInformation() {
    return {
        fullName: $("fullName").value.trim(),
        phone: $("phone").value.trim(),
        address: $("address").value.trim()
    };
}

function validateCustomer(customer) {
    if (
        customer.fullName.length < 2 ||
        customer.fullName.length > 100
    ) {
        return "Please enter a valid full name.";
    }

    if (!/^0[0-9]{9}$/.test(customer.phone)) {
        return "Please enter a valid 10-digit phone number.";
    }

    if (
        customer.address.length < 5 ||
        customer.address.length > 300
    ) {
        return "Please enter a valid shipping address.";
    }

    return null;
}

// =========================================
// CREATE API REQUEST
// =========================================

function createOrderRequest(customer) {
    return {
        customer_name: customer.fullName,
        phone_number: customer.phone,
        shipping_address: customer.address,

        items: cart.map(item => ({
            product_id: Number(item.productId),
            quantity: Number(item.quantity)
        }))
    };
}

// =========================================
// ORDER CONFIRMATION
// =========================================

function showOrderSuccess(order) {
    $("checkoutLayout").hidden = true;
    $("emptyCheckout").hidden = true;
    $("checkoutMessage").hidden = true;

    $("orderSuccess").hidden = false;

    $("successOrderId").textContent =
        "TG-" + order.order_id;

    $("successCustomer").textContent =
        order.customer_name;

    $("successPayment").textContent =
        "Cash on Delivery";

    $("successTotal").textContent =
        formatPrice(order.total_amount);

    $("cartCount").textContent = "0";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

// =========================================
// PLACE ORDER
// =========================================

async function placeOrder(event) {
    event.preventDefault();

    if (isSubmitting || !isReady) {
        return;
    }

    const customer = getCustomerInformation();
    const customerError = validateCustomer(customer);

    if (customerError) {
        showMessage(customerError, true);
        return;
    }

    const stockError = validateStock();

    if (stockError) {
        showMessage(stockError, true);
        return;
    }

    const paymentMethod = document.querySelector(
        'input[name="payment"]:checked'
    )?.value;

    if (paymentMethod !== "COD") {
        showMessage(
            "Only Cash on Delivery is currently supported.",
            true
        );

        return;
    }

    isSubmitting = true;

    $("placeOrder").disabled = true;
    $("placeOrder").textContent = "Processing Order...";

    try {
        const previousTotal = calculateTotals().total;

        await refreshCartProducts();

        renderCheckout();

        const latestStockError = validateStock();

        if (latestStockError) {
            showMessage(latestStockError, true);
            return;
        }

        if (calculateTotals().total !== previousTotal) {
            showMessage(
                "Product prices have changed. Please review your order.",
                true
            );

            return;
        }

        const orderData = createOrderRequest(customer);

        // Send HTTP POST to ASP.NET Core Backend.
        const order = await TechGearAPI.createOrder(
            orderData
        );

        if (!order || !order.order_id) {
            throw new Error(
                "Unable to confirm order creation."
            );
        }

        // Clear cart only after backend confirms success.
        try {
            localStorage.removeItem(CART_STORAGE_KEY);
        } catch (storageError) {
            console.error(
                "Unable to clear cart:",
                storageError
            );
        }

        cart = [];

        isReady = false;

        showOrderSuccess(order);

    } catch (error) {
        console.error("Checkout error:", error);

        showMessage(
            `${error.message || "Unable to place order."} ` +
            "If the connection was interrupted, verify the order before retrying.",
            true
        );

    } finally {
        isSubmitting = false;

        $("placeOrder").textContent = "Place Order";

        $("placeOrder").disabled =
            !isReady || Boolean(validateStock());
    }
}

// =========================================
// INITIALIZATION
// =========================================

async function initializeCheckout() {
    isReady = false;

    $("placeOrder").disabled = true;

    $("currentYear").textContent =
        new Date().getFullYear();

    initializeCustomer();

    cart = getCart();

    renderCheckout();

    if (cart.length === 0) {
        return;
    }

    try {
        await refreshCartProducts();

        isReady = true;

        renderCheckout();

        if (!validateStock()) {
            showMessage(
                "Product prices and stock verified successfully."
            );
        }

    } catch (error) {
        console.error(error);

        showMessage(
            error.message || "Unable to connect to the server.",
            true
        );
    }
}

// =========================================
// EVENTS
// =========================================

$("checkoutForm").addEventListener(
    "submit",
    placeOrder
);

window.addEventListener("storage", event => {
    if (isSubmitting || !$("orderSuccess").hidden) {
        return;
    }

    if (
        event.key === CART_STORAGE_KEY ||
        event.key === null
    ) {
        window.location.reload();
    }
});

initializeCheckout();
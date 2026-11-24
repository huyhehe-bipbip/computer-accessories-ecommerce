
"use strict";

// =========================================
// TECHGEAR - CHECKOUT
// Frontend simulation
// =========================================

const CART_STORAGE_KEY = "techgear_cart";
const ORDER_STORAGE_KEY = "techgear_orders";
const USER_STORAGE_KEY = "techgear_user";

const SHIPPING_FEE = 30000;
const MEMBER_DISCOUNT = 0.10;

const COUPON = {
    code: "TECH10",
    type: "percentage",
    value: 10,
    active: true
};

const $ = id => document.getElementById(id);

let cart = [];
let appliedCoupon = null;
let isSubmitting = false;

// =========================================
// STORAGE
// =========================================

function readStorage(key, fallback) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : fallback;
    } catch (error) {
        console.error("Storage error:", error);
        return fallback;
    }
}

function getCart() {
    const data = readStorage(CART_STORAGE_KEY, []);
    return Array.isArray(data) ? data : [];
}

function getCurrentUser() {
    const user = readStorage(USER_STORAGE_KEY, null);

    return user &&
           user.isLoggedIn === true &&
           user.role === "member"
        ? user
        : null;
}

function isMember() {
    return getCurrentUser() !== null;
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
    const guestPrice = Number(item.price);

    if (!isMember()) {
        return guestPrice;
    }

    const memberPrice = Number(item.memberPrice);

    if (
        item.memberPrice != null &&
        Number.isFinite(memberPrice) &&
        memberPrice >= 0 &&
        memberPrice <= guestPrice
    ) {
        return memberPrice;
    }

    return Math.round(
        guestPrice * (1 - MEMBER_DISCOUNT)
    );
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

function calculateDiscount(subtotal) {
    if (!appliedCoupon) {
        return 0;
    }

    let discount = 0;

    if (appliedCoupon.type === "percentage") {
        discount = Math.round(
            subtotal * appliedCoupon.value / 100
        );
    } else if (appliedCoupon.type === "fixed") {
        discount = appliedCoupon.value;
    }

    return Math.max(0, Math.min(discount, subtotal));
}

function calculateTotals() {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount(subtotal);

    const shipping = cart.length > 0
        ? SHIPPING_FEE
        : 0;

    return {
        subtotal,
        discount,
        shipping,
        total: subtotal - discount + shipping
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

function showCouponMessage(message, isError = false) {
    $("couponMessage").textContent = message;

    $("couponMessage").classList.toggle(
        "error",
        isError
    );
}

// =========================================
// CUSTOMER INFORMATION
// =========================================

function initializeCustomer() {
    const user = getCurrentUser();

    if (!user) {
        $("customerType").textContent = "Guest Checkout";

        $("customerNotice").textContent =
            "You can place an order without creating an account.";

        return;
    }

    $("customerType").textContent = "Member Checkout";

    $("customerNotice").textContent =
        "Exclusive member pricing has been applied.";

    $("fullName").value = user.fullName || user.name || "";
    $("phone").value = user.phone || "";
    $("email").value = user.email || "";
    $("address").value = user.address || "";
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
        const quantity = Number(item.quantity);
        const stock = Number(item.stock);
        const price = Number(item.price);

        if (
            item.productId == null ||
            !item.name ||
            item.price == null ||
            item.stock == null ||
            !Number.isInteger(quantity) ||
            quantity < 1 ||
            !Number.isInteger(stock) ||
            stock < 0 ||
            !Number.isFinite(price) ||
            price < 0
        ) {
            return "Invalid product information in your cart.";
        }

        const productId = String(item.productId);

        if (seenProducts.has(productId)) {
            return "Duplicate product entries. Please review your cart.";
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
        unitPrice.textContent = formatPrice(getUnitPrice(item));

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
// RENDER SUMMARY
// =========================================

function updateSummary() {
    const totals = calculateTotals();
    const quantity = calculateQuantity();

    $("cartCount").textContent = quantity;
    $("totalItems").textContent = quantity;

    $("pricingType").textContent = isMember()
        ? "Member Price"
        : "Guest Price";

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
    if (cart.length === 0) {
        $("checkoutLayout").hidden = true;
        $("emptyCheckout").hidden = false;
        $("cartCount").textContent = "0";
        return;
    }

    $("emptyCheckout").hidden = true;
    $("checkoutLayout").hidden = false;

    const stockError = validateStock();

    if (stockError) {
        showMessage(stockError, true);
        $("placeOrder").disabled = true;
        return;
    }

    $("placeOrder").disabled = false;

    renderOrderItems();
    updateSummary();
}

// =========================================
// COUPON VALIDATION
// =========================================

async function applyCoupon() {
    const code = $("couponCode")
        .value.trim().toUpperCase();

    if (!code) {
        showCouponMessage(
            "Please enter a coupon code.",
            true
        );
        return;
    }

    $("applyCoupon").disabled = true;
    $("applyCoupon").textContent = "Checking...";

    // Simulate asynchronous coupon validation.
    // Replace this delay with an API request later.
    await new Promise(resolve => {
        setTimeout(resolve, 500);
    });

    try {
        if (code !== COUPON.code || !COUPON.active) {
            appliedCoupon = null;

            $("removeCoupon").hidden = true;

            showCouponMessage(
                "Invalid or inactive coupon code.",
                true
            );
        } else {
            appliedCoupon = { ...COUPON };

            $("couponCode").value = COUPON.code;
            $("removeCoupon").hidden = false;

            showCouponMessage(
                "Coupon applied successfully! You saved 10%."
            );
        }

        updateSummary();
    } finally {
        $("applyCoupon").disabled = false;
        $("applyCoupon").textContent = "Apply";
    }
}

function removeCoupon() {
    appliedCoupon = null;

    $("couponCode").value = "";
    $("removeCoupon").hidden = true;

    showCouponMessage("Coupon removed.");

    updateSummary();
}

// =========================================
// CUSTOMER FORM VALIDATION
// =========================================

function getCustomerInformation() {
    return {
        fullName: $("fullName").value.trim(),
        phone: $("phone").value.trim(),
        email: $("email").value.trim(),
        address: $("address").value.trim(),
        notes: $("notes").value.trim()
    };
}

function validateCustomer(customer) {
    if (customer.fullName.length < 2) {
        return "Please enter your full name.";
    }

    if (!/^0[0-9]{9}$/.test(customer.phone)) {
        return "Please enter a valid 10-digit phone number.";
    }

    if (customer.address.length < 5) {
        return "Please enter a valid shipping address.";
    }

    return null;
}

// =========================================
// CREATE SIMULATED ORDER
// =========================================

function createOrder(customer, paymentMethod) {
    const totals = calculateTotals();
    const user = getCurrentUser();

    return {
        orderId: "TG-" + crypto.randomUUID(),
        customerId: user ? user.id || null : null,
        customerType: user ? "Member" : "Guest",

        customer,

        items: cart.map(item => ({
            productId: item.productId,
            name: item.name,
            quantity: Number(item.quantity),
            unitPrice: getUnitPrice(item),

            subtotal:
                getUnitPrice(item) * Number(item.quantity)
        })),

        couponCode: appliedCoupon
            ? appliedCoupon.code
            : null,

        subtotal: totals.subtotal,
        discount: totals.discount,
        shippingFee: totals.shipping,
        total: totals.total,

        paymentMethod,
        paymentStatus: "Simulated",
        status: "Pending",
        createdAt: new Date().toISOString()
    };
}

function saveOrder(order) {
    const data = readStorage(ORDER_STORAGE_KEY, []);

    const orders = Array.isArray(data)
        ? data
        : [];

    const previousOrders =
        localStorage.getItem(ORDER_STORAGE_KEY);

    try {
        localStorage.setItem(
            ORDER_STORAGE_KEY,
            JSON.stringify([...orders, order])
        );

        localStorage.removeItem(CART_STORAGE_KEY);

        return true;
    } catch (error) {
        console.error("Unable to save order:", error);

        // Attempt to restore previous order data.
        try {
            if (previousOrders === null) {
                localStorage.removeItem(ORDER_STORAGE_KEY);
            } else {
                localStorage.setItem(
                    ORDER_STORAGE_KEY,
                    previousOrders
                );
            }
        } catch (restoreError) {
            console.error(restoreError);
        }

        return false;
    }
}

// =========================================
// ORDER CONFIRMATION
// =========================================

function showOrderSuccess(order) {
    $("checkoutLayout").hidden = true;
    $("emptyCheckout").hidden = true;
    $("checkoutMessage").hidden = true;

    $("orderSuccess").hidden = false;

    $("successOrderId").textContent = order.orderId;

    $("successCustomer").textContent =
        order.customer.fullName;

    $("successPayment").textContent =
        order.paymentMethod === "COD"
            ? "Cash on Delivery"
            : "Bank Transfer";

    $("successTotal").textContent =
        formatPrice(order.total);

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

    if (isSubmitting) {
        return;
    }

    const customer = getCustomerInformation();
    const customerError = validateCustomer(customer);

    if (customerError) {
        showMessage(customerError, true);
        return;
    }

    cart = getCart();

    const stockError = validateStock();

    if (stockError) {
        showMessage(stockError, true);
        return;
    }

    const paymentMethod = document.querySelector(
        'input[name="payment"]:checked'
    )?.value;

    if (!["COD", "BANK_TRANSFER"].includes(paymentMethod)) {
        showMessage("Please select a payment method.", true);
        return;
    }

    isSubmitting = true;

    $("placeOrder").disabled = true;
    $("placeOrder").textContent = "Processing Order...";

    try {
        await new Promise(resolve => {
            setTimeout(resolve, 600);
        });

        // Recheck cart before order creation.
        cart = getCart();

        const latestStockError = validateStock();

        if (latestStockError) {
            showMessage(latestStockError, true);
            return;
        }

        const order = createOrder(customer, paymentMethod);

        if (!saveOrder(order)) {
            showMessage(
                "Unable to create your order. Please try again.",
                true
            );
            return;
        }

        cart = [];

        showOrderSuccess(order);

    } catch (error) {
        console.error(error);

        showMessage(
            "An unexpected error occurred.",
            true
        );
    } finally {
        isSubmitting = false;

        $("placeOrder").disabled = false;
        $("placeOrder").textContent = "Place Order";
    }
}

// =========================================
// EVENTS
// =========================================

$("applyCoupon").addEventListener("click", applyCoupon);

$("removeCoupon").addEventListener("click", removeCoupon);

$("couponCode").addEventListener("keydown", event => {
    if (event.key === "Enter") {
        event.preventDefault();

        if (!$("applyCoupon").disabled) {
            applyCoupon();
        }
    }
});

$("checkoutForm").addEventListener("submit", placeOrder);

window.addEventListener("storage", event => {
    if (!$("orderSuccess").hidden) {
        return;
    }

    if (
        event.key === CART_STORAGE_KEY ||
        event.key === USER_STORAGE_KEY ||
        event.key === null
    ) {
        cart = getCart();
        initializeCustomer();
        renderCheckout();
    }
});

// =========================================
// INITIALIZATION
// =========================================

$("currentYear").textContent = new Date().getFullYear();

cart = getCart();

initializeCustomer();
renderCheckout();

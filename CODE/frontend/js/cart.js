
"use strict";

const CART_STORAGE_KEY = "techgear_cart";

const cartItems = document.getElementById("cartItems");
const cartCount = document.getElementById("cartCount");
const itemCount = document.getElementById("itemCount");
const cartLayout = document.getElementById("cartLayout");
const emptyCart = document.getElementById("emptyCart");
const cartMessage = document.getElementById("cartMessage");

const summaryQuantity = document.getElementById("summaryQuantity");
const summarySubtotal = document.getElementById("summarySubtotal");
const summaryTotal = document.getElementById("summaryTotal");

let messageTimer;

// Format price in Vietnamese Dong
function formatPrice(price) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND"
    }).format(price);
}

// Read cart data from localStorage
function getCart() {
    try {
        const data = localStorage.getItem(CART_STORAGE_KEY);
        const cart = data ? JSON.parse(data) : [];

        return Array.isArray(cart) ? cart : [];
    } catch (error) {
        console.error("Unable to read cart:", error);
        return [];
    }
}

// Save cart data to localStorage
function saveCart(cart) {
    try {
        localStorage.setItem(
            CART_STORAGE_KEY,
            JSON.stringify(cart)
        );

        return true;
    } catch (error) {
        console.error("Unable to save cart:", error);
        showMessage("Unable to save your cart.", true);
        return false;
    }
}

// Display notification
function showMessage(message, isError = false) {
    clearTimeout(messageTimer);

    cartMessage.textContent = message;
    cartMessage.classList.toggle("error", isError);
    cartMessage.hidden = false;

    messageTimer = setTimeout(() => {
        cartMessage.hidden = true;
    }, 3000);
}

// Prevent HTML injection when rendering product data
function escapeHTML(value) {
    const element = document.createElement("div");
    element.textContent = String(value ?? "");

    return element.innerHTML
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// Calculate total quantity
function calculateQuantity(cart) {
    return cart.reduce((total, item) => {
        return total + Number(item.quantity);
    }, 0);
}

// Calculate guest subtotal
function calculateSubtotal(cart) {
    return cart.reduce((total, item) => {
        return total + Number(item.price) * Number(item.quantity);
    }, 0);
}

// Update header cart count
function updateCartCount(cart) {
    cartCount.textContent = calculateQuantity(cart);
}

// Update order summary
function updateSummary(cart) {
    const quantity = calculateQuantity(cart);
    const subtotal = calculateSubtotal(cart);

    summaryQuantity.textContent = quantity;
    summarySubtotal.textContent = formatPrice(subtotal);
    summaryTotal.textContent = formatPrice(subtotal);
}

// Render product image or placeholder
function renderProductImage(item) {
    if (item.image) {
        return `
            <img src="${escapeHTML(item.image)}"
                 alt="${escapeHTML(item.name)}">
        `;
    }

    return escapeHTML(item.icon || "📦");
}

// Render shopping cart
function renderCart() {
    const cart = getCart();

    updateCartCount(cart);
    updateSummary(cart);

    const quantity = calculateQuantity(cart);

    itemCount.textContent =
        `${quantity} ${quantity === 1 ? "item" : "items"}`;

    if (cart.length === 0) {
        cartLayout.hidden = true;
        emptyCart.hidden = false;
        cartItems.innerHTML = "";
        return;
    }

    emptyCart.hidden = true;
    cartLayout.hidden = false;

    cartItems.innerHTML = cart.map(item => {
        const id = escapeHTML(item.productId);
        const quantity = Number(item.quantity);
        const stock = Number(item.stock);
        const price = Number(item.price);
        const subtotal = price * quantity;

        return `
            <tr>
                <td>
                    <div class="product-info">

                        <div class="product-image">
                            ${renderProductImage(item)}
                        </div>

                        <div>
                            <a class="product-name"
                               href="product-details.html?id=${encodeURIComponent(item.productId)}">
                                ${escapeHTML(item.name)}
                            </a>

                            <p class="product-category">
                                ${escapeHTML(item.category)}
                            </p>

                            <p class="stock-label">
                                ${stock} available
                            </p>
                        </div>

                    </div>
                </td>

                <td class="item-price" data-label="Price">
                    ${formatPrice(price)}
                </td>

                <td data-label="Quantity">
                    <div class="quantity-control">

                        <button type="button"
                                data-action="decrease"
                                data-id="${id}"
                                aria-label="Decrease quantity"
                                ${quantity <= 1 ? "disabled" : ""}>
                            &minus;
                        </button>

                        <span>${quantity}</span>

                        <button type="button"
                                data-action="increase"
                                data-id="${id}"
                                aria-label="Increase quantity"
                                ${quantity >= stock ? "disabled" : ""}>
                            +
                        </button>

                    </div>
                </td>

                <td class="item-subtotal" data-label="Subtotal">
                    ${formatPrice(subtotal)}
                </td>

                <td data-label="Action">
                    <button type="button"
                            class="remove-button"
                            data-action="remove"
                            data-id="${id}">
                        Remove
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

// Increase or decrease product quantity
function updateQuantity(productId, change) {
    const cart = getCart();

    const item = cart.find(product => {
        return String(product.productId) === String(productId);
    });

    if (!item) {
        showMessage("Product not found.", true);
        return;
    }

    const newQuantity = Number(item.quantity) + change;

    if (newQuantity < 1) {
        return;
    }

    if (newQuantity > Number(item.stock)) {
        showMessage("Quantity exceeds available stock.", true);
        return;
    }

    item.quantity = newQuantity;

    if (saveCart(cart)) {
        renderCart();
        showMessage("Cart updated successfully.");
    }
}

// Remove a product
function removeItem(productId) {
    const cart = getCart();

    const updatedCart = cart.filter(item => {
        return String(item.productId) !== String(productId);
    });

    if (saveCart(updatedCart)) {
        renderCart();
        showMessage("Product removed from cart.");
    }
}

// Clear all products
function clearCart() {
    const confirmed = window.confirm(
        "Are you sure you want to clear your cart?"
    );

    if (!confirmed) {
        return;
    }

    if (saveCart([])) {
        renderCart();
        showMessage("Your cart has been cleared.");
    }
}

// Handle cart button events
cartItems.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");

    if (!button || button.disabled) {
        return;
    }

    const action = button.dataset.action;
    const productId = button.dataset.id;

    switch (action) {
        case "increase":
            updateQuantity(productId, 1);
            break;

        case "decrease":
            updateQuantity(productId, -1);
            break;

        case "remove":
            removeItem(productId);
            break;
    }
});

// Clear cart button
document.getElementById("clearCart")
    .addEventListener("click", clearCart);

// Synchronize cart between browser tabs
window.addEventListener("storage", event => {
    if (event.key === CART_STORAGE_KEY || event.key === null) {
        renderCart();
    }
});

// Update footer year
document.getElementById("currentYear").textContent =
    new Date().getFullYear();

// Initial render
renderCart();

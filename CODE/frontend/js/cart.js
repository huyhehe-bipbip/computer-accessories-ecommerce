
"use strict";

const CART_STORAGE_KEY = "techgear_cart";
const API_BASE_URL = "http://localhost:5262";

const cartItems = document.getElementById("cartItems");
const cartCount = document.getElementById("cart-count") ||
                  document.getElementById("cartCount");
const itemCount = document.getElementById("itemCount");
const cartLayout = document.getElementById("cartLayout");
const emptyCart = document.getElementById("emptyCart");
const cartMessage = document.getElementById("cartMessage");

const summaryQuantity = document.getElementById("summaryQuantity");
const summarySubtotal = document.getElementById("summarySubtotal");
const summaryTotal = document.getElementById("summaryTotal");

let messageTimer;

// Format price
function formatPrice(price) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND"
    }).format(Number(price) || 0);
}

// Read cart
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

// Save cart
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

// Show message
function showMessage(message, isError = false) {
    if (!cartMessage) return;

    clearTimeout(messageTimer);

    cartMessage.textContent = message;
    cartMessage.classList.toggle("error", isError);
    cartMessage.hidden = false;

    messageTimer = setTimeout(() => {
        cartMessage.hidden = true;
    }, 3000);
}

// Escape HTML
function escapeHTML(value) {
    const element = document.createElement("div");
    element.textContent = String(value ?? "");

    return element.innerHTML
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// Calculate quantity
function calculateQuantity(cart) {
    return cart.reduce((total, item) => {
        return total + Number(item.quantity || 0);
    }, 0);
}

// Calculate subtotal
function calculateSubtotal(cart) {
    return cart.reduce((total, item) => {
        return total +
            Number(item.price || 0) *
            Number(item.quantity || 0);
    }, 0);
}

// Update cart count
function updateCartCount(cart) {
    if (cartCount) {
        cartCount.textContent = calculateQuantity(cart);
    }
}

// Update summary
function updateSummary(cart) {
    const quantity = calculateQuantity(cart);
    const subtotal = calculateSubtotal(cart);

    if (summaryQuantity) {
        summaryQuantity.textContent = quantity;
    }

    if (summarySubtotal) {
        summarySubtotal.textContent = formatPrice(subtotal);
    }

    if (summaryTotal) {
        summaryTotal.textContent = formatPrice(subtotal);
    }
}

// Render product image
function renderProductImage(item) {
    if (item.image) {
        return `
            <img
                src="${escapeHTML(item.image)}"
                alt="${escapeHTML(item.name)}"
                onerror="this.style.display='none'"
            >
        `;
    }

    return `<span>${escapeHTML(item.icon || "📦")}</span>`;
}

// Get latest product images from API
async function refreshCartImages() {
    try {
        const response = await fetch(
            `${API_BASE_URL}/api/products`
        );

        if (!response.ok) {
            throw new Error("Cannot load products from API.");
        }

        const products = await response.json();

        if (!Array.isArray(products)) {
            throw new Error("Invalid product data.");
        }

        const cart = getCart();
        let changed = false;

        cart.forEach(item => {
            const product = products.find(p =>
                String(p.product_id) === String(item.productId)
            );

            if (!product || !product.image_url) {
                return;
            }

            const latestImage = new URL(
                product.image_url,
                API_BASE_URL
            ).href;

            if (item.image !== latestImage) {
                item.image = latestImage;
                changed = true;
            }
        });

        if (changed) {
            saveCart(cart);
            renderCart();
        }

    } catch (error) {
        console.error("Unable to refresh cart images:", error);
    }
}

// Render cart
function renderCart() {
    if (!cartItems) return;

    const cart = getCart();

    updateCartCount(cart);
    updateSummary(cart);

    const quantity = calculateQuantity(cart);

    if (itemCount) {
        itemCount.textContent =
            `${quantity} ${quantity === 1 ? "item" : "items"}`;
    }

    if (cart.length === 0) {
        if (cartLayout) cartLayout.hidden = true;
        if (emptyCart) emptyCart.hidden = false;
        cartItems.innerHTML = "";
        return;
    }

    if (emptyCart) emptyCart.hidden = true;
    if (cartLayout) cartLayout.hidden = false;

    cartItems.innerHTML = cart.map(item => {
        const id = escapeHTML(item.productId);
        const itemQuantity = Number(item.quantity || 1);
        const stock = Number(item.stock || 0);
        const price = Number(item.price || 0);
        const subtotal = price * itemQuantity;

        return `
            <tr>
                <td>
                    <div class="product-info">
                        <div class="product-image">
                            ${renderProductImage(item)}
                        </div>

                        <div class="product-description">
                            <a class="product-name"
                               href="product-details.html?id=${encodeURIComponent(item.productId)}">
                                ${escapeHTML(item.name)}
                            </a>

                            <p class="product-category">
                                ${escapeHTML(item.category || "")}
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
                                ${itemQuantity <= 1 ? "disabled" : ""}>
                            &minus;
                        </button>

                        <span>${itemQuantity}</span>

                        <button type="button"
                                data-action="increase"
                                data-id="${id}"
                                aria-label="Increase quantity"
                                ${itemQuantity >= stock ? "disabled" : ""}>
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

// Update quantity
function updateQuantity(productId, change) {
    const cart = getCart();

    const item = cart.find(product =>
        String(product.productId) === String(productId)
    );

    if (!item) {
        showMessage("Product not found.", true);
        return;
    }

    const newQuantity = Number(item.quantity) + change;

    if (newQuantity < 1) return;

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

// Remove item
function removeItem(productId) {
    const cart = getCart();

    const updatedCart = cart.filter(item =>
        String(item.productId) !== String(productId)
    );

    if (saveCart(updatedCart)) {
        renderCart();
        showMessage("Product removed from cart.");
    }
}

// Clear cart
function clearCart() {
    const confirmed = window.confirm(
        "Are you sure you want to clear your cart?"
    );

    if (!confirmed) return;

    if (saveCart([])) {
        renderCart();
        showMessage("Your cart has been cleared.");
    }
}

// Handle cart buttons
if (cartItems) {
    cartItems.addEventListener("click", event => {
        const button = event.target.closest("button[data-action]");

        if (!button || button.disabled) return;

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
}

// Clear cart button
const clearCartButton = document.getElementById("clearCart");

if (clearCartButton) {
    clearCartButton.addEventListener("click", clearCart);
}

// Synchronize browser tabs
window.addEventListener("storage", event => {
    if (event.key === CART_STORAGE_KEY || event.key === null) {
        renderCart();
    }
});

// Footer year
const currentYear = document.getElementById("currentYear");

if (currentYear) {
    currentYear.textContent = new Date().getFullYear();
}

// Initial render
renderCart();

// Refresh images from database
refreshCartImages();

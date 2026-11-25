
"use strict";

// Format product price
function formatPrice(price) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND"
    }).format(price);
}

// Get product icon
function getProductIcon(category) {
    const name = category.toLowerCase();

    if (name.includes("bàn phím") || name.includes("keyboard")) {
        return "⌨️";
    }

    if (name.includes("chuột") || name.includes("mouse")) {
        return "🖱️";
    }

    if (name.includes("tai nghe") || name.includes("headset")) {
        return "🎧";
    }

    return "🔌";
}

// Create product card
function createProductCard(product, categoryName) {
    const card = document.createElement("article");
    card.className = "product-card";

    const imageBox = document.createElement("div");
    imageBox.className = "product-image";

    function showIcon() {
        imageBox.textContent = getProductIcon(categoryName);
    }

    if (product.image && /^https?:\/\//i.test(product.image)) {
        const image = document.createElement("img");

        image.src = product.image;
        image.alt = product.name;
        image.loading = "lazy";

        image.style.width = "100%";
        image.style.height = "100%";
        image.style.objectFit = "contain";

        image.addEventListener("error", showIcon);

        imageBox.appendChild(image);
    } else {
        showIcon();
    }

    const info = document.createElement("div");
    info.className = "product-info";

    const category = document.createElement("p");
    category.className = "product-category";
    category.textContent = categoryName;

    const name = document.createElement("h3");
    name.className = "product-name";
    name.textContent = product.name;

    const price = document.createElement("p");
    price.className = "product-price";
    price.textContent = formatPrice(product.displayPrice);

    const button = document.createElement("a");
button.className = "product-button";
button.textContent = "View Details";
button.href = `product-details.html?id=${encodeURIComponent(product.id)}&source=api`;

    info.append(category, name, price, button);
    card.append(imageBox, info);

    return card;
}

// Load products from backend API
async function loadFeaturedProducts() {
    const container = document.getElementById(
        "featured-products"
    );

    const status = document.getElementById(
        "product-status"
    );

    container.replaceChildren();
    status.textContent = "Loading products...";

    try {
        const [products, categories] = await Promise.all([
            TechGearAPI.getProducts(),
            TechGearAPI.getCategories()
        ]);

        const categoryMap = new Map(
            categories.map(category => [
                category.id,
                category.name
            ])
        );

        if (products.length === 0) {
            status.textContent = "No products available.";
            return;
        }

        const featuredProducts = products.slice(0, 4);

        featuredProducts.forEach(product => {
            const categoryName =
                categoryMap.get(product.categoryId)
                || "Accessories";

            const card = createProductCard(
                product,
                categoryName
            );

            container.appendChild(card);
        });

        status.textContent =
            "Products loaded from database successfully.";

        status.style.color = "#15803d";

    } catch (error) {
        console.error("Failed to load products:", error);

        status.textContent =
            "Unable to connect to the product API.";

        status.style.color = "#dc2626";
    }
}

// Mobile navigation
const menuToggle = document.getElementById("menu-toggle");
const navMenu = document.getElementById("nav-menu");

menuToggle.addEventListener("click", function () {
    const isOpen = navMenu.classList.toggle("show");

    menuToggle.setAttribute(
        "aria-expanded",
        String(isOpen)
    );
});

// Search form
const searchForm = document.getElementById("search-form");

searchForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const keyword = document
        .getElementById("search-input")
        .value.trim();

    if (keyword) {
        window.location.href =
            "products.html?search=" +
            encodeURIComponent(keyword);
    }
});

// Update shopping cart counter
function updateCartCount() {
    const cartCount = document.getElementById("cart-count");

    try {
        const cart = JSON.parse(
            localStorage.getItem("techgear_cart") || "[]"
        );

        const total = Array.isArray(cart)
            ? cart.reduce(
                (sum, item) =>
                    sum + (Number(item.quantity) || 0),
                0
            )
            : 0;

        cartCount.textContent = total;

    } catch {
        cartCount.textContent = "0";
    }
}

// Update footer year
document.getElementById("current-year").textContent =
    new Date().getFullYear();

// Initialize homepage
updateCartCount();
loadFeaturedProducts();

window.addEventListener("pageshow", updateCartCount);
window.addEventListener("storage", updateCartCount);

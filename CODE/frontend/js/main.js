
// Temporary product data for frontend development
const featuredProducts = [
    {
        id: 1,
        name: "Mechanical Gaming Keyboard",
        category: "Keyboards",
        price: 890000,
        icon: "⌨️"
    },
    {
        id: 2,
        name: "Wireless Gaming Mouse",
        category: "Mice",
        price: 450000,
        icon: "🖱️"
    },
    {
        id: 3,
        name: "RGB Gaming Headset",
        category: "Headsets",
        price: 690000,
        icon: "🎧"
    },
    {
        id: 4,
        name: "USB-C Multiport Hub",
        category: "Accessories",
        price: 550000,
        icon: "🔌"
    }
];

// Format product price in Vietnamese Dong
function formatPrice(price) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND"
    }).format(price);
}

// Render featured products
function renderFeaturedProducts() {
    const productContainer =
        document.getElementById("featured-products");

    if (!productContainer) return;

    productContainer.innerHTML = featuredProducts.map(product => `
        <article class="product-card">
            <div class="product-image" aria-hidden="true">
                ${product.icon}
            </div>

            <div class="product-info">
                <p class="product-category">
                    ${product.category}
                </p>

                <h3 class="product-name">
                    ${product.name}
                </h3>

                <p class="product-price">
                    ${formatPrice(product.price)}
                </p>

                <a class="product-button"
                   href="product-details.html?id=${product.id}">
                    View Details
                </a>
            </div>
        </article>
    `).join("");
}

// Mobile navigation
const menuToggle = document.getElementById("menu-toggle");
const navMenu = document.getElementById("nav-menu");

menuToggle.addEventListener("click", function () {
    const isOpen = navMenu.classList.toggle("show");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
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
            "products.html?search=" + encodeURIComponent(keyword);
    }
});

// Automatically update footer year
document.getElementById("current-year").textContent =
    new Date().getFullYear();

// Initialize homepage
renderFeaturedProducts();

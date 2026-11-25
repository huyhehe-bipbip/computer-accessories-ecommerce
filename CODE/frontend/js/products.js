
"use strict";

// =========================================
// TECHGEAR - PRODUCT LISTING
// =========================================

// APPLICATION STATE

let products = [];
let categories = [];
let isLoading = true;

const filters = {
    keyword: "",
    category: "all",
    minPrice: 0,
    maxPrice: Infinity,
    sort: "default"
};

// =========================================
// DOM ELEMENTS
// =========================================

const productGrid = document.getElementById("productGrid");
const productCount = document.getElementById("productCount");
const emptyState = document.getElementById("emptyState");
const dataStatus = document.getElementById("dataStatus");

const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");

const minPriceInput = document.getElementById("minPrice");
const maxPriceInput = document.getElementById("maxPrice");

const sortProducts = document.getElementById("sortProducts");
const applyFiltersButton = document.getElementById("applyFilters");
const resetFiltersButton = document.getElementById("resetFilters");
const clearEmptyFiltersButton = document.getElementById("clearEmptyFilters");

const filterError = document.getElementById("filterError");

const categoryGroup = document
    .querySelector('input[name="category"]')
    .closest(".filter-group");

// =========================================
// FORMAT PRICE
// =========================================

function formatPrice(price) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND"
    }).format(price);
}

// =========================================
// NORMALIZE SEARCH TEXT
// =========================================

function normalizeText(value) {
    return String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .trim();
}

// =========================================
// CATEGORY MAPPING
// =========================================

function getCategoryKey(category) {
    const text = normalizeText(category);

    if (
        text.includes("ban phim") ||
        text.includes("keyboard")
    ) {
        return "keyboards";
    }

    if (
        text.includes("chuot") ||
        text.includes("mouse") ||
        text === "mice"
    ) {
        return "mice";
    }

    if (
        text.includes("tai nghe") ||
        text.includes("headset") ||
        text.includes("headphone")
    ) {
        return "headsets";
    }

    if (
        text.includes("phu kien") ||
        text.includes("accessor")
    ) {
        return "accessories";
    }

    return text;
}

// =========================================
// CATEGORY ICON
// =========================================

function getCategoryIcon(category) {
    const icons = {
        keyboards: "⌨️",
        mice: "🖱️",
        headsets: "🎧",
        accessories: "🔌"
    };

    return icons[getCategoryKey(category)] || "📦";
}

// =========================================
// BUILD CATEGORY FILTERS
// =========================================

function buildCategoryFilters() {
    categoryGroup.replaceChildren();

    const heading = document.createElement("h3");
    heading.textContent = "Categories";

    categoryGroup.appendChild(heading);

    function addCategoryOption(value, name) {
        const label = document.createElement("label");
        const input = document.createElement("input");

        input.type = "radio";
        input.name = "category";
        input.value = String(value);
        input.checked = filters.category === String(value);

        label.append(
            input,
            document.createTextNode(" " + name)
        );

        categoryGroup.appendChild(label);
    }

    addCategoryOption("all", "All Products");

    categories.forEach(category => {
        addCategoryOption(category.id, category.name);
    });

    // Keep the Accessories navigation option
    // even when no accessory category exists yet.
    const hasAccessories = categories.some(category =>
        getCategoryKey(category.name) === "accessories"
    );

    if (!hasAccessories) {
        addCategoryOption("accessories", "Accessories");
    }
}

// =========================================
// CREATE PRODUCT CARD
// =========================================

function createProductCard(product) {
    const card = document.createElement("article");
    card.className = "catalog-card";

    // Product image

    const imageBox = document.createElement("div");
    imageBox.className = "catalog-card-image";

    const fallbackIcon = getCategoryIcon(product.category);

    if (product.image) {
        const image = document.createElement("img");

        image.src = product.image;
        image.alt = product.name;
        image.loading = "lazy";

        image.addEventListener("error", function () {
            imageBox.textContent = fallbackIcon;
        });

        imageBox.appendChild(image);
    } else {
        imageBox.textContent = fallbackIcon;
    }

    // Product information

    const body = document.createElement("div");
    body.className = "catalog-card-body";

    const category = document.createElement("p");
    category.className = "catalog-card-category";
    category.textContent = product.category;

    const name = document.createElement("h3");
    name.className = "catalog-card-name";
    name.textContent = product.name;

    const price = document.createElement("p");
    price.className = "catalog-card-price";
    price.textContent = formatPrice(product.price);

    // Stock information

    const stock = document.createElement("p");

    stock.textContent = product.stock > 0
        ? `In stock: ${product.stock}`
        : "Out of stock";

    stock.style.fontSize = "13px";
    stock.style.color = product.stock > 0
        ? "#15803d"
        : "#dc2626";

    // Temporarily disable product details
    // until the details page uses backend data.

    const detailsButton = document.createElement("a");
detailsButton.className = "catalog-card-btn";
detailsButton.textContent = "View Details";
detailsButton.href = `product-details.html?id=${encodeURIComponent(product.id)}&source=api`;

    body.append(
        category,
        name,
        price,
        stock,
        detailsButton
    );

    card.append(imageBox, body);

    return card;
}

// =========================================
// RENDER PRODUCTS
// =========================================

function renderProducts(productList) {
    productGrid.replaceChildren();

    productCount.textContent =
        `Showing ${productList.length} ` +
        (productList.length === 1 ? "product" : "products");

    if (productList.length === 0) {
        emptyState.hidden = false;
        return;
    }

    emptyState.hidden = true;

    const fragment = document.createDocumentFragment();

    productList.forEach(product => {
        fragment.appendChild(createProductCard(product));
    });

    productGrid.appendChild(fragment);
}

// =========================================
// FILTER AND SORT PRODUCTS
// =========================================

function filterProducts() {
    if (isLoading) {
        return;
    }

    const keyword = normalizeText(filters.keyword);

    let result = products.filter(product => {
        const matchesKeyword =
            normalizeText(product.name).includes(keyword) ||
            normalizeText(product.category).includes(keyword) ||
            normalizeText(product.description).includes(keyword);

        const matchesCategory =
            filters.category === "all" ||
            String(product.categoryId) === filters.category;

        const matchesPrice =
            product.price >= filters.minPrice &&
            product.price <= filters.maxPrice;

        return (
            matchesKeyword &&
            matchesCategory &&
            matchesPrice
        );
    });

    switch (filters.sort) {
        case "price-asc":
            result.sort((a, b) => a.price - b.price);
            break;

        case "price-desc":
            result.sort((a, b) => b.price - a.price);
            break;

        case "name-asc":
            result.sort((a, b) =>
                a.name.localeCompare(b.name, "vi")
            );
            break;

        case "name-desc":
            result.sort((a, b) =>
                b.name.localeCompare(a.name, "vi")
            );
            break;

        default:
            break;
    }

    renderProducts(result);
}

// =========================================
// SEARCH PRODUCTS
// =========================================

searchForm.addEventListener("submit", function (event) {
    event.preventDefault();

    filters.keyword = searchInput.value.trim();

    filterProducts();
});

searchInput.addEventListener("input", function () {
    filters.keyword = searchInput.value.trim();

    filterProducts();
});

// =========================================
// CATEGORY FILTER
// =========================================

categoryGroup.addEventListener("change", function (event) {
    if (event.target.matches('input[name="category"]')) {
        filters.category = event.target.value;

        filterProducts();
    }
});

// =========================================
// PRICE FILTER
// =========================================

function applyPriceFilter() {
    const min = minPriceInput.value === ""
        ? 0
        : Number(minPriceInput.value);

    const max = maxPriceInput.value === ""
        ? Infinity
        : Number(maxPriceInput.value);

    if (
        !minPriceInput.validity.valid ||
        !maxPriceInput.validity.valid ||
        !Number.isFinite(min) ||
        Number.isNaN(max) ||
        min < 0 ||
        max < 0
    ) {
        filterError.textContent =
            "Please enter valid non-negative prices.";

        return;
    }

    if (min > max) {
        filterError.textContent =
            "Minimum price cannot exceed maximum price.";

        return;
    }

    filterError.textContent = "";

    filters.minPrice = min;
    filters.maxPrice = max;

    filterProducts();
}

applyFiltersButton.addEventListener(
    "click",
    applyPriceFilter
);

// =========================================
// SORT PRODUCTS
// =========================================

sortProducts.addEventListener("change", function () {
    filters.sort = sortProducts.value;

    filterProducts();
});

// =========================================
// RESET FILTERS
// =========================================

function resetFilters() {
    filters.keyword = "";
    filters.category = "all";
    filters.minPrice = 0;
    filters.maxPrice = Infinity;
    filters.sort = "default";

    searchInput.value = "";
    minPriceInput.value = "";
    maxPriceInput.value = "";
    sortProducts.value = "default";
    filterError.textContent = "";

    categoryGroup
        .querySelectorAll('input[name="category"]')
        .forEach(input => {
            input.checked = input.value === "all";
        });

    history.replaceState(
        null,
        "",
        window.location.pathname
    );

    filterProducts();
}

resetFiltersButton.addEventListener(
    "click",
    resetFilters
);

clearEmptyFiltersButton.addEventListener(
    "click",
    resetFilters
);

// =========================================
// READ URL PARAMETERS
// =========================================

function readUrlParameters() {
    const params = new URLSearchParams(
        window.location.search
    );

    const category = params.get("category");
    const keyword = params.get("search");

    if (category) {
        const matchedCategory = categories.find(item =>
            String(item.id) === category ||
            normalizeText(item.name) === normalizeText(category) ||
            getCategoryKey(item.name) === getCategoryKey(category)
        );

        if (matchedCategory) {
            filters.category = String(matchedCategory.id);
        } else if (getCategoryKey(category) === "accessories") {
            filters.category = "accessories";
        }
    }

    if (keyword) {
        searchInput.value = keyword;
        filters.keyword = keyword.trim();
    }
}

// =========================================
// MOBILE NAVIGATION
// =========================================

const menuToggle = document.getElementById("menuToggle");
const catalogNav = document.getElementById("catalogNav");

menuToggle.addEventListener("click", function () {
    const isOpen = catalogNav.classList.toggle("is-open");

    menuToggle.setAttribute(
        "aria-expanded",
        String(isOpen)
    );

    menuToggle.textContent = isOpen ? "✕" : "☰";
});

// =========================================
// UPDATE CART COUNT
// =========================================

function updateCartCount() {
    const cartCount = document.getElementById("cartCount");

    try {
        const cart = JSON.parse(
            localStorage.getItem("techgear_cart") || "[]"
        );

        const total = Array.isArray(cart)
            ? cart.reduce((sum, item) => {
                const quantity = Number(item.quantity);

                return sum + (
                    Number.isSafeInteger(quantity) &&
                    quantity > 0
                        ? quantity
                        : 0
                );
            }, 0)
            : 0;

        cartCount.textContent = total;
    } catch {
        cartCount.textContent = "0";
    }
}

// =========================================
// LOAD PRODUCTS FROM BACKEND API
// =========================================

async function loadProducts() {
    isLoading = true;

    productCount.textContent = "Loading products...";
    dataStatus.textContent = "Connecting to database...";
    emptyState.hidden = true;

    try {
        const [apiProducts, apiCategories] = await Promise.all([
            window.TechGearAPI.getProducts(),
            window.TechGearAPI.getCategories()
        ]);

        categories = apiCategories;

        products = apiProducts.map(product => {
            const category = categories.find(item =>
                Number(item.id) === Number(product.categoryId)
            );

            const price = Number(
                product.displayPrice ?? product.guestPrice
            );

            if (!Number.isFinite(price) || price < 0) {
                throw new Error("Invalid product price.");
            }

            return {
                id: product.id,
                name: product.name,
                description: product.description,
                image: product.image,
                categoryId: product.categoryId,
                category: category
                    ? category.name
                    : "Uncategorized",
                price: price,
                guestPrice: product.guestPrice,
                memberPrice: product.memberPrice,
                stock: product.stock
            };
        });

        readUrlParameters();
        buildCategoryFilters();

        dataStatus.textContent =
            "Products loaded from database successfully.";

        dataStatus.style.color = "#15803d";

        isLoading = false;

        filterProducts();

    } catch (error) {
        console.error("Failed to load products:", error);

        products = [];
        isLoading = false;

        productGrid.replaceChildren();

        productCount.textContent = "Products unavailable";
        emptyState.hidden = true;

        dataStatus.textContent =
            "Unable to connect to the database. Please check the backend.";

        dataStatus.style.color = "#dc2626";
    }
}

// =========================================
// INITIALIZE APPLICATION
// =========================================

function initialize() {
    updateCartCount();
    loadProducts();
}

window.addEventListener("pageshow", updateCartCount);
window.addEventListener("storage", updateCartCount);

initialize();

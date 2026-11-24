
// =========================================
// TECHGEAR - PRODUCT LISTING
// =========================================

// API configuration
const API_CONFIG = {
    enabled: false,
    productsUrl: ""
};

// =========================================
// SAMPLE PRODUCT DATA
// =========================================

const sampleProducts = [
    {
        id: 1,
        name: "Mechanical Gaming Keyboard",
        category: "Keyboards",
        price: 890000,
        icon: "⌨️",
        image: ""
    },
    {
        id: 2,
        name: "Wireless Gaming Mouse",
        category: "Mice",
        price: 450000,
        icon: "🖱️",
        image: ""
    },
    {
        id: 3,
        name: "RGB Gaming Headset",
        category: "Headsets",
        price: 690000,
        icon: "🎧",
        image: ""
    },
    {
        id: 4,
        name: "USB-C Multiport Hub",
        category: "Accessories",
        price: 550000,
        icon: "🔌",
        image: ""
    },
    {
        id: 5,
        name: "RGB Mechanical Keyboard",
        category: "Keyboards",
        price: 1290000,
        icon: "⌨️",
        image: ""
    },
    {
        id: 6,
        name: "Wired Optical Mouse",
        category: "Mice",
        price: 250000,
        icon: "🖱️",
        image: ""
    },
    {
        id: 7,
        name: "Wireless Bluetooth Headset",
        category: "Headsets",
        price: 990000,
        icon: "🎧",
        image: ""
    },
    {
        id: 8,
        name: "USB Charging Cable",
        category: "Accessories",
        price: 150000,
        icon: "🔌",
        image: ""
    },
    {
        id: 9,
        name: "Compact Wireless Keyboard",
        category: "Keyboards",
        price: 590000,
        icon: "⌨️",
        image: ""
    },
    {
        id: 10,
        name: "Professional Gaming Mouse",
        category: "Mice",
        price: 790000,
        icon: "🖱️",
        image: ""
    },
    {
        id: 11,
        name: "Studio Stereo Headset",
        category: "Headsets",
        price: 1490000,
        icon: "🎧",
        image: ""
    },
    {
        id: 12,
        name: "Large Gaming Mouse Pad",
        category: "Accessories",
        price: 290000,
        icon: "🖥️",
        image: ""
    }
];

// =========================================
// APPLICATION STATE
// =========================================

let products = [];

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

const clearEmptyFiltersButton =
    document.getElementById("clearEmptyFilters");

const filterError = document.getElementById("filterError");

const categoryInputs =
    document.querySelectorAll('input[name="category"]');

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
// CATEGORY ICON
// =========================================

function getCategoryIcon(category) {
    const icons = {
        Keyboards: "⌨️",
        Mice: "🖱️",
        Headsets: "🎧",
        Accessories: "🔌"
    };

    return icons[category] || "📦";
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

    const fallbackIcon =
        product.icon || getCategoryIcon(product.category);

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

    // Product details link
    const detailsButton = document.createElement("a");
    detailsButton.className = "catalog-card-btn";

    detailsButton.href =
        "product-details.html?id=" +
        encodeURIComponent(product.id);

    detailsButton.textContent = "View Details";

    body.append(category, name, price, detailsButton);
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

    productList.forEach(function (product) {
        fragment.appendChild(createProductCard(product));
    });

    productGrid.appendChild(fragment);
}

// =========================================
// FILTER AND SORT PRODUCTS
// =========================================

function filterProducts() {
    let result = products.filter(function (product) {

        const keyword = filters.keyword.toLowerCase();

        const matchesKeyword =
            product.name.toLowerCase().includes(keyword) ||
            product.category.toLowerCase().includes(keyword);

        const matchesCategory =
            filters.category === "all" ||
            product.category.toLowerCase() ===
            filters.category.toLowerCase();

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
                a.name.localeCompare(b.name)
            );
            break;

        case "name-desc":
            result.sort((a, b) =>
                b.name.localeCompare(a.name)
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

// Live search without reloading the page
searchInput.addEventListener("input", function () {
    filters.keyword = searchInput.value.trim();

    filterProducts();
});

// =========================================
// CATEGORY FILTER
// =========================================

categoryInputs.forEach(function (input) {
    input.addEventListener("change", function () {
        filters.category = input.value;

        filterProducts();
    });
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

    categoryInputs.forEach(function (input) {
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
        categoryInputs.forEach(function (input) {
            if (
                input.value.toLowerCase() ===
                category.toLowerCase()
            ) {
                input.checked = true;
                filters.category = input.value;
            }
        });
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

    const isOpen =
        catalogNav.classList.toggle("is-open");

    menuToggle.setAttribute(
        "aria-expanded",
        String(isOpen)
    );

    menuToggle.textContent = isOpen ? "✕" : "☰";
});

// =========================================
// LOAD PRODUCTS FROM API
// =========================================

async function loadProducts() {

    if (!API_CONFIG.enabled) {

        products = [...sampleProducts];

        dataStatus.textContent =
            "Sample products for UI preview.";

        filterProducts();

        return;
    }

    try {
        dataStatus.textContent = "Loading products...";

        const response = await fetch(
            API_CONFIG.productsUrl
        );

        if (!response.ok) {
            throw new Error(
                `HTTP error: ${response.status}`
            );
        }

        const data = await response.json();

        // Expected frontend data structure.
        // Update this mapping after checking the backend API.

        if (
            !Array.isArray(data) ||
            !data.every(product =>
                product.id != null &&
                typeof product.name === "string" &&
                typeof product.category === "string" &&
                typeof product.price === "number" &&
                Number.isFinite(product.price) &&
                product.price >= 0
            )
        ) {
            throw new Error("Invalid product data format.");
        }

        products = data;

        dataStatus.textContent = "";

        filterProducts();

    } catch (error) {

        console.error("Failed to load products:", error);

        products = [];

        productGrid.replaceChildren();

        productCount.textContent = "Products unavailable";

        emptyState.hidden = true;

        dataStatus.textContent =
            "Unable to load products. Please try again later.";
    }
}

// =========================================
// INITIALIZE APPLICATION
// =========================================

function initialize() {
    readUrlParameters();
    loadProducts();
}

initialize();

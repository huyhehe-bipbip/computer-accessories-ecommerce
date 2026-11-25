
/* =========================================
   TECHGEAR - PRODUCT DETAILS
   Backend API Integration
========================================= */

const CART_STORAGE_KEY = "techgear_cart";

let detailProducts = [];
let currentProduct = null;

const $ = id => document.getElementById(id);

const quantityInput = $("quantity");
const decreaseButton = $("decreaseQuantity");
const increaseButton = $("increaseQuantity");
const addToCartButton = $("addToCart");
const cartMessage = $("cartMessage");

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
// PRODUCT ICON
// =========================================

function getProductIcon(category) {
    const name = category.toLowerCase();

    if (name.includes("bàn phím") ||
        name.includes("keyboard")) {
        return "⌨️";
    }

    if (name.includes("chuột") ||
        name.includes("mouse")) {
        return "🖱️";
    }

    if (name.includes("tai nghe") ||
        name.includes("headset")) {
        return "🎧";
    }

    return "🔌";
}

// =========================================
// NORMALIZE PRODUCT DATA
// =========================================

function mapProduct(product, categories) {
    const category = categories.find(
        item => Number(item.id) === Number(product.categoryId)
    );

    const categoryName = category
        ? category.name
        : `Category #${product.categoryId}`;

    return {
        id: Number(product.id),
        name: product.name,
        description: product.description || "",
        category: categoryName,
        categoryId: Number(product.categoryId),
        price: Number(product.guestPrice),
        memberPrice: Number(product.memberPrice),
        stock: Number(product.stock),
        image: product.image || "",
        icon: getProductIcon(categoryName),
        source: "api"
    };
}

// =========================================
// MEMBER PRICE
// =========================================

function getMemberPrice(product) {
    return product.memberPrice;
}

function getSavingPercentage(product) {
    if (product.price <= 0) return 0;

    return Math.max(
        0,
        Math.round(
            (1 - product.memberPrice / product.price) * 100
        )
    );
}

// =========================================
// CART STORAGE
// =========================================

function getCart() {
    const storedCart = localStorage.getItem(
        CART_STORAGE_KEY
    );

    if (!storedCart) return [];

    const cart = JSON.parse(storedCart);

    if (
        !Array.isArray(cart) ||
        !cart.every(item =>
            item &&
            Number.isInteger(item.productId) &&
            Number.isSafeInteger(item.quantity) &&
            item.quantity > 0
        )
    ) {
        throw new Error("Invalid cart data.");
    }

    return cart;
}

function saveCart(cart) {
    localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(cart)
    );
}

function updateCartCount() {
    try {
        const totalQuantity = getCart().reduce(
            (total, item) => total + item.quantity,
            0
        );

        $("cartCount").textContent =
            `Cart (${totalQuantity})`;

    } catch (error) {
        $("cartCount").textContent =
            "Cart (Unavailable)";

        console.error(error);
    }
}

// =========================================
// GET PRODUCT ID FROM URL
// =========================================

function getProductId() {
    const params = new URLSearchParams(
        window.location.search
    );

    const id = params.get("id");

    if (!id || !/^\d+$/.test(id)) {
        return null;
    }

    const productId = Number(id);

    return Number.isSafeInteger(productId) &&
           productId > 0
        ? productId
        : null;
}

// =========================================
// DATA STATUS
// =========================================

function showDataStatus(message, type) {
    let status = $("detailDataStatus");

    if (!status) {
        status = document.createElement("p");
        status.id = "detailDataStatus";

        status.setAttribute("role", "status");
        status.style.marginBottom = "16px";
        status.style.fontSize = "14px";

        $("productDetails").before(status);
    }

    status.textContent = message;

    status.style.color =
        type === "success"
            ? "#15803d"
            : type === "error"
                ? "#dc2626"
                : "#64748b";
}

// =========================================
// DISPLAY PRODUCT IMAGE
// =========================================

function renderProductImage(container, product) {
    container.replaceChildren();

    function showIcon() {
        container.textContent = product.icon;

        container.setAttribute("role", "img");
        container.setAttribute(
            "aria-label",
            product.name + " illustration"
        );
    }

    if (!product.image) {
        showIcon();
        return;
    }

    try {
        const url = new URL(
            product.image,
            "http://localhost:5262"
        );

        if (!["http:", "https:"].includes(url.protocol)) {
            showIcon();
            return;
        }

        const image = document.createElement("img");

        image.src = url.href;
        image.alt = product.name;

        image.addEventListener("error", showIcon);

        container.appendChild(image);

    } catch {
        showIcon();
    }
}

// =========================================
// DISPLAY PRODUCT DETAILS
// =========================================

function renderProductDetails(product) {
    document.title = `${product.name} | TechGear`;

    $("breadcrumbName").textContent = product.name;
    $("productCategory").textContent = product.category;
    $("productName").textContent = product.name;

    $("productDescription").textContent =
        product.description || "No description available.";

    $("guestPrice").textContent =
        formatPrice(product.price);

    $("memberPrice").textContent =
        formatPrice(getMemberPrice(product));

    $("savingBadge").textContent =
        `Save ${getSavingPercentage(product)}%`;

    renderProductImage(
        $("productImage"),
        product
    );

    const imageNote = document.querySelector(
        ".pd-image-note"
    );

    if (imageNote) {
        imageNote.textContent = "Product illustration";
    }

    const stockStatus = $("stockStatus");

    if (product.stock > 0) {
        stockStatus.textContent =
            `In Stock · ${product.stock} available`;

        stockStatus.classList.remove("out-of-stock");

    } else {
        stockStatus.textContent = "Out of Stock";
        stockStatus.classList.add("out-of-stock");
    }

    $("availableQuantity").textContent =
        `${product.stock} available`;

    quantityInput.min = product.stock > 0 ? 1 : 0;
    quantityInput.max = product.stock;
    quantityInput.value = product.stock > 0 ? 1 : 0;

    quantityInput.disabled = product.stock === 0;
    addToCartButton.disabled = product.stock === 0;

    addToCartButton.textContent =
        product.stock > 0
            ? "Add to Cart"
            : "Out of Stock";

    $("productDetails").hidden = false;

    renderSpecifications(product);
    updateQuantity();
}

// =========================================
// PRODUCT SPECIFICATIONS
// =========================================

function renderSpecifications(product) {
    $("specId").textContent = product.id;
    $("specName").textContent = product.name;
    $("specCategory").textContent = product.category;

    $("specStock").textContent =
        product.stock > 0
            ? `${product.stock} items in stock`
            : "Out of Stock";

    $("specifications").hidden = false;
}

// =========================================
// QUANTITY VALIDATION
// =========================================

function getValidQuantity() {
    if (!currentProduct || currentProduct.stock === 0) {
        return 0;
    }

    let quantity = Number(quantityInput.value);

    if (!Number.isFinite(quantity)) {
        quantity = 1;
    }

    quantity = Math.floor(quantity);

    return Math.max(
        1,
        Math.min(quantity, currentProduct.stock)
    );
}

function updateQuantity() {
    if (!currentProduct) return;

    const quantity = getValidQuantity();

    quantityInput.value = quantity;

    decreaseButton.disabled = quantity <= 1;

    increaseButton.disabled =
        quantity >= currentProduct.stock;

    $("totalPrice").textContent = formatPrice(
        currentProduct.price * quantity
    );
}

// =========================================
// QUANTITY EVENTS
// =========================================

decreaseButton.addEventListener("click", function () {
    quantityInput.value = getValidQuantity() - 1;
    updateQuantity();
});

increaseButton.addEventListener("click", function () {
    quantityInput.value = getValidQuantity() + 1;
    updateQuantity();
});

quantityInput.addEventListener(
    "change",
    updateQuantity
);

quantityInput.addEventListener("input", function () {
    if (quantityInput.value !== "") {
        updateQuantity();
    }
});

// =========================================
// CART MESSAGE
// =========================================

function showMessage(message, type) {
    cartMessage.textContent = message;
    cartMessage.className = `pd-message ${type}`;
}

// =========================================
// ADD TO CART
// =========================================

function addToCart() {
    if (!currentProduct) return;

    if (currentProduct.stock === 0) {
        showMessage(
            "This product is out of stock.",
            "error"
        );

        return;
    }

    const quantity = getValidQuantity();

    updateQuantity();

    try {
        const cart = getCart();

        // Prevent mixing sample and database products
        if (cart.some(item => item.source !== "api")) {
            showMessage(
                "Please remove sample products from your cart first.",
                "error"
            );

            return;
        }

        const existingItem = cart.find(
            item => item.productId === currentProduct.id
        );

        const existingQuantity = cart
            .filter(item =>
                item.productId === currentProduct.id
            )
            .reduce(
                (total, item) => total + item.quantity,
                0
            );

        const newQuantity =
            existingQuantity + quantity;

        if (newQuantity > currentProduct.stock) {
            showMessage(
                "The requested quantity exceeds available stock.",
                "error"
            );

            return;
        }

        const cartItem = {
            productId: currentProduct.id,
            name: currentProduct.name,
            category: currentProduct.category,
            price: currentProduct.price,
            memberPrice: currentProduct.memberPrice,
            stock: currentProduct.stock,
            icon: currentProduct.icon,
            image: currentProduct.image,
            source: "api"
        };

        if (existingItem) {
            const updatedQuantity =
                existingItem.quantity + quantity;

            Object.assign(existingItem, cartItem, {
                quantity: updatedQuantity
            });

        } else {
            cart.push({
                ...cartItem,
                quantity: quantity
            });
        }

        saveCart(cart);
        updateCartCount();

        showMessage(
            `${quantity} item(s) added to your cart successfully.`,
            "success"
        );

    } catch (error) {
        console.error("Cart error:", error);

        showMessage(
            "Unable to save your cart.",
            "error"
        );
    }
}

addToCartButton.addEventListener(
    "click",
    addToCart
);

// =========================================
// RELATED PRODUCTS
// =========================================

function createRelatedCard(product) {
    const card = document.createElement("article");
    card.className = "pd-related-card";

    const imageBox = document.createElement("div");
    imageBox.className = "pd-related-image";

    renderProductImage(imageBox, product);

    const body = document.createElement("div");
    body.className = "pd-related-body";

    const category = document.createElement("p");
    category.textContent = product.category;

    const name = document.createElement("h3");
    name.textContent = product.name;

    const price = document.createElement("strong");
    price.textContent = formatPrice(product.price);

    const link = document.createElement("a");

    link.href =
        `product-details.html?id=${product.id}&source=api`;

    link.textContent = "View Details";

    body.append(category, name, price, link);
    card.append(imageBox, body);

    return card;
}

function renderRelatedProducts(product) {
    const container = $("relatedProducts");

    const sameCategory = detailProducts.filter(item =>
        item.id !== product.id &&
        item.categoryId === product.categoryId
    );

    const otherProducts = detailProducts.filter(item =>
        item.id !== product.id &&
        item.categoryId !== product.categoryId
    );

    const relatedProducts = [
        ...sameCategory,
        ...otherProducts
    ].slice(0, 4);

    container.replaceChildren();

    relatedProducts.forEach(item => {
        container.appendChild(
            createRelatedCard(item)
        );
    });

    $("relatedSection").hidden =
        relatedProducts.length === 0;
}

// =========================================
// SEARCH FORM
// =========================================

$("detailSearchForm").addEventListener(
    "submit",
    function (event) {
        event.preventDefault();

        const keyword = $("detailSearchInput")
            .value.trim();

        window.location.href = keyword
            ? "products.html?search=" +
                encodeURIComponent(keyword)
            : "products.html";
    }
);

// =========================================
// PRODUCT NOT FOUND
// =========================================

function showNotFound() {
    document.title = "Product Not Found | TechGear";

    $("notFound").hidden = false;
    $("productDetails").hidden = true;
    $("specifications").hidden = true;
    $("relatedSection").hidden = true;
}

// =========================================
// INITIALIZE APPLICATION
// =========================================

async function initialize() {
    $("detailYear").textContent =
        new Date().getFullYear();

    updateCartCount();

    const productId = getProductId();

    if (!productId) {
        showNotFound();
        return;
    }

    const source = new URLSearchParams(
        window.location.search
    ).get("source");

    if (source === "fallback") {
        showDataStatus(
            "Sample product details are no longer available. Please browse database products.",
            "error"
        );

        return;
    }

    showDataStatus(
        "Loading product details...",
        "loading"
    );

    try {
        const [products, categories] = await Promise.all([
            TechGearAPI.getProducts(),
            TechGearAPI.getCategories()
        ]);

        detailProducts = products.map(
            product => mapProduct(product, categories)
        );

        currentProduct = detailProducts.find(
            product => product.id === productId
        );

        if (!currentProduct) {
            showDataStatus(
                "Product not found in database.",
                "error"
            );

            showNotFound();
            return;
        }

        renderProductDetails(currentProduct);
        renderRelatedProducts(currentProduct);

        showDataStatus(
            "Product loaded from database successfully.",
            "success"
        );

    } catch (error) {
        console.error("Product loading error:", error);

        showDataStatus(
            "Unable to connect to the backend. Please check the API server.",
            "error"
        );
    }
}

window.addEventListener("pageshow", updateCartCount);
window.addEventListener("storage", updateCartCount);

initialize();

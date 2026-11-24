
// =========================================
// TECHGEAR - PRODUCT DETAILS
// =========================================

const CART_STORAGE_KEY = "techgear_cart";
const MEMBER_DISCOUNT = 0.10;

// =========================================
// SAMPLE PRODUCT DATA
// =========================================

const detailProducts = [
    {
        id: 1,
        name: "Mechanical Gaming Keyboard",
        category: "Keyboards",
        price: 890000,
        stock: 25,
        icon: "⌨️",
        image: "",
        description:
            "A mechanical gaming keyboard designed for responsive typing, gaming performance and everyday computer use."
    },
    {
        id: 2,
        name: "Wireless Gaming Mouse",
        category: "Mice",
        price: 450000,
        stock: 30,
        icon: "🖱️",
        image: "",
        description:
            "A comfortable wireless gaming mouse designed for precise cursor control and convenient everyday use."
    },
    {
        id: 3,
        name: "RGB Gaming Headset",
        category: "Headsets",
        price: 690000,
        stock: 18,
        icon: "🎧",
        image: "",
        description:
            "A gaming headset with RGB lighting, comfortable ear cushions and clear audio for gaming and communication."
    },
    {
        id: 4,
        name: "USB-C Multiport Hub",
        category: "Accessories",
        price: 550000,
        stock: 20,
        icon: "🔌",
        image: "",
        description:
            "A compact USB-C multiport hub designed to expand connectivity for compatible laptops and computer devices."
    },
    {
        id: 5,
        name: "RGB Mechanical Keyboard",
        category: "Keyboards",
        price: 1290000,
        stock: 12,
        icon: "⌨️",
        image: "",
        description:
            "A mechanical keyboard with RGB lighting, designed for gaming setups and comfortable typing."
    },
    {
        id: 6,
        name: "Wired Optical Mouse",
        category: "Mice",
        price: 250000,
        stock: 40,
        icon: "🖱️",
        image: "",
        description:
            "A reliable wired optical mouse suitable for office work, studying and daily computer tasks."
    },
    {
        id: 7,
        name: "Wireless Bluetooth Headset",
        category: "Headsets",
        price: 990000,
        stock: 15,
        icon: "🎧",
        image: "",
        description:
            "A wireless Bluetooth headset designed for convenient listening, online meetings and entertainment."
    },
    {
        id: 8,
        name: "USB Charging Cable",
        category: "Accessories",
        price: 150000,
        stock: 50,
        icon: "🔌",
        image: "",
        description:
            "A practical USB charging cable for compatible electronic devices and everyday charging needs."
    },
    {
        id: 9,
        name: "Compact Wireless Keyboard",
        category: "Keyboards",
        price: 590000,
        stock: 22,
        icon: "⌨️",
        image: "",
        description:
            "A compact wireless keyboard designed to save desk space and provide convenient typing."
    },
    {
        id: 10,
        name: "Professional Gaming Mouse",
        category: "Mice",
        price: 790000,
        stock: 16,
        icon: "🖱️",
        image: "",
        description:
            "A gaming mouse designed for accurate movement, comfortable handling and responsive gaming control."
    },
    {
        id: 11,
        name: "Studio Stereo Headset",
        category: "Headsets",
        price: 1490000,
        stock: 0,
        icon: "🎧",
        image: "",
        description:
            "A stereo headset designed for music listening, multimedia activities and comfortable extended use."
    },
    {
        id: 12,
        name: "Large Gaming Mouse Pad",
        category: "Accessories",
        price: 290000,
        stock: 35,
        icon: "🖥️",
        image: "",
        description:
            "A large mouse pad providing a smooth surface and additional space for keyboard and mouse movement."
    }
];

// =========================================
// APPLICATION STATE
// =========================================

let currentProduct = null;

// =========================================
// DOM ELEMENTS
// =========================================

const quantityInput =
    document.getElementById("quantity");

const decreaseButton =
    document.getElementById("decreaseQuantity");

const increaseButton =
    document.getElementById("increaseQuantity");

const addToCartButton =
    document.getElementById("addToCart");

const cartMessage =
    document.getElementById("cartMessage");

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
// MEMBER PRICE
// =========================================

function getMemberPrice(product) {
    return Math.round(
        product.price * (1 - MEMBER_DISCOUNT)
    );
}

// =========================================
// CART STORAGE
// =========================================

function getCart() {

    const storedCart = localStorage.getItem(
        CART_STORAGE_KEY
    );

    if (!storedCart) {
        return [];
    }

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

// =========================================
// UPDATE CART COUNT
// =========================================

function updateCartCount() {

    const cartCount =
        document.getElementById("cartCount");

    try {

        const cart = getCart();

        const totalQuantity = cart.reduce(
            (total, item) => total + item.quantity,
            0
        );

        cartCount.textContent =
            `Cart (${totalQuantity})`;

    } catch (error) {

        cartCount.textContent = "Cart (Unavailable)";

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

    return Number.isSafeInteger(productId)
        ? productId
        : null;

}

// =========================================
// DISPLAY PRODUCT IMAGE
// =========================================

function renderProductImage(container, product) {

    container.replaceChildren();

    if (product.image) {

        const image = document.createElement("img");

        image.src = product.image;
        image.alt = product.name;

        image.addEventListener("error", function () {
            container.textContent = product.icon;
        });

        container.appendChild(image);

    } else {

        container.textContent = product.icon;

        container.setAttribute("role", "img");

        container.setAttribute(
            "aria-label",
            product.name + " illustration"
        );

    }

}

// =========================================
// DISPLAY PRODUCT DETAILS
// =========================================

function renderProductDetails(product) {

    document.title =
        `${product.name} | TechGear`;

    document.getElementById(
        "breadcrumbName"
    ).textContent = product.name;

    document.getElementById(
        "productCategory"
    ).textContent = product.category;

    document.getElementById(
        "productName"
    ).textContent = product.name;

    document.getElementById(
        "productDescription"
    ).textContent = product.description;

    document.getElementById(
        "guestPrice"
    ).textContent = formatPrice(product.price);

    document.getElementById(
        "memberPrice"
    ).textContent = formatPrice(
        getMemberPrice(product)
    );

    document.getElementById(
        "savingBadge"
    ).textContent =
        `Save ${Math.round(MEMBER_DISCOUNT * 100)}%`;

    renderProductImage(
        document.getElementById("productImage"),
        product
    );

    const stockStatus =
        document.getElementById("stockStatus");

    if (product.stock > 0) {

        stockStatus.textContent =
            `In Stock · ${product.stock} available`;

        stockStatus.classList.remove("out-of-stock");

    } else {

        stockStatus.textContent = "Out of Stock";

        stockStatus.classList.add("out-of-stock");

    }

    document.getElementById(
        "availableQuantity"
    ).textContent = `${product.stock} available`;

    quantityInput.min = product.stock > 0 ? 1 : 0;
    quantityInput.max = product.stock;
    quantityInput.value = product.stock > 0 ? 1 : 0;

    quantityInput.disabled = product.stock === 0;

    addToCartButton.disabled = product.stock === 0;

    addToCartButton.textContent =
        product.stock > 0
            ? "Add to Cart"
            : "Out of Stock";

    document.getElementById(
        "productDetails"
    ).hidden = false;

    renderSpecifications(product);

    updateQuantity();

}

// =========================================
// PRODUCT SPECIFICATIONS
// =========================================

function renderSpecifications(product) {

    document.getElementById(
        "specId"
    ).textContent = product.id;

    document.getElementById(
        "specName"
    ).textContent = product.name;

    document.getElementById(
        "specCategory"
    ).textContent = product.category;

    document.getElementById(
        "specStock"
    ).textContent =
        product.stock > 0
            ? `${product.stock} items in stock`
            : "Out of Stock";

    document.getElementById(
        "specifications"
    ).hidden = false;

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

// =========================================
// UPDATE QUANTITY AND TOTAL PRICE
// =========================================

function updateQuantity() {

    if (!currentProduct) return;

    const quantity = getValidQuantity();

    quantityInput.value = quantity;

    decreaseButton.disabled = quantity <= 1;

    increaseButton.disabled =
        quantity >= currentProduct.stock;

    document.getElementById(
        "totalPrice"
    ).textContent = formatPrice(
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

quantityInput.addEventListener("change", updateQuantity);

quantityInput.addEventListener("input", function () {

    if (quantityInput.value !== "") {
        updateQuantity();
    }

});

// =========================================
// SHOW CART MESSAGE
// =========================================

function showMessage(message, type) {

    cartMessage.textContent = message;

    cartMessage.className =
        `pd-message ${type}`;

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

        // Prevent cart quantity exceeding sample stock
        if (newQuantity > currentProduct.stock) {

            showMessage(
                "The requested quantity exceeds available stock.",
                "error"
            );

            return;

        }

        if (existingItem) {

            existingItem.quantity += quantity;

        } else {

            cart.push({
                productId: currentProduct.id,
                name: currentProduct.name,
                category: currentProduct.category,
                price: currentProduct.price,
                memberPrice: getMemberPrice(currentProduct),
                stock: currentProduct.stock,
                icon: currentProduct.icon,
                image: currentProduct.image,
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
            "Unable to save your cart. Please check browser storage.",
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
        `product-details.html?id=${product.id}`;

    link.textContent = "View Details";

    body.append(category, name, price, link);

    card.append(imageBox, body);

    return card;

}

function renderRelatedProducts(product) {

    const container =
        document.getElementById("relatedProducts");

    const sameCategory = detailProducts.filter(item =>
        item.id !== product.id &&
        item.category === product.category
    );

    const otherProducts = detailProducts.filter(item =>
        item.id !== product.id &&
        item.category !== product.category
    );

    const relatedProducts = [
        ...sameCategory,
        ...otherProducts
    ].slice(0, 4);

    container.replaceChildren();

    relatedProducts.forEach(function (item) {

        container.appendChild(
            createRelatedCard(item)
        );

    });

    document.getElementById(
        "relatedSection"
    ).hidden = relatedProducts.length === 0;

}

// =========================================
// SEARCH FORM
// =========================================

document.getElementById(
    "detailSearchForm"
).addEventListener("submit", function (event) {

    event.preventDefault();

    const keyword = document.getElementById(
        "detailSearchInput"
    ).value.trim();

    window.location.href = keyword
        ? "products.html?search=" +
            encodeURIComponent(keyword)
        : "products.html";

});

// =========================================
// INITIALIZE APPLICATION
// =========================================

function initialize() {

    document.getElementById(
        "detailYear"
    ).textContent = new Date().getFullYear();

    updateCartCount();

    const productId = getProductId();

    currentProduct = detailProducts.find(
        product => product.id === productId
    );

    if (!currentProduct) {

        document.title = "Product Not Found | TechGear";

        document.getElementById(
            "notFound"
        ).hidden = false;

        return;

    }

    renderProductDetails(currentProduct);

    renderRelatedProducts(currentProduct);

}

initialize();

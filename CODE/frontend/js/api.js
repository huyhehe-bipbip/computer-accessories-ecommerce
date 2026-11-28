
const TechGearAPI = (() => {
    const BASE_URL = "http://localhost:5262/api";
    const IMAGE_BASE_URL = "http://localhost:5262";

    // =========================================
    // API REQUEST
    // =========================================

    async function request(endpoint, options = {}) {
        const headers = {
            Accept: "application/json",
            ...options.headers
        };

        if (
            options.body !== undefined &&
            !(options.body instanceof FormData)
        ) {
            headers["Content-Type"] = "application/json";
        }

        const response = await fetch(`${BASE_URL}${endpoint}`, {
            ...options,
            method: options.method || "GET",
            headers
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(
                data?.message ||
                data?.title ||
                `API error: ${response.status}`
            );
        }

        return data;
    }

    // =========================================
    // IMAGE URL
    // =========================================

    function normalizeImageUrl(imagePath) {
        if (!imagePath) {
            return "";
        }

        const path = String(imagePath).trim();

        if (!path) {
            return "";
        }

        // Giu nguyen URL day du.
        if (/^(https?:\/\/|data:|blob:)/i.test(path)) {
            return path;
        }

        let cleanPath = path.replace(/\\/g, "/");

        // Loai bo wwwroot neu co.
        cleanPath = cleanPath.replace(/^.*?wwwroot\//i, "");

        // Chuan hoa duong dan.
        cleanPath = cleanPath.replace(/^\.?\//, "");
        cleanPath = cleanPath.replace(/^\/+/, "");

        return `${IMAGE_BASE_URL}/${cleanPath}`;
    }

    // =========================================
    // NORMALIZE PRODUCT
    // =========================================

    function normalizeProduct(product) {
        return {
            id: product.product_id,
            name: product.product_name,
            description: product.description || "",

            // Chuyen image_url thanh URL day du.
            image: normalizeImageUrl(product.image_url),

            guestPrice: product.guest_price,
            memberPrice: product.member_price,
            displayPrice: product.display_price,
            stock: product.stock_quantity,
            categoryId: product.category_id
        };
    }

    // =========================================
    // PRODUCTS
    // =========================================

    async function getProducts() {
        const products = await request("/products");

        return products.map(normalizeProduct);
    }

    async function getProductById(id) {
        const product = await request(
            `/products/${encodeURIComponent(id)}`
        );

        return normalizeProduct(product);
    }

    // =========================================
    // CATEGORIES
    // =========================================

    async function getCategories() {
        return await request("/categories");
    }

    async function getCategoryById(id) {
        return await request(
            `/categories/${encodeURIComponent(id)}`
        );
    }

    // =========================================
    // ORDERS
    // =========================================

    async function createOrder(orderData) {
        return await request("/orders", {
            method: "POST",
            body: JSON.stringify(orderData)
        });
    }

    // =========================================
    // EXPORT
    // =========================================

    return {
        getProducts,
        getProductById,
        getCategories,
        getCategoryById,
        createOrder,
        normalizeImageUrl
    };

})();

// Cho phep cac file JavaScript khac su dung API.
window.TechGearAPI = TechGearAPI;

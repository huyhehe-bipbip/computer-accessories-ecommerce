
const TechGearAPI = (() => {
    const BASE_URL = "http://localhost:5262/api";

    async function request(endpoint, options = {}) {
        const headers = {
            Accept: "application/json",
            ...options.headers
        };

        if (options.body !== undefined && !(options.body instanceof FormData)) {
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

    function normalizeProduct(product) {
        return {
            id: product.product_id,
            name: product.product_name,
            description: product.description || "",
            image: product.image_url || "",
            guestPrice: product.guest_price,
            memberPrice: product.member_price,
            displayPrice: product.display_price,
            stock: product.stock_quantity,
            categoryId: product.category_id
        };
    }

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

    async function getCategories() {
        return await request("/categories");
    }

    async function getCategoryById(id) {
        return await request(
            `/categories/${encodeURIComponent(id)}`
        );
    }

    async function createOrder(orderData) {
        return await request("/orders", {
            method: "POST",
            body: JSON.stringify(orderData)
        });
    }

    return {
        getProducts,
        getProductById,
        getCategories,
        getCategoryById,
        createOrder
    };
})();

// Cho phép các file JavaScript khác sử dụng API
window.TechGearAPI = TechGearAPI;

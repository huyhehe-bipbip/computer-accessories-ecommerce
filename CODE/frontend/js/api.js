const TechGearAPI = (() => {
    "use strict";

    const BASE_URL = "http://localhost:5262/api";

    // =========================================
    // HTTP REQUEST
    // =========================================

    async function request(endpoint, options = {}) {
        const headers = {
            Accept: "application/json",
            ...options.headers
        };

        if (options.body !== undefined) {
            headers["Content-Type"] = "application/json";
        }

        const response = await fetch(
            `${BASE_URL}${endpoint}`,
            {
                ...options,
                method: options.method || "GET",
                headers
            }
        );

        const data = await response.json()
            .catch(() => null);

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
    // NORMALIZE PRODUCT
    // =========================================

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

    // =========================================
    // PRODUCT API
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
    // CATEGORY API
    // =========================================

    async function getCategories() {
        const categories = await request("/categories");

        return categories.map(category => ({
            id: category.category_id,
            name: category.category_name
        }));
    }

    async function getCategoryById(id) {
        const category = await request(
            `/categories/${encodeURIComponent(id)}`
        );

        return {
            id: category.category_id,
            name: category.category_name
        };
    }

    // =========================================
    // CHECKOUT API
    // =========================================

    async function createOrder(orderData) {
        return await request("/checkout", {
            method: "POST",
            body: JSON.stringify(orderData)
        });
    }

    // =========================================
    // PUBLIC API
    // =========================================

    return {
        getProducts,
        getProductById,
        getCategories,
        getCategoryById,
        createOrder
    };

})();

window.TechGearAPI = TechGearAPI;
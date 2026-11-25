CREATE DATABASE EcommerceDB;
GO
USE EcommerceDB;
GO

CREATE TABLE categories (
    category_id INT IDENTITY(1,1) PRIMARY KEY,
    category_name NVARCHAR(100) NOT NULL
);

CREATE TABLE products (
    product_id INT IDENTITY(1,1) PRIMARY KEY,
    product_name NVARCHAR(200) NOT NULL,
    description NVARCHAR(MAX),
    image_url NVARCHAR(500),
    guest_price DECIMAL(18,2) NOT NULL,
    member_price DECIMAL(18,2) NOT NULL,
    stock_quantity INT NOT NULL DEFAULT 0,
    category_id INT FOREIGN KEY REFERENCES categories(category_id)
);

CREATE TABLE cart_items (
    cart_id INT IDENTITY(1,1) PRIMARY KEY,
    session_id NVARCHAR(100) NOT NULL,
    product_id INT FOREIGN KEY REFERENCES products(product_id),
    quantity INT NOT NULL
);

CREATE TABLE orders (
    order_id INT IDENTITY(1,1) PRIMARY KEY,
    customer_name NVARCHAR(100) NOT NULL,
    phone_number NVARCHAR(20) NOT NULL,
    shipping_address NVARCHAR(500) NOT NULL,
    total_amount DECIMAL(18,2) NOT NULL,
    order_status NVARCHAR(50) DEFAULT 'Pending',
    created_at DATETIME DEFAULT GETDATE()
);

CREATE TABLE order_items (
    order_item_id INT IDENTITY(1,1) PRIMARY KEY,
    order_id INT FOREIGN KEY REFERENCES orders(order_id),
    product_id INT FOREIGN KEY REFERENCES products(product_id),
    quantity INT NOT NULL,
    unit_price DECIMAL(18,2) NOT NULL
);
USE EcommerceDB;
GO

INSERT INTO categories (category_name) VALUES 
(N'Bàn phím cơ'),
(N'Chuột gaming'),
(N'Tai nghe');

INSERT INTO products (product_name, description, image_url, guest_price, member_price, stock_quantity, category_id) VALUES 
(N'Bàn phím cơ Keychron K2', N'Bàn phím cơ không dây layout 75%', N'https://down-vn.img.susercontent.com/file/vn-11134207-7r98o-lu83p1q4k1b181', 1850000, 1650000, 50, 1),
(N'Chuột Logitech G Pro X', N'Chuột gaming không dây siêu nhẹ', N'https://down-vn.img.susercontent.com/file/vn-11134207-7r98o-lu83p1q4k1b181', 2990000, 2790000, 30, 2),
(N'Tai nghe HyperX Cloud II', N'Tai nghe gaming giả lập âm thanh vòm 7.1', N'https://down-vn.img.susercontent.com/file/vn-11134207-7r98o-lu83p1q4k1b181', 1990000, 1790000, 20, 3);
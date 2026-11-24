
<?php
session_start();

// Kiểm tra đăng nhập Admin
if (!isset($_SESSION["admin_id"])) {
    header("Location: login.php");
    exit;
}

// Kết nối cơ sở dữ liệu
require_once __DIR__ . '/includes/db.php';

// Lấy tên Admin
$adminName = htmlspecialchars(
    $_SESSION["admin_name"] ?? "Admin",
    ENT_QUOTES,
    "UTF-8"
);

// Đếm sản phẩm đang kinh doanh
$totalProducts = $conn->query(
    "SELECT COUNT(*)
     FROM products
     WHERE status = 1"
)->fetchColumn();

// Đếm tổng số đơn hàng
$totalOrders = $conn->query(
    "SELECT COUNT(*)
     FROM orders"
)->fetchColumn();

// Đếm tổng số khách hàng Member
$totalCustomers = $conn->query(
    "SELECT COUNT(*)
     FROM users"
)->fetchColumn();

// Tính doanh thu từ đơn hàng đã hoàn thành
$totalRevenue = $conn->query(
    "SELECT COALESCE(SUM(total_amount), 0)
     FROM orders
     WHERE status = 'completed'"
)->fetchColumn();
?>

<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">

    <meta name="viewport"
          content="width=device-width, initial-scale=1.0">

    <title>Admin Dashboard</title>

    <link rel="stylesheet" href="assets/css/dashboard.css">
</head>

<body>

<div class="dashboard-container">

    <!-- Thanh menu bên trái -->
    <aside class="sidebar">

        <h2>💻 ADMIN PANEL</h2>

        <a href="dashboard.php" class="active">
            🏠 Dashboard
        </a>

        <a href="pages/products.php">
            📦 Quản lý sản phẩm
        </a>

        <a href="pages/categories.php">
            📂 Quản lý danh mục
        </a>

        <a href="pages/orders.php">
            🛒 Quản lý đơn hàng
        </a>

        <a href="pages/customers.php">
            👥 Quản lý khách hàng
        </a>

        <a href="pages/coupons.php">
            🎟️ Quản lý mã giảm giá
        </a>

        <a href="pages/reports.php">
            📊 Báo cáo doanh thu
        </a>

        <a href="logout.php" class="logout">
            ↪ Đăng xuất
        </a>

    </aside>

    <!-- Nội dung chính -->
    <main class="main-content">

        <div class="topbar">

            <div>

                <h1>Admin Dashboard</h1>

                <p class="welcome">
                    Xin chào, <?= $adminName ?>!
                    Chào mừng bạn đến với hệ thống.
                </p>

            </div>

        </div>

        <h2>Tổng quan hệ thống</h2>

        <!-- Các thẻ thống kê -->
        <div class="stats">

            <!-- Sản phẩm -->
            <div class="stat-card">

                <h3>📦 Sản phẩm đang kinh doanh</h3>

                <p><?= (int)$totalProducts ?></p>

            </div>

            <!-- Đơn hàng -->
            <div class="stat-card">

                <h3>🛒 Tổng đơn hàng</h3>

                <p><?= (int)$totalOrders ?></p>

            </div>

            <!-- Khách hàng -->
            <div class="stat-card">

                <h3>👥 Khách hàng</h3>

                <p><?= (int)$totalCustomers ?></p>

            </div>

            <!-- Doanh thu -->
            <div class="stat-card">

                <h3>💰 Doanh thu</h3>

                <p>
                    <?= number_format(
                        $totalRevenue, 0, ',', '.'
                    ) ?> đ
                </p>

            </div>

        </div>

    </main>

</div>

</body>
</html>

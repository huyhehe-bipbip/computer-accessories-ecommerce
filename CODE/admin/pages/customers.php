
<?php
session_start();

// Kiểm tra quyền Admin
if (!isset($_SESSION["admin_id"])) {
    header("Location: ../login.php");
    exit;
}

// Kết nối cơ sở dữ liệu
require_once __DIR__ . '/../includes/db.php';

function e($value) {
    return htmlspecialchars(
        (string)$value,
        ENT_QUOTES,
        "UTF-8"
    );
}

// Nhận từ khóa tìm kiếm
$keyword = trim($_GET["keyword"] ?? "");

// Đếm tổng số khách hàng
$totalCustomers = $conn->query(
    "SELECT COUNT(*) FROM users"
)->fetchColumn();

// Lấy danh sách khách hàng
if ($keyword !== "") {

    $stmt = $conn->prepare(
        "SELECT id, username, full_name, created_at
         FROM users
         WHERE username LIKE ?
            OR full_name LIKE ?
         ORDER BY id DESC"
    );

    $stmt->execute([
        "%$keyword%",
        "%$keyword%"
    ]);

} else {

    $stmt = $conn->query(
        "SELECT id, username, full_name, created_at
         FROM users
         ORDER BY id DESC"
    );
}

$customers = $stmt->fetchAll();

// Xem chi tiết khách hàng
$customerDetail = null;

if (isset($_GET["view"])) {

    $id = filter_var($_GET["view"], FILTER_VALIDATE_INT);

    if ($id !== false && $id > 0) {
        $stmt = $conn->prepare(
            "SELECT id, username, full_name, created_at
             FROM users
             WHERE id = ?"
        );

        $stmt->execute([$id]);

        $customerDetail = $stmt->fetch();
    }
}
?>

<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Quản lý khách hàng</title>

    <link rel="stylesheet" href="../assets/css/dashboard.css">

    <style>
        .card {
            background: white;
            padding: 25px;
            border-radius: 12px;
            margin-bottom: 20px;
            box-shadow: 0 4px 15px #00000010;
        }

        .search-form {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-bottom: 20px;
        }

        .search-form input {
            padding: 12px;
            width: 350px;
            max-width: 100%;
            border: 1px solid #ccc;
            border-radius: 6px;
        }

        .btn {
            display: inline-block;
            padding: 12px 18px;
            border: none;
            border-radius: 6px;
            color: white;
            text-decoration: none;
            cursor: pointer;
        }

        .btn-blue {
            background: #2563eb;
        }

        .btn-gray {
            background: #64748b;
        }

        .btn-orange {
            background: #f59e0b;
        }

        .table-wrapper {
            overflow-x: auto;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th, td {
            padding: 15px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }

        th {
            background: #2563eb;
            color: white;
        }

        tbody tr:hover {
            background: #f8fafc;
        }

        .total {
            font-size: 32px;
            font-weight: bold;
            color: #2563eb;
        }

        .detail p {
            margin: 15px 0;
        }

        .empty {
            text-align: center;
            color: #777;
        }
    </style>
</head>

<body>

<div class="dashboard-container">

    <!-- Thanh menu bên trái -->
    <aside class="sidebar">

        <h2>💻 ADMIN PANEL</h2>

        <a href="../dashboard.php">🏠 Dashboard</a>

        <a href="products.php">📦 Quản lý sản phẩm</a>

        <a href="categories.php">📂 Quản lý danh mục</a>

        <a href="orders.php">🛒 Quản lý đơn hàng</a>

        <a href="customers.php" class="active">
            👥 Quản lý khách hàng
        </a>

        <a href="coupons.php">🎟️ Quản lý mã giảm giá</a>

        <a href="reports.php">📊 Báo cáo doanh thu</a>

        <a href="../logout.php" class="logout">
            ↪ Đăng xuất
        </a>

    </aside>

    <!-- Nội dung chính -->
    <main class="main-content">

        <div class="topbar">
            <div>
                <h1>Quản lý khách hàng</h1>

                <p class="welcome">
                    Quản lý danh sách thành viên của hệ thống.
                </p>
            </div>
        </div>

        <!-- Thống kê khách hàng -->
        <div class="card">

            <h3>👥 Tổng số khách hàng</h3>

            <p class="total">
                <?= e($totalCustomers) ?>
            </p>

        </div>

        <!-- Chi tiết khách hàng -->
        <?php if ($customerDetail): ?>

            <div class="card detail">

                <h2>Thông tin chi tiết khách hàng</h2>

                <p>
                    <strong>ID:</strong>
                    <?= e($customerDetail["id"]) ?>
                </p>

                <p>
                    <strong>Tên đăng nhập:</strong>
                    <?= e($customerDetail["username"]) ?>
                </p>

                <p>
                    <strong>Họ và tên:</strong>
                    <?= e($customerDetail["full_name"]) ?>
                </p>

                <p>
                    <strong>Ngày đăng ký:</strong>
                    <?= e($customerDetail["created_at"]) ?>
                </p>

                <a href="customers.php" class="btn btn-gray">
                    Đóng chi tiết
                </a>

            </div>

        <?php elseif (isset($_GET["view"])): ?>

            <div class="card">
                Không tìm thấy khách hàng.
            </div>

        <?php endif; ?>

        <!-- Danh sách khách hàng -->
        <div class="card">

            <h2>Danh sách khách hàng</h2>

            <!-- Tìm kiếm -->
            <form method="GET" class="search-form">

                <input
                    type="text"
                    name="keyword"
                    placeholder="Nhập tên đăng nhập hoặc họ tên..."
                    value="<?= e($keyword) ?>"
                >

                <button type="submit" class="btn btn-blue">
                    Tìm kiếm
                </button>

                <a href="customers.php" class="btn btn-gray">
                    Làm mới
                </a>

            </form>

            <div class="table-wrapper">

                <table>

                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Tên đăng nhập</th>
                            <th>Họ và tên</th>
                            <th>Ngày đăng ký</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>

                    <tbody>

                        <?php foreach ($customers as $customer): ?>

                            <tr>

                                <td>
                                    <?= e($customer["id"]) ?>
                                </td>

                                <td>
                                    <?= e($customer["username"]) ?>
                                </td>

                                <td>
                                    <?= e($customer["full_name"]) ?>
                                </td>

                                <td>
                                    <?= e($customer["created_at"]) ?>
                                </td>

                                <td>
                                    <a
                                        href="customers.php?view=<?= e($customer["id"]) ?>"
                                        class="btn btn-orange"
                                    >
                                        Xem
                                    </a>
                                </td>

                            </tr>

                        <?php endforeach; ?>

                        <?php if (empty($customers)): ?>

                            <tr>
                                <td colspan="5" class="empty">
                                    Không tìm thấy khách hàng nào.
                                </td>
                            </tr>

                        <?php endif; ?>

                    </tbody>

                </table>

            </div>

        </div>

    </main>

</div>

</body>
</html>

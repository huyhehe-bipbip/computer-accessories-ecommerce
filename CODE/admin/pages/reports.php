<?php
session_start();

if (!isset($_SESSION["admin_id"])) {
    header("Location: ../login.php");
    exit;
}

require_once __DIR__ . '/../includes/db.php';

function e($value) {
    return htmlspecialchars((string)$value, ENT_QUOTES, "UTF-8");
}

function money($value) {
    return number_format($value, 0, ',', '.') . ' đ';
}

function validDate($value) {
    $date = DateTime::createFromFormat('!Y-m-d', $value);
    return $date && $date->format('Y-m-d') === $value;
}

// Nhận ngày lọc
$startDate = $_GET["start_date"] ?? "";
$endDate = $_GET["end_date"] ?? "";

$where = [];
$params = [];
$error = "";

if (
    ($startDate !== "" && !validDate($startDate)) ||
    ($endDate !== "" && !validDate($endDate))
) {
    $error = "Ngày không hợp lệ.";
} elseif (
    $startDate !== "" &&
    $endDate !== "" &&
    $startDate > $endDate
) {
    $error = "Ngày bắt đầu không được lớn hơn ngày kết thúc.";
}

if ($error === "") {
    if ($startDate !== "") {
        $where[] = "created_at >= ?";
        $params[] = $startDate . " 00:00:00";
    }

    if ($endDate !== "") {
        $where[] = "created_at < DATE_ADD(?, INTERVAL 1 DAY)";
        $params[] = $endDate;
    }
} else {
    $where[] = "1 = 0";
}

$whereSQL = empty($where)
    ? ""
    : " WHERE " . implode(" AND ", $where);

// Thống kê đơn hàng
$sql = "SELECT
            COUNT(*) AS total_orders,
            COALESCE(SUM(CASE
                WHEN status = 'completed'
                THEN total_amount ELSE 0
            END), 0) AS total_revenue,

            COUNT(CASE WHEN status = 'pending'
                THEN 1 END) AS pending_orders,

            COUNT(CASE WHEN status = 'confirmed'
                THEN 1 END) AS confirmed_orders,

            COUNT(CASE WHEN status = 'shipping'
                THEN 1 END) AS shipping_orders,

            COUNT(CASE WHEN status = 'completed'
                THEN 1 END) AS completed_orders,

            COUNT(CASE WHEN status = 'cancelled'
                THEN 1 END) AS cancelled_orders

        FROM orders" . $whereSQL;

$stmt = $conn->prepare($sql);
$stmt->execute($params);
$stats = $stmt->fetch(PDO::FETCH_ASSOC);

// Danh sách đơn hàng
$stmt = $conn->prepare(
    "SELECT id, customer_name, phone, address,
            total_amount, status, created_at
     FROM orders" . $whereSQL . "
     ORDER BY id DESC"
);

$stmt->execute($params);
$orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Doanh thu theo ngày tạo đơn hàng
$chartWhere = $where;
$chartWhere[] = "status = 'completed'";

$chartSQL = "SELECT
                DATE(created_at) AS order_date,
                SUM(total_amount) AS revenue
             FROM orders
             WHERE " . implode(" AND ", $chartWhere) . "
             GROUP BY DATE(created_at)
             ORDER BY order_date ASC";

$stmt = $conn->prepare($chartSQL);
$stmt->execute($params);
$chartData = $stmt->fetchAll(PDO::FETCH_ASSOC);

$maxRevenue = 0;

foreach ($chartData as $item) {
    $maxRevenue = max(
        $maxRevenue,
        (float)$item["revenue"]
    );
}

// Tên trạng thái
$statusNames = [
    "pending" => "Chờ xác nhận",
    "confirmed" => "Đã xác nhận",
    "shipping" => "Đang giao hàng",
    "completed" => "Đã hoàn thành",
    "cancelled" => "Đã hủy"
];
?>

<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport"
          content="width=device-width, initial-scale=1.0">

    <title>Báo cáo doanh thu</title>

    <link rel="stylesheet" href="../assets/css/dashboard.css">

    <style>
        .card {
            background: white;
            padding: 25px;
            border-radius: 12px;
            margin-bottom: 20px;
            box-shadow: 0 4px 15px #00000010;
        }

        .card h2 {
            margin-bottom: 20px;
        }

        .stats {
            display: grid;
            grid-template-columns: repeat(
                auto-fit, minmax(200px, 1fr)
            );
            gap: 20px;
            margin-bottom: 25px;
        }

        .filter-form {
            display: flex;
            align-items: flex-end;
            gap: 15px;
            flex-wrap: wrap;
        }

        .form-group {
            flex: 1;
            min-width: 180px;
        }

        label {
            display: block;
            font-weight: bold;
            margin-bottom: 8px;
        }

        input {
            width: 100%;
            padding: 12px;
            border: 1px solid #ccc;
            border-radius: 6px;
        }

        .btn {
            display: inline-block;
            padding: 12px 20px;
            border: none;
            border-radius: 6px;
            background: #2563eb;
            color: white;
            cursor: pointer;
            text-decoration: none;
        }

        .btn-reset {
            background: #64748b;
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

        tr:hover td {
            background: #f8fafc;
        }

        .revenue {
            color: #059669;
            font-weight: bold;
        }

        .status {
            display: inline-block;
            padding: 7px 12px;
            border-radius: 5px;
            font-size: 14px;
            font-weight: bold;
            white-space: nowrap;
        }

        .pending {
            background: #fef3c7;
            color: #92400e;
        }

        .confirmed {
            background: #dbeafe;
            color: #1d4ed8;
        }

        .shipping {
            background: #ede9fe;
            color: #6d28d9;
        }

        .completed {
            background: #dcfce7;
            color: #166534;
        }

        .cancelled {
            background: #fee2e2;
            color: #991b1b;
        }

        .empty {
            text-align: center;
            color: #777;
            padding: 25px;
        }

        .error {
            background: #fee2e2;
            color: #991b1b;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 20px;
        }

        .chart-row {
            margin-bottom: 20px;
        }

        .chart-label {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            gap: 10px;
        }

        .chart-track {
            background: #e2e8f0;
            border-radius: 6px;
            height: 28px;
            overflow: hidden;
        }

        .chart-bar {
            background: #2563eb;
            height: 100%;
            border-radius: 6px;
        }

        .note {
            color: #64748b;
            font-size: 14px;
            margin-top: 15px;
        }
    </style>
</head>

<body>

<div class="dashboard-container">

    <!-- Menu bên trái -->
    <aside class="sidebar">

        <h2>💻 ADMIN PANEL</h2>

        <a href="../dashboard.php">🏠 Dashboard</a>

        <a href="products.php">
            📦 Quản lý sản phẩm
        </a>

        <a href="categories.php">
            📂 Quản lý danh mục
        </a>

        <a href="orders.php">
            🛒 Quản lý đơn hàng
        </a>

        <a href="customers.php">
            👥 Quản lý khách hàng
        </a>

        <a href="coupons.php">
            🎟️ Quản lý mã giảm giá
        </a>

        <a href="reports.php" class="active">
            📊 Báo cáo doanh thu
        </a>

        <a href="../logout.php" class="logout">
            ↪ Đăng xuất
        </a>

    </aside>

    <!-- Nội dung chính -->
    <main class="main-content">

        <div class="topbar">
            <div>
                <h1>Báo cáo doanh thu</h1>

                <p class="welcome">
                    Thống kê doanh thu và tình hình kinh doanh.
                </p>
            </div>
        </div>

        <!-- Thông báo lỗi -->
        <?php if ($error !== ""): ?>

            <div class="error">
                <?= e($error) ?>
            </div>

        <?php endif; ?>

        <!-- Bộ lọc thời gian -->
        <div class="card">

            <h2>Lọc báo cáo theo thời gian</h2>

            <form method="GET" class="filter-form">

                <div class="form-group">
                    <label>Ngày bắt đầu</label>

                    <input
                        type="date"
                        name="start_date"
                        value="<?= e($startDate) ?>"
                    >
                </div>

                <div class="form-group">
                    <label>Ngày kết thúc</label>

                    <input
                        type="date"
                        name="end_date"
                        value="<?= e($endDate) ?>"
                    >
                </div>

                <button type="submit" class="btn">
                    Xem báo cáo
                </button>

                <a href="reports.php" class="btn btn-reset">
                    Làm mới
                </a>

            </form>

        </div>

        <!-- Thống kê tổng quan -->
        <div class="stats">

            <div class="stat-card">
                <h3>💰 Tổng doanh thu</h3>

                <p>
                    <?= money($stats["total_revenue"]) ?>
                </p>
            </div>

            <div class="stat-card">
                <h3>🛒 Tổng đơn hàng</h3>

                <p>
                    <?= e($stats["total_orders"]) ?>
                </p>
            </div>

            <div class="stat-card">
                <h3>⏳ Chờ xác nhận</h3>

                <p>
                    <?= e($stats["pending_orders"]) ?>
                </p>
            </div>

            <div class="stat-card">
                <h3>📋 Đã xác nhận</h3>

                <p>
                    <?= e($stats["confirmed_orders"]) ?>
                </p>
            </div>

            <div class="stat-card">
                <h3>🚚 Đang giao hàng</h3>

                <p>
                    <?= e($stats["shipping_orders"]) ?>
                </p>
            </div>

            <div class="stat-card">
                <h3>✅ Đã hoàn thành</h3>

                <p>
                    <?= e($stats["completed_orders"]) ?>
                </p>
            </div>

            <div class="stat-card">
                <h3>❌ Đã hủy</h3>

                <p>
                    <?= e($stats["cancelled_orders"]) ?>
                </p>
            </div>

        </div>

        <!-- Biểu đồ doanh thu -->
        <div class="card">

            <h2>Biểu đồ doanh thu theo ngày</h2>

            <?php if (empty($chartData)): ?>

                <p class="empty">
                    Chưa có doanh thu trong thời gian này.
                </p>

            <?php else: ?>

                <?php foreach ($chartData as $item): ?>

                    <?php
                    $percent = $maxRevenue > 0
                        ? ($item["revenue"] / $maxRevenue) * 100
                        : 0;

                    $percent = max(0, min(100, $percent));
                    ?>

                    <div class="chart-row">

                        <div class="chart-label">

                            <strong>
                                <?= date(
                                    "d/m/Y",
                                    strtotime($item["order_date"])
                                ) ?>
                            </strong>

                            <span class="revenue">
                                <?= money($item["revenue"]) ?>
                            </span>

                        </div>

                        <div class="chart-track">

                            <div
                                class="chart-bar"
                                style="width: <?= $percent ?>%;"
                            ></div>

                        </div>

                    </div>

                <?php endforeach; ?>

            <?php endif; ?>

            <p class="note">
                Doanh thu chỉ tính các đơn hàng đã hoàn thành
                và được thống kê theo ngày tạo đơn hàng.
            </p>

        </div>

        <!-- Danh sách đơn hàng -->
        <div class="card">

            <h2>Chi tiết đơn hàng</h2>

            <div class="table-wrapper">

                <table>

                    <thead>
                        <tr>
                            <th>Mã đơn</th>
                            <th>Khách hàng</th>
                            <th>Số điện thoại</th>
                            <th>Tổng tiền</th>
                            <th>Trạng thái</th>
                            <th>Ngày tạo</th>
                        </tr>
                    </thead>

                    <tbody>

                    <?php foreach ($orders as $order): ?>

                        <tr>

                            <td>
                                #<?= e($order["id"]) ?>
                            </td>

                            <td>
                                <?= e($order["customer_name"]) ?>
                            </td>

                            <td>
                                <?= e($order["phone"]) ?>
                            </td>

                            <td class="revenue">
                                <?= money($order["total_amount"]) ?>
                            </td>

                            <td>

                                <span class="status <?= e($order["status"]) ?>">

                                    <?= e(
                                        $statusNames[$order["status"]]
                                        ?? "Không xác định"
                                    ) ?>

                                </span>

                            </td>

                            <td>

                                <?= $order["created_at"]
                                    ? date(
                                        "d/m/Y H:i",
                                        strtotime($order["created_at"])
                                    )
                                    : "Chưa xác định"
                                ?>

                            </td>

                        </tr>

                    <?php endforeach; ?>

                    <?php if (empty($orders)): ?>

                        <tr>
                            <td colspan="6" class="empty">
                                Không tìm thấy đơn hàng nào.
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
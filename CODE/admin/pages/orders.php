<?php
session_start();

if (!isset($_SESSION["admin_id"])) {
    header("Location: ../login.php");
    exit;
}

require_once __DIR__ . "/../includes/db.php";

function e($value) {
    return htmlspecialchars((string)$value, ENT_QUOTES, "UTF-8");
}

$statuses = [
    "pending" => "Chờ xác nhận",
    "confirmed" => "Đã xác nhận",
    "shipping" => "Đang giao hàng",
    "completed" => "Hoàn thành",
    "cancelled" => "Đã hủy"
];

$message = "";
$isError = false;

if (empty($_SESSION["order_csrf"])) {
    $_SESSION["order_csrf"] = bin2hex(random_bytes(32));
}

// Cập nhật trạng thái đơn hàng
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    try {
        if (!hash_equals(
            $_SESSION["order_csrf"],
            (string)($_POST["csrf_token"] ?? "")
        )) {
            throw new Exception("Yêu cầu không hợp lệ.");
        }

        $id = (int)($_POST["id"] ?? 0);
        $status = $_POST["status"] ?? "";

        if ($id <= 0 || !isset($statuses[$status])) {
            throw new Exception("Thông tin không hợp lệ.");
        }

        $stmt = $conn->prepare(
            "UPDATE orders SET status = ? WHERE id = ?"
        );

        $stmt->execute([$status, $id]);

        header("Location: orders.php?message=updated");
        exit;

    } catch (Exception $ex) {
        $message = "Không thể cập nhật đơn hàng.";
        $isError = true;
    }
}

if (($_GET["message"] ?? "") === "updated") {
    $message = "Cập nhật trạng thái đơn hàng thành công!";
}

// Tìm kiếm và lọc đơn hàng
$keyword = trim($_GET["keyword"] ?? "");
$filter = $_GET["status"] ?? "";

$sql = "SELECT * FROM orders WHERE 1=1";
$params = [];

if ($keyword !== "") {
    $sql .= " AND (customer_name LIKE ?
              OR phone LIKE ?
              OR CAST(id AS CHAR) LIKE ?)";

    $params[] = "%$keyword%";
    $params[] = "%$keyword%";
    $params[] = "%$keyword%";
}

if (isset($statuses[$filter])) {
    $sql .= " AND status = ?";
    $params[] = $filter;
}

$sql .= " ORDER BY id DESC";

$stmt = $conn->prepare($sql);
$stmt->execute($params);
$orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Xem chi tiết đơn hàng
$viewOrder = null;
$orderDetails = [];

if (isset($_GET["view"])) {
    $id = (int)$_GET["view"];

    $stmt = $conn->prepare(
        "SELECT * FROM orders WHERE id = ?"
    );
    $stmt->execute([$id]);
    $viewOrder = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($viewOrder) {
        $stmt = $conn->prepare(
            "SELECT od.*, p.name AS product_name
             FROM order_details od
             LEFT JOIN products p ON od.product_id = p.id
             WHERE od.order_id = ?"
        );

        $stmt->execute([$id]);
        $orderDetails = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
?>

<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport"
          content="width=device-width, initial-scale=1.0">

    <title>Quản lý đơn hàng</title>

    <style>
        * {
            box-sizing: border-box;
        }

        body {
            font-family: Arial, sans-serif;
            background: #f2f4f7;
            color: #222;
            margin: 0;
            padding: 25px;
        }

        .container {
            max-width: 1350px;
            margin: auto;
        }

        .back {
            color: #2563eb;
            text-decoration: none;
        }

        h1 {
            margin: 35px 0 25px;
        }

        .card {
            background: white;
            padding: 24px;
            border-radius: 12px;
            margin-bottom: 25px;
            box-shadow: 0 2px 10px #00000012;
            overflow-x: auto;
        }

        input, select {
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 5px;
        }

        .search-form {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }

        .search-form input {
            flex: 1;
            min-width: 200px;
        }

        .btn {
            display: inline-block;
            padding: 10px 14px;
            border: none;
            border-radius: 5px;
            color: white;
            background: #2563eb;
            text-decoration: none;
            cursor: pointer;
        }

        .btn-gray {
            background: #64748b;
        }

        .btn-orange {
            background: #e99a12;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }

        th, td {
            padding: 13px 10px;
            border-bottom: 1px solid #ddd;
            text-align: left;
        }

        th {
            background: #2563eb;
            color: white;
        }

        .pending {
            color: #d97706;
        }

        .confirmed {
            color: #2563eb;
        }

        .shipping {
            color: #0891b2;
        }

        .completed {
            color: green;
        }

        .cancelled {
            color: red;
        }

        .alert {
            background: #dff2e6;
            color: #086b36;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }

        .error {
            background: #fee2e2;
            color: #b91c1c;
        }

        .update-form {
            display: flex;
            gap: 6px;
            align-items: center;
        }
    </style>
</head>

<body>
<div class="container">

    <a class="back" href="../dashboard.php">
        ← Quay lại Dashboard
    </a>

    <h1>📋 Quản lý đơn hàng</h1>

    <?php if ($message !== ""): ?>
        <div class="alert <?= $isError ? 'error' : '' ?>">
            <?= e($message) ?>
        </div>
    <?php endif; ?>

    <?php if ($viewOrder): ?>

        <div class="card">

            <h2>
                Chi tiết đơn hàng #<?= e($viewOrder["id"]) ?>
            </h2>

            <p>
                <strong>Khách hàng:</strong>
                <?= e($viewOrder["customer_name"]) ?>
            </p>

            <p>
                <strong>Số điện thoại:</strong>
                <?= e($viewOrder["phone"]) ?>
            </p>

            <p>
                <strong>Địa chỉ:</strong>
                <?= e($viewOrder["address"]) ?>
            </p>

            <p>
                <strong>Ngày đặt:</strong>
                <?= e($viewOrder["created_at"]) ?>
            </p>

            <p>
                <strong>Trạng thái:</strong>
                <?= e($statuses[$viewOrder["status"]]
                    ?? "Không xác định") ?>
            </p>

            <table>
                <thead>
                    <tr>
                        <th>Sản phẩm</th>
                        <th>Số lượng</th>
                        <th>Đơn giá</th>
                        <th>Thành tiền</th>
                    </tr>
                </thead>

                <tbody>

                <?php foreach ($orderDetails as $detail): ?>
                    <tr>
                        <td>
                            <?= e($detail["product_name"]
                                ?? "Sản phẩm không còn tồn tại") ?>
                        </td>

                        <td><?= e($detail["quantity"]) ?></td>

                        <td>
                            <?= number_format(
                                $detail["price"], 0, ",", "."
                            ) ?> đ
                        </td>

                        <td>
                            <?= number_format(
                                $detail["price"] *
                                $detail["quantity"], 0, ",", "."
                            ) ?> đ
                        </td>
                    </tr>
                <?php endforeach; ?>

                <?php if (empty($orderDetails)): ?>
                    <tr>
                        <td colspan="4">
                            Chưa có chi tiết sản phẩm.
                        </td>
                    </tr>
                <?php endif; ?>

                </tbody>
            </table>

            <h3>
                Tổng tiền:
                <?= number_format(
                    $viewOrder["total_amount"], 0, ",", "."
                ) ?> đ
            </h3>

            <a class="btn btn-gray" href="orders.php">
                Đóng chi tiết
            </a>

        </div>

    <?php endif; ?>

    <div class="card">

        <h2>Tìm kiếm đơn hàng</h2>

        <form method="GET" class="search-form">

            <input type="text"
                   name="keyword"
                   placeholder="Nhập mã đơn, tên hoặc số điện thoại"
                   value="<?= e($keyword) ?>">

            <select name="status">

                <option value="">Tất cả trạng thái</option>

                <?php foreach ($statuses as $key => $label): ?>

                    <option value="<?= e($key) ?>"
                        <?= $filter === $key ? "selected" : "" ?>>

                        <?= e($label) ?>

                    </option>

                <?php endforeach; ?>

            </select>

            <button class="btn" type="submit">
                Tìm kiếm
            </button>

            <a class="btn btn-gray" href="orders.php">
                Làm mới
            </a>

        </form>

    </div>

    <div class="card">

        <h2>Danh sách đơn hàng</h2>

        <p>
            Số đơn hàng tìm thấy:
            <strong><?= count($orders) ?></strong>
        </p>

        <table>

            <thead>
                <tr>
                    <th>ID</th>
                    <th>Khách hàng</th>
                    <th>Số điện thoại</th>
                    <th>Tổng tiền</th>
                    <th>Ngày đặt</th>
                    <th>Trạng thái</th>
                    <th>Cập nhật</th>
                    <th>Chi tiết</th>
                </tr>
            </thead>

            <tbody>

            <?php foreach ($orders as $order): ?>

                <tr>

                    <td><?= e($order["id"]) ?></td>

                    <td><?= e($order["customer_name"]) ?></td>

                    <td><?= e($order["phone"]) ?></td>

                    <td>
                        <?= number_format(
                            $order["total_amount"], 0, ",", "."
                        ) ?> đ
                    </td>

                    <td><?= e($order["created_at"]) ?></td>

                    <td class="<?= e($order["status"]) ?>">
                        <strong>
                            <?= e($statuses[$order["status"]]
                                ?? "Không xác định") ?>
                        </strong>
                    </td>

                    <td>

                        <form method="POST" class="update-form">

                            <input type="hidden"
                                   name="csrf_token"
                                   value="<?= e($_SESSION["order_csrf"]) ?>">

                            <input type="hidden"
                                   name="id"
                                   value="<?= e($order["id"]) ?>">

                            <select name="status">

                                <?php foreach ($statuses as $key => $label): ?>

                                    <option value="<?= e($key) ?>"
                                        <?= $order["status"] === $key
                                            ? "selected" : "" ?>>

                                        <?= e($label) ?>

                                    </option>

                                <?php endforeach; ?>

                            </select>

                            <button type="submit" class="btn">
                                Lưu
                            </button>

                        </form>

                    </td>

                    <td>
                        <a class="btn btn-orange"
                           href="orders.php?view=<?= e($order["id"]) ?>">
                            Xem
                        </a>
                    </td>

                </tr>

            <?php endforeach; ?>

            <?php if (empty($orders)): ?>

                <tr>
                    <td colspan="8" style="text-align:center;">
                        Chưa có đơn hàng nào.
                    </td>
                </tr>

            <?php endif; ?>

            </tbody>

        </table>

    </div>

</div>
</body>
</html>
<?php
session_start();

if (!isset($_SESSION["admin_id"])) {
    header("Location: ../login.php");
    exit;
}

require_once __DIR__ . '/../includes/db.php';

date_default_timezone_set('Asia/Ho_Chi_Minh');

$error = "";
$success = $_SESSION["coupon_success"] ?? "";
unset($_SESSION["coupon_success"]);

if (empty($_SESSION["coupon_csrf"])) {
    $_SESSION["coupon_csrf"] = bin2hex(random_bytes(32));
}

$csrf = $_SESSION["coupon_csrf"];

function e($value) {
    return htmlspecialchars(
        (string)$value,
        ENT_QUOTES,
        "UTF-8"
    );
}

function money($value) {
    return number_format($value, 0, ',', '.') . ' đ';
}

function inputDate($value) {
    return $value
        ? date('Y-m-d\TH:i', strtotime($value))
        : '';
}

function parseDate($value) {
    if ($value === "") {
        return null;
    }

    $date = DateTime::createFromFormat(
        'Y-m-d\TH:i',
        $value
    );

    if (!$date || $date->format('Y-m-d\TH:i') !== $value) {
        throw new InvalidArgumentException(
            "Ngày giờ không hợp lệ."
        );
    }

    return $date->format('Y-m-d H:i:s');
}

// Xử lý thêm, sửa, xóa và đổi trạng thái
if ($_SERVER["REQUEST_METHOD"] === "POST") {

    if (!hash_equals($csrf, $_POST["csrf"] ?? "")) {
        http_response_code(403);
        exit("Yêu cầu không hợp lệ.");
    }

    $action = $_POST["action"] ?? "";
    $id = (int)($_POST["id"] ?? 0);

    try {

        if ($action === "add" || $action === "edit") {

            $code = strtoupper(
                trim($_POST["code"] ?? "")
            );

            $type = $_POST["discount_type"] ?? "";
            $rawValue = trim($_POST["discount_value"] ?? "");
            $value = (float)$rawValue;

            $startDate = parseDate(
                $_POST["start_date"] ?? ""
            );

            $endDate = parseDate(
                $_POST["end_date"] ?? ""
            );

            $status = ($_POST["status"] ?? "1") === "1"
                ? 1 : 0;

            if (!preg_match('/^[A-Z0-9_-]{1,50}$/', $code)) {

                $error = "Mã giảm giá không hợp lệ.";

            } elseif (!in_array(
                $type,
                ["percentage", "fixed"],
                true
            )) {

                $error = "Loại giảm giá không hợp lệ.";

            } elseif (
                !preg_match('/^\d{1,10}(\.\d{1,2})?$/', $rawValue)
                || $value <= 0
            ) {

                $error = "Giá trị giảm giá phải lớn hơn 0 và hợp lệ.";

            } elseif (
                $type === "percentage" && $value > 100
            ) {

                $error = "Phần trăm giảm giá không được vượt quá 100%.";

            } elseif (
                $startDate && $endDate &&
                $startDate > $endDate
            ) {

                $error = "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.";

            } else {

                // Kiểm tra mã giảm giá trùng
                $stmt = $conn->prepare(
                    "SELECT id FROM coupons
                     WHERE code = ? AND id != ?"
                );

                $stmt->execute([$code, $id]);

                if ($stmt->fetch()) {

                    $error = "Mã giảm giá đã tồn tại.";

                } elseif ($action === "add") {

                    $stmt = $conn->prepare(
                        "INSERT INTO coupons
                        (
                            code,
                            discount_type,
                            discount_value,
                            start_date,
                            end_date,
                            status
                        )
                        VALUES (?, ?, ?, ?, ?, ?)"
                    );

                    $stmt->execute([
                        $code,
                        $type,
                        $rawValue,
                        $startDate,
                        $endDate,
                        $status
                    ]);

                    $_SESSION["coupon_success"] =
                        "Thêm mã giảm giá thành công.";

                } elseif ($id > 0) {

                    $stmt = $conn->prepare(
                        "UPDATE coupons SET
                            code = ?,
                            discount_type = ?,
                            discount_value = ?,
                            start_date = ?,
                            end_date = ?,
                            status = ?
                         WHERE id = ?"
                    );

                    $stmt->execute([
                        $code,
                        $type,
                        $rawValue,
                        $startDate,
                        $endDate,
                        $status,
                        $id
                    ]);

                    $_SESSION["coupon_success"] =
                        "Cập nhật mã giảm giá thành công.";

                } else {
                    $error = "ID mã giảm giá không hợp lệ.";
                }
            }

        } elseif ($action === "delete" && $id > 0) {

            $stmt = $conn->prepare(
                "DELETE FROM coupons WHERE id = ?"
            );

            $stmt->execute([$id]);

            $_SESSION["coupon_success"] =
                "Xóa mã giảm giá thành công.";

        } elseif ($action === "toggle" && $id > 0) {

            $stmt = $conn->prepare(
                "UPDATE coupons
                 SET status = CASE
                    WHEN status = 1 THEN 0
                    ELSE 1
                 END
                 WHERE id = ?"
            );

            $stmt->execute([$id]);

            $_SESSION["coupon_success"] =
                "Thay đổi trạng thái thành công.";

        } else {
            $error = "Thao tác không hợp lệ.";
        }

        if ($error === "") {
            header("Location: coupons.php");
            exit;
        }

    } catch (InvalidArgumentException $ex) {

        $error = $ex->getMessage();

    } catch (PDOException $ex) {

        $error = "Không thể thực hiện thao tác. "
               . "Mã giảm giá có thể bị trùng hoặc đang được sử dụng.";

    }
}

// Lấy thông tin mã giảm giá cần sửa
$editCoupon = null;

if (isset($_GET["edit"])) {

    $id = (int)$_GET["edit"];

    $stmt = $conn->prepare(
        "SELECT * FROM coupons WHERE id = ?"
    );

    $stmt->execute([$id]);

    $editCoupon = $stmt->fetch(PDO::FETCH_ASSOC);

}

// Tìm kiếm mã giảm giá
$keyword = trim($_GET["keyword"] ?? "");

if ($keyword !== "") {

    $stmt = $conn->prepare(
        "SELECT * FROM coupons
         WHERE code LIKE ?
         ORDER BY id DESC"
    );

    $stmt->execute(["%" . $keyword . "%"]);

} else {

    $stmt = $conn->query(
        "SELECT * FROM coupons ORDER BY id DESC"
    );

}

$coupons = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Thống kê tổng số mã
$totalCoupons = $conn->query(
    "SELECT COUNT(*) FROM coupons"
)->fetchColumn();

// Thống kê mã đang có hiệu lực
$now = date('Y-m-d H:i:s');

$stmt = $conn->prepare(
    "SELECT COUNT(*) FROM coupons
     WHERE status = 1
     AND (start_date IS NULL OR start_date <= ?)
     AND (end_date IS NULL OR end_date >= ?)"
);

$stmt->execute([$now, $now]);

$activeCoupons = $stmt->fetchColumn();

// Thống kê mã hết hạn
$stmt = $conn->prepare(
    "SELECT COUNT(*) FROM coupons
     WHERE end_date IS NOT NULL
     AND end_date < ?"
);

$stmt->execute([$now]);

$expiredCoupons = $stmt->fetchColumn();
?>

<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">

    <meta name="viewport"
          content="width=device-width, initial-scale=1.0">

    <title>Quản lý mã giảm giá</title>

    <link rel="stylesheet"
          href="../assets/css/dashboard.css">

    <style>
        * {
            box-sizing: border-box;
        }

        .card {
            background: white;
            padding: 25px;
            border-radius: 12px;
            margin-bottom: 20px;
            box-shadow: 0 4px 15px #00000010;
        }

        .coupon-stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin: 25px 0;
        }

        .coupon-stat {
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 4px 15px #00000010;
        }

        .coupon-stat h3 {
            margin: 0 0 12px;
            color: #64748b;
            font-size: 16px;
        }

        .coupon-stat p {
            font-size: 30px;
            font-weight: bold;
            color: #2563eb;
            margin: 0;
        }

        .form-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 18px;
            margin: 20px 0;
        }

        label {
            display: block;
            font-weight: bold;
            margin-bottom: 8px;
        }

        input, select {
            width: 100%;
            padding: 12px;
            border: 1px solid #ccc;
            border-radius: 6px;
            font-size: 14px;
        }

        .btn {
            display: inline-block;
            padding: 11px 17px;
            border: none;
            border-radius: 6px;
            color: white;
            background: #2563eb;
            text-decoration: none;
            cursor: pointer;
            font-size: 14px;
        }

        .btn:hover {
            opacity: 0.85;
        }

        .btn-edit {
            background: #f59e0b;
        }

        .btn-delete {
            background: #dc2626;
        }

        .btn-toggle {
            background: #059669;
        }

        .btn-reset {
            background: #64748b;
        }

        .search-form {
            display: flex;
            gap: 10px;
            margin: 20px 0;
        }

        .search-form input {
            max-width: 350px;
        }

        .table-wrapper {
            overflow-x: auto;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th, td {
            padding: 14px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }

        th {
            background: #2563eb;
            color: white;
            white-space: nowrap;
        }

        tr:hover td {
            background: #f8fafc;
        }

        .status {
            display: inline-block;
            padding: 7px 10px;
            border-radius: 5px;
            font-size: 13px;
            white-space: nowrap;
        }

        .active-status {
            background: #dcfce7;
            color: #166534;
        }

        .inactive-status {
            background: #e2e8f0;
            color: #475569;
        }

        .expired-status {
            background: #fee2e2;
            color: #991b1b;
        }

        .pending-status {
            background: #fef3c7;
            color: #92400e;
        }

        .success {
            background: #d4edda;
            color: #155724;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 20px;
        }

        .error {
            background: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 20px;
        }

        .actions {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }

        .actions form {
            margin: 0;
        }

        .empty {
            text-align: center;
            color: #777;
            padding: 25px;
        }

        @media (max-width: 1000px) {
            .form-grid,
            .coupon-stats {
                grid-template-columns: 1fr;
            }

            .search-form {
                flex-wrap: wrap;
            }
        }
    </style>
</head>

<body>

<div class="dashboard-container">

    <!-- Menu bên trái -->
    <aside class="sidebar">

        <h2>💻 ADMIN PANEL</h2>

        <a href="../dashboard.php">
            🏠 Dashboard
        </a>

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

        <a href="coupons.php" class="active">
            🎟️ Quản lý mã giảm giá
        </a>

        <a href="reports.php">
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
                <h1>Quản lý mã giảm giá</h1>

                <p class="welcome">
                    Quản lý chương trình khuyến mãi của hệ thống.
                </p>
            </div>
        </div>

        <!-- Thống kê -->
        <div class="coupon-stats">

            <div class="coupon-stat">
                <h3>🎟️ Tổng mã giảm giá</h3>
                <p><?= e($totalCoupons) ?></p>
            </div>

            <div class="coupon-stat">
                <h3>✅ Đang hoạt động</h3>
                <p><?= e($activeCoupons) ?></p>
            </div>

            <div class="coupon-stat">
                <h3>⏰ Đã hết hạn</h3>
                <p><?= e($expiredCoupons) ?></p>
            </div>

        </div>

        <?php if ($success !== ""): ?>

            <div class="success">
                <?= e($success) ?>
            </div>

        <?php endif; ?>

        <?php if ($error !== ""): ?>

            <div class="error">
                <?= e($error) ?>
            </div>

        <?php endif; ?>

        <!-- Form thêm và sửa mã -->
        <div class="card">

            <h2>
                <?= $editCoupon
                    ? "Chỉnh sửa mã giảm giá"
                    : "Thêm mã giảm giá" ?>
            </h2>

            <form method="POST">

                <input type="hidden"
                       name="csrf"
                       value="<?= e($csrf) ?>">

                <input type="hidden"
                       name="action"
                       value="<?= $editCoupon ? 'edit' : 'add' ?>">

                <input type="hidden"
                       name="id"
                       value="<?= e($editCoupon["id"] ?? 0) ?>">

                <div class="form-grid">

                    <div>
                        <label>Mã giảm giá</label>

                        <input type="text"
                               name="code"
                               maxlength="50"
                               placeholder="VD: SALE10"
                               value="<?= e($editCoupon["code"] ?? "") ?>"
                               required>
                    </div>

                    <div>
                        <label>Loại giảm giá</label>

                        <select name="discount_type" required>

                            <option value="percentage"
                                <?= ($editCoupon["discount_type"] ?? "")
                                    === "percentage"
                                    ? "selected" : "" ?>>
                                Giảm theo phần trăm (%)
                            </option>

                            <option value="fixed"
                                <?= ($editCoupon["discount_type"] ?? "")
                                    === "fixed"
                                    ? "selected" : "" ?>>
                                Giảm theo số tiền (VNĐ)
                            </option>

                        </select>
                    </div>

                    <div>
                        <label>Giá trị giảm giá</label>

                        <input type="number"
                               name="discount_value"
                               min="0.01"
                               max="9999999999.99"
                               step="0.01"
                               placeholder="Nhập giá trị"
                               value="<?= e($editCoupon["discount_value"] ?? "") ?>"
                               required>
                    </div>

                    <div>
                        <label>Ngày bắt đầu</label>

                        <input type="datetime-local"
                               name="start_date"
                               value="<?= e(inputDate(
                                   $editCoupon["start_date"] ?? null
                               )) ?>">
                    </div>

                    <div>
                        <label>Ngày kết thúc</label>

                        <input type="datetime-local"
                               name="end_date"
                               value="<?= e(inputDate(
                                   $editCoupon["end_date"] ?? null
                               )) ?>">
                    </div>

                    <div>
                        <label>Trạng thái</label>

                        <select name="status">

                            <option value="1"
                                <?= ($editCoupon["status"] ?? 1) == 1
                                    ? "selected" : "" ?>>
                                Hoạt động
                            </option>

                            <option value="0"
                                <?= ($editCoupon["status"] ?? 1) == 0
                                    ? "selected" : "" ?>>
                                Ngừng hoạt động
                            </option>

                        </select>
                    </div>

                </div>

                <button type="submit" class="btn">

                    <?= $editCoupon
                        ? "Lưu thay đổi"
                        : "+ Thêm mã giảm giá" ?>

                </button>

                <?php if ($editCoupon): ?>

                    <a href="coupons.php"
                       class="btn btn-reset">
                        Hủy chỉnh sửa
                    </a>

                <?php endif; ?>

            </form>

        </div>

        <!-- Danh sách mã giảm giá -->
        <div class="card">

            <h2>Danh sách mã giảm giá</h2>

            <form method="GET" class="search-form">

                <input type="text"
                       name="keyword"
                       placeholder="Nhập mã giảm giá cần tìm..."
                       value="<?= e($keyword) ?>">

                <button type="submit" class="btn">
                    Tìm kiếm
                </button>

                <a href="coupons.php"
                   class="btn btn-reset">
                    Làm mới
                </a>

            </form>

            <div class="table-wrapper">

                <table>

                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Mã giảm giá</th>
                            <th>Loại giảm</th>
                            <th>Giá trị</th>
                            <th>Ngày bắt đầu</th>
                            <th>Ngày kết thúc</th>
                            <th>Trạng thái</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>

                    <tbody>

                    <?php foreach ($coupons as $coupon): ?>

                        <tr>

                            <td><?= e($coupon["id"]) ?></td>

                            <td>
                                <strong>
                                    <?= e($coupon["code"]) ?>
                                </strong>
                            </td>

                            <td>
                                <?= $coupon["discount_type"] === "percentage"
                                    ? "Phần trăm"
                                    : "Số tiền" ?>
                            </td>

                            <td>
                                <?php if (
                                    $coupon["discount_type"] === "percentage"
                                ): ?>

                                    <?= e(rtrim(rtrim(
                                        (string)$coupon["discount_value"],
                                        '0'
                                    ), '.')) ?>%

                                <?php else: ?>

                                    <?= money($coupon["discount_value"]) ?>

                                <?php endif; ?>
                            </td>

                            <td>
                                <?= $coupon["start_date"]
                                    ? e(date(
                                        'd/m/Y H:i',
                                        strtotime($coupon["start_date"])
                                    ))
                                    : "Không giới hạn" ?>
                            </td>

                            <td>
                                <?= $coupon["end_date"]
                                    ? e(date(
                                        'd/m/Y H:i',
                                        strtotime($coupon["end_date"])
                                    ))
                                    : "Không giới hạn" ?>
                            </td>

                            <td>

                                <?php if ($coupon["status"] != 1): ?>

                                    <span class="status inactive-status">
                                        Ngừng hoạt động
                                    </span>

                                <?php elseif (
                                    $coupon["end_date"] &&
                                    $coupon["end_date"] < $now
                                ): ?>

                                    <span class="status expired-status">
                                        Hết hạn
                                    </span>

                                <?php elseif (
                                    $coupon["start_date"] &&
                                    $coupon["start_date"] > $now
                                ): ?>

                                    <span class="status pending-status">
                                        Chưa bắt đầu
                                    </span>

                                <?php else: ?>

                                    <span class="status active-status">
                                        Hoạt động
                                    </span>

                                <?php endif; ?>

                            </td>

                            <td>

                                <div class="actions">

                                    <a class="btn btn-edit"
                                       href="?edit=<?= e($coupon["id"]) ?>">
                                        Sửa
                                    </a>

                                    <form method="POST">

                                        <input type="hidden"
                                               name="csrf"
                                               value="<?= e($csrf) ?>">

                                        <input type="hidden"
                                               name="action"
                                               value="toggle">

                                        <input type="hidden"
                                               name="id"
                                               value="<?= e($coupon["id"]) ?>">

                                        <button type="submit"
                                                class="btn btn-toggle">

                                            <?= $coupon["status"] == 1
                                                ? "Tắt"
                                                : "Bật" ?>

                                        </button>

                                    </form>

                                    <form method="POST"
                                          onsubmit="return confirm('Bạn có chắc muốn xóa mã giảm giá này?');">

                                        <input type="hidden"
                                               name="csrf"
                                               value="<?= e($csrf) ?>">

                                        <input type="hidden"
                                               name="action"
                                               value="delete">

                                        <input type="hidden"
                                               name="id"
                                               value="<?= e($coupon["id"]) ?>">

                                        <button type="submit"
                                                class="btn btn-delete">
                                            Xóa
                                        </button>

                                    </form>

                                </div>

                            </td>

                        </tr>

                    <?php endforeach; ?>

                    <?php if (empty($coupons)): ?>

                        <tr>
                            <td colspan="8" class="empty">
                                Không tìm thấy mã giảm giá nào.
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
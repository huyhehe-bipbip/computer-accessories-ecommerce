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

$message = "";
$isError = false;
$editProduct = null;

if (empty($_SESSION["product_csrf"])) {
    $_SESSION["product_csrf"] = bin2hex(random_bytes(32));
}

// XỬ LÝ THÊM, SỬA, XÓA SẢN PHẨM
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $action = $_POST["action"] ?? "";

    try {
        if (!hash_equals(
            $_SESSION["product_csrf"],
            (string)($_POST["csrf_token"] ?? "")
        )) {
            throw new Exception("Yêu cầu không hợp lệ.");
        }

        if ($action === "add" || $action === "update") {
            $name = trim($_POST["name"] ?? "");
            $categoryId = (int)($_POST["category_id"] ?? 0);
            $description = trim($_POST["description"] ?? "");
            $price = $_POST["price"] ?? "";
            $memberPrice = $_POST["member_price"] ?? "";
            $stock = $_POST["stock"] ?? "";
            $image = trim($_POST["image"] ?? "");
            $status = isset($_POST["status"]) ? 1 : 0;

            if (
                $name === "" ||
                $categoryId <= 0 ||
                !is_numeric($price) ||
                !is_numeric($memberPrice) ||
                filter_var($stock, FILTER_VALIDATE_INT) === false ||
                $price < 0 ||
                $memberPrice < 0 ||
                $stock < 0
            ) {
                throw new Exception("Vui lòng nhập thông tin hợp lệ.");
            }

            // Kiểm tra danh mục
            $stmt = $conn->prepare(
                "SELECT id FROM categories WHERE id = ?"
            );
            $stmt->execute([$categoryId]);

            if (!$stmt->fetch()) {
                throw new Exception("Danh mục không tồn tại.");
            }

            // THÊM SẢN PHẨM
            if ($action === "add") {
                $sql = "INSERT INTO products
                    (category_id, name, description, price,
                     member_price, stock, image, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

                $stmt = $conn->prepare($sql);

                $stmt->execute([
                    $categoryId,
                    $name,
                    $description,
                    $price,
                    $memberPrice,
                    $stock,
                    $image,
                    $status
                ]);

                header("Location: products.php?message=added");
                exit;
            }

            // SỬA SẢN PHẨM
            if ($action === "update") {
                $id = (int)($_POST["id"] ?? 0);

                $sql = "UPDATE products SET
                    category_id = ?,
                    name = ?,
                    description = ?,
                    price = ?,
                    member_price = ?,
                    stock = ?,
                    image = ?,
                    status = ?
                    WHERE id = ?";

                $stmt = $conn->prepare($sql);

                $stmt->execute([
                    $categoryId,
                    $name,
                    $description,
                    $price,
                    $memberPrice,
                    $stock,
                    $image,
                    $status,
                    $id
                ]);

                header("Location: products.php?message=updated");
                exit;
            }
        }

        // XÓA SẢN PHẨM
        if ($action === "delete") {
            $id = (int)($_POST["id"] ?? 0);

            $stmt = $conn->prepare(
                "SELECT COUNT(*) FROM order_details
                 WHERE product_id = ?"
            );

            $stmt->execute([$id]);

            if ($stmt->fetchColumn() > 0) {
                throw new Exception(
                    "Không thể xóa sản phẩm đã có trong đơn hàng!"
                );
            }

            $stmt = $conn->prepare(
                "DELETE FROM products WHERE id = ?"
            );

            $stmt->execute([$id]);

            header("Location: products.php?message=deleted");
            exit;
        }

        // ẨN / HIỆN SẢN PHẨM
        if ($action === "toggle") {
            $id = (int)($_POST["id"] ?? 0);

            $stmt = $conn->prepare(
                "UPDATE products
                 SET status = CASE
                     WHEN status = 1 THEN 0
                     ELSE 1
                 END
                 WHERE id = ?"
            );

            $stmt->execute([$id]);

            header("Location: products.php?message=toggled");
            exit;
        }

    } catch (PDOException $ex) {
        error_log($ex->getMessage());
        $message = "Lỗi cơ sở dữ liệu. Vui lòng kiểm tra lại.";
        $isError = true;

    } catch (Exception $ex) {
        $message = $ex->getMessage();
        $isError = true;
    }
}

// THÔNG BÁO
if (!$isError && isset($_GET["message"])) {
    $messages = [
        "added" => "Thêm sản phẩm thành công!",
        "updated" => "Cập nhật sản phẩm thành công!",
        "deleted" => "Xóa sản phẩm thành công!",
        "toggled" => "Thay đổi trạng thái thành công!"
    ];

    $message = $messages[$_GET["message"]] ?? "";
}

// LẤY SẢN PHẨM CẦN SỬA
if (isset($_GET["edit"])) {
    $id = (int)$_GET["edit"];

    $stmt = $conn->prepare(
        "SELECT * FROM products WHERE id = ?"
    );

    $stmt->execute([$id]);
    $editProduct = $stmt->fetch();

    if (!$editProduct) {
        $message = "Không tìm thấy sản phẩm.";
        $isError = true;
    }
}

// LẤY DANH MỤC ĐANG HIỂN THỊ
// Giữ lại danh mục hiện tại khi sửa sản phẩm
$stmt = $conn->prepare(
    "SELECT id, name, status FROM categories
     WHERE status = 1 OR id = ?
     ORDER BY name"
);

$stmt->execute([
    $editProduct["category_id"] ?? 0
]);

$categories = $stmt->fetchAll();

// LẤY DANH SÁCH SẢN PHẨM
$sql = "SELECT p.*, c.name AS category_name
        FROM products p
        LEFT JOIN categories c
        ON p.category_id = c.id
        ORDER BY p.id DESC";

$products = $conn->query($sql)->fetchAll();
?>

<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport"
          content="width=device-width, initial-scale=1.0">

    <title>Quản lý sản phẩm</title>

    <style>
        * {
            box-sizing: border-box;
        }

        body {
            font-family: Arial, sans-serif;
            background: #f4f6f9;
            margin: 0;
            padding: 25px;
            color: #333;
        }

        .container {
            max-width: 1200px;
            margin: auto;
        }

        h1 {
            color: #222;
        }

        .back {
            display: inline-block;
            margin-bottom: 15px;
            color: #2563eb;
            text-decoration: none;
        }

        .form-box, .table-box {
            background: white;
            padding: 22px;
            margin-bottom: 25px;
            border-radius: 10px;
            box-shadow: 0 2px 8px #00000010;
        }

        .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }

        label {
            display: block;
            font-weight: bold;
            margin-bottom: 7px;
        }

        input, select, textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 5px;
            margin-bottom: 15px;
        }

        textarea {
            resize: vertical;
        }

        button, .btn {
            border: none;
            padding: 10px 15px;
            border-radius: 5px;
            cursor: pointer;
            text-decoration: none;
            color: white;
            display: inline-block;
        }

        .save {
            background: #2563eb;
        }

        .edit {
            background: #e69b17;
        }

        .delete {
            background: #dc3545;
        }

        .toggle {
            background: #64748b;
        }

        .cancel {
            background: #777;
        }

        .message {
            background: #e0f2e9;
            color: #176b3a;
            padding: 12px;
            margin-bottom: 20px;
            border-radius: 5px;
        }

        .error {
            background: #fee2e2;
            color: #991b1b;
            padding: 12px;
            margin-bottom: 20px;
            border-radius: 5px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th, td {
            padding: 12px 10px;
            border-bottom: 1px solid #ddd;
            text-align: left;
        }

        th {
            background: #2563eb;
            color: white;
        }

        .active {
            color: green;
            font-weight: bold;
        }

        .inactive {
            color: red;
            font-weight: bold;
        }

        .actions {
            display: flex;
            gap: 6px;
            align-items: center;
            flex-wrap: wrap;
        }

        .actions form {
            margin: 0;
        }

        .table-box {
            overflow-x: auto;
        }

        @media (max-width: 700px) {
            .form-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>

<body>

<div class="container">

    <a class="back" href="../dashboard.php">
        ← Quay lại Dashboard
    </a>

    <h1>📦 Quản lý sản phẩm</h1>

    <?php if ($message !== ""): ?>
        <div class="<?= $isError ? 'error' : 'message' ?>">
            <?= e($message) ?>
        </div>
    <?php endif; ?>

    <div class="form-box">

        <h2>
            <?= $editProduct
                ? "Cập nhật sản phẩm"
                : "Thêm sản phẩm mới" ?>
        </h2>

        <form method="POST" action="products.php">

            <input type="hidden" name="csrf_token"
                   value="<?= e($_SESSION["product_csrf"]) ?>">

            <input type="hidden" name="action"
                   value="<?= $editProduct ? 'update' : 'add' ?>">

            <?php if ($editProduct): ?>
                <input type="hidden" name="id"
                       value="<?= e($editProduct["id"]) ?>">
            <?php endif; ?>

            <div class="form-grid">

                <div>
                    <label>Tên sản phẩm</label>

                    <input type="text" name="name" required
                           value="<?= e($editProduct["name"] ?? "") ?>">
                </div>

                <div>
                    <label>Danh mục</label>

                    <select name="category_id" required>

                        <option value="">
                            -- Chọn danh mục --
                        </option>

                        <?php foreach ($categories as $category): ?>

                            <option
                                value="<?= e($category["id"]) ?>"
                                <?= (int)($editProduct["category_id"] ?? 0)
                                    === (int)$category["id"]
                                    ? "selected" : "" ?>>

                                <?= e($category["name"]) ?>
                                <?= (int)$category["status"] === 0
                                    ? " (Đang ẩn)" : "" ?>

                            </option>

                        <?php endforeach; ?>

                    </select>

                    <?php if (count($categories) === 0): ?>
                        <p>
                            Chưa có danh mục.
                            <a href="categories.php">
                                Thêm danh mục
                            </a>
                        </p>
                    <?php endif; ?>
                </div>

                <div>
                    <label>Giá khách thường (VNĐ)</label>

                    <input type="number"
                           name="price"
                           min="0"
                           step="1"
                           required
                           value="<?= e($editProduct["price"] ?? "") ?>">
                </div>

                <div>
                    <label>Giá Member (VNĐ)</label>

                    <input type="number"
                           name="member_price"
                           min="0"
                           step="1"
                           required
                           value="<?= e($editProduct["member_price"] ?? "") ?>">
                </div>

                <div>
                    <label>Số lượng tồn kho</label>

                    <input type="number"
                           name="stock"
                           min="0"
                           step="1"
                           required
                           value="<?= e($editProduct["stock"] ?? 0) ?>">
                </div>

                <div>
                    <label>Đường dẫn hình ảnh</label>

                    <input type="text"
                           name="image"
                           placeholder="Ví dụ: images/mouse.jpg"
                           value="<?= e($editProduct["image"] ?? "") ?>">
                </div>

            </div>

            <label>Mô tả sản phẩm</label>

            <textarea name="description" rows="4"><?= e(
                $editProduct["description"] ?? ""
            ) ?></textarea>

            <label>
                <input type="checkbox"
                       name="status"
                       value="1"
                       style="width:auto"
                       <?= !$editProduct ||
                           (int)$editProduct["status"] === 1
                           ? "checked" : "" ?>>

                Đang kinh doanh
            </label>

            <button type="submit" class="save">
                <?= $editProduct
                    ? "Lưu thay đổi"
                    : "Thêm sản phẩm" ?>
            </button>

            <?php if ($editProduct): ?>
                <a href="products.php" class="btn cancel">
                    Hủy sửa
                </a>
            <?php endif; ?>

        </form>

    </div>

    <!-- DANH SÁCH SẢN PHẨM -->
    <div class="table-box">

        <h2>Danh sách sản phẩm</h2>

        <p>
            Tổng số sản phẩm:
            <strong><?= count($products) ?></strong>
        </p>

        <table>

            <thead>
                <tr>
                    <th>ID</th>
                    <th>Tên sản phẩm</th>
                    <th>Danh mục</th>
                    <th>Giá thường</th>
                    <th>Giá Member</th>
                    <th>Tồn kho</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                </tr>
            </thead>

            <tbody>

            <?php foreach ($products as $product): ?>

                <tr>

                    <td><?= e($product["id"]) ?></td>

                    <td><?= e($product["name"]) ?></td>

                    <td>
                        <?= e($product["category_name"] ?? "Chưa phân loại") ?>
                    </td>

                    <td>
                        <?= number_format(
                            (float)$product["price"], 0, ",", "."
                        ) ?> đ
                    </td>

                    <td>
                        <?= number_format(
                            (float)$product["member_price"], 0, ",", "."
                        ) ?> đ
                    </td>

                    <td><?= e($product["stock"]) ?></td>

                    <td>
                        <?php if ((int)$product["status"] === 1): ?>
                            <span class="active">
                                Đang bán
                            </span>
                        <?php else: ?>
                            <span class="inactive">
                                Ngừng bán
                            </span>
                        <?php endif; ?>
                    </td>

                    <td>
                        <div class="actions">

                            <a class="btn edit"
                               href="products.php?edit=<?= e($product["id"]) ?>">
                                Sửa
                            </a>

                            <form method="POST" action="products.php">

                                <input type="hidden"
                                       name="csrf_token"
                                       value="<?= e($_SESSION["product_csrf"]) ?>">

                                <input type="hidden"
                                       name="action"
                                       value="toggle">

                                <input type="hidden"
                                       name="id"
                                       value="<?= e($product["id"]) ?>">

                                <button type="submit" class="toggle">
                                    <?= (int)$product["status"] === 1
                                        ? "Ẩn" : "Hiện" ?>
                                </button>

                            </form>

                            <form method="POST"
                                  action="products.php"
                                  onsubmit="return confirm('Bạn có chắc muốn xóa sản phẩm này?');">

                                <input type="hidden"
                                       name="csrf_token"
                                       value="<?= e($_SESSION["product_csrf"]) ?>">

                                <input type="hidden"
                                       name="action"
                                       value="delete">

                                <input type="hidden"
                                       name="id"
                                       value="<?= e($product["id"]) ?>">

                                <button type="submit" class="delete">
                                    Xóa
                                </button>

                            </form>

                        </div>
                    </td>

                </tr>

            <?php endforeach; ?>

            <?php if (count($products) === 0): ?>
                <tr>
                    <td colspan="8" style="text-align:center">
                        Chưa có sản phẩm nào.
                    </td>
                </tr>
            <?php endif; ?>

            </tbody>

        </table>

    </div>

</div>

</body>
</html>
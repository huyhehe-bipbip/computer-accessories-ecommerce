
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
$editCategory = null;

// Tạo mã bảo vệ form
if (empty($_SESSION["category_csrf"])) {
    $_SESSION["category_csrf"] = bin2hex(random_bytes(32));
}

// XỬ LÝ THÊM, SỬA, XÓA
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $action = $_POST["action"] ?? "";

    try {
        if (!hash_equals(
            $_SESSION["category_csrf"],
            (string)($_POST["csrf_token"] ?? "")
        )) {
            throw new Exception("Yêu cầu không hợp lệ.");
        }

        if ($action === "add" || $action === "update") {
            $name = trim($_POST["name"] ?? "");
            $description = trim($_POST["description"] ?? "");
            $status = isset($_POST["status"]) ? 1 : 0;
            $id = (int)($_POST["id"] ?? 0);

            if ($name === "" || mb_strlen($name) > 100) {
                throw new Exception(
                    "Tên danh mục phải từ 1 đến 100 ký tự."
                );
            }

            // Kiểm tra trùng tên
            $stmt = $conn->prepare(
                "SELECT COUNT(*) FROM categories
                 WHERE name = ? AND id != ?"
            );
            $stmt->execute([$name, $id]);

            if ($stmt->fetchColumn() > 0) {
                throw new Exception("Tên danh mục đã tồn tại.");
            }

            // THÊM DANH MỤC
            if ($action === "add") {
                $stmt = $conn->prepare(
                    "INSERT INTO categories
                     (name, description, status)
                     VALUES (?, ?, ?)"
                );

                $stmt->execute([
                    $name, $description, $status
                ]);

                header("Location: categories.php?message=added");
                exit;
            }

            // SỬA DANH MỤC
            if ($action === "update") {
                $stmt = $conn->prepare(
                    "SELECT id FROM categories WHERE id = ?"
                );
                $stmt->execute([$id]);

                if (!$stmt->fetch()) {
                    throw new Exception("Không tìm thấy danh mục.");
                }

                $stmt = $conn->prepare(
                    "UPDATE categories SET
                     name = ?,
                     description = ?,
                     status = ?
                     WHERE id = ?"
                );

                $stmt->execute([
                    $name, $description, $status, $id
                ]);

                header("Location: categories.php?message=updated");
                exit;
            }
        }

        // XÓA DANH MỤC
        if ($action === "delete") {
            $id = (int)($_POST["id"] ?? 0);

            // Kiểm tra danh mục có sản phẩm không
            $stmt = $conn->prepare(
                "SELECT COUNT(*) FROM products
                 WHERE category_id = ?"
            );

            $stmt->execute([$id]);

            if ($stmt->fetchColumn() > 0) {
                throw new Exception(
                    "Không thể xóa danh mục đang chứa sản phẩm!"
                );
            }

            $stmt = $conn->prepare(
                "DELETE FROM categories WHERE id = ?"
            );

            $stmt->execute([$id]);

            if ($stmt->rowCount() === 0) {
                throw new Exception("Không tìm thấy danh mục.");
            }

            header("Location: categories.php?message=deleted");
            exit;
        }

        // BẬT / TẮT DANH MỤC
        if ($action === "toggle") {
            $id = (int)($_POST["id"] ?? 0);

            $stmt = $conn->prepare(
                "UPDATE categories
                 SET status = CASE
                     WHEN status = 1 THEN 0
                     ELSE 1
                 END
                 WHERE id = ?"
            );

            $stmt->execute([$id]);

            if ($stmt->rowCount() === 0) {
                throw new Exception("Không tìm thấy danh mục.");
            }

            header("Location: categories.php?message=toggled");
            exit;
        }

    } catch (PDOException $ex) {
        error_log($ex->getMessage());
        $message = "Lỗi cơ sở dữ liệu. Vui lòng thử lại.";
        $isError = true;

    } catch (Exception $ex) {
        $message = $ex->getMessage();
        $isError = true;
    }
}

// THÔNG BÁO
if (!$isError && isset($_GET["message"])) {
    $messages = [
        "added" => "Thêm danh mục thành công!",
        "updated" => "Cập nhật danh mục thành công!",
        "deleted" => "Xóa danh mục thành công!",
        "toggled" => "Thay đổi trạng thái thành công!"
    ];

    $message = $messages[$_GET["message"]] ?? "";
}

// LẤY DANH MỤC CẦN SỬA
if (isset($_GET["edit"])) {
    $id = (int)$_GET["edit"];

    $stmt = $conn->prepare(
        "SELECT * FROM categories WHERE id = ?"
    );

    $stmt->execute([$id]);
    $editCategory = $stmt->fetch();

    if (!$editCategory) {
        $message = "Không tìm thấy danh mục.";
        $isError = true;
    }
}

// LẤY DANH SÁCH DANH MỤC
$sql = "SELECT c.*,
        (SELECT COUNT(*) FROM products p
         WHERE p.category_id = c.id) AS product_count
        FROM categories c
        ORDER BY c.id DESC";

$categories = $conn->query($sql)->fetchAll();
?>

<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport"
          content="width=device-width, initial-scale=1.0">

    <title>Quản lý danh mục</title>

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

        label {
            display: block;
            font-weight: bold;
            margin-bottom: 7px;
        }

        input, textarea {
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

        @media (max-width: 700px) {
            .table-box {
                overflow-x: auto;
            }
        }
    </style>
</head>

<body>

<div class="container">

    <a class="back" href="../dashboard.php">
        ← Quay lại Dashboard
    </a>

    <h1>📁 Quản lý danh mục</h1>

    <?php if ($message !== ""): ?>
        <div class="<?= $isError ? 'error' : 'message' ?>">
            <?= e($message) ?>
        </div>
    <?php endif; ?>

    <!-- FORM THÊM / SỬA -->
    <div class="form-box">

        <h2>
            <?= $editCategory
                ? "Cập nhật danh mục"
                : "Thêm danh mục mới" ?>
        </h2>

        <form method="POST">

            <input type="hidden" name="csrf_token"
                   value="<?= e($_SESSION["category_csrf"]) ?>">

            <input type="hidden" name="action"
                   value="<?= $editCategory ? 'update' : 'add' ?>">

            <?php if ($editCategory): ?>
                <input type="hidden" name="id"
                       value="<?= e($editCategory["id"]) ?>">
            <?php endif; ?>

            <label>Tên danh mục</label>

            <input type="text"
                   name="name"
                   maxlength="100"
                   required
                   value="<?= e($editCategory["name"] ?? "") ?>">

            <label>Mô tả danh mục</label>

            <textarea name="description" rows="4"><?= e(
                $editCategory["description"] ?? ""
            ) ?></textarea>

            <label>
                <input type="checkbox"
                       name="status"
                       value="1"
                       style="width:auto"
                       <?= !$editCategory ||
                           (int)$editCategory["status"] === 1
                           ? "checked" : "" ?>>

                Đang hiển thị
            </label>

            <button type="submit" class="save">
                <?= $editCategory
                    ? "Lưu thay đổi"
                    : "Thêm danh mục" ?>
            </button>

            <?php if ($editCategory): ?>
                <a href="categories.php" class="btn cancel">
                    Hủy sửa
                </a>
            <?php endif; ?>

        </form>

    </div>

    <!-- DANH SÁCH DANH MỤC -->
    <div class="table-box">

        <h2>Danh sách danh mục</h2>

        <p>
            Tổng số danh mục:
            <strong><?= count($categories) ?></strong>
        </p>

        <table>

            <thead>
                <tr>
                    <th>ID</th>
                    <th>Tên danh mục</th>
                    <th>Mô tả</th>
                    <th>Số sản phẩm</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                </tr>
            </thead>

            <tbody>

            <?php foreach ($categories as $category): ?>

                <tr>

                    <td><?= e($category["id"]) ?></td>

                    <td><?= e($category["name"]) ?></td>

                    <td><?= e($category["description"]) ?></td>

                    <td><?= e($category["product_count"]) ?></td>

                    <td>
                        <?php if ((int)$category["status"] === 1): ?>
                            <span class="active">Hiển thị</span>
                        <?php else: ?>
                            <span class="inactive">Đang ẩn</span>
                        <?php endif; ?>
                    </td>

                    <td>
                        <div class="actions">

                            <a class="btn edit"
                               href="categories.php?edit=<?= e($category["id"]) ?>">
                                Sửa
                            </a>

                            <form method="POST">

                                <input type="hidden" name="csrf_token"
                                       value="<?= e($_SESSION["category_csrf"]) ?>">

                                <input type="hidden"
                                       name="action" value="toggle">

                                <input type="hidden" name="id"
                                       value="<?= e($category["id"]) ?>">

                                <button type="submit" class="toggle">
                                    <?= (int)$category["status"] === 1
                                        ? "Ẩn" : "Hiện" ?>
                                </button>

                            </form>

                            <form method="POST"
                                  onsubmit="return confirm('Bạn có chắc muốn xóa danh mục này?');">

                                <input type="hidden" name="csrf_token"
                                       value="<?= e($_SESSION["category_csrf"]) ?>">

                                <input type="hidden"
                                       name="action" value="delete">

                                <input type="hidden" name="id"
                                       value="<?= e($category["id"]) ?>">

                                <button type="submit" class="delete">
                                    Xóa
                                </button>

                            </form>

                        </div>
                    </td>

                </tr>

            <?php endforeach; ?>

            <?php if (count($categories) === 0): ?>
                <tr>
                    <td colspan="6" style="text-align:center">
                        Chưa có danh mục nào.
                    </td>
                </tr>
            <?php endif; ?>

            </tbody>

        </table>

    </div>

</div>

</body>
</html>

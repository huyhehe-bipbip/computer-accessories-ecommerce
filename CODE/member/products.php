
<?php
session_start();

require_once __DIR__ . '/../admin/includes/db.php';

$isMember = isset($_SESSION["member_id"]);

// Chỉ lấy sản phẩm và danh mục đang hoạt động
$stmt = $conn->query(
    "SELECT p.id, p.name, p.price, p.member_price, p.stock
     FROM products AS p
     INNER JOIN categories AS c ON p.category_id = c.id
     WHERE p.status = 1
       AND c.status = 1
     ORDER BY p.id DESC"
);

$products = $stmt->fetchAll();

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
?>

<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Danh sách sản phẩm</title>

    <style>
        * {
            box-sizing: border-box;
        }

        body {
            font-family: Arial, sans-serif;
            background: #f1f3f5;
            margin: 0;
        }

        .container {
            width: 90%;
            margin: 30px auto;
        }

        .card {
            background: white;
            padding: 25px;
            border-radius: 12px;
            margin-bottom: 20px;
            box-shadow: 0 4px 15px #00000015;
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

        .member-price {
            color: #dc2626;
            font-weight: bold;
        }

        .old-price {
            color: #777;
            text-decoration: line-through;
        }

        .success {
            background: #d4edda;
            color: #155724;
            padding: 15px;
            border-radius: 5px;
        }

        a {
            color: #2563eb;
            text-decoration: none;
        }

        a:hover {
            text-decoration: underline;
        }

        .logout-btn {
            background: #dc3545;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        }

        .logout-btn:hover {
            background: #b91c1c;
        }

        .empty {
            text-align: center;
            color: #777;
            padding: 20px;
        }
    </style>
</head>

<body>

<div class="container">

    <h1>Danh sách sản phẩm</h1>

    <div class="card">

        <?php if ($isMember): ?>

            <div class="success">

                Xin chào,
                <strong>
                    <?= e($_SESSION["member_name"] ?? "Member") ?>
                </strong>

                <p>
                    Bạn đang được hưởng giá ưu đãi Member.
                </p>

                <form action="logout.php" method="POST">
                    <button type="submit" class="logout-btn">
                        Đăng xuất
                    </button>
                </form>

            </div>

        <?php else: ?>

            <p>Bạn đang truy cập với tư cách khách.</p>

            <a href="login.php">Đăng nhập Member</a>
            |
            <a href="register.php">Đăng ký Member</a>

        <?php endif; ?>

    </div>

    <div class="card">

        <h2>Sản phẩm đang kinh doanh</h2>

        <table>

            <thead>
                <tr>
                    <th>ID</th>
                    <th>Tên sản phẩm</th>
                    <th>Giá bán</th>
                    <th>Tồn kho</th>
                </tr>
            </thead>

            <tbody>

                <?php foreach ($products as $product): ?>

                    <tr>

                        <td>
                            <?= e($product["id"]) ?>
                        </td>

                        <td>
                            <?= e($product["name"]) ?>
                        </td>

                        <td>

                            <?php if (
                                $isMember &&
                                $product["member_price"] > 0 &&
                                $product["member_price"] < $product["price"]
                            ): ?>

                                <span class="old-price">
                                    <?= money($product["price"]) ?>
                                </span>

                                <br>

                                <span class="member-price">
                                    <?= money($product["member_price"]) ?>
                                </span>

                            <?php else: ?>

                                <?= money($product["price"]) ?>

                            <?php endif; ?>

                        </td>

                        <td>
                            <?= e($product["stock"]) ?>
                        </td>

                    </tr>

                <?php endforeach; ?>

                <?php if (empty($products)): ?>

                    <tr>
                        <td colspan="4" class="empty">
                            Chưa có sản phẩm nào đang kinh doanh.
                        </td>
                    </tr>

                <?php endif; ?>

            </tbody>

        </table>

    </div>

</div>

</body>
</html>

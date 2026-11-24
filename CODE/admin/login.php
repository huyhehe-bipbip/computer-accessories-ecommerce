
<?php
session_start();

require_once __DIR__ . "/includes/db.php";

$error = "";

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $username = trim($_POST["username"] ?? "");
    $password = $_POST["password"] ?? "";

    if ($username === "" || $password === "") {
        $error = "Vui lòng nhập đầy đủ tài khoản và mật khẩu.";
    } else {
        $sql = "SELECT id, username, password_hash, full_name
                FROM admin_users
                WHERE username = ?";

        $stmt = $conn->prepare($sql);
        $stmt->execute([$username]);

        $admin = $stmt->fetch();

        if ($admin && password_verify($password, $admin["password_hash"])) {
            session_regenerate_id(true);

            $_SESSION["admin_id"] = $admin["id"];
            $_SESSION["admin_username"] = $admin["username"];
            $_SESSION["admin_name"] = $admin["full_name"];

            header("Location: dashboard.php");
            exit;
        } else {
            $error = "Tên đăng nhập hoặc mật khẩu không chính xác.";
        }
    }
}
?>

<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Đăng nhập Admin</title>

    <link rel="stylesheet" href="assets/css/login.css">
</head>

<body>

    <div class="login-container">

        <div class="login-icon">💻</div>

        <h1>ADMIN LOGIN</h1>
        <p class="subtitle">Đăng nhập vào hệ thống quản trị</p>

        <?php if ($error !== ""): ?>
            <div class="error">
                <?= htmlspecialchars($error, ENT_QUOTES, "UTF-8") ?>
            </div>
        <?php endif; ?>

        <form method="POST" action="">

            <label for="username">Tên đăng nhập</label>
            <input
                type="text"
                id="username"
                name="username"
                placeholder="Nhập tên đăng nhập"
                required
            >

            <label for="password">Mật khẩu</label>
            <input
                type="password"
                id="password"
                name="password"
                placeholder="Nhập mật khẩu"
                required
            >

            <button type="submit">Đăng nhập</button>

        </form>

        <p class="footer-text">
            Computer Accessories Ecommerce
        </p>

    </div>

</body>
</html>

 
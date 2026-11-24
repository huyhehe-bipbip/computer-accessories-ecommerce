
<?php
session_start();

require_once __DIR__ . '/../admin/includes/db.php';

$error = "";

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $username = trim($_POST["username"] ?? "");
    $password = $_POST["password"] ?? "";

    if ($username === "" || $password === "") {
        $error = "Vui lòng nhập đầy đủ thông tin.";
    } else {
        $stmt = $conn->prepare(
            "SELECT id, username, password_hash, full_name
             FROM users
             WHERE username = ?"
        );

        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user["password_hash"])) {

            session_regenerate_id(true);

            $_SESSION["member_id"] = $user["id"];
            $_SESSION["member_username"] = $user["username"];
            $_SESSION["member_name"] = $user["full_name"];

            header("Location: login.php");
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
    <title>Đăng nhập Member</title>

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
            width: 420px;
            max-width: 95%;
            margin: 60px auto;
            padding: 30px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 15px #00000015;
        }

        h2 {
            text-align: center;
        }

        label {
            font-weight: bold;
        }

        input {
            width: 100%;
            padding: 12px;
            margin: 8px 0 18px;
            border: 1px solid #ccc;
            border-radius: 5px;
        }

        button {
            width: 100%;
            padding: 12px;
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        }

        .error {
            background: #f8d7da;
            color: #721c24;
            padding: 12px;
            margin-bottom: 15px;
            border-radius: 5px;
        }

        .success {
            background: #d4edda;
            color: #155724;
            padding: 15px;
            border-radius: 5px;
            text-align: center;
        }

        p {
            text-align: center;
        }

        a {
            color: #2563eb;
            text-decoration: none;
        }
    </style>
</head>

<body>

<div class="container">

    <h2>Đăng nhập Member</h2>

    <?php if (isset($_SESSION["member_id"])): ?>

        <div class="success">
            Đăng nhập thành công!
            <p>
                Xin chào,
                <strong>
                    <?= htmlspecialchars($_SESSION["member_name"], ENT_QUOTES, "UTF-8") ?>
                </strong>
            </p>
        </div>

        <p>Bạn đã đăng nhập với tư cách Member.</p>
<form action="logout.php" method="POST">
    <button type="submit" style="background: #dc3545;">
        Đăng xuất
    </button>
</form>
    <?php else: ?>

        <?php if ($error !== ""): ?>
            <div class="error">
                <?= htmlspecialchars($error, ENT_QUOTES, "UTF-8") ?>
            </div>
        <?php endif; ?>

        <form method="POST">

            <label>Tên đăng nhập</label>
            <input type="text" name="username" required>

            <label>Mật khẩu</label>
            <input type="password" name="password" required>

            <button type="submit">Đăng nhập</button>

        </form>

        <p>
            Chưa có tài khoản?
            <a href="register.php">Đăng ký</a>
        </p>

    <?php endif; ?>

</div>

</body>
</html>


<?php
require_once __DIR__ . '/../admin/includes/db.php';

$message = "";
$success = false;

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $username = trim($_POST["username"] ?? "");
    $full_name = trim($_POST["full_name"] ?? "");
    $password = $_POST["password"] ?? "";
    $confirm_password = $_POST["confirm_password"] ?? "";

    if ($username === "" || $full_name === "" || $password === "") {
        $message = "Vui lòng nhập đầy đủ thông tin.";
    } elseif (strlen($username) > 50 || mb_strlen($full_name) > 100) {
        $message = "Tên đăng nhập hoặc họ tên quá dài.";
    } elseif (strlen($password) < 6) {
        $message = "Mật khẩu phải có ít nhất 6 ký tự.";
    } elseif ($password !== $confirm_password) {
        $message = "Mật khẩu xác nhận không khớp.";
    } else {
        $stmt = $conn->prepare(
            "SELECT id FROM users WHERE username = ?"
        );
        $stmt->execute([$username]);

        if ($stmt->fetch()) {
            $message = "Tên đăng nhập đã tồn tại.";
        } else {
            $password_hash = password_hash(
                $password,
                PASSWORD_DEFAULT
            );

            $stmt = $conn->prepare(
                "INSERT INTO users
                (username, password_hash, full_name)
                VALUES (?, ?, ?)"
            );

            try {
                $stmt->execute([
                    $username,
                    $password_hash,
                    $full_name
                ]);

                $message = "Đăng ký thành công!";
                $success = true;
            } catch (PDOException $e) {
                $message = "Không thể đăng ký tài khoản.";
            }
        }
    }
}
?>

<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Đăng ký Member</title>

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
            color: #222;
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

        .message {
            padding: 12px;
            margin-bottom: 15px;
            border-radius: 5px;
        }

        .success {
            background: #d4edda;
            color: #155724;
        }

        .error {
            background: #f8d7da;
            color: #721c24;
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

    <h2>Đăng ký Member</h2>

    <?php if ($message !== ""): ?>
        <div class="message <?= $success ? 'success' : 'error' ?>">
            <?= htmlspecialchars($message, ENT_QUOTES, 'UTF-8') ?>
        </div>
    <?php endif; ?>

    <form method="POST">

        <label>Họ và tên</label>
        <input type="text" name="full_name"
               maxlength="100" required>

        <label>Tên đăng nhập</label>
        <input type="text" name="username"
               maxlength="50" required>

        <label>Mật khẩu</label>
        <input type="password" name="password"
               minlength="6" required>

        <label>Xác nhận mật khẩu</label>
        <input type="password" name="confirm_password"
               required>

        <button type="submit">Đăng ký</button>

    </form>

    <p>
        Đã có tài khoản?
        <a href="login.php">Đăng nhập</a>
    </p>

</div>

</body>
</html>

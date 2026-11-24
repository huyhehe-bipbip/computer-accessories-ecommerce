
<?php
require_once __DIR__ . "/includes/db.php";

$username = "admin";
$password = "Admin@123";
$full_name = "Administrator";

$check = $conn->prepare(
    "SELECT id FROM admin_users WHERE username = ?"
);
$check->execute([$username]);

if ($check->fetch()) {
    exit("Tai khoan admin da ton tai.");
}

$password_hash = password_hash($password, PASSWORD_DEFAULT);

$sql = "INSERT INTO admin_users (username, password_hash, full_name)
        VALUES (?, ?, ?)";

$stmt = $conn->prepare($sql);
$stmt->execute([$username, $password_hash, $full_name]);

echo "Tao tai khoan Admin thanh cong!";

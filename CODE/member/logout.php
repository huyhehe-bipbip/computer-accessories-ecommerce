<?php
session_start();

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    unset($_SESSION["member_id"]);
    unset($_SESSION["member_username"]);
    unset($_SESSION["member_name"]);

    session_regenerate_id(true);
}

header("Location: login.php");
exit;
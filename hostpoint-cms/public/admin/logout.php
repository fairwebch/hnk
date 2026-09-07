<?php
declare(strict_types=1);
require __DIR__ . '/includes/db.php';
require __DIR__ . '/includes/auth.php';

hnkcms_start_session();
$_SESSION = [];
session_destroy();
header('Location: /admin/login.php');

<?php
/**
 * PDO konekcija na hidapifa_hnkcms. config.php živi izvan document-roota
 * (hostpoint-cms/config/), pa mu se ovdje pristupa relativnom putanjom
 * prema gore.
 */

declare(strict_types=1);

function hnkcms_config(): array
{
    static $config = null;
    if ($config === null) {
        $path = __DIR__ . '/../../../config/config.php';
        if (!is_file($path)) {
            http_response_code(500);
            die('config.php nije pronađen. Kopirati config/config.example.php u config/config.php i popuniti.');
        }
        $config = require $path;
    }
    return $config;
}

function hnkcms_db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $c = hnkcms_config()['db'];
        $dsn = sprintf(
            'mysql:host=%s;dbname=%s;charset=%s',
            $c['host'],
            $c['name'],
            $c['charset'] ?? 'utf8mb4'
        );
        $pdo = new PDO($dsn, $c['user'], $c['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
    return $pdo;
}

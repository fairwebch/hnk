<?php
/**
 * Session guard + login/lockout logika za admin panel.
 * Uključiti NAKON db.php (koristi hnkcms_db(), hnkcms_config()).
 */

declare(strict_types=1);

const HNKCMS_MAX_ATTEMPTS = 5;
const HNKCMS_LOCKOUT_MINUTES = 15;

function hnkcms_start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $cfg = hnkcms_config();
    session_name($cfg['session_name'] ?? 'hnkcms_admin');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/admin/',
        'secure' => true,     // staging/produkcija su uvijek HTTPS
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function hnkcms_current_user(): ?array
{
    hnkcms_start_session();
    if (empty($_SESSION['admin_user_id'])) {
        return null;
    }
    $stmt = hnkcms_db()->prepare('SELECT * FROM admin_users WHERE id = ?');
    $stmt->execute([$_SESSION['admin_user_id']]);
    $user = $stmt->fetch();
    return $user ?: null;
}

/** Preusmjerava na login ako nema aktivne (potpuno prijavljene) sesije. */
function hnkcms_require_login(): array
{
    $user = hnkcms_current_user();
    if (!$user || empty($_SESSION['admin_2fa_ok'])) {
        header('Location: /admin/login.php');
        exit;
    }
    return $user;
}

function hnkcms_is_locked(array $user): bool
{
    return !empty($user['locked_until']) && strtotime($user['locked_until']) > time();
}

function hnkcms_register_failed_attempt(array $user): void
{
    $db = hnkcms_db();
    $attempts = (int) $user['failed_attempts'] + 1;
    if ($attempts >= HNKCMS_MAX_ATTEMPTS) {
        $lockedUntil = date('Y-m-d H:i:s', time() + HNKCMS_LOCKOUT_MINUTES * 60);
        $stmt = $db->prepare('UPDATE admin_users SET failed_attempts = 0, locked_until = ? WHERE id = ?');
        $stmt->execute([$lockedUntil, $user['id']]);
    } else {
        $stmt = $db->prepare('UPDATE admin_users SET failed_attempts = ? WHERE id = ?');
        $stmt->execute([$attempts, $user['id']]);
    }
}

function hnkcms_register_success(array $user): void
{
    $stmt = hnkcms_db()->prepare(
        'UPDATE admin_users SET failed_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = ?'
    );
    $stmt->execute([$user['id']]);
}

// --- CSRF ---------------------------------------------------------------

function hnkcms_csrf_token(): string
{
    hnkcms_start_session();
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function hnkcms_csrf_field(): string
{
    $token = htmlspecialchars(hnkcms_csrf_token(), ENT_QUOTES);
    return "<input type=\"hidden\" name=\"csrf_token\" value=\"{$token}\">";
}

function hnkcms_verify_csrf(): void
{
    hnkcms_start_session();
    $sent = $_POST['csrf_token'] ?? '';
    if (empty($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $sent)) {
        http_response_code(403);
        die('Nevažeći CSRF token — osvježite stranicu i pokušajte ponovo.');
    }
}

<?php
declare(strict_types=1);
require __DIR__ . '/includes/db.php';
require __DIR__ . '/includes/auth.php';
require __DIR__ . '/includes/totp.php';

hnkcms_start_session();

// Već potpuno prijavljen → dashboard.
if (!empty($_SESSION['admin_user_id']) && !empty($_SESSION['admin_2fa_ok'])) {
    header('Location: /admin/index.php');
    exit;
}

$error = null;
$step = !empty($_SESSION['admin_pending_user_id']) ? 'totp' : 'password';

// Lozinka je već prošla (pending user postoji), ali 2FA nikad nije
// postavljen za ovaj nalog — ravno na setup, bez besmislenog "unesi kod"
// koraka koji korisnik ne može ispuniti.
if ($step === 'totp') {
    $stmt = hnkcms_db()->prepare('SELECT totp_secret, totp_confirmed FROM admin_users WHERE id = ?');
    $stmt->execute([(int) $_SESSION['admin_pending_user_id']]);
    $pending = $stmt->fetch();
    if (!$pending || empty($pending['totp_secret']) || !$pending['totp_confirmed']) {
        header('Location: /admin/setup-2fa.php');
        exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    hnkcms_verify_csrf();

    if ($step === 'password') {
        $username = trim((string) ($_POST['username'] ?? ''));
        $password = (string) ($_POST['password'] ?? '');

        $stmt = hnkcms_db()->prepare('SELECT * FROM admin_users WHERE username = ?');
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if ($user && hnkcms_is_locked($user)) {
            $error = 'Nalog je privremeno zaključan zbog previše neuspjelih pokušaja. Pokušajte kasnije.';
        } elseif ($user && password_verify($password, $user['password_hash'])) {
            // Lozinka OK — čeka se TOTP korak. Ne prijavljujemo puni login dok
            // i drugi faktor ne prođe.
            $_SESSION['admin_pending_user_id'] = (int) $user['id'];
            header('Location: /admin/login.php');
            exit;
        } else {
            if ($user) {
                hnkcms_register_failed_attempt($user);
            }
            $error = 'Pogrešno korisničko ime ili lozinka.';
            usleep(300000); // blaga vremenska kazna protiv brute-force / user-enumeration
        }
    } elseif ($step === 'totp') {
        $userId = (int) $_SESSION['admin_pending_user_id'];
        $stmt = hnkcms_db()->prepare('SELECT * FROM admin_users WHERE id = ?');
        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        if (!$user) {
            unset($_SESSION['admin_pending_user_id']);
            header('Location: /admin/login.php');
            exit;
        }
        if (hnkcms_is_locked($user)) {
            $error = 'Nalog je privremeno zaključan zbog previše neuspjelih pokušaja. Pokušajte kasnije.';
        } elseif (empty($user['totp_secret']) || !$user['totp_confirmed']) {
            // 2FA još nije postavljen za ovaj nalog.
            header('Location: /admin/setup-2fa.php');
            exit;
        } elseif (Totp::verify($user['totp_secret'], (string) ($_POST['code'] ?? ''))) {
            hnkcms_register_success($user);
            unset($_SESSION['admin_pending_user_id']);
            $_SESSION['admin_user_id'] = $user['id'];
            $_SESSION['admin_2fa_ok'] = true;
            session_regenerate_id(true);
            header('Location: /admin/index.php');
            exit;
        } else {
            hnkcms_register_failed_attempt($user);
            $error = 'Pogrešan kod. Provjerite autentikator aplikaciju.';
        }
    }
}
?>
<!doctype html>
<html lang="hr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>HNK CMS · Prijava</title>
<link rel="stylesheet" href="/admin/assets/admin.css">
</head>
<body class="auth-body">
<main class="auth-card">
  <div class="auth-card-flag" aria-hidden="true"></div>
  <div class="auth-card-body">
  <h1>HNK Kroatien Schwyz</h1>
  <p class="auth-sub">Admin · <?= htmlspecialchars($step === 'totp' ? 'Kod za potvrdu (2FA)' : 'Prijava', ENT_QUOTES) ?></p>

  <?php if ($error): ?>
    <p class="auth-error"><?= htmlspecialchars($error, ENT_QUOTES) ?></p>
  <?php endif; ?>

  <?php if ($step === 'password'): ?>
    <form method="post" class="auth-form">
      <?= hnkcms_csrf_field() ?>
      <label>Korisničko ime
        <input type="text" name="username" autocomplete="username" required autofocus>
      </label>
      <label>Lozinka
        <input type="password" name="password" autocomplete="current-password" required>
      </label>
      <button type="submit">Nastavi</button>
    </form>
  <?php else: ?>
    <form method="post" class="auth-form">
      <?= hnkcms_csrf_field() ?>
      <label>6-znamenkasti kod iz autentikator aplikacije
        <input type="text" name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" required autofocus>
      </label>
      <button type="submit">Prijavi se</button>
    </form>
  <?php endif; ?>
  </div>
</main>
</body>
</html>

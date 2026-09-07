<?php
/**
 * Prvo postavljanje 2FA — dostupno samo nakon uspješne lozinke (pending user),
 * a prije nego je totp_confirmed=1. Nakon potvrde prvog koda, nalog se smatra
 * potpuno prijavljenim (isto kao normalan TOTP login).
 */
declare(strict_types=1);
require __DIR__ . '/includes/db.php';
require __DIR__ . '/includes/auth.php';
require __DIR__ . '/includes/totp.php';

hnkcms_start_session();

if (empty($_SESSION['admin_pending_user_id'])) {
    header('Location: /admin/login.php');
    exit;
}
$userId = (int) $_SESSION['admin_pending_user_id'];
$stmt = hnkcms_db()->prepare('SELECT * FROM admin_users WHERE id = ?');
$stmt->execute([$userId]);
$user = $stmt->fetch();
if (!$user) {
    unset($_SESSION['admin_pending_user_id']);
    header('Location: /admin/login.php');
    exit;
}
if (!empty($user['totp_secret']) && $user['totp_confirmed']) {
    // 2FA već postavljen — ovamo se ne smije doći, natrag na login.
    header('Location: /admin/login.php');
    exit;
}

// Tajna se generira jednom pa čuva u sesiji dok se ne potvrdi prvim kodom
// (ne pišemo je u bazu dok korisnik ne dokaže da je uspješno uparena).
if (empty($_SESSION['admin_2fa_pending_secret'])) {
    $_SESSION['admin_2fa_pending_secret'] = Totp::generateSecret();
}
$secret = $_SESSION['admin_2fa_pending_secret'];

$error = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    hnkcms_verify_csrf();
    if (Totp::verify($secret, (string) ($_POST['code'] ?? ''))) {
        $stmt = hnkcms_db()->prepare('UPDATE admin_users SET totp_secret = ?, totp_confirmed = 1 WHERE id = ?');
        $stmt->execute([$secret, $user['id']]);

        unset($_SESSION['admin_2fa_pending_secret'], $_SESSION['admin_pending_user_id']);
        $_SESSION['admin_user_id'] = $user['id'];
        $_SESSION['admin_2fa_ok'] = true;
        session_regenerate_id(true);
        header('Location: /admin/index.php');
        exit;
    }
    $error = 'Pogrešan kod — provjerite je li sat na telefonu točan i pokušajte ponovo.';
}

$issuer = hnkcms_config()['totp_issuer'];
$uri = Totp::otpauthUri($secret, $user['username'], $issuer);
?>
<!doctype html>
<html lang="hr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>HNK CMS · Postavi 2FA</title>
<link rel="stylesheet" href="/admin/assets/admin.css">
</head>
<body class="auth-body">
<main class="auth-card auth-card--wide">
  <h1>HNK Kroatien Schwyz</h1>
  <p class="auth-sub">Postavljanje dvofaktorske autentikacije (prvi put)</p>

  <ol class="setup-steps">
    <li>Otvorite autentikator aplikaciju (Google Authenticator, Authy, 1Password, ...).</li>
    <li>Dodajte novi nalog → unesite ključ ručno (nema QR koda — namjerno, bez vanjskih servisa):
      <div class="secret-box"><?= htmlspecialchars(chunk_split($secret, 4, ' '), ENT_QUOTES) ?></div>
      <p class="hint">Naziv izdavatelja: <?= htmlspecialchars($issuer, ENT_QUOTES) ?> · Tip: vrijeme-bazirano (TOTP), 6 znamenki, 30s</p>
    </li>
    <li>Upišite trenutni 6-znamenkasti kod da potvrdite uparivanje:</li>
  </ol>

  <?php if ($error): ?>
    <p class="auth-error"><?= htmlspecialchars($error, ENT_QUOTES) ?></p>
  <?php endif; ?>

  <form method="post" class="auth-form">
    <?= hnkcms_csrf_field() ?>
    <label>Kod iz aplikacije
      <input type="text" name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" required autofocus>
    </label>
    <button type="submit">Potvrdi i aktiviraj 2FA</button>
  </form>
</main>
</body>
</html>

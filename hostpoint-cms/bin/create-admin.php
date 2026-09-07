<?php
/**
 * CLI: kreira/resetira admin nalog izravno u bazi, bez izlaganja lozinke
 * kroz HTTP u bilo kojem trenutku bootstrapa.
 *
 * Pokrenuti na Hostpointu preko SSH (ili lokalno protiv config.php koji
 * pokazuje na eksterni MySQL host):
 *   php bin/create-admin.php <username>
 * Zatražit će lozinku interaktivno (bez echo-a u terminalu gdje je moguće).
 *
 * 2FA se NE postavlja ovdje — prvi login kroz browser (login.php) će
 * korisnika automatski provesti kroz setup-2fa.php.
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    die("Samo za CLI.\n");
}
require __DIR__ . '/../public/admin/includes/db.php';

$username = $argv[1] ?? null;
if (!$username) {
    fwrite(STDERR, "Upotreba: php bin/create-admin.php <username>\n");
    exit(1);
}

fwrite(STDOUT, "Lozinka za '{$username}' (min. 12 znakova): ");
if (stripos(PHP_OS, 'WIN') === false && shell_exec('which stty')) {
    shell_exec('stty -echo');
    $password = trim((string) fgets(STDIN));
    shell_exec('stty echo');
    fwrite(STDOUT, "\n");
} else {
    $password = trim((string) fgets(STDIN));
}

if (strlen($password) < 12) {
    fwrite(STDERR, "Lozinka mora imati barem 12 znakova.\n");
    exit(1);
}

$hash = password_hash($password, PASSWORD_DEFAULT);
$db = hnkcms_db();

$stmt = $db->prepare('SELECT id FROM admin_users WHERE username = ?');
$stmt->execute([$username]);
$existing = $stmt->fetch();

if ($existing) {
    // Reset lozinke: briše i postojeći 2FA da nalog prođe setup ponovo
    // (spriječava scenarij "netko je promijenio lozinku ali stari TOTP
    // uređaj ostaje uparen").
    $db->prepare('UPDATE admin_users SET password_hash=?, totp_secret=NULL, totp_confirmed=0, failed_attempts=0, locked_until=NULL WHERE id=?')
        ->execute([$hash, $existing['id']]);
    fwrite(STDOUT, "Lozinka za '{$username}' ažurirana. 2FA će se ponovo postaviti kod sljedeće prijave.\n");
} else {
    $db->prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)')
        ->execute([$username, $hash]);
    fwrite(STDOUT, "Admin nalog '{$username}' kreiran. 2FA se postavlja kod prve prijave na /admin/login.php.\n");
}

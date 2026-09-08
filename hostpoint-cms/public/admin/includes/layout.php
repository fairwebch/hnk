<?php
/**
 * Zajednički okvir admin stranica (header + nav tabovi + <main>). Izdvojeno
 * kad je stigao 4. modul — nav se dotad ručno duplirao u svakoj stranici,
 * pa je svaki novi modul značio uređivanje svih postojećih datoteka.
 * Uključiti NAKON auth.php (prima već provjerenog $user).
 */

declare(strict_types=1);

/** Tabovi glavne navigacije: ključ => [putanja, labela]. Novi modul = jedan redak ovdje. */
const HNKCMS_NAV = [
    'sponzori' => ['/admin/index.php', 'Sponzori'],
    'uprava'   => ['/admin/uprava.php', 'Uprava'],
    'stranice' => ['/admin/stranice.php', 'Stranice'],
    'momcadi'  => ['/admin/momcadi.php', 'Momčadi'],
    'galerije' => ['/admin/galerije.php', 'Galerije'],
    'novosti'  => ['/admin/novosti.php', 'Novosti'],
    'dogadjaji' => ['/admin/dogadjaji.php', 'Događaji'],
    'prijave'   => ['/admin/prijave.php', 'Prijave'],
];

/**
 * @param string $title   naslov taba (bez "HNK CMS ·" prefiksa)
 * @param string $active  ključ iz HNKCMS_NAV
 * @param array  $user    redak iz admin_users (hnkcms_require_login())
 * @param bool   $narrow  uži <main> za forme (admin-main--narrow)
 */
function hnkcms_admin_page_start(string $title, string $active, array $user, bool $narrow = false): void
{
    $mainClass = 'admin-main' . ($narrow ? ' admin-main--narrow' : '');
    ?>
<!doctype html>
<html lang="hr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>HNK CMS · <?= htmlspecialchars($title, ENT_QUOTES) ?></title>
<link rel="stylesheet" href="/admin/assets/admin.css">
</head>
<body class="admin-body">
<header class="admin-header">
  <h1>HNK Kroatien Schwyz · CMS</h1>
  <div class="admin-header-right">
    <span>Prijavljen: <?= htmlspecialchars($user['username'], ENT_QUOTES) ?></span>
    <a href="/admin/logout.php" class="btn btn-ghost">Odjava</a>
  </div>
</header>

<nav class="admin-nav">
  <?php foreach (HNKCMS_NAV as $key => [$href, $label]): ?>
    <a href="<?= $href ?>"<?= $key === $active ? ' class="is-active"' : '' ?>><?= $label ?></a>
  <?php endforeach; ?>
</nav>

<main class="<?= $mainClass ?>">
<?php
}

function hnkcms_admin_page_end(): void
{
    ?>
</main>
</body>
</html>
<?php
}

/** Flash poruka iz ?msg= (nakon redirecta), ili ništa. */
function hnkcms_flash(): void
{
    if (!empty($_GET['msg'])) {
        echo '<p class="flash flash-ok">' . htmlspecialchars((string) $_GET['msg'], ENT_QUOTES) . '</p>';
    }
}

<?php
/**
 * Zajednički okvir admin stranica (sidebar + topbar + <main>). Izdvojeno
 * kad je stigao 4. modul — nav se dotad ručno duplirao u svakoj stranici,
 * pa je svaki novi modul značio uređivanje svih postojećih datoteka.
 * Uključiti NAKON auth.php (prima već provjerenog $user).
 *
 * FAZA 1 redizajna (vidi hostpoint-cms/README.md): sidebar navigacija
 * zamjenjuje raniju gornju traku tabova. Ovo je JEDINO mjesto koje
 * generira <header>/<nav> markup — svi moduli i dalje samo zovu
 * hnkcms_admin_page_start()/hnkcms_admin_page_end(), pa je ovaj redizajn
 * automatski vidljiv na svih 10 modula bez dodirivanja njihovih fajlova.
 */

declare(strict_types=1);

/** Tabovi glavne navigacije: ključ => [putanja, labela, grupa]. Novi modul = jedan redak ovdje. */
const HNKCMS_NAV = [
    'sponzori'  => ['/admin/index.php', 'Sponzori', 'sadrzaj'],
    'uprava'    => ['/admin/uprava.php', 'Uprava', 'sadrzaj'],
    'stranice'  => ['/admin/stranice.php', 'Stranice', 'sadrzaj'],
    'momcadi'   => ['/admin/momcadi.php', 'Momčadi', 'sadrzaj'],
    'galerije'  => ['/admin/galerije.php', 'Galerije', 'sadrzaj'],
    'novosti'   => ['/admin/novosti.php', 'Novosti', 'sadrzaj'],
    'dogadjaji' => ['/admin/dogadjaji.php', 'Događaji', 'sadrzaj'],
    'prijave'   => ['/admin/prijave.php', 'Prijave', 'sistem'],
    'klub'      => ['/admin/klub.php', 'Klub', 'sistem'],
    'sajt'      => ['/admin/sajt.php', 'Postavke', 'sistem'],
];

const HNKCMS_NAV_GROUPS = [
    'sadrzaj' => 'Sadržaj',
    'sistem'  => 'Sistem',
];

/**
 * Minimalne inline stroke-ikone (lucide-stil, bez vanjskih biblioteka).
 * viewBox 24x24, stroke="currentColor" — boja dolazi iz CSS-a nav linka.
 */
function hnkcms_icon(string $name): string
{
    $paths = [
        'sponzori'  => '<path d="M8.5 14a3.5 3.5 0 1 1 3.5-3.5"/><path d="M12 3v3M12 18v3M4.6 5.6l2.1 2.1M17.3 17.3l2.1 2.1M3 12h3M18 12h3M4.6 18.4l2.1-2.1M17.3 6.7l2.1-2.1"/><circle cx="12" cy="10.5" r="1.5"/>',
        'uprava'    => '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 2.7-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 20c.3-2.2 1.9-3.8 4-4"/>',
        'stranice'  => '<path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 15.5h6M9 8.5h2"/>',
        'momcadi'   => '<path d="M8 4 4 6.5 6 9v11a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9l2-2.5L16 4l-1.5 2h-5L8 4z"/><path d="M9.5 6 12 8.5 14.5 6"/>',
        'galerije'  => '<rect x="3.5" y="4.5" width="17" height="14" rx="1"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M4.5 16.5 9 12l2.5 2.5L16 10l4 5"/>',
        'novosti'   => '<path d="M5 4.5h11a1 1 0 0 1 1 1V17a2 2 0 0 0 2 2H6a1.5 1.5 0 0 1-1.5-1.5V4.5z"/><path d="M19 8v9a2 2 0 0 1-2 2"/><path d="M8 8h5M8 11h5M8 14h3"/>',
        'dogadjaji' => '<rect x="3.5" y="5" width="17" height="15" rx="1.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><circle cx="8.3" cy="13.5" r="1"/><circle cx="12" cy="13.5" r="1"/><circle cx="15.7" cy="13.5" r="1"/>',
        'prijave'   => '<path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z"/><path d="M4 7.5 12 12l8-4.5M12 12v9"/>',
        'klub'      => '<path d="M12 3 4 6.5v5c0 5 3.4 8 8 9.5 4.6-1.5 8-4.5 8-9.5v-5z"/><path d="m9 12 2 2 4-4.5"/>',
        'sajt'      => '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M3 12h2.5M18.5 12H21M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>',
        'hamburger' => '<path d="M4 6.5h16M4 12h16M4 17.5h16"/>',
        'close'     => '<path d="M6 6l12 12M18 6 6 18"/>',
        'logout'    => '<path d="M9 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h3"/><path d="M14 8l4 4-4 4M18 12H9"/>',
    ];
    $d = $paths[$name] ?? '';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . $d . '</svg>';
}

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
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/admin/assets/admin.css">
</head>
<body class="admin-body">
<input type="checkbox" id="nav-toggle" class="nav-toggle">

<div class="admin-shell">
  <aside class="admin-sidebar">
    <div class="sidebar-top">
      <a href="/admin/index.php" class="sidebar-brand">
        <span class="sidebar-brand-mark" aria-hidden="true">HNK</span>
        <span class="sidebar-brand-label">Kroatien Schwyz<br><small>CMS</small></span>
      </a>
      <label for="nav-toggle" class="sidebar-close" aria-label="Zatvori meni"><?= hnkcms_icon('close') ?></label>
    </div>

    <nav class="sidebar-nav">
      <?php foreach (HNKCMS_NAV_GROUPS as $groupKey => $groupLabel): ?>
        <div class="nav-group">
          <span class="nav-group-label"><?= htmlspecialchars($groupLabel, ENT_QUOTES) ?></span>
          <?php foreach (HNKCMS_NAV as $key => [$href, $label, $group]): if ($group !== $groupKey) continue; ?>
            <a href="<?= $href ?>"<?= $key === $active ? ' class="is-active"' : '' ?>>
              <?= hnkcms_icon($key) ?>
              <span><?= htmlspecialchars($label, ENT_QUOTES) ?></span>
            </a>
          <?php endforeach; ?>
        </div>
      <?php endforeach; ?>
    </nav>

    <div class="sidebar-bottom">
      <span class="sidebar-user"><?= htmlspecialchars($user['username'], ENT_QUOTES) ?></span>
      <a href="/admin/logout.php" class="btn btn-ghost sidebar-logout"><?= hnkcms_icon('logout') ?> Odjava</a>
    </div>
  </aside>

  <label for="nav-toggle" class="sidebar-backdrop" aria-hidden="true"></label>

  <div class="admin-content">
    <header class="admin-topbar">
      <label for="nav-toggle" class="hamburger" aria-label="Otvori meni"><?= hnkcms_icon('hamburger') ?></label>
      <span class="topbar-title"><?= htmlspecialchars($title, ENT_QUOTES) ?></span>
    </header>

    <main class="<?= $mainClass ?>">
<?php
}

function hnkcms_admin_page_end(): void
{
    ?>
    </main>
  </div>
</div>
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

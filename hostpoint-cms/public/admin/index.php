<?php
declare(strict_types=1);
require __DIR__ . '/includes/db.php';
require __DIR__ . '/includes/auth.php';

$user = hnkcms_require_login();

$rows = hnkcms_db()->query('SELECT * FROM sponzori ORDER BY redoslijed ASC, id ASC')->fetchAll();
$uploadsUrl = rtrim(hnkcms_config()['public_base_url'], '/') . '/uploads/sponzori';
?>
<!doctype html>
<html lang="hr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>HNK CMS · Sponzori</title>
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
  <a href="/admin/index.php" class="is-active">Sponzori</a>
  <a href="/admin/uprava.php">Uprava</a>
  <a href="/admin/stranice.php">Stranice</a>
</nav>

<main class="admin-main">
  <div class="admin-toolbar">
    <h2>Sponzori</h2>
    <a href="/admin/sponzor-edit.php" class="btn btn-primary">+ Novi sponzor</a>
  </div>

  <?php if (!empty($_GET['msg'])): ?>
    <p class="flash flash-ok"><?= htmlspecialchars($_GET['msg'], ENT_QUOTES) ?></p>
  <?php endif; ?>

  <table class="admin-table">
    <thead>
      <tr>
        <th>Red.</th>
        <th>Logo</th>
        <th>Naziv</th>
        <th>Paket</th>
        <th>Status</th>
        <th>Web</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      <?php if (!$rows): ?>
        <tr><td colspan="7" class="empty">Još nema unesenih sponzora.</td></tr>
      <?php endif; ?>
      <?php foreach ($rows as $row): ?>
        <tr>
          <td><?= (int) $row['redoslijed'] ?></td>
          <td>
            <?php if ($row['logo_small']): ?>
              <img class="thumb" src="<?= htmlspecialchars($uploadsUrl . '/' . $row['logo_small'], ENT_QUOTES) ?>" alt="">
            <?php else: ?>
              <span class="thumb thumb-empty">—</span>
            <?php endif; ?>
          </td>
          <td><?= htmlspecialchars($row['naziv'], ENT_QUOTES) ?></td>
          <td><span class="pill pill-<?= strtolower($row['paket']) ?>"><?= htmlspecialchars($row['paket'], ENT_QUOTES) ?></span></td>
          <td>
            <span class="pill <?= $row['status'] === 'veroeffentlicht' ? 'pill-live' : 'pill-draft' ?>">
              <?= $row['status'] === 'veroeffentlicht' ? 'Veröffentlicht' : 'Entwurf' ?>
            </span>
          </td>
          <td><?php if ($row['link']): ?><a href="<?= htmlspecialchars($row['link'], ENT_QUOTES) ?>" target="_blank" rel="noopener">↗</a><?php endif; ?></td>
          <td class="admin-row-actions">
            <a href="/admin/sponzor-edit.php?id=<?= (int) $row['id'] ?>">Uredi</a>
            <form method="post" action="/admin/sponzor-delete.php" onsubmit="return confirm('Obrisati sponzora &quot;<?= htmlspecialchars(addslashes($row['naziv']), ENT_QUOTES) ?>&quot;? Ovo briše i logo datoteke.');">
              <?= hnkcms_csrf_field() ?>
              <input type="hidden" name="id" value="<?= (int) $row['id'] ?>">
              <button type="submit" class="link-danger">Obriši</button>
            </form>
          </td>
        </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
</main>
</body>
</html>

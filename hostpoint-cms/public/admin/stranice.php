<?php
declare(strict_types=1);
require __DIR__ . '/includes/db.php';
require __DIR__ . '/includes/auth.php';

$user = hnkcms_require_login();

$rows = hnkcms_db()->query('SELECT * FROM stranice ORDER BY naslov_hr ASC')->fetchAll();
?>
<!doctype html>
<html lang="hr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>HNK CMS · Stranice</title>
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
  <a href="/admin/index.php">Sponzori</a>
  <a href="/admin/uprava.php">Uprava</a>
  <a href="/admin/stranice.php" class="is-active">Stranice</a>
</nav>

<main class="admin-main">
  <div class="admin-toolbar">
    <h2>Stranice</h2>
    <a href="/admin/stranica-edit.php" class="btn btn-primary">+ Nova stranica</a>
  </div>

  <?php if (!empty($_GET['msg'])): ?>
    <p class="flash flash-ok"><?= htmlspecialchars($_GET['msg'], ENT_QUOTES) ?></p>
  <?php endif; ?>

  <table class="admin-table">
    <thead>
      <tr>
        <th>Naslov</th>
        <th>Slug</th>
        <th>Status</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      <?php if (!$rows): ?>
        <tr><td colspan="4" class="empty">Još nema unesenih stranica.</td></tr>
      <?php endif; ?>
      <?php foreach ($rows as $row): ?>
        <tr>
          <td><?= htmlspecialchars($row['naslov_hr'], ENT_QUOTES) ?></td>
          <td><code><?= htmlspecialchars($row['slug'], ENT_QUOTES) ?></code></td>
          <td>
            <span class="pill <?= $row['status'] === 'veroeffentlicht' ? 'pill-live' : 'pill-draft' ?>">
              <?= $row['status'] === 'veroeffentlicht' ? 'Veröffentlicht' : 'Entwurf' ?>
            </span>
          </td>
          <td class="admin-row-actions">
            <a href="/admin/stranica-edit.php?id=<?= (int) $row['id'] ?>">Uredi</a>
            <form method="post" action="/admin/stranica-delete.php" onsubmit="return confirm('Obrisati stranicu &quot;<?= htmlspecialchars(addslashes($row['naslov_hr']), ENT_QUOTES) ?>&quot;?');">
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

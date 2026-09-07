<?php
declare(strict_types=1);
require __DIR__ . '/includes/db.php';
require __DIR__ . '/includes/auth.php';
require __DIR__ . '/includes/layout.php';

$user = hnkcms_require_login();

$rows = hnkcms_db()->query('SELECT * FROM sponzori ORDER BY redoslijed ASC, id ASC')->fetchAll();
$uploadsUrl = rtrim(hnkcms_config()['public_base_url'], '/') . '/uploads/sponzori';

hnkcms_admin_page_start('Sponzori', 'sponzori', $user);
?>
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
<?php hnkcms_admin_page_end(); ?>

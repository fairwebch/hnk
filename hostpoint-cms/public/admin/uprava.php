<?php
declare(strict_types=1);
require __DIR__ . '/includes/db.php';
require __DIR__ . '/includes/auth.php';
require __DIR__ . '/includes/layout.php';

$user = hnkcms_require_login();

$rows = hnkcms_db()->query('SELECT * FROM clan_uprave ORDER BY redoslijed ASC, id ASC')->fetchAll();
$uploadsUrl = rtrim(hnkcms_config()['public_base_url'], '/') . '/uploads/clan-uprave';

hnkcms_admin_page_start('Uprava', 'uprava', $user);
?>
  <div class="admin-toolbar">
    <h2>Uprava</h2>
    <a href="/admin/uprava-edit.php" class="btn btn-primary">+ Novi član</a>
  </div>

  <?php if (!empty($_GET['msg'])): ?>
    <p class="flash flash-ok"><?= htmlspecialchars($_GET['msg'], ENT_QUOTES) ?></p>
  <?php endif; ?>

  <table class="admin-table">
    <thead>
      <tr>
        <th>Red.</th>
        <th>Slika</th>
        <th>Ime i prezime</th>
        <th>Funkcija</th>
        <th>Status</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      <?php if (!$rows): ?>
        <tr><td colspan="6" class="empty">Još nema unesenih članova uprave.</td></tr>
      <?php endif; ?>
      <?php foreach ($rows as $row): ?>
        <tr>
          <td><?= (int) $row['redoslijed'] ?></td>
          <td>
            <?php if ($row['slika_small']): ?>
              <img class="thumb thumb-round" src="<?= htmlspecialchars($uploadsUrl . '/' . $row['slika_small'], ENT_QUOTES) ?>" alt="">
            <?php else: ?>
              <span class="thumb thumb-empty">—</span>
            <?php endif; ?>
          </td>
          <td><?= htmlspecialchars($row['ime'], ENT_QUOTES) ?></td>
          <td><?= htmlspecialchars($row['funkcija_hr'], ENT_QUOTES) ?></td>
          <td>
            <span class="pill <?= $row['status'] === 'veroeffentlicht' ? 'pill-live' : 'pill-draft' ?>">
              <?= $row['status'] === 'veroeffentlicht' ? 'Veröffentlicht' : 'Entwurf' ?>
            </span>
          </td>
          <td class="admin-row-actions">
            <a href="/admin/uprava-edit.php?id=<?= (int) $row['id'] ?>">Uredi</a>
            <form method="post" action="/admin/uprava-delete.php" onsubmit="return confirm('Obrisati člana &quot;<?= htmlspecialchars(addslashes($row['ime']), ENT_QUOTES) ?>&quot;? Ovo briše i sliku.');">
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

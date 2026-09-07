<?php
declare(strict_types=1);
require __DIR__ . '/includes/db.php';
require __DIR__ . '/includes/auth.php';
require __DIR__ . '/includes/layout.php';

$user = hnkcms_require_login();

$rows = hnkcms_db()->query(
    'SELECT m.*,
            (SELECT COUNT(*) FROM momcad_igraci i WHERE i.momcad_id = m.id) AS broj_igraca,
            (SELECT COUNT(*) FROM momcad_popis_imena p WHERE p.momcad_id = m.id) AS broj_popis,
            (SELECT COUNT(*) FROM momcad_galerija g WHERE g.momcad_id = m.id) AS broj_galerija
     FROM momcadi m ORDER BY m.redoslijed ASC, m.id ASC'
)->fetchAll();
$uploadsUrl = rtrim(hnkcms_config()['public_base_url'], '/') . '/uploads/momcadi';

hnkcms_admin_page_start('Momčadi', 'momcadi', $user);
?>
  <div class="admin-toolbar">
    <h2>Momčadi</h2>
    <a href="/admin/momcad-edit.php" class="btn btn-primary">+ Nova momčad</a>
  </div>

  <?php hnkcms_flash(); ?>

  <table class="admin-table">
    <thead>
      <tr>
        <th>Red.</th>
        <th>Grupna</th>
        <th>Naziv</th>
        <th>Slug</th>
        <th>Igrači</th>
        <th>Popis imena</th>
        <th>Galerija</th>
        <th>Status</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      <?php if (!$rows): ?>
        <tr><td colspan="9" class="empty">Još nema unesenih momčadi.</td></tr>
      <?php endif; ?>
      <?php foreach ($rows as $row): ?>
        <tr>
          <td><?= (int) $row['redoslijed'] ?></td>
          <td>
            <?php if ($row['grupna_small']): ?>
              <img class="thumb thumb-wide" src="<?= htmlspecialchars($uploadsUrl . '/' . $row['grupna_small'], ENT_QUOTES) ?>" alt="">
            <?php else: ?>
              <span class="thumb thumb-empty">—</span>
            <?php endif; ?>
          </td>
          <td><?= htmlspecialchars($row['naziv_hr'], ENT_QUOTES) ?></td>
          <td><code><?= htmlspecialchars($row['slug'], ENT_QUOTES) ?></code></td>
          <td><?= (int) $row['broj_igraca'] ?></td>
          <td><?= (int) $row['broj_popis'] ?></td>
          <td><?= (int) $row['broj_galerija'] ?></td>
          <td>
            <span class="pill <?= $row['status'] === 'veroeffentlicht' ? 'pill-live' : 'pill-draft' ?>">
              <?= $row['status'] === 'veroeffentlicht' ? 'Veröffentlicht' : 'Entwurf' ?>
            </span>
          </td>
          <td class="admin-row-actions">
            <a href="/admin/momcad-edit.php?id=<?= (int) $row['id'] ?>">Uredi</a>
            <a href="/admin/momcad-sastav.php?momcad=<?= (int) $row['id'] ?>">Sastav</a>
            <form method="post" action="/admin/momcad-delete.php" onsubmit="return confirm('Obrisati momčad &quot;<?= htmlspecialchars(addslashes($row['naziv_hr']), ENT_QUOTES) ?>&quot;? Ovo briše i sve igrače, popis imena, galeriju i pripadajuće slike.');">
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

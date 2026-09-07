<?php
declare(strict_types=1);
require __DIR__ . '/includes/db.php';
require __DIR__ . '/includes/auth.php';
require __DIR__ . '/includes/layout.php';

$user = hnkcms_require_login();

$rows = hnkcms_db()->query(
    'SELECT g.*,
            (SELECT COUNT(*) FROM galerija_slike s WHERE s.galerija_id = g.id) AS broj_slika,
            (SELECT s.slika_thumb FROM galerija_slike s WHERE s.galerija_id = g.id ORDER BY s.redoslijed ASC, s.id ASC LIMIT 1) AS cover_thumb
     FROM galerije g ORDER BY g.godina DESC, g.datum DESC, g.id ASC'
)->fetchAll();
$uploadsUrl = rtrim(hnkcms_config()['public_base_url'], '/') . '/uploads/galerije';
$katLabel = ['sport' => 'Sport i turniri', 'feste' => 'Zabave i feste'];

hnkcms_admin_page_start('Galerije', 'galerije', $user);
?>
  <div class="admin-toolbar">
    <h2>Galerije <span class="hint" style="display:inline;font-weight:400">— <?= count($rows) ?> albuma, <?= array_sum(array_column($rows, 'broj_slika')) ?> slika</span></h2>
    <a href="/admin/galerija-edit.php" class="btn btn-primary">+ Nova galerija</a>
  </div>

  <?php hnkcms_flash(); ?>

  <table class="admin-table">
    <thead>
      <tr>
        <th>Cover</th>
        <th>Naziv</th>
        <th>Slug</th>
        <th>Godina</th>
        <th>Kategorija</th>
        <th>Slike</th>
        <th>Status</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      <?php if (!$rows): ?>
        <tr><td colspan="8" class="empty">Još nema unesenih galerija.</td></tr>
      <?php endif; ?>
      <?php foreach ($rows as $row): ?>
        <tr>
          <td>
            <?php if ($row['cover_thumb']): ?>
              <img class="thumb thumb-square" src="<?= htmlspecialchars($uploadsUrl . '/' . $row['cover_thumb'], ENT_QUOTES) ?>" alt="">
            <?php else: ?>
              <span class="thumb thumb-empty">—</span>
            <?php endif; ?>
          </td>
          <td><?= htmlspecialchars($row['naziv_hr'], ENT_QUOTES) ?></td>
          <td><code><?= htmlspecialchars($row['slug'], ENT_QUOTES) ?></code></td>
          <td><?= (int) $row['godina'] ?></td>
          <td><span class="pill pill-<?= $row['kategorija'] ?>"><?= $katLabel[$row['kategorija']] ?? $row['kategorija'] ?></span></td>
          <td><?= (int) $row['broj_slika'] ?></td>
          <td>
            <span class="pill <?= $row['status'] === 'veroeffentlicht' ? 'pill-live' : 'pill-draft' ?>">
              <?= $row['status'] === 'veroeffentlicht' ? 'Veröffentlicht' : 'Entwurf' ?>
            </span>
          </td>
          <td class="admin-row-actions">
            <a href="/admin/galerija-edit.php?id=<?= (int) $row['id'] ?>">Uredi</a>
            <a href="/admin/galerija-slike.php?galerija=<?= (int) $row['id'] ?>">Slike</a>
            <form method="post" action="/admin/galerija-delete.php" onsubmit="return confirm('Obrisati galeriju &quot;<?= htmlspecialchars(addslashes($row['naziv_hr']), ENT_QUOTES) ?>&quot; i svih <?= (int) $row['broj_slika'] ?> slika?');">
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

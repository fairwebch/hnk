<?php
declare(strict_types=1);
require __DIR__ . '/includes/db.php';
require __DIR__ . '/includes/auth.php';
require __DIR__ . '/includes/layout.php';

$user = hnkcms_require_login();

$rows = hnkcms_db()->query(
    'SELECT n.*, (SELECT COUNT(*) FROM novost_slike s WHERE s.novost_id = n.id) AS broj_slika
     FROM novosti n ORDER BY n.datum DESC, n.id DESC'
)->fetchAll();
$uploadsUrl = rtrim(hnkcms_config()['public_base_url'], '/') . '/uploads/novosti';

hnkcms_admin_page_start('Novosti', 'novosti', $user);
?>
  <div class="admin-toolbar">
    <h2>Novosti <span class="hint" style="display:inline;font-weight:400">— <?= count($rows) ?></span></h2>
    <a href="/admin/novost-edit.php" class="btn btn-primary">+ Nova novost</a>
  </div>

  <?php hnkcms_flash(); ?>

  <table class="admin-table">
    <thead>
      <tr>
        <th>Cover</th>
        <th>Datum</th>
        <th>Naslov</th>
        <th>Kategorija</th>
        <th>Slike u tekstu</th>
        <th>Status</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      <?php if (!$rows): ?>
        <tr><td colspan="7" class="empty">Još nema unesenih novosti.</td></tr>
      <?php endif; ?>
      <?php foreach ($rows as $row): ?>
        <tr>
          <td>
            <?php if ($row['cover_small']): ?>
              <img class="thumb thumb-wide" src="<?= htmlspecialchars($uploadsUrl . '/' . $row['cover_small'], ENT_QUOTES) ?>" alt="">
            <?php else: ?>
              <span class="thumb thumb-empty">—</span>
            <?php endif; ?>
          </td>
          <td><?= htmlspecialchars(date('d.m.Y', strtotime($row['datum'])), ENT_QUOTES) ?></td>
          <td><?= htmlspecialchars($row['naslov_hr'], ENT_QUOTES) ?><br><code style="font-size:.72rem;color:var(--text-soft)"><?= htmlspecialchars($row['slug'], ENT_QUOTES) ?></code></td>
          <td><span class="pill pill-standard"><?= htmlspecialchars($row['kategorija'], ENT_QUOTES) ?></span></td>
          <td><?= (int) $row['broj_slika'] ?></td>
          <td>
            <span class="pill <?= $row['status'] === 'veroeffentlicht' ? 'pill-live' : 'pill-draft' ?>">
              <?= $row['status'] === 'veroeffentlicht' ? 'Veröffentlicht' : 'Entwurf' ?>
            </span>
          </td>
          <td class="admin-row-actions">
            <a href="/admin/novost-edit.php?id=<?= (int) $row['id'] ?>">Uredi</a>
            <form method="post" action="/admin/novost-delete.php" onsubmit="return confirm('Obrisati novost &quot;<?= htmlspecialchars(addslashes($row['naslov_hr']), ENT_QUOTES) ?>&quot; i njene slike?');">
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

<?php
declare(strict_types=1);
require __DIR__ . '/includes/db.php';
require __DIR__ . '/includes/auth.php';
require __DIR__ . '/includes/layout.php';

$user = hnkcms_require_login();

$rows = hnkcms_db()->query(
    "SELECT d.*, (COALESCE(d.datum_kraj, d.datum_pocetak) >= UTC_TIMESTAMP()) AS nadolazeci,
            (SELECT COUNT(*) FROM dogadjaj_program p WHERE p.dogadjaj_id = d.id) AS broj_stavki
     FROM dogadjaji d ORDER BY d.datum_pocetak DESC, d.id DESC"
)->fetchAll();
$uploadsUrl = rtrim(hnkcms_config()['public_base_url'], '/') . '/uploads/dogadjaji';
$vrstaLabel = ['bez' => 'Bez prijava', 'osoba' => 'Prijava osobe', 'ekipa' => 'Prijava ekipe'];

hnkcms_admin_page_start('Događaji', 'dogadjaji', $user);
?>
  <div class="admin-toolbar">
    <h2>Događaji <span class="hint" style="display:inline;font-weight:400">— <?= count($rows) ?></span></h2>
    <a href="/admin/dogadjaj-edit.php" class="btn btn-primary">+ Novi događaj</a>
  </div>

  <?php hnkcms_flash(); ?>
  <p class="hint">Prijave sudionika (osobni podaci) su u zasebnoj privatnoj bazi — ovdje se uređuju samo javni podaci i postavke prijava.</p>

  <table class="admin-table">
    <thead>
      <tr>
        <th>Cover</th>
        <th>Početak</th>
        <th>Naziv</th>
        <th>Kategorija</th>
        <th>Lokacija</th>
        <th>Prijave</th>
        <th>Status</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      <?php if (!$rows): ?>
        <tr><td colspan="8" class="empty">Još nema unesenih događaja.</td></tr>
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
          <td>
            <?= htmlspecialchars(date('d.m.Y H:i', strtotime($row['datum_pocetak'] . ' UTC')), ENT_QUOTES) ?> <span class="hint" style="display:inline">UTC</span>
            <?php if (!$row['nadolazeci']): ?><br><span class="pill pill-basic">prošli</span><?php endif; ?>
          </td>
          <td><?= htmlspecialchars($row['naziv_hr'], ENT_QUOTES) ?><br><code style="font-size:.72rem;color:var(--text-soft)"><?= htmlspecialchars($row['slug'], ENT_QUOTES) ?></code></td>
          <td><?= $row['kategorija'] ? '<span class="pill pill-standard">' . htmlspecialchars($row['kategorija'], ENT_QUOTES) . '</span>' : '—' ?></td>
          <td><?= htmlspecialchars((string) $row['lokacija'], ENT_QUOTES) ?></td>
          <td>
            <?= $vrstaLabel[$row['vrsta_prijave']] ?>
            <?php if ($row['vrsta_prijave'] !== 'bez'): ?>
              <br><span class="pill <?= $row['prijave_otvorene'] ? 'pill-live' : 'pill-draft' ?>"><?= $row['prijave_otvorene'] ? 'otvorene' : 'zatvorene' ?></span>
              <?= $row['pristup_prijavi'] === 'clanovi' ? '<span class="pill pill-premium">članovi</span>' : '' ?>
            <?php endif; ?>
          </td>
          <td>
            <span class="pill <?= $row['status'] === 'veroeffentlicht' ? 'pill-live' : 'pill-draft' ?>">
              <?= $row['status'] === 'veroeffentlicht' ? 'Veröffentlicht' : 'Entwurf' ?>
            </span>
          </td>
          <td class="admin-row-actions">
            <a href="/admin/dogadjaj-edit.php?id=<?= (int) $row['id'] ?>">Uredi</a>
            <form method="post" action="/admin/dogadjaj-delete.php" onsubmit="return confirm('Obrisati događaj &quot;<?= htmlspecialchars(addslashes($row['naziv_hr']), ENT_QUOTES) ?>&quot;? (Prijave u privatnoj bazi ostaju do isteka retencije.)');">
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

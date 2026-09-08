<?php
/**
 * Pregled prijava po događaju — čita PRIVATNU bazu (db-prijave). Kopija
 * naziva/datuma događaja je u samoj tablici prijave, pa dashboard ne ovisi o
 * javnoj bazi (događaj može biti obrisan, prijave žive do isteka retencije).
 */
declare(strict_types=1);
require __DIR__ . '/includes/db.php';
require __DIR__ . '/includes/db-prijave.php';
require __DIR__ . '/includes/auth.php';
require __DIR__ . '/includes/layout.php';

$user = hnkcms_require_login();
$priv = hnkcms_db_prijave();

$rows = $priv->query(
    'SELECT dogadjaj_id, dogadjaj_slug, dogadjaj_naziv_hr, MAX(dogadjaj_datum_kraj) AS kraj,
            COUNT(*) AS ukupno,
            SUM(otkazana = 0) AS aktivne,
            SUM(otkazana = 1) AS otkazane,
            SUM(otkazana = 0 AND status_placanja = \'placeno\') AS placene,
            SUM(CASE WHEN otkazana = 0 THEN broj_osoba ELSE 0 END) AS osobe,
            MAX(datum_prijave) AS zadnja
     FROM prijave GROUP BY dogadjaj_id, dogadjaj_slug, dogadjaj_naziv_hr ORDER BY kraj DESC'
)->fetchAll();
$log = $priv->query('SELECT * FROM prijave_purge_log ORDER BY izvrseno_at DESC LIMIT 1')->fetch();

hnkcms_admin_page_start('Prijave', 'prijave', $user);
?>
  <div class="admin-toolbar">
    <h2>Prijave na događaje</h2>
  </div>
  <?php hnkcms_flash(); ?>
  <p class="hint">
    Osobni podaci sudionika — zasebna baza s vlastitim MySQL korisnikom, nedostupna javnom API-ju.
    Retencija: prijave se automatski brišu 30 dana nakon kraja događaja, otkazane 30 dana nakon otkaza
    (<?= $log ? 'zadnji purge ' . htmlspecialchars($log['izvrseno_at'], ENT_QUOTES) . ' UTC: ' . (int) $log['obrisano_isteklo'] . ' isteklih, ' . (int) $log['obrisano_otkazano'] . ' otkazanih obrisano' : 'purge još nije pokrenut' ?>).
    Postavke prijava (otvoreno/zatvoreno, kod) su na kartici Događaji.
  </p>

  <table class="admin-table">
    <thead>
      <tr><th>Događaj</th><th>Kraj događaja</th><th>Aktivne</th><th>Osobe</th><th>Plaćene</th><th>Otkazane</th><th>Zadnja prijava</th><th></th></tr>
    </thead>
    <tbody>
      <?php if (!$rows): ?>
        <tr><td colspan="8" class="empty">Još nema prijava.</td></tr>
      <?php endif; ?>
      <?php foreach ($rows as $r): ?>
        <tr>
          <td><?= htmlspecialchars($r['dogadjaj_naziv_hr'], ENT_QUOTES) ?><br><code style="font-size:.72rem;color:var(--text-soft)"><?= htmlspecialchars($r['dogadjaj_slug'], ENT_QUOTES) ?></code></td>
          <td><?= htmlspecialchars(date('d.m.Y', strtotime($r['kraj'] . ' UTC')), ENT_QUOTES) ?></td>
          <td><?= (int) $r['aktivne'] ?></td>
          <td><?= (int) $r['osobe'] ?></td>
          <td><?= (int) $r['placene'] ?> / <?= (int) $r['aktivne'] ?></td>
          <td><?= (int) $r['otkazane'] ?></td>
          <td><?= htmlspecialchars(date('d.m.Y H:i', strtotime($r['zadnja'] . ' UTC')), ENT_QUOTES) ?></td>
          <td class="admin-row-actions"><a href="/admin/prijave-dogadjaj.php?dogadjaj=<?= (int) $r['dogadjaj_id'] ?>">Otvori</a></td>
        </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
<?php hnkcms_admin_page_end(); ?>

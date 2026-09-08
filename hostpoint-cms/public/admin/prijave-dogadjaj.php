<?php
/**
 * Prijave jednog događaja: lista, plaćeno/neplaćeno (POST), CSV izvoz
 * (?csv=1, isti stupci kao Sanity PrijaveDashboard) i brisanje pojedinačne
 * prijave (POST -> prijava-delete.php, pravo na brisanje na zahtjev).
 */
declare(strict_types=1);
require __DIR__ . '/includes/db.php';
require __DIR__ . '/includes/db-prijave.php';
require __DIR__ . '/includes/auth.php';
require __DIR__ . '/includes/layout.php';

$user = hnkcms_require_login();
$priv = hnkcms_db_prijave();

$dogadjajId = isset($_GET['dogadjaj']) && ctype_digit((string) $_GET['dogadjaj']) ? (int) $_GET['dogadjaj'] : 0;
$back = '/admin/prijave-dogadjaj.php?dogadjaj=' . $dogadjajId;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    hnkcms_verify_csrf();
    $id = (int) ($_POST['id'] ?? 0);
    $status = ($_POST['status_placanja'] ?? '') === 'placeno' ? 'placeno' : 'neplaceno';
    $priv->prepare('UPDATE prijave SET status_placanja = ? WHERE id = ? AND dogadjaj_id = ?')->execute([$status, $id, $dogadjajId]);
    header('Location: ' . $back . '&msg=' . rawurlencode('Status plaćanja spremljen.'));
    exit;
}

$stmt = $priv->prepare('SELECT * FROM prijave WHERE dogadjaj_id = ? ORDER BY datum_prijave DESC, id DESC');
$stmt->execute([$dogadjajId]);
$prijave = $stmt->fetchAll();
if (!$prijave) {
    header('Location: /admin/prijave.php');
    exit;
}
$naslov = $prijave[0]['dogadjaj_naziv_hr'];
$slug = $prijave[0]['dogadjaj_slug'];

// --- CSV (UTF-8 BOM + ; separator, isti stupci kao Sanity dashboard) ---
if (isset($_GET['csv'])) {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="prijave-' . preg_replace('/[^a-z0-9-]/', '', $slug) . '.csv"');
    $out = fopen('php://output', 'w');
    fwrite($out, "\xEF\xBB\xBF");
    fputcsv($out, ['Tip', 'Ime / Naziv ekipe', 'Prezime / Kontakt osoba', 'E-mail', 'Telefon', 'Broj osoba', 'Napomena', 'Status plaćanja', 'Datum prijave', 'Otkazana', 'Datum otkaza'], ';');
    foreach ($prijave as $p) {
        fputcsv($out, [
            $p['tip'] === 'osoba' ? 'Osoba' : 'Ekipa',
            $p['tip'] === 'osoba' ? $p['ime'] : $p['naziv_ekipe'],
            $p['tip'] === 'osoba' ? $p['prezime'] : $p['kontakt_osoba'],
            $p['email'], $p['telefon'] ?? '', (int) $p['broj_osoba'], $p['napomena'] ?? '',
            $p['status_placanja'] === 'placeno' ? 'Plaćeno' : 'Neplaćeno',
            $p['datum_prijave'], (int) $p['otkazana'] ? 'da' : 'ne', $p['datum_otkaza'] ?? '',
        ], ';');
    }
    fclose($out);
    exit;
}

$aktivne = array_filter($prijave, fn($p) => !(int) $p['otkazana']);
$osobe = array_sum(array_map(fn($p) => (int) $p['broj_osoba'], $aktivne));
$placene = count(array_filter($aktivne, fn($p) => $p['status_placanja'] === 'placeno'));

hnkcms_admin_page_start('Prijave · ' . $naslov, 'prijave', $user);
?>
  <p><a href="/admin/prijave.php">&larr; Natrag na pregled</a></p>
  <div class="admin-toolbar">
    <h2><?= htmlspecialchars($naslov, ENT_QUOTES) ?> <span class="hint" style="display:inline;font-weight:400">— <?= count($aktivne) ?> aktivnih (<?= $osobe ?> osoba), <?= $placene ?> plaćenih, <?= count($prijave) - count($aktivne) ?> otkazanih</span></h2>
    <a href="<?= $back ?>&amp;csv=1" class="btn btn-primary">Izvoz CSV</a>
  </div>
  <?php hnkcms_flash(); ?>

  <table class="admin-table">
    <thead>
      <tr><th>Tip</th><th>Ime / ekipa</th><th>E-mail</th><th>Telefon</th><th>Osobe</th><th>Napomena</th><th>Plaćeno</th><th>Prijava</th><th></th></tr>
    </thead>
    <tbody>
      <?php foreach ($prijave as $p): $otk = (int) $p['otkazana']; ?>
        <tr style="<?= $otk ? 'opacity:.55' : '' ?>">
          <td><?= $p['tip'] === 'osoba' ? 'Osoba' : 'Ekipa' ?><?= $otk ? '<br><span class="pill pill-draft">otkazana</span>' : '' ?></td>
          <td>
            <?= htmlspecialchars($p['tip'] === 'osoba' ? trim($p['ime'] . ' ' . $p['prezime']) : $p['naziv_ekipe'], ENT_QUOTES) ?>
            <?= $p['tip'] === 'ekipa' ? '<br><span class="hint" style="display:inline">' . htmlspecialchars((string) $p['kontakt_osoba'], ENT_QUOTES) . '</span>' : '' ?>
          </td>
          <td><a href="mailto:<?= htmlspecialchars($p['email'], ENT_QUOTES) ?>"><?= htmlspecialchars($p['email'], ENT_QUOTES) ?></a></td>
          <td><?= htmlspecialchars((string) $p['telefon'], ENT_QUOTES) ?></td>
          <td><?= (int) $p['broj_osoba'] ?></td>
          <td style="max-width:220px;font-size:.8rem"><?= nl2br(htmlspecialchars((string) $p['napomena'], ENT_QUOTES)) ?></td>
          <td>
            <?php if (!$otk): ?>
              <form method="post" style="margin:0">
                <?= hnkcms_csrf_field() ?>
                <input type="hidden" name="id" value="<?= (int) $p['id'] ?>">
                <input type="hidden" name="status_placanja" value="<?= $p['status_placanja'] === 'placeno' ? 'neplaceno' : 'placeno' ?>">
                <button type="submit" class="pill <?= $p['status_placanja'] === 'placeno' ? 'pill-live' : 'pill-draft' ?>" style="border:0;cursor:pointer" title="Klik mijenja status">
                  <?= $p['status_placanja'] === 'placeno' ? 'Plaćeno' : 'Neplaćeno' ?>
                </button>
              </form>
            <?php else: ?>—<?php endif; ?>
          </td>
          <td style="white-space:nowrap;font-size:.8rem">
            <?= htmlspecialchars(date('d.m.Y H:i', strtotime($p['datum_prijave'] . ' UTC')), ENT_QUOTES) ?>
            <?= $otk && $p['datum_otkaza'] ? '<br>otkaz ' . htmlspecialchars(date('d.m.Y', strtotime($p['datum_otkaza'] . ' UTC')), ENT_QUOTES) : '' ?>
          </td>
          <td class="admin-row-actions">
            <form method="post" action="/admin/prijava-delete.php" onsubmit="return confirm('Trajno obrisati ovu prijavu (osobne podatke)? Nema povratka.');">
              <?= hnkcms_csrf_field() ?>
              <input type="hidden" name="id" value="<?= (int) $p['id'] ?>">
              <input type="hidden" name="dogadjaj" value="<?= $dogadjajId ?>">
              <button type="submit" class="link-danger">Obriši</button>
            </form>
          </td>
        </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
<?php hnkcms_admin_page_end(); ?>

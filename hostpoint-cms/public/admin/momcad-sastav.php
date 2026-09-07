<?php
/**
 * "Sastav" jedne momčadi — hub za tri child tablice na jednoj stranici:
 * strukturirani roster (momcad_igraci), legacy popis imena
 * (momcad_popis_imena) i galerija (momcad_galerija). Sam tim (naziv, slike,
 * trener, opis) se uređuje u momcad-edit.php.
 */
declare(strict_types=1);
require __DIR__ . '/includes/db.php';
require __DIR__ . '/includes/auth.php';
require __DIR__ . '/includes/layout.php';

$user = hnkcms_require_login();
$db = hnkcms_db();

$momcadId = isset($_GET['momcad']) && ctype_digit((string) $_GET['momcad']) ? (int) $_GET['momcad'] : 0;
$stmt = $db->prepare('SELECT * FROM momcadi WHERE id = ?');
$stmt->execute([$momcadId]);
$team = $stmt->fetch();
if (!$team) {
    header('Location: /admin/momcadi.php');
    exit;
}

$igraci = $db->prepare('SELECT * FROM momcad_igraci WHERE momcad_id = ? ORDER BY redoslijed ASC, id ASC');
$igraci->execute([$momcadId]);
$igraci = $igraci->fetchAll();

$popis = $db->prepare('SELECT * FROM momcad_popis_imena WHERE momcad_id = ? ORDER BY redoslijed ASC, id ASC');
$popis->execute([$momcadId]);
$popis = $popis->fetchAll();

$galerija = $db->prepare('SELECT * FROM momcad_galerija WHERE momcad_id = ? ORDER BY redoslijed ASC, id ASC');
$galerija->execute([$momcadId]);
$galerija = $galerija->fetchAll();

$uploadsUrl = rtrim(hnkcms_config()['public_base_url'], '/') . '/uploads/momcadi';
$pozicijeLabel = ['golman' => 'Golman', 'obrana' => 'Obrana', 'vezni' => 'Vezni red', 'napad' => 'Napad'];
$naziv = htmlspecialchars($team['naziv_hr'], ENT_QUOTES);
$back = '/admin/momcad-sastav.php?momcad=' . $momcadId;

hnkcms_admin_page_start('Sastav · ' . $team['naziv_hr'], 'momcadi', $user);
?>
  <p><a href="/admin/momcadi.php">&larr; Natrag na momčadi</a> &middot; <a href="/admin/momcad-edit.php?id=<?= $momcadId ?>">Uredi podatke momčadi</a></p>
  <h2>Sastav: <?= $naziv ?></h2>

  <?php hnkcms_flash(); ?>

  <section class="admin-section">
    <div class="admin-toolbar">
      <h2>Igrači (roster) <span class="hint" style="display:inline;font-weight:400">— <?= count($igraci) ?></span></h2>
      <a href="/admin/momcad-igrac-edit.php?momcad=<?= $momcadId ?>" class="btn btn-primary">+ Novi igrač</a>
    </div>
    <p class="hint">Čim postoji barem jedan igrač ovdje, sajt prikazuje strukturirani roster (grupisan po pozicijama) umjesto popisa imena ispod.</p>
    <table class="admin-table">
      <thead><tr><th>Red.</th><th>Slika</th><th>Ime i prezime</th><th>Broj</th><th>Pozicija</th><th></th></tr></thead>
      <tbody>
        <?php if (!$igraci): ?>
          <tr><td colspan="6" class="empty">Roster još nije popunjen — sajt prikazuje popis imena.</td></tr>
        <?php endif; ?>
        <?php foreach ($igraci as $p): ?>
          <tr>
            <td><?= (int) $p['redoslijed'] ?></td>
            <td>
              <?php if ($p['slika_small']): ?>
                <img class="thumb thumb-portrait" src="<?= htmlspecialchars($uploadsUrl . '/' . $p['slika_small'], ENT_QUOTES) ?>" alt="">
              <?php else: ?>
                <span class="thumb thumb-empty">—</span>
              <?php endif; ?>
            </td>
            <td><?= htmlspecialchars(trim($p['ime'] . ' ' . ($p['prezime'] ?? '')), ENT_QUOTES) ?></td>
            <td><?= $p['broj'] !== null ? (int) $p['broj'] : '—' ?></td>
            <td><?= $p['pozicija'] ? $pozicijeLabel[$p['pozicija']] : '—' ?></td>
            <td class="admin-row-actions">
              <a href="/admin/momcad-igrac-edit.php?momcad=<?= $momcadId ?>&amp;id=<?= (int) $p['id'] ?>">Uredi</a>
              <form method="post" action="/admin/momcad-igrac-delete.php" onsubmit="return confirm('Obrisati igrača &quot;<?= htmlspecialchars(addslashes($p['ime']), ENT_QUOTES) ?>&quot;?');">
                <?= hnkcms_csrf_field() ?>
                <input type="hidden" name="id" value="<?= (int) $p['id'] ?>">
                <button type="submit" class="link-danger">Obriši</button>
              </form>
            </td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </section>

  <section class="admin-section">
    <div class="admin-toolbar">
      <h2>Popis imena (po redovima na fotografiji) <span class="hint" style="display:inline;font-weight:400">— <?= count($popis) ?></span></h2>
      <a href="/admin/momcad-popis-edit.php?momcad=<?= $momcadId ?>" class="btn btn-primary">+ Novi red</a>
    </div>
    <p class="hint">Jednostavni prikaz dok roster nije popunjen: oznaka reda (npr. "Gornji red s lijeva na desno") + imena odvojena zarezom. Zvjezdica (*) = nepoznato ime, ne broji se.</p>
    <table class="admin-table">
      <thead><tr><th>Red.</th><th>Oznaka reda (HR)</th><th>Imena</th><th></th></tr></thead>
      <tbody>
        <?php if (!$popis): ?>
          <tr><td colspan="4" class="empty">Nema redova.</td></tr>
        <?php endif; ?>
        <?php foreach ($popis as $r): ?>
          <tr>
            <td><?= (int) $r['redoslijed'] ?></td>
            <td><?= htmlspecialchars((string) $r['oznaka_hr'], ENT_QUOTES) ?></td>
            <td><?= htmlspecialchars($r['imena'], ENT_QUOTES) ?></td>
            <td class="admin-row-actions">
              <a href="/admin/momcad-popis-edit.php?momcad=<?= $momcadId ?>&amp;id=<?= (int) $r['id'] ?>">Uredi</a>
              <form method="post" action="/admin/momcad-popis-delete.php" onsubmit="return confirm('Obrisati ovaj red imena?');">
                <?= hnkcms_csrf_field() ?>
                <input type="hidden" name="id" value="<?= (int) $r['id'] ?>">
                <button type="submit" class="link-danger">Obriši</button>
              </form>
            </td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </section>

  <section class="admin-section">
    <div class="admin-toolbar">
      <h2>Galerija <span class="hint" style="display:inline;font-weight:400">— <?= count($galerija) ?></span></h2>
    </div>
    <?php if ($galerija): ?>
      <div class="admin-gallery">
        <?php foreach ($galerija as $g): ?>
          <figure>
            <img src="<?= htmlspecialchars($uploadsUrl . '/' . $g['slika_medium'], ENT_QUOTES) ?>" alt="<?= htmlspecialchars((string) $g['alt'], ENT_QUOTES) ?>">
            <figcaption>
              <span title="<?= htmlspecialchars((string) $g['alt'], ENT_QUOTES) ?>">#<?= (int) $g['redoslijed'] ?> <?= $g['alt'] ? '· ' . htmlspecialchars(mb_strimwidth($g['alt'], 0, 22, '…'), ENT_QUOTES) : '' ?></span>
              <span class="admin-row-actions">
                <a href="/admin/momcad-galerija-edit.php?id=<?= (int) $g['id'] ?>">Uredi</a>
                <form method="post" action="/admin/momcad-galerija-delete.php" onsubmit="return confirm('Obrisati ovu sliku iz galerije?');">
                  <?= hnkcms_csrf_field() ?>
                  <input type="hidden" name="id" value="<?= (int) $g['id'] ?>">
                  <button type="submit" class="link-danger">Obriši</button>
                </form>
              </span>
            </figcaption>
          </figure>
        <?php endforeach; ?>
      </div>
    <?php else: ?>
      <p class="hint">Galerija je prazna.</p>
    <?php endif; ?>

    <form method="post" action="/admin/momcad-galerija-upload.php" enctype="multipart/form-data" class="admin-form admin-inline-form">
      <?= hnkcms_csrf_field() ?>
      <input type="hidden" name="momcad" value="<?= $momcadId ?>">
      <label>Dodaj slike (može više odjednom)
        <input type="file" name="slike[]" accept="image/png,image/jpeg,image/webp,image/gif" multiple required>
      </label>
      <button type="submit" class="btn btn-primary">Upload</button>
    </form>
  </section>
<?php hnkcms_admin_page_end(); ?>

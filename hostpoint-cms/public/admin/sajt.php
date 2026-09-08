<?php
/**
 * Postavke sajta: hero fotografije početne (1–3, redoslijed = crossfade) i
 * header fotografije za /klub, /sponzoring, /postani-clan. Sve akcije su POST
 * na ovu istu stranicu (?action=upload|delete|order), CSRF zaštićeno.
 */
declare(strict_types=1);
require __DIR__ . '/includes/db.php';
require __DIR__ . '/includes/auth.php';
require __DIR__ . '/includes/webp.php';
require __DIR__ . '/includes/layout.php';

$user = hnkcms_require_login();
$db = hnkcms_db();
$uploadsDir = __DIR__ . '/../uploads/sajt';
$uploadsUrl = rtrim(hnkcms_config()['public_base_url'], '/') . '/uploads/sajt';

const HNKCMS_SLOTOVI = [
    'hero' => ['Hero fotografije — početna', 'Pozadina hero sekcije. 1 slika = statično; 2–3 = spori crossfade. Široki kadar, min. 1600 px širine.', 3],
    'header_klub' => ['Header — Klub', 'Pozadina naslova stranice /klub. Prazno = tamni header bez fotografije.', 1],
    'header_sponzoring' => ['Header — Sponzoring', 'Pozadina naslova stranice /sponzoring.', 1],
    'header_postani_clan' => ['Header — Postani član', 'Pozadina naslova stranice /postani-clan.', 1],
];
const HNKCMS_WIDTHS_HERO = ['small' => 480, 'medium' => 1200, 'large' => 2560];

$errors = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    hnkcms_verify_csrf();
    $action = $_GET['action'] ?? '';
    $kljuc = (string) ($_POST['kljuc'] ?? '');

    if ($action === 'upload' && isset(HNKCMS_SLOTOVI[$kljuc])) {
        $max = HNKCMS_SLOTOVI[$kljuc][2];
        $stmt = $db->prepare('SELECT COUNT(*) FROM slike_sajta WHERE kljuc = ?');
        $stmt->execute([$kljuc]);
        $cnt = (int) $stmt->fetchColumn();
        if ($cnt >= $max) {
            $errors[] = 'Slot je pun (max ' . $max . ') — prvo obrišite postojeću sliku.';
        } elseif (empty($_FILES['slika']['name'])) {
            $errors[] = 'Odaberite datoteku.';
        } else {
            // INSERT bez slike (treba ID za ime datoteke), pa upload + UPDATE.
            $db->prepare('INSERT INTO slike_sajta (kljuc, redoslijed, slika_original, slika_small, slika_medium, slika_large, slika_alt) VALUES (?, ?, "", "", "", "", ?)')
                ->execute([$kljuc, (int) ($_POST['redoslijed'] ?? 100), trim((string) ($_POST['slika_alt'] ?? '')) ?: null]);
            $newId = (int) $db->lastInsertId();
            try {
                $d = WebpPipeline::process($_FILES['slika'], $uploadsDir, $newId, $kljuc, $kljuc === 'hero' ? HNKCMS_WIDTHS_HERO : WebpPipeline::WIDTHS_WIDE);
                $db->prepare('UPDATE slike_sajta SET slika_original=?, slika_small=?, slika_medium=?, slika_large=?, slika_is_vector=?, slika_width=?, slika_height=? WHERE id=?')
                    ->execute([$d['original'], $d['small'], $d['medium'], $d['large'], (int) $d['is_vector'], $d['width'], $d['height'], $newId]);
                header('Location: /admin/sajt.php?msg=' . rawurlencode('Slika dodana.'));
                exit;
            } catch (LogoUploadError $e) {
                $db->prepare('DELETE FROM slike_sajta WHERE id = ?')->execute([$newId]);
                $errors[] = $e->getMessage();
            }
        }
    } elseif ($action === 'delete') {
        $id = (int) ($_POST['id'] ?? 0);
        $stmt = $db->prepare('SELECT * FROM slike_sajta WHERE id = ?');
        $stmt->execute([$id]);
        if ($row = $stmt->fetch()) {
            $db->prepare('DELETE FROM slike_sajta WHERE id = ?')->execute([$id]);
            WebpPipeline::delete($uploadsDir, $row, 'slika');
        }
        header('Location: /admin/sajt.php?msg=' . rawurlencode('Slika obrisana.'));
        exit;
    } elseif ($action === 'order') {
        $id = (int) ($_POST['id'] ?? 0);
        $db->prepare('UPDATE slike_sajta SET redoslijed = ?, slika_alt = ? WHERE id = ?')
            ->execute([(int) ($_POST['redoslijed'] ?? 100), trim((string) ($_POST['slika_alt'] ?? '')) ?: null, $id]);
        header('Location: /admin/sajt.php?msg=' . rawurlencode('Spremljeno.'));
        exit;
    }
}

$all = $db->query('SELECT * FROM slike_sajta ORDER BY kljuc, redoslijed ASC, id ASC')->fetchAll();
$bySlot = [];
foreach ($all as $r) {
    $bySlot[$r['kljuc']][] = $r;
}

hnkcms_admin_page_start('Postavke sajta', 'sajt', $user);
?>
  <div class="admin-toolbar"><h2>Postavke sajta — fotografije</h2></div>
  <?php hnkcms_flash(); ?>
  <?php foreach ($errors as $err): ?>
    <p class="flash flash-error"><?= htmlspecialchars($err, ENT_QUOTES) ?></p>
  <?php endforeach; ?>

  <?php foreach (HNKCMS_SLOTOVI as $kljuc => [$naslov, $opis, $max]): $rows = $bySlot[$kljuc] ?? []; ?>
    <h3 style="margin:1.6rem 0 .2rem"><?= htmlspecialchars($naslov, ENT_QUOTES) ?> <span class="hint" style="display:inline;font-weight:400">(<?= count($rows) ?>/<?= $max ?>)</span></h3>
    <p class="hint"><?= htmlspecialchars($opis, ENT_QUOTES) ?></p>

    <?php if ($rows): ?>
      <table class="admin-table">
        <thead><tr><th>Pregled</th><th>Dimenzije</th><th>Redoslijed</th><th>Alt tekst</th><th></th></tr></thead>
        <tbody>
        <?php foreach ($rows as $r): ?>
          <tr>
            <td><img src="<?= htmlspecialchars($uploadsUrl . '/' . $r['slika_small'], ENT_QUOTES) ?>" alt="" style="width:160px;height:auto;display:block"></td>
            <td><?= (int) $r['slika_width'] ?>×<?= (int) $r['slika_height'] ?></td>
            <td colspan="2">
              <form method="post" action="/admin/sajt.php?action=order" style="display:flex;gap:.5rem;align-items:center;margin:0">
                <?= hnkcms_csrf_field() ?>
                <input type="hidden" name="id" value="<?= (int) $r['id'] ?>">
                <input type="number" name="redoslijed" value="<?= (int) $r['redoslijed'] ?>" style="width:5rem">
                <input type="text" name="slika_alt" value="<?= htmlspecialchars((string) $r['slika_alt'], ENT_QUOTES) ?>" placeholder="Alt tekst (neobavezno)" style="min-width:16rem">
                <button type="submit" class="btn">Spremi</button>
              </form>
            </td>
            <td class="admin-row-actions">
              <form method="post" action="/admin/sajt.php?action=delete" onsubmit="return confirm('Obrisati ovu sliku?');">
                <?= hnkcms_csrf_field() ?>
                <input type="hidden" name="id" value="<?= (int) $r['id'] ?>">
                <button type="submit" class="link-danger">Obriši</button>
              </form>
            </td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
    <?php endif; ?>

    <?php if (count($rows) < $max): ?>
      <form method="post" action="/admin/sajt.php?action=upload" enctype="multipart/form-data" class="admin-form" style="display:flex;gap:.75rem;align-items:flex-end;flex-wrap:wrap;margin:.5rem 0 0">
        <?= hnkcms_csrf_field() ?>
        <input type="hidden" name="kljuc" value="<?= $kljuc ?>">
        <label style="margin:0">Nova slika
          <input type="file" name="slika" accept="image/png,image/jpeg,image/webp" required>
        </label>
        <?php if ($max > 1): ?>
          <label style="margin:0">Redoslijed <input type="number" name="redoslijed" value="<?= (count($rows) + 1) * 10 ?>" style="width:5rem"></label>
        <?php endif; ?>
        <label style="margin:0">Alt tekst <input type="text" name="slika_alt" placeholder="neobavezno"></label>
        <button type="submit" class="btn btn-primary">Učitaj</button>
      </form>
    <?php endif; ?>
  <?php endforeach; ?>
<?php hnkcms_admin_page_end(); ?>

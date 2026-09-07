<?php
declare(strict_types=1);
require __DIR__ . '/includes/db.php';
require __DIR__ . '/includes/auth.php';
require __DIR__ . '/includes/webp.php';
require __DIR__ . '/includes/layout.php';

$user = hnkcms_require_login();
$db = hnkcms_db();

$id = isset($_GET['id']) && ctype_digit((string) $_GET['id']) ? (int) $_GET['id'] : null;
$row = null;
if ($id !== null) {
    $stmt = $db->prepare('SELECT * FROM momcadi WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) {
        header('Location: /admin/momcadi.php');
        exit;
    }
}

$uploadsDir = __DIR__ . '/../uploads/momcadi';

// Tri slike na nivou tima: ključ = prefiks kolona u bazi = ime file inputa.
// Cover i grupna idu na WIDTHS_WIDE (hero 100vw / 1200px), trener je portret.
$imageSlots = [
    'cover'        => ['filePrefix' => 'cover',  'widths' => WebpPipeline::WIDTHS_WIDE, 'label' => 'Naslovna slika (hero pozadina)', 'hasAlt' => true],
    'grupna'       => ['filePrefix' => 'grupna', 'widths' => WebpPipeline::WIDTHS_WIDE, 'label' => 'Grupna fotografija', 'hasAlt' => true],
    'trener_slika' => ['filePrefix' => 'trener', 'widths' => null, 'label' => 'Slika trenera', 'hasAlt' => false],
];

/** ", p_original=?, p_small=?, ..." za jedan slot; $data=null postavlja sve na NULL/0 (uklanjanje). */
function hnkcms_image_set_sql(string $prefix, ?array $data, array &$params): string
{
    $params[] = $data['original'] ?? null;
    $params[] = $data['small'] ?? null;
    $params[] = $data['medium'] ?? null;
    $params[] = $data['large'] ?? null;
    $params[] = $data ? (int) $data['is_vector'] : 0;
    $params[] = $data['width'] ?? null;
    $params[] = $data['height'] ?? null;
    return ", {$prefix}_original=?, {$prefix}_small=?, {$prefix}_medium=?, {$prefix}_large=?, {$prefix}_is_vector=?, {$prefix}_width=?, {$prefix}_height=?";
}

$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    hnkcms_verify_csrf();

    $slug = strtolower(trim((string) ($_POST['slug'] ?? '')));
    $nazivHr = trim((string) ($_POST['naziv_hr'] ?? ''));
    $nazivDe = trim((string) ($_POST['naziv_de'] ?? ''));
    $redoslijed = (int) ($_POST['redoslijed'] ?? 100);
    $ligaHr = trim((string) ($_POST['liga_hr'] ?? ''));
    $ligaDe = trim((string) ($_POST['liga_de'] ?? ''));
    $terminHr = trim((string) ($_POST['termin_treninga_hr'] ?? ''));
    $terminDe = trim((string) ($_POST['termin_treninga_de'] ?? ''));
    $opisHr = (string) ($_POST['opis_hr'] ?? '');
    $opisDe = (string) ($_POST['opis_de'] ?? '');
    $coverAlt = trim((string) ($_POST['cover_alt'] ?? ''));
    $grupnaAlt = trim((string) ($_POST['grupna_alt'] ?? ''));
    $trenerIme = trim((string) ($_POST['trener_ime'] ?? ''));
    $trenerFunkcijaHr = trim((string) ($_POST['trener_funkcija_hr'] ?? ''));
    $trenerFunkcijaDe = trim((string) ($_POST['trener_funkcija_de'] ?? ''));
    $status = ($_POST['status'] ?? '') === 'entwurf' ? 'entwurf' : 'veroeffentlicht';

    if ($nazivHr === '') {
        $errors[] = 'Naziv (HR) je obavezan.';
    }
    if ($slug === '' || !preg_match('/^[a-z0-9]+(-[a-z0-9]+)*$/', $slug)) {
        $errors[] = 'Slug je obavezan i smije sadržavati samo mala slova, brojeve i crtice (npr. "seniori").';
    } else {
        $dupStmt = $row
            ? $db->prepare('SELECT id FROM momcadi WHERE slug = ? AND id != ?')
            : $db->prepare('SELECT id FROM momcadi WHERE slug = ?');
        $dupStmt->execute($row ? [$slug, $row['id']] : [$slug]);
        if ($dupStmt->fetch()) {
            $errors[] = "Slug \"{$slug}\" je već zauzet.";
        }
    }

    $baseCols = 'slug=?, naziv_hr=?, naziv_de=?, redoslijed=?, liga_hr=?, liga_de=?, termin_treninga_hr=?, termin_treninga_de=?, opis_hr=?, opis_de=?, cover_alt=?, grupna_alt=?, trener_ime=?, trener_funkcija_hr=?, trener_funkcija_de=?, status=?';
    $baseParams = [$slug, $nazivHr, $nazivDe ?: null, $redoslijed, $ligaHr ?: null, $ligaDe ?: null, $terminHr ?: null, $terminDe ?: null, $opisHr ?: null, $opisDe ?: null, $coverAlt ?: null, $grupnaAlt ?: null, $trenerIme ?: null, $trenerFunkcijaHr ?: null, $trenerFunkcijaDe ?: null, $status];

    // Uploadi se obrađuju samo jednom po zahtjevu (move_uploaded_file premješta
    // tmp datoteku) — za novu momčad tek nakon INSERT-a, jer WebpPipeline treba ID.
    if (!$errors && $row) {
        $newImages = [];   // slot => data
        $removeSlots = []; // slot => true
        foreach ($imageSlots as $slot => $cfg) {
            if (!empty($_FILES[$slot]['name'])) {
                try {
                    $newImages[$slot] = WebpPipeline::process($_FILES[$slot], $uploadsDir, (int) $row['id'], $cfg['filePrefix'], $cfg['widths']);
                } catch (LogoUploadError $e) {
                    $errors[] = $cfg['label'] . ': ' . $e->getMessage();
                }
            } elseif (!empty($_POST["ukloni_{$slot}"]) && !empty($row["{$slot}_small"])) {
                $removeSlots[$slot] = true;
            }
        }
    }

    if (!$errors) {
        if ($row) {
            $sql = 'UPDATE momcadi SET ' . $baseCols;
            $params = $baseParams;
            foreach ($newImages as $slot => $data) {
                $sql .= hnkcms_image_set_sql($slot, $data, $params);
            }
            foreach ($removeSlots as $slot => $_) {
                $sql .= hnkcms_image_set_sql($slot, null, $params);
            }
            $sql .= ' WHERE id=?';
            $params[] = $row['id'];
            $db->prepare($sql)->execute($params);

            // Stare datoteke se brišu tek nakon uspješnog upisa.
            foreach (array_keys($newImages + $removeSlots) as $slot) {
                WebpPipeline::delete($uploadsDir, $row, $slot);
            }
            header('Location: /admin/momcadi.php?msg=' . rawurlencode('Momčad ažurirana.'));
            exit;
        }

        $db->prepare('INSERT INTO momcadi SET ' . $baseCols)->execute($baseParams);
        $newId = (int) $db->lastInsertId();

        $uploadErrors = [];
        foreach ($imageSlots as $slot => $cfg) {
            if (empty($_FILES[$slot]['name'])) {
                continue;
            }
            try {
                $data = WebpPipeline::process($_FILES[$slot], $uploadsDir, $newId, $cfg['filePrefix'], $cfg['widths']);
                $params = [];
                $sql = 'UPDATE momcadi SET id=id' . hnkcms_image_set_sql($slot, $data, $params) . ' WHERE id=?';
                $params[] = $newId;
                $db->prepare($sql)->execute($params);
            } catch (LogoUploadError $e) {
                $uploadErrors[] = $cfg['label'] . ': ' . $e->getMessage();
            }
        }

        $msg = $uploadErrors
            ? 'Momčad kreirana, ALI: ' . implode(' ', $uploadErrors) . ' Dodajte slike kroz Uredi.'
            : 'Momčad kreirana. Igrače, popis imena i galeriju dodajte kroz "Sastav".';
        header('Location: /admin/momcadi.php?msg=' . rawurlencode($msg));
        exit;
    }
}

$uploadsUrl = rtrim(hnkcms_config()['public_base_url'], '/') . '/uploads/momcadi';
$isEdit = $row !== null;
$v = fn(string $key, $default = '') => htmlspecialchars((string) ($_POST[$key] ?? $row[$key] ?? $default), ENT_QUOTES);

hnkcms_admin_page_start($isEdit ? 'Uredi momčad' : 'Nova momčad', 'momcadi', $user, true);
?>
  <p><a href="/admin/momcadi.php">&larr; Natrag na listu</a>
    <?php if ($isEdit): ?> &middot; <a href="/admin/momcad-sastav.php?momcad=<?= (int) $row['id'] ?>">Sastav (igrači, popis imena, galerija) &rarr;</a><?php endif; ?>
  </p>
  <h2><?= $isEdit ? 'Uredi momčad' : 'Nova momčad' ?></h2>

  <?php foreach ($errors as $err): ?>
    <p class="flash flash-error"><?= htmlspecialchars($err, ENT_QUOTES) ?></p>
  <?php endforeach; ?>

  <form method="post" enctype="multipart/form-data" class="admin-form">
    <?= hnkcms_csrf_field() ?>

    <label>Naziv (HR) *
      <input type="text" name="naziv_hr" value="<?= $v('naziv_hr') ?>" required>
    </label>
    <label>Naziv (DE)
      <input type="text" name="naziv_de" value="<?= $v('naziv_de') ?>">
    </label>

    <label>Slug (dio URL-a) *
      <input type="text" name="slug" value="<?= $v('slug') ?>" placeholder="npr. seniori" required>
    </label>
    <p class="hint">Ruta na sajtu: /momcadi/&lt;slug&gt;. Postojeće: aktivni, seniori, juniori.</p>

    <label>Redoslijed prikaza
      <input type="number" name="redoslijed" value="<?= $v('redoslijed', '100') ?>">
    </label>

    <label>Liga / natjecanje (HR)
      <input type="text" name="liga_hr" value="<?= $v('liga_hr') ?>" placeholder="npr. 3. liga">
    </label>
    <label>Liga / natjecanje (DE)
      <input type="text" name="liga_de" value="<?= $v('liga_de') ?>">
    </label>

    <label>Termin treninga (HR)
      <input type="text" name="termin_treninga_hr" value="<?= $v('termin_treninga_hr') ?>" placeholder="npr. Utorak i četvrtak 19:00">
    </label>
    <label>Termin treninga (DE)
      <input type="text" name="termin_treninga_de" value="<?= $v('termin_treninga_de') ?>">
    </label>

    <?php foreach (['cover', 'grupna'] as $slot): $cfg = $imageSlots[$slot]; ?>
      <div class="field-group">
        <p class="group-title"><?= $cfg['label'] ?></p>
        <label>Datoteka <?= $isEdit && $row["{$slot}_small"] ? '(ostaviti prazno da se zadrži postojeća)' : '' ?>
          <input type="file" name="<?= $slot ?>" accept="image/png,image/jpeg,image/webp,image/gif">
        </label>
        <?php if ($isEdit && $row["{$slot}_small"]): ?>
          <div class="current-logo">
            <img src="<?= htmlspecialchars($uploadsUrl . '/' . $row["{$slot}_small"], ENT_QUOTES) ?>" alt="" style="width:120px;height:68px;object-fit:cover">
            <span class="hint">Trenutna slika (<?= (int) $row["{$slot}_width"] ?>×<?= (int) $row["{$slot}_height"] ?>)</span>
          </div>
          <label class="checkbox-inline"><input type="checkbox" name="ukloni_<?= $slot ?>" value="1"> Ukloni sliku</label>
        <?php endif; ?>
        <label>Alt tekst
          <input type="text" name="<?= $slot ?>_alt" value="<?= $v("{$slot}_alt") ?>">
        </label>
      </div>
    <?php endforeach; ?>

    <div class="field-group">
      <p class="group-title">Trener (opciono)</p>
      <label>Ime i prezime
        <input type="text" name="trener_ime" value="<?= $v('trener_ime') ?>">
      </label>
      <label>Funkcija (HR)
        <input type="text" name="trener_funkcija_hr" value="<?= $v('trener_funkcija_hr') ?>" placeholder="npr. Trener">
      </label>
      <label>Funkcija (DE)
        <input type="text" name="trener_funkcija_de" value="<?= $v('trener_funkcija_de') ?>">
      </label>
      <label>Slika trenera <?= $isEdit && $row['trener_slika_small'] ? '(ostaviti prazno da se zadrži postojeća)' : '' ?>
        <input type="file" name="trener_slika" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml">
      </label>
      <?php if ($isEdit && $row['trener_slika_small']): ?>
        <div class="current-logo current-photo">
          <img src="<?= htmlspecialchars($uploadsUrl . '/' . $row['trener_slika_small'], ENT_QUOTES) ?>" alt="">
          <span class="hint">Trenutna slika</span>
        </div>
        <label class="checkbox-inline"><input type="checkbox" name="ukloni_trener_slika" value="1"> Ukloni sliku</label>
      <?php endif; ?>
    </div>

    <label>Opis (HR) — Markdown
      <textarea name="opis_hr" rows="8" class="admin-textarea-mono"><?= $v('opis_hr') ?></textarea>
    </label>
    <label>Opis (DE) — Markdown
      <textarea name="opis_de" rows="8" class="admin-textarea-mono"><?= $v('opis_de') ?></textarea>
    </label>
    <p class="hint">
      Podržano: prazan red = novi pasus, Enter unutar pasusa = prijelom reda &middot;
      <strong>**bold**</strong> &middot; <em>*italic*</em> &middot; <code>## Naslov</code> / <code>### Podnaslov</code> &middot;
      <code>&gt; citat</code> &middot; <code>- stavka</code> &middot; <code>1. stavka</code> &middot; <code>[tekst](https://...)</code>.
    </p>

    <label>Status
      <select name="status">
        <option value="veroeffentlicht" <?= ($_POST['status'] ?? $row['status'] ?? 'veroeffentlicht') === 'veroeffentlicht' ? 'selected' : '' ?>>Veröffentlicht (vidljivo na sajtu)</option>
        <option value="entwurf" <?= ($_POST['status'] ?? $row['status'] ?? '') === 'entwurf' ? 'selected' : '' ?>>Entwurf (skriveno, samo u adminu)</option>
      </select>
    </label>

    <button type="submit" class="btn btn-primary"><?= $isEdit ? 'Spremi izmjene' : 'Kreiraj momčad' ?></button>
  </form>
<?php hnkcms_admin_page_end(); ?>

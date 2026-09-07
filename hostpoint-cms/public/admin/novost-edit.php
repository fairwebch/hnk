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
    $stmt = $db->prepare('SELECT * FROM novosti WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) {
        header('Location: /admin/novosti.php');
        exit;
    }
}

$kategorije = ['Eventi', 'Novosti', 'Skupština', 'Sport'];
$uploadsDir = __DIR__ . '/../uploads/novosti';
$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    hnkcms_verify_csrf();

    $slug = strtolower(trim((string) ($_POST['slug'] ?? '')));
    $naslovHr = trim((string) ($_POST['naslov_hr'] ?? ''));
    $naslovDe = trim((string) ($_POST['naslov_de'] ?? ''));
    $datumRaw = trim((string) ($_POST['datum'] ?? ''));       // datetime-local: GGGG-MM-DDTHH:MM
    $kategorija = (string) ($_POST['kategorija'] ?? 'Novosti');
    $coverAlt = trim((string) ($_POST['cover_alt'] ?? ''));
    $sazetakHr = trim((string) ($_POST['sazetak_hr'] ?? ''));
    $sazetakDe = trim((string) ($_POST['sazetak_de'] ?? ''));
    $sadrzajHr = (string) ($_POST['sadrzaj_hr'] ?? '');
    $sadrzajDe = (string) ($_POST['sadrzaj_de'] ?? '');
    $status = ($_POST['status'] ?? '') === 'entwurf' ? 'entwurf' : 'veroeffentlicht';

    if ($naslovHr === '') {
        $errors[] = 'Naslov (HR) je obavezan.';
    }
    if (!in_array($kategorija, $kategorije, true)) {
        $errors[] = 'Nevažeća kategorija.';
    }
    $datum = null;
    if (preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/', $datumRaw)) {
        $datum = str_replace('T', ' ', strlen($datumRaw) === 16 ? $datumRaw . ':00' : $datumRaw);
    } else {
        $errors[] = 'Datum i vrijeme su obavezni.';
    }
    if ($slug === '' || !preg_match('/^[a-z0-9]+(-[a-z0-9]+)*$/', $slug)) {
        $errors[] = 'Slug je obavezan i smije sadržavati samo mala slova, brojeve i crtice.';
    } else {
        $dupStmt = $row
            ? $db->prepare('SELECT id FROM novosti WHERE slug = ? AND id != ?')
            : $db->prepare('SELECT id FROM novosti WHERE slug = ?');
        $dupStmt->execute($row ? [$slug, $row['id']] : [$slug]);
        if ($dupStmt->fetch()) {
            $errors[] = "Slug \"{$slug}\" je već zauzet.";
        }
    }

    $baseCols = 'slug=?, naslov_hr=?, naslov_de=?, datum=?, kategorija=?, cover_alt=?, sazetak_hr=?, sazetak_de=?, sadrzaj_hr=?, sadrzaj_de=?, status=?';
    $baseParams = [$slug, $naslovHr, $naslovDe ?: null, $datum, $kategorija, $coverAlt ?: null, $sazetakHr ?: null, $sazetakDe ?: null, $sadrzajHr ?: null, $sadrzajDe ?: null, $status];

    $coverData = null;
    $removeCover = false;
    if (!$errors && $row) {
        if (!empty($_FILES['cover']['name'])) {
            try {
                $coverData = WebpPipeline::process($_FILES['cover'], $uploadsDir, (int) $row['id'], 'cover', WebpPipeline::WIDTHS_WIDE);
            } catch (LogoUploadError $e) {
                $errors[] = 'Naslovna slika: ' . $e->getMessage();
            }
        } elseif (!empty($_POST['ukloni_cover']) && $row['cover_small']) {
            $removeCover = true;
        }
    }

    if (!$errors) {
        $coverSql = ', cover_original=?, cover_small=?, cover_medium=?, cover_large=?, cover_is_vector=?, cover_width=?, cover_height=?';
        $coverParams = fn(?array $d) => [$d['original'] ?? null, $d['small'] ?? null, $d['medium'] ?? null, $d['large'] ?? null, $d ? (int) $d['is_vector'] : 0, $d['width'] ?? null, $d['height'] ?? null];

        if ($row) {
            $sql = 'UPDATE novosti SET ' . $baseCols;
            $params = $baseParams;
            if ($coverData || $removeCover) {
                $sql .= $coverSql;
                array_push($params, ...$coverParams($coverData));
            }
            $sql .= ' WHERE id=?';
            $params[] = $row['id'];
            $db->prepare($sql)->execute($params);
            if ($coverData || $removeCover) {
                WebpPipeline::delete($uploadsDir, $row, 'cover');
            }
            header('Location: /admin/novost-edit.php?id=' . (int) $row['id'] . '&msg=' . rawurlencode('Novost spremljena.'));
            exit;
        }

        $db->prepare('INSERT INTO novosti SET ' . $baseCols)->execute($baseParams);
        $newId = (int) $db->lastInsertId();
        $msg = 'Novost kreirana.';
        if (!empty($_FILES['cover']['name'])) {
            try {
                $d = WebpPipeline::process($_FILES['cover'], $uploadsDir, $newId, 'cover', WebpPipeline::WIDTHS_WIDE);
                $db->prepare('UPDATE novosti SET id=id' . $coverSql . ' WHERE id=?')->execute([...$coverParams($d), $newId]);
            } catch (LogoUploadError $e) {
                $msg = 'Novost kreirana, ALI naslovna slika nije uspjela: ' . $e->getMessage();
            }
        }
        header('Location: /admin/novost-edit.php?id=' . $newId . '&msg=' . rawurlencode($msg . ' Slike u tekstu možete dodati ispod.'));
        exit;
    }
}

$uploadsUrl = rtrim(hnkcms_config()['public_base_url'], '/') . '/uploads/novosti';
$isEdit = $row !== null;
$v = fn(string $key, $default = '') => htmlspecialchars((string) ($_POST[$key] ?? $row[$key] ?? $default), ENT_QUOTES);
$datumValue = $_POST['datum'] ?? ($row ? str_replace(' ', 'T', substr($row['datum'], 0, 16)) : date('Y-m-d\TH:i'));
$selKat = (string) ($_POST['kategorija'] ?? $row['kategorija'] ?? 'Novosti');

$slike = [];
if ($isEdit) {
    $s = $db->prepare('SELECT * FROM novost_slike WHERE novost_id = ? ORDER BY redoslijed ASC, id ASC');
    $s->execute([$row['id']]);
    $slike = $s->fetchAll();
}

hnkcms_admin_page_start($isEdit ? 'Uredi novost' : 'Nova novost', 'novosti', $user, true);
?>
  <p><a href="/admin/novosti.php">&larr; Natrag na listu</a></p>
  <h2><?= $isEdit ? 'Uredi novost' : 'Nova novost' ?></h2>

  <?php hnkcms_flash(); ?>
  <?php foreach ($errors as $err): ?>
    <p class="flash flash-error"><?= htmlspecialchars($err, ENT_QUOTES) ?></p>
  <?php endforeach; ?>

  <form method="post" enctype="multipart/form-data" class="admin-form">
    <?= hnkcms_csrf_field() ?>

    <label>Naslov (HR) *
      <input type="text" name="naslov_hr" value="<?= $v('naslov_hr') ?>" required>
    </label>
    <label>Naslov (DE)
      <input type="text" name="naslov_de" value="<?= $v('naslov_de') ?>">
    </label>

    <label>Slug (dio URL-a) *
      <input type="text" name="slug" value="<?= $v('slug') ?>" placeholder="npr. poziv-na-godisnju-skupstinu-2026" required>
    </label>

    <label>Datum i vrijeme objave *
      <input type="datetime-local" name="datum" value="<?= htmlspecialchars((string) $datumValue, ENT_QUOTES) ?>" required>
    </label>

    <label>Kategorija
      <select name="kategorija">
        <?php foreach ($kategorije as $k): ?>
          <option value="<?= htmlspecialchars($k, ENT_QUOTES) ?>" <?= $selKat === $k ? 'selected' : '' ?>><?= htmlspecialchars($k, ENT_QUOTES) ?></option>
        <?php endforeach; ?>
      </select>
    </label>

    <div class="field-group">
      <p class="group-title">Naslovna slika</p>
      <label>Datoteka <?= $isEdit && $row['cover_small'] ? '(ostaviti prazno da se zadrži postojeća)' : '' ?>
        <input type="file" name="cover" accept="image/png,image/jpeg,image/webp,image/gif">
      </label>
      <?php if ($isEdit && $row['cover_small']): ?>
        <div class="current-logo">
          <img src="<?= htmlspecialchars($uploadsUrl . '/' . $row['cover_small'], ENT_QUOTES) ?>" alt="" style="width:120px;height:68px;object-fit:cover">
          <span class="hint">Trenutna (<?= (int) $row['cover_width'] ?>×<?= (int) $row['cover_height'] ?>)</span>
        </div>
        <label class="checkbox-inline"><input type="checkbox" name="ukloni_cover" value="1"> Ukloni naslovnu sliku</label>
      <?php endif; ?>
      <label>Alt tekst
        <input type="text" name="cover_alt" value="<?= $v('cover_alt') ?>">
      </label>
    </div>

    <label>Kratak opis (HR)
      <textarea name="sazetak_hr" rows="3"><?= $v('sazetak_hr') ?></textarea>
    </label>
    <label>Kratak opis (DE)
      <textarea name="sazetak_de" rows="3"><?= $v('sazetak_de') ?></textarea>
    </label>

    <label>Sadržaj (HR) — Markdown
      <textarea name="sadrzaj_hr" rows="18" class="admin-textarea-mono"><?= $v('sadrzaj_hr') ?></textarea>
    </label>
    <label>Sadržaj (DE) — Markdown
      <textarea name="sadrzaj_de" rows="10" class="admin-textarea-mono"><?= $v('sadrzaj_de') ?></textarea>
    </label>
    <p class="hint">
      Podržano: prazan red = novi pasus, Enter unutar pasusa = prijelom reda &middot;
      <strong>**bold**</strong> &middot; <em>*italic*</em> &middot; <code>## Naslov</code> / <code>### Podnaslov</code> &middot;
      <code>&gt; citat</code> &middot; <code>- stavka</code> &middot; <code>1. stavka</code> &middot; <code>[tekst](https://...)</code> &middot;
      slika u zasebnom redu <code>![opis](url)</code> (snippet ispod) &middot;
      pasus koji počinje brojem s tačkom, a nije lista: <code>1\. tekst</code>.
    </p>

    <label>Status
      <select name="status">
        <option value="veroeffentlicht" <?= ($_POST['status'] ?? $row['status'] ?? 'veroeffentlicht') === 'veroeffentlicht' ? 'selected' : '' ?>>Veröffentlicht (vidljivo na sajtu)</option>
        <option value="entwurf" <?= ($_POST['status'] ?? $row['status'] ?? '') === 'entwurf' ? 'selected' : '' ?>>Entwurf (skriveno, samo u adminu)</option>
      </select>
    </label>

    <button type="submit" class="btn btn-primary"><?= $isEdit ? 'Spremi izmjene' : 'Kreiraj novost' ?></button>
  </form>

  <?php if ($isEdit): ?>
    <section class="admin-section">
      <div class="admin-toolbar">
        <h2>Slike u tekstu <span class="hint" style="display:inline;font-weight:400">— <?= count($slike) ?></span></h2>
      </div>
      <p class="hint">Uploadajte sliku, pa kopirajte snippet u Sadržaj (u zaseban red, između pasusa). Opis slike = alt tekst i potpis pod slikom.</p>

      <form method="post" action="/admin/novost-slika-upload.php" enctype="multipart/form-data" class="admin-form admin-inline-form">
        <?= hnkcms_csrf_field() ?>
        <input type="hidden" name="novost" value="<?= (int) $row['id'] ?>">
        <label>Slike (može više odjednom)
          <input type="file" name="slike[]" accept="image/png,image/jpeg,image/webp,image/gif" multiple required>
        </label>
        <button type="submit" class="btn btn-primary">Upload</button>
      </form>

      <?php if ($slike): ?>
        <div class="admin-gallery" style="margin-top:1.25rem">
          <?php foreach ($slike as $s): ?>
            <?php $snippet = '![' . ($s['alt'] ?? '') . '](' . $uploadsUrl . '/' . $s['slika_medium'] . ')'; ?>
            <figure>
              <img src="<?= htmlspecialchars($uploadsUrl . '/' . $s['slika_small'], ENT_QUOTES) ?>" alt="" loading="lazy">
              <figcaption style="flex-direction:column;align-items:stretch">
                <input type="text" readonly value="<?= htmlspecialchars($snippet, ENT_QUOTES) ?>" onclick="this.select()" style="width:100%;font-family:ui-monospace,monospace;font-size:.7rem;padding:.3rem .4rem;border:1px solid var(--line);margin:0">
                <span class="admin-row-actions" style="justify-content:space-between;margin-top:.4rem">
                  <a href="/admin/novost-slika-edit.php?id=<?= (int) $s['id'] ?>">Alt tekst</a>
                  <form method="post" action="/admin/novost-slika-delete.php" onsubmit="return confirm('Obrisati sliku? Ako je snippet u tekstu, uklonite ga ručno.');">
                    <?= hnkcms_csrf_field() ?>
                    <input type="hidden" name="id" value="<?= (int) $s['id'] ?>">
                    <button type="submit" class="link-danger">Obriši</button>
                  </form>
                </span>
              </figcaption>
            </figure>
          <?php endforeach; ?>
        </div>
      <?php endif; ?>
    </section>
  <?php endif; ?>
<?php hnkcms_admin_page_end(); ?>

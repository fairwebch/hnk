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
    $stmt = $db->prepare('SELECT * FROM dogadjaji WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) {
        header('Location: /admin/dogadjaji.php');
        exit;
    }
}

$kategorije = ['Turnir', 'Zabava', 'Izlet', 'Skupština'];
$vrste = ['bez' => 'Bez prijava', 'osoba' => 'Prijava osobe', 'ekipa' => 'Prijava ekipe'];
$pristupi = ['javna' => 'Javna — svatko se može prijaviti', 'clanovi' => 'Samo članovi — treba tajni link'];
$uploadsDir = __DIR__ . '/../uploads/dogadjaji';

$sponzori = $db->query("SELECT id, naziv FROM sponzori ORDER BY redoslijed ASC, naziv ASC")->fetchAll();
$galerije = $db->query("SELECT id, naziv_hr, godina FROM galerije ORDER BY godina DESC, datum DESC, naziv_hr ASC")->fetchAll();

/** Isti alfabet kao Sanity generateTajniKod (bez 0/1/i/l/o radi čitljivosti), 10 znakova. */
function hnkcms_novi_tajni_kod(): string
{
    $chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    $s = '';
    for ($i = 0; $i < 10; $i++) {
        $s .= $chars[random_int(0, strlen($chars) - 1)];
    }
    return $s;
}

/** datetime-local ("GGGG-MM-DDTHH:MM") -> MySQL DATETIME, ili null ako prazno; false ako neispravno. */
function hnkcms_parse_dt(string $raw)
{
    if ($raw === '') {
        return null;
    }
    if (!preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/', $raw)) {
        return false;
    }
    return str_replace('T', ' ', strlen($raw) === 16 ? $raw . ':00' : $raw);
}

$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    hnkcms_verify_csrf();

    $slug = strtolower(trim((string) ($_POST['slug'] ?? '')));
    $nazivHr = trim((string) ($_POST['naziv_hr'] ?? ''));
    $nazivDe = trim((string) ($_POST['naziv_de'] ?? ''));
    $kategorija = (string) ($_POST['kategorija'] ?? '');
    $kategorija = in_array($kategorija, $kategorije, true) ? $kategorija : null;
    $datumPocetak = hnkcms_parse_dt(trim((string) ($_POST['datum_pocetak'] ?? '')));
    $datumKraj = hnkcms_parse_dt(trim((string) ($_POST['datum_kraj'] ?? '')));
    $lokacija = trim((string) ($_POST['lokacija'] ?? ''));
    $coverAlt = trim((string) ($_POST['cover_alt'] ?? ''));
    $opisHr = (string) ($_POST['opis_hr'] ?? '');
    $opisDe = (string) ($_POST['opis_de'] ?? '');
    $kotizacija = trim((string) ($_POST['kotizacija'] ?? ''));
    $kapacitet = trim((string) ($_POST['kapacitet'] ?? ''));
    $prijavaLink = trim((string) ($_POST['prijava_link'] ?? ''));
    $sponzorId = ctype_digit((string) ($_POST['sponzor_id'] ?? '')) ? (int) $_POST['sponzor_id'] : null;
    $galerijaId = ctype_digit((string) ($_POST['galerija_id'] ?? '')) ? (int) $_POST['galerija_id'] : null;
    $programRaw = (string) ($_POST['program'] ?? '');
    $vrsta = (string) ($_POST['vrsta_prijave'] ?? 'bez');
    $vrsta = isset($vrste[$vrsta]) ? $vrsta : 'bez';
    $pristup = (string) ($_POST['pristup_prijavi'] ?? 'javna');
    $pristup = isset($pristupi[$pristup]) ? $pristup : 'javna';
    $otvorene = !empty($_POST['prijave_otvorene']) ? 1 : 0;
    $rokPrijave = hnkcms_parse_dt(trim((string) ($_POST['rok_prijave'] ?? '')));
    $status = ($_POST['status'] ?? '') === 'entwurf' ? 'entwurf' : 'veroeffentlicht';

    if ($nazivHr === '') {
        $errors[] = 'Naziv (HR) je obavezan.';
    }
    if ($datumPocetak === null || $datumPocetak === false) {
        $errors[] = 'Datum i vrijeme početka su obavezni (UTC).';
    }
    if ($datumKraj === false) {
        $errors[] = 'Datum kraja nije ispravan.';
    }
    if ($rokPrijave === false) {
        $errors[] = 'Rok prijave nije ispravan.';
    }
    if ($prijavaLink !== '' && !preg_match('#^(https?://|mailto:|tel:)#i', $prijavaLink)) {
        $errors[] = 'Link za prijavu mora biti http(s)://, mailto: ili tel:.';
    }
    if ($slug === '' || !preg_match('/^[a-z0-9]+(-[a-z0-9]+)*$/', $slug)) {
        $errors[] = 'Slug je obavezan i smije sadržavati samo mala slova, brojeve i crtice.';
    } else {
        $dupStmt = $row
            ? $db->prepare('SELECT id FROM dogadjaji WHERE slug = ? AND id != ?')
            : $db->prepare('SELECT id FROM dogadjaji WHERE slug = ?');
        $dupStmt->execute($row ? [$slug, $row['id']] : [$slug]);
        if ($dupStmt->fetch()) {
            $errors[] = "Slug \"{$slug}\" je već zauzet.";
        }
    }

    // Program: jedna stavka po redu, "vrijeme | opis" (ili samo tekst = opis).
    $programStavke = [];
    foreach (preg_split('/\r\n|\r|\n/', $programRaw) as $line) {
        $line = trim($line);
        if ($line === '') {
            continue;
        }
        [$vrijeme, $opis] = array_pad(array_map('trim', explode('|', $line, 2)), 2, null);
        if ($opis === null) {
            [$vrijeme, $opis] = [null, $vrijeme];
        }
        $programStavke[] = [$vrijeme ?: null, $opis ?: null];
    }

    // Tajni kod: čuva se postojeći; generira se novi kad je pristup "clanovi" i
    // koda još nema, ili kad admin izričito zatraži rotaciju.
    $tajniKod = $row['tajni_kod'] ?? null;
    if (($pristup === 'clanovi' && !$tajniKod) || !empty($_POST['novi_tajni_kod'])) {
        $tajniKod = hnkcms_novi_tajni_kod();
    }

    $baseCols = 'slug=?, naziv_hr=?, naziv_de=?, kategorija=?, datum_pocetak=?, datum_kraj=?, lokacija=?, cover_alt=?, opis_hr=?, opis_de=?, kotizacija=?, kapacitet=?, prijava_link=?, sponzor_id=?, galerija_id=?, vrsta_prijave=?, pristup_prijavi=?, prijave_otvorene=?, rok_prijave=?, tajni_kod=?, status=?';
    $baseParams = [$slug, $nazivHr, $nazivDe ?: null, $kategorija, $datumPocetak, $datumKraj, $lokacija ?: null, $coverAlt ?: null, $opisHr ?: null, $opisDe ?: null, $kotizacija ?: null, $kapacitet ?: null, $prijavaLink ?: null, $sponzorId, $galerijaId, $vrsta, $pristup, $otvorene, $rokPrijave, $tajniKod, $status];

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
        $saveProgram = function (int $dogadjajId) use ($db, $programStavke): void {
            $db->prepare('DELETE FROM dogadjaj_program WHERE dogadjaj_id = ?')->execute([$dogadjajId]);
            $ins = $db->prepare('INSERT INTO dogadjaj_program (dogadjaj_id, vrijeme, opis, redoslijed) VALUES (?,?,?,?)');
            foreach ($programStavke as $i => [$vrijeme, $opis]) {
                $ins->execute([$dogadjajId, $vrijeme, $opis, ($i + 1) * 10]);
            }
        };

        if ($row) {
            $sql = 'UPDATE dogadjaji SET ' . $baseCols;
            $params = $baseParams;
            if ($coverData || $removeCover) {
                $sql .= $coverSql;
                array_push($params, ...$coverParams($coverData));
            }
            $sql .= ' WHERE id=?';
            $params[] = $row['id'];
            $db->prepare($sql)->execute($params);
            $saveProgram((int) $row['id']);
            if ($coverData || $removeCover) {
                WebpPipeline::delete($uploadsDir, $row, 'cover');
            }
            header('Location: /admin/dogadjaj-edit.php?id=' . (int) $row['id'] . '&msg=' . rawurlencode('Događaj spremljen.'));
            exit;
        }

        $db->prepare('INSERT INTO dogadjaji SET ' . $baseCols)->execute($baseParams);
        $newId = (int) $db->lastInsertId();
        $saveProgram($newId);
        $msg = 'Događaj kreiran.';
        if (!empty($_FILES['cover']['name'])) {
            try {
                $d = WebpPipeline::process($_FILES['cover'], $uploadsDir, $newId, 'cover', WebpPipeline::WIDTHS_WIDE);
                $db->prepare('UPDATE dogadjaji SET id=id' . $coverSql . ' WHERE id=?')->execute([...$coverParams($d), $newId]);
            } catch (LogoUploadError $e) {
                $msg = 'Događaj kreiran, ALI naslovna slika nije uspjela: ' . $e->getMessage();
            }
        }
        header('Location: /admin/dogadjaj-edit.php?id=' . $newId . '&msg=' . rawurlencode($msg));
        exit;
    }
}

$uploadsUrl = rtrim(hnkcms_config()['public_base_url'], '/') . '/uploads/dogadjaji';
$isEdit = $row !== null;
$v = fn(string $key, $default = '') => htmlspecialchars((string) ($_POST[$key] ?? $row[$key] ?? $default), ENT_QUOTES);
$dtLocal = fn(?string $mysql) => $mysql ? str_replace(' ', 'T', substr($mysql, 0, 16)) : '';
$sel = fn(string $key, $default = '') => (string) ($_POST[$key] ?? $row[$key] ?? $default);

$programText = $_POST['program'] ?? null;
if ($programText === null && $isEdit) {
    $ps = $db->prepare('SELECT vrijeme, opis FROM dogadjaj_program WHERE dogadjaj_id = ? ORDER BY redoslijed ASC, id ASC');
    $ps->execute([$row['id']]);
    $programText = implode("\n", array_map(fn($p) => trim(($p['vrijeme'] ?? '') . ' | ' . ($p['opis'] ?? ''), ' |'), $ps->fetchAll()));
}

hnkcms_admin_page_start($isEdit ? 'Uredi događaj' : 'Novi događaj', 'dogadjaji', $user, true);
?>
  <p><a href="/admin/dogadjaji.php">&larr; Natrag na listu</a></p>
  <h2><?= $isEdit ? 'Uredi događaj' : 'Novi događaj' ?></h2>

  <?php hnkcms_flash(); ?>
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
      <input type="text" name="slug" value="<?= $v('slug') ?>" placeholder="npr. malonogometni-turnir-2026" required>
    </label>
    <label>Kategorija
      <select name="kategorija">
        <option value="" <?= $sel('kategorija') === '' ? 'selected' : '' ?>>— bez kategorije —</option>
        <?php foreach ($kategorije as $k): ?>
          <option value="<?= htmlspecialchars($k, ENT_QUOTES) ?>" <?= $sel('kategorija') === $k ? 'selected' : '' ?>><?= htmlspecialchars($k, ENT_QUOTES) ?></option>
        <?php endforeach; ?>
      </select>
    </label>

    <label>Početak * <span class="hint" style="display:inline">(UTC — sajt prikazuje u lokalnom vremenu posjetitelja)</span>
      <input type="datetime-local" name="datum_pocetak" value="<?= htmlspecialchars((string) ($_POST['datum_pocetak'] ?? $dtLocal($row['datum_pocetak'] ?? null)), ENT_QUOTES) ?>" required>
    </label>
    <label>Kraj (opciono; ako je prazno, koristi se početak)
      <input type="datetime-local" name="datum_kraj" value="<?= htmlspecialchars((string) ($_POST['datum_kraj'] ?? $dtLocal($row['datum_kraj'] ?? null)), ENT_QUOTES) ?>">
    </label>
    <label>Lokacija
      <input type="text" name="lokacija" value="<?= $v('lokacija') ?>" placeholder="npr. Dreifachhalle Allmig, Oberarth">
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

    <label>Opis (HR) — Markdown
      <textarea name="opis_hr" rows="8" class="admin-textarea-mono"><?= $v('opis_hr') ?></textarea>
    </label>
    <label>Opis (DE) — Markdown
      <textarea name="opis_de" rows="6" class="admin-textarea-mono"><?= $v('opis_de') ?></textarea>
    </label>
    <p class="hint">Podržano: prazan red = novi pasus &middot; <strong>**bold**</strong> &middot; <em>*italic*</em> &middot; <code>## Naslov</code> &middot; <code>- stavka</code> &middot; <code>[tekst](https://...)</code> &middot; <code>1\. tekst</code> za pasus koji počinje brojem.</p>

    <label>Program dana <span class="hint" style="display:inline">(jedna stavka po redu: <code>vrijeme | opis</code>)</span>
      <textarea name="program" rows="5" class="admin-textarea-mono" placeholder="09:00 | Okupljanje ekipa&#10;10:00 | Početak turnira"><?= htmlspecialchars((string) $programText, ENT_QUOTES) ?></textarea>
    </label>

    <label>Kotizacija <span class="hint" style="display:inline">(slobodan tekst, npr. „20 CHF po ekipi“, „Besplatno“)</span>
      <input type="text" name="kotizacija" value="<?= $v('kotizacija') ?>">
    </label>
    <label>Kapacitet <span class="hint" style="display:inline">(slobodan tekst, npr. „16 ekipa“; ne provjerava se automatski)</span>
      <input type="text" name="kapacitet" value="<?= $v('kapacitet') ?>">
    </label>
    <label>Eksterni link za prijavu (opciono)
      <input type="url" name="prijava_link" value="<?= $v('prijava_link') ?>" placeholder="https://...">
    </label>

    <label>Sponzor događaja
      <select name="sponzor_id">
        <option value="">— nema —</option>
        <?php foreach ($sponzori as $s): ?>
          <option value="<?= (int) $s['id'] ?>" <?= (string) $sel('sponzor_id') === (string) $s['id'] ? 'selected' : '' ?>><?= htmlspecialchars($s['naziv'], ENT_QUOTES) ?></option>
        <?php endforeach; ?>
      </select>
    </label>
    <label>Povezana galerija (arhiva)
      <select name="galerija_id">
        <option value="">— nema —</option>
        <?php foreach ($galerije as $g): ?>
          <option value="<?= (int) $g['id'] ?>" <?= (string) $sel('galerija_id') === (string) $g['id'] ? 'selected' : '' ?>><?= (int) $g['godina'] ?> · <?= htmlspecialchars($g['naziv_hr'], ENT_QUOTES) ?></option>
        <?php endforeach; ?>
      </select>
    </label>

    <div class="field-group">
      <p class="group-title">Prijave (postavke — same prijave su u privatnoj bazi)</p>
      <label>Vrsta prijave
        <select name="vrsta_prijave">
          <?php foreach ($vrste as $val => $label): ?>
            <option value="<?= $val ?>" <?= $sel('vrsta_prijave', 'bez') === $val ? 'selected' : '' ?>><?= $label ?></option>
          <?php endforeach; ?>
        </select>
      </label>
      <label>Pristup
        <select name="pristup_prijavi">
          <?php foreach ($pristupi as $val => $label): ?>
            <option value="<?= $val ?>" <?= $sel('pristup_prijavi', 'javna') === $val ? 'selected' : '' ?>><?= $label ?></option>
          <?php endforeach; ?>
        </select>
      </label>
      <label class="checkbox-inline"><input type="checkbox" name="prijave_otvorene" value="1" <?= !empty($_POST['prijave_otvorene']) || (!$_POST && !empty($row['prijave_otvorene'])) ? 'checked' : '' ?>> Prijave otvorene</label>
      <label>Rok prijave (UTC; nakon isteka forma se sama zatvara)
        <input type="datetime-local" name="rok_prijave" value="<?= htmlspecialchars((string) ($_POST['rok_prijave'] ?? $dtLocal($row['rok_prijave'] ?? null)), ENT_QUOTES) ?>">
      </label>
      <?php if ($isEdit): ?>
        <label>Tajni kod (članski link: /dogadjaji/<?= htmlspecialchars($row['slug'], ENT_QUOTES) ?>?kod=…)
          <input type="text" readonly value="<?= htmlspecialchars((string) ($row['tajni_kod'] ?? '— generira se pri spremanju ako je pristup „samo članovi“ —'), ENT_QUOTES) ?>" onclick="this.select()">
        </label>
        <label class="checkbox-inline"><input type="checkbox" name="novi_tajni_kod" value="1"> Generiraj novi tajni kod (stari link prestaje vrijediti)</label>
      <?php endif; ?>
      <p class="hint">Tajni kod se nikad ne šalje javnim API-jem; podijeli ga preko newslettera.</p>
    </div>

    <label>Status
      <select name="status">
        <option value="veroeffentlicht" <?= $sel('status', 'veroeffentlicht') === 'veroeffentlicht' ? 'selected' : '' ?>>Veröffentlicht (vidljivo na sajtu)</option>
        <option value="entwurf" <?= $sel('status') === 'entwurf' ? 'selected' : '' ?>>Entwurf (skriveno, samo u adminu)</option>
      </select>
    </label>

    <button type="submit" class="btn btn-primary"><?= $isEdit ? 'Spremi izmjene' : 'Kreiraj događaj' ?></button>
  </form>
<?php hnkcms_admin_page_end(); ?>

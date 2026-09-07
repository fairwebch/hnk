<?php
declare(strict_types=1);
require __DIR__ . '/includes/db.php';
require __DIR__ . '/includes/auth.php';
require __DIR__ . '/includes/webp.php';

$user = hnkcms_require_login();
$db = hnkcms_db();

$id = isset($_GET['id']) && ctype_digit((string) $_GET['id']) ? (int) $_GET['id'] : null;
$row = null;
if ($id !== null) {
    $stmt = $db->prepare('SELECT * FROM sponzori WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) {
        header('Location: /admin/index.php');
        exit;
    }
}

$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    hnkcms_verify_csrf();

    $naziv = trim((string) ($_POST['naziv'] ?? ''));
    $link = trim((string) ($_POST['link'] ?? ''));
    $paket = (string) ($_POST['paket'] ?? 'Basic');
    $opisHr = trim((string) ($_POST['opis_paketa_hr'] ?? ''));
    $opisDe = trim((string) ($_POST['opis_paketa_de'] ?? ''));
    $redoslijed = (int) ($_POST['redoslijed'] ?? 100);
    $status = ($_POST['status'] ?? '') === 'entwurf' ? 'entwurf' : 'veroeffentlicht';

    if ($naziv === '') {
        $errors[] = 'Naziv je obavezan.';
    }
    if (!in_array($paket, ['Basic', 'Standard', 'Premium'], true)) {
        $errors[] = 'Nevažeći paket.';
    }
    if ($link !== '' && !filter_var($link, FILTER_VALIDATE_URL)) {
        $errors[] = 'Web poveznica nije valjan URL.';
    }
    if (!$row && empty($_FILES['logo']['name'])) {
        $errors[] = 'Logo je obavezan za novog sponzora.';
    }

    // NAPOMENA: WebpPipeline::process() se za rasterske uploade poziva samo
    // JEDNOM po zahtjevu — move_uploaded_file() unutar nje premjesti (ne
    // kopira) privremenu datoteku, pa bi drugi poziv nad istim $_FILES
    // pukao ("tmp_name ne postoji"). Zato se za novog sponzora obrada
    // odgađa dok ne dobijemo $newId (vidi ispod), umjesto da se radi
    // unaprijed pa opet nakon INSERT-a.
    $uploadsDir = __DIR__ . '/../uploads/sponzori';

    if (!$errors) {
        if ($row) {
            $logoData = null;
            if (!empty($_FILES['logo']['name'])) {
                try {
                    $logoData = WebpPipeline::process($_FILES['logo'], $uploadsDir, $row['id']);
                } catch (LogoUploadError $e) {
                    $errors[] = $e->getMessage();
                }
            }
        }
    }

    if (!$errors) {
        if ($row) {
            // Ako je novi logo uploadan, stare datoteke se brišu nakon uspješnog upisa.
            $oldLogoForCleanup = $logoData ? $row : null;

            $sql = 'UPDATE sponzori SET naziv=?, link=?, paket=?, opis_paketa_hr=?, opis_paketa_de=?, redoslijed=?, status=?';
            $params = [$naziv, $link ?: null, $paket, $opisHr ?: null, $opisDe ?: null, $redoslijed, $status];
            if ($logoData) {
                $sql .= ', logo_original=?, logo_small=?, logo_medium=?, logo_large=?, logo_is_vector=?, logo_width=?, logo_height=?';
                array_push($params, $logoData['original'], $logoData['small'], $logoData['medium'], $logoData['large'], (int) $logoData['is_vector'], $logoData['width'], $logoData['height']);
            }
            $sql .= ' WHERE id=?';
            $params[] = $row['id'];

            $db->prepare($sql)->execute($params);

            if ($oldLogoForCleanup) {
                WebpPipeline::delete(__DIR__ . '/../uploads/sponzori', $oldLogoForCleanup);
            }
            header('Location: /admin/index.php?msg=' . rawurlencode('Sponzor ažuriran.'));
            exit;
        }

        // Novi sponzor: prvo INSERT bez loga (treba mu ID za imenovanje datoteka
        // u WebpPipeline), pa upload, pa UPDATE s putanjama.
        $stmt = $db->prepare(
            'INSERT INTO sponzori (naziv, link, paket, opis_paketa_hr, opis_paketa_de, redoslijed, status) VALUES (?,?,?,?,?,?,?)'
        );
        $stmt->execute([$naziv, $link ?: null, $paket, $opisHr ?: null, $opisDe ?: null, $redoslijed, $status]);
        $newId = (int) $db->lastInsertId();

        try {
            $logoData = WebpPipeline::process($_FILES['logo'], $uploadsDir, $newId);
            $upd = $db->prepare(
                'UPDATE sponzori SET logo_original=?, logo_small=?, logo_medium=?, logo_large=?, logo_is_vector=?, logo_width=?, logo_height=? WHERE id=?'
            );
            $upd->execute([$logoData['original'], $logoData['small'], $logoData['medium'], $logoData['large'], (int) $logoData['is_vector'], $logoData['width'], $logoData['height'], $newId]);
        } catch (LogoUploadError $e) {
            // Redak je već upisan (bez loga) — ne brišemo ga, samo javljamo grešku
            // da korisnik odmah doda logo kroz "Uredi".
            header('Location: /admin/index.php?msg=' . rawurlencode('Sponzor kreiran, ALI logo nije uspio: ' . $e->getMessage() . ' Dodajte ga kroz Uredi.'));
            exit;
        }

        header('Location: /admin/index.php?msg=' . rawurlencode('Sponzor kreiran.'));
        exit;
    }
}

$uploadsUrl = rtrim(hnkcms_config()['public_base_url'], '/') . '/uploads/sponzori';
$isEdit = $row !== null;
$v = fn(string $key, $default = '') => htmlspecialchars((string) ($_POST[$key] ?? $row[$key] ?? $default), ENT_QUOTES);
?>
<!doctype html>
<html lang="hr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>HNK CMS · <?= $isEdit ? 'Uredi sponzora' : 'Novi sponzor' ?></title>
<link rel="stylesheet" href="/admin/assets/admin.css">
</head>
<body class="admin-body">
<header class="admin-header">
  <h1>HNK Kroatien Schwyz · CMS</h1>
  <div class="admin-header-right">
    <span>Prijavljen: <?= htmlspecialchars($user['username'], ENT_QUOTES) ?></span>
    <a href="/admin/logout.php" class="btn btn-ghost">Odjava</a>
  </div>
</header>

<main class="admin-main admin-main--narrow">
  <p><a href="/admin/index.php">&larr; Natrag na listu</a></p>
  <h2><?= $isEdit ? 'Uredi sponzora' : 'Novi sponzor' ?></h2>

  <?php foreach ($errors as $err): ?>
    <p class="flash flash-error"><?= htmlspecialchars($err, ENT_QUOTES) ?></p>
  <?php endforeach; ?>

  <form method="post" enctype="multipart/form-data" class="admin-form">
    <?= hnkcms_csrf_field() ?>

    <label>Naziv *
      <input type="text" name="naziv" value="<?= $v('naziv') ?>" required>
    </label>

    <label>Logo <?= $isEdit ? '(ostaviti prazno da se zadrži postojeći)' : '*' ?>
      <input type="file" name="logo" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml">
    </label>
    <?php if ($isEdit && $row['logo_small']): ?>
      <div class="current-logo">
        <img src="<?= htmlspecialchars($uploadsUrl . '/' . $row['logo_small'], ENT_QUOTES) ?>" alt="">
        <span class="hint">Trenutni logo<?= $row['logo_is_vector'] ? ' (SVG)' : '' ?></span>
      </div>
    <?php endif; ?>

    <label>Web poveznica
      <input type="url" name="link" value="<?= $v('link') ?>" placeholder="https://...">
    </label>

    <label>Paket
      <select name="paket">
        <?php foreach (['Basic', 'Standard', 'Premium'] as $p): ?>
          <option value="<?= $p ?>" <?= ($_POST['paket'] ?? $row['paket'] ?? 'Basic') === $p ? 'selected' : '' ?>><?= $p ?></option>
        <?php endforeach; ?>
      </select>
    </label>

    <label>Opis paketa (HR)
      <textarea name="opis_paketa_hr" rows="3"><?= $v('opis_paketa_hr') ?></textarea>
    </label>
    <label>Opis paketa (DE)
      <textarea name="opis_paketa_de" rows="3"><?= $v('opis_paketa_de') ?></textarea>
    </label>

    <label>Redoslijed prikaza
      <input type="number" name="redoslijed" value="<?= $v('redoslijed', '100') ?>">
    </label>

    <label>Status
      <select name="status">
        <option value="veroeffentlicht" <?= ($_POST['status'] ?? $row['status'] ?? 'veroeffentlicht') === 'veroeffentlicht' ? 'selected' : '' ?>>Veröffentlicht (vidljivo na sajtu)</option>
        <option value="entwurf" <?= ($_POST['status'] ?? $row['status'] ?? '') === 'entwurf' ? 'selected' : '' ?>>Entwurf (skriveno, samo u adminu)</option>
      </select>
    </label>

    <button type="submit" class="btn btn-primary"><?= $isEdit ? 'Spremi izmjene' : 'Kreiraj sponzora' ?></button>
  </form>
</main>
</body>
</html>

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
    $stmt = $db->prepare('SELECT * FROM clan_uprave WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) {
        header('Location: /admin/uprava.php');
        exit;
    }
}

$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    hnkcms_verify_csrf();

    $ime = trim((string) ($_POST['ime'] ?? ''));
    $funkcijaHr = trim((string) ($_POST['funkcija_hr'] ?? ''));
    $funkcijaDe = trim((string) ($_POST['funkcija_de'] ?? ''));
    $zaduzenjeHr = trim((string) ($_POST['zaduzenje_hr'] ?? ''));
    $zaduzenjeDe = trim((string) ($_POST['zaduzenje_de'] ?? ''));
    $telefon = trim((string) ($_POST['telefon'] ?? ''));
    $redoslijed = (int) ($_POST['redoslijed'] ?? 100);
    $status = ($_POST['status'] ?? '') === 'entwurf' ? 'entwurf' : 'veroeffentlicht';

    if ($ime === '') {
        $errors[] = 'Ime i prezime su obavezni.';
    }
    if ($funkcijaHr === '') {
        $errors[] = 'Funkcija (HR) je obavezna.';
    }
    // Slika je NEOBAVEZNA (za razliku od sponzor loga) — frontend prikazuje
    // inicijale kad je nema, isto kao u Sanity shemi (image nema required()).

    $uploadsDir = __DIR__ . '/../uploads/clan-uprave';

    if (!$errors) {
        if ($row) {
            $slikaData = null;
            if (!empty($_FILES['slika']['name'])) {
                try {
                    $slikaData = WebpPipeline::process($_FILES['slika'], $uploadsDir, $row['id'], 'clan');
                } catch (LogoUploadError $e) {
                    $errors[] = $e->getMessage();
                }
            }
        }
    }

    if (!$errors) {
        if ($row) {
            $oldSlikaForCleanup = $slikaData ? $row : null;

            $sql = 'UPDATE clan_uprave SET ime=?, funkcija_hr=?, funkcija_de=?, zaduzenje_hr=?, zaduzenje_de=?, telefon=?, redoslijed=?, status=?';
            $params = [$ime, $funkcijaHr, $funkcijaDe ?: null, $zaduzenjeHr ?: null, $zaduzenjeDe ?: null, $telefon ?: null, $redoslijed, $status];
            if ($slikaData) {
                $sql .= ', slika_original=?, slika_small=?, slika_medium=?, slika_large=?, slika_is_vector=?, slika_width=?, slika_height=?';
                array_push($params, $slikaData['original'], $slikaData['small'], $slikaData['medium'], $slikaData['large'], (int) $slikaData['is_vector'], $slikaData['width'], $slikaData['height']);
            }
            $sql .= ' WHERE id=?';
            $params[] = $row['id'];

            $db->prepare($sql)->execute($params);

            if ($oldSlikaForCleanup) {
                WebpPipeline::delete($uploadsDir, $oldSlikaForCleanup, 'slika');
            }
            header('Location: /admin/uprava.php?msg=' . rawurlencode('Član ažuriran.'));
            exit;
        }

        // Novi član: prvo INSERT bez slike (treba mu ID za imenovanje datoteka
        // u WebpPipeline), pa tek onda upload (ako je poslan) i UPDATE.
        $stmt = $db->prepare(
            'INSERT INTO clan_uprave (ime, funkcija_hr, funkcija_de, zaduzenje_hr, zaduzenje_de, telefon, redoslijed, status) VALUES (?,?,?,?,?,?,?,?)'
        );
        $stmt->execute([$ime, $funkcijaHr, $funkcijaDe ?: null, $zaduzenjeHr ?: null, $zaduzenjeDe ?: null, $telefon ?: null, $redoslijed, $status]);
        $newId = (int) $db->lastInsertId();

        if (!empty($_FILES['slika']['name'])) {
            try {
                $slikaData = WebpPipeline::process($_FILES['slika'], $uploadsDir, $newId, 'clan');
                $upd = $db->prepare(
                    'UPDATE clan_uprave SET slika_original=?, slika_small=?, slika_medium=?, slika_large=?, slika_is_vector=?, slika_width=?, slika_height=? WHERE id=?'
                );
                $upd->execute([$slikaData['original'], $slikaData['small'], $slikaData['medium'], $slikaData['large'], (int) $slikaData['is_vector'], $slikaData['width'], $slikaData['height'], $newId]);
            } catch (LogoUploadError $e) {
                header('Location: /admin/uprava.php?msg=' . rawurlencode('Član kreiran, ALI slika nije uspjela: ' . $e->getMessage() . ' Dodajte je kroz Uredi.'));
                exit;
            }
        }

        header('Location: /admin/uprava.php?msg=' . rawurlencode('Član kreiran.'));
        exit;
    }
}

$uploadsUrl = rtrim(hnkcms_config()['public_base_url'], '/') . '/uploads/clan-uprave';
$isEdit = $row !== null;
$v = fn(string $key, $default = '') => htmlspecialchars((string) ($_POST[$key] ?? $row[$key] ?? $default), ENT_QUOTES);

hnkcms_admin_page_start($isEdit ? 'Uredi člana uprave' : 'Novi član uprave', 'uprava', $user, true);
?>
  <p><a href="/admin/uprava.php">&larr; Natrag na listu</a></p>
  <h2><?= $isEdit ? 'Uredi člana uprave' : 'Novi član uprave' ?></h2>

  <?php foreach ($errors as $err): ?>
    <p class="flash flash-error"><?= htmlspecialchars($err, ENT_QUOTES) ?></p>
  <?php endforeach; ?>

  <form method="post" enctype="multipart/form-data" class="admin-form">
    <?= hnkcms_csrf_field() ?>

    <label>Ime i prezime *
      <input type="text" name="ime" value="<?= $v('ime') ?>" required>
    </label>

    <label>Funkcija (HR) *
      <input type="text" name="funkcija_hr" value="<?= $v('funkcija_hr') ?>" required>
    </label>
    <label>Funkcija (DE)
      <input type="text" name="funkcija_de" value="<?= $v('funkcija_de') ?>">
    </label>

    <label>Zaduženje — jedan red (HR)
      <input type="text" name="zaduzenje_hr" value="<?= $v('zaduzenje_hr') ?>" placeholder="npr. Financije i članarine">
    </label>
    <label>Zaduženje — jedan red (DE)
      <input type="text" name="zaduzenje_de" value="<?= $v('zaduzenje_de') ?>">
    </label>

    <label>Telefon
      <input type="text" name="telefon" value="<?= $v('telefon') ?>" placeholder="+41 ...">
    </label>

    <label>Slika <?= $isEdit ? '(ostaviti prazno da se zadrži postojeća)' : '(neobavezno — bez slike prikazuju se inicijali)' ?>
      <input type="file" name="slika" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml">
    </label>
    <?php if ($isEdit && $row['slika_small']): ?>
      <div class="current-logo current-photo">
        <img src="<?= htmlspecialchars($uploadsUrl . '/' . $row['slika_small'], ENT_QUOTES) ?>" alt="">
        <span class="hint">Trenutna slika<?= $row['slika_is_vector'] ? ' (SVG)' : '' ?></span>
      </div>
    <?php endif; ?>

    <label>Redoslijed prikaza
      <input type="number" name="redoslijed" value="<?= $v('redoslijed', '100') ?>">
    </label>

    <label>Status
      <select name="status">
        <option value="veroeffentlicht" <?= ($_POST['status'] ?? $row['status'] ?? 'veroeffentlicht') === 'veroeffentlicht' ? 'selected' : '' ?>>Veröffentlicht (vidljivo na sajtu)</option>
        <option value="entwurf" <?= ($_POST['status'] ?? $row['status'] ?? '') === 'entwurf' ? 'selected' : '' ?>>Entwurf (skriveno, samo u adminu)</option>
      </select>
    </label>

    <button type="submit" class="btn btn-primary"><?= $isEdit ? 'Spremi izmjene' : 'Kreiraj člana' ?></button>
  </form>
<?php hnkcms_admin_page_end(); ?>

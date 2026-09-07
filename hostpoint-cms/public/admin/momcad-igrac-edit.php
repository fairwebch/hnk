<?php
declare(strict_types=1);
require __DIR__ . '/includes/db.php';
require __DIR__ . '/includes/auth.php';
require __DIR__ . '/includes/webp.php';
require __DIR__ . '/includes/layout.php';

$user = hnkcms_require_login();
$db = hnkcms_db();

$momcadId = isset($_GET['momcad']) && ctype_digit((string) $_GET['momcad']) ? (int) $_GET['momcad'] : 0;
$teamStmt = $db->prepare('SELECT id, naziv_hr FROM momcadi WHERE id = ?');
$teamStmt->execute([$momcadId]);
$team = $teamStmt->fetch();
if (!$team) {
    header('Location: /admin/momcadi.php');
    exit;
}
$back = '/admin/momcad-sastav.php?momcad=' . $momcadId;

$id = isset($_GET['id']) && ctype_digit((string) $_GET['id']) ? (int) $_GET['id'] : null;
$row = null;
if ($id !== null) {
    $stmt = $db->prepare('SELECT * FROM momcad_igraci WHERE id = ? AND momcad_id = ?');
    $stmt->execute([$id, $momcadId]);
    $row = $stmt->fetch();
    if (!$row) {
        header('Location: ' . $back);
        exit;
    }
}

$pozicije = ['golman' => 'Golman', 'obrana' => 'Obrana', 'vezni' => 'Vezni red', 'napad' => 'Napad'];
$uploadsDir = __DIR__ . '/../uploads/momcadi';
$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    hnkcms_verify_csrf();

    $ime = trim((string) ($_POST['ime'] ?? ''));
    $prezime = trim((string) ($_POST['prezime'] ?? ''));
    $brojRaw = trim((string) ($_POST['broj'] ?? ''));
    $broj = $brojRaw === '' ? null : (int) $brojRaw;
    $pozicija = (string) ($_POST['pozicija'] ?? '');
    $pozicija = isset($pozicije[$pozicija]) ? $pozicija : null;
    $redoslijed = (int) ($_POST['redoslijed'] ?? 100);

    if ($ime === '') {
        $errors[] = 'Ime je obavezno.';
    }
    if ($brojRaw !== '' && (!ctype_digit($brojRaw) || $broj > 999)) {
        $errors[] = 'Broj dresa mora biti cijeli broj 0–999.';
    }

    $slikaData = null;
    $removeSlika = false;
    if (!$errors && $row) {
        if (!empty($_FILES['slika']['name'])) {
            try {
                $slikaData = WebpPipeline::process($_FILES['slika'], $uploadsDir, (int) $row['id'], 'igrac');
            } catch (LogoUploadError $e) {
                $errors[] = $e->getMessage();
            }
        } elseif (!empty($_POST['ukloni_slika']) && $row['slika_small']) {
            $removeSlika = true;
        }
    }

    if (!$errors) {
        $base = [$ime, $prezime ?: null, $broj, $pozicija, $redoslijed];
        if ($row) {
            $sql = 'UPDATE momcad_igraci SET ime=?, prezime=?, broj=?, pozicija=?, redoslijed=?';
            $params = $base;
            if ($slikaData || $removeSlika) {
                $sql .= ', slika_original=?, slika_small=?, slika_medium=?, slika_large=?, slika_is_vector=?, slika_width=?, slika_height=?';
                array_push($params,
                    $slikaData['original'] ?? null, $slikaData['small'] ?? null, $slikaData['medium'] ?? null, $slikaData['large'] ?? null,
                    $slikaData ? (int) $slikaData['is_vector'] : 0, $slikaData['width'] ?? null, $slikaData['height'] ?? null);
            }
            $sql .= ' WHERE id=?';
            $params[] = $row['id'];
            $db->prepare($sql)->execute($params);
            if ($slikaData || $removeSlika) {
                WebpPipeline::delete($uploadsDir, $row, 'slika');
            }
            header('Location: ' . $back . '&msg=' . rawurlencode('Igrač ažuriran.'));
            exit;
        }

        $db->prepare('INSERT INTO momcad_igraci (momcad_id, ime, prezime, broj, pozicija, redoslijed) VALUES (?,?,?,?,?,?)')
            ->execute([$momcadId, ...$base]);
        $newId = (int) $db->lastInsertId();

        if (!empty($_FILES['slika']['name'])) {
            try {
                $d = WebpPipeline::process($_FILES['slika'], $uploadsDir, $newId, 'igrac');
                $db->prepare('UPDATE momcad_igraci SET slika_original=?, slika_small=?, slika_medium=?, slika_large=?, slika_is_vector=?, slika_width=?, slika_height=? WHERE id=?')
                    ->execute([$d['original'], $d['small'], $d['medium'], $d['large'], (int) $d['is_vector'], $d['width'], $d['height'], $newId]);
            } catch (LogoUploadError $e) {
                header('Location: ' . $back . '&msg=' . rawurlencode('Igrač kreiran, ALI slika nije uspjela: ' . $e->getMessage() . ' Dodajte je kroz Uredi.'));
                exit;
            }
        }
        header('Location: ' . $back . '&msg=' . rawurlencode('Igrač kreiran.'));
        exit;
    }
}

$uploadsUrl = rtrim(hnkcms_config()['public_base_url'], '/') . '/uploads/momcadi';
$isEdit = $row !== null;
$v = fn(string $key, $default = '') => htmlspecialchars((string) ($_POST[$key] ?? $row[$key] ?? $default), ENT_QUOTES);
$selPoz = (string) ($_POST['pozicija'] ?? $row['pozicija'] ?? '');

hnkcms_admin_page_start(($isEdit ? 'Uredi igrača' : 'Novi igrač') . ' · ' . $team['naziv_hr'], 'momcadi', $user, true);
?>
  <p><a href="<?= $back ?>">&larr; Natrag na sastav</a></p>
  <h2><?= $isEdit ? 'Uredi igrača' : 'Novi igrač' ?> <span class="hint" style="display:inline;font-weight:400">— <?= htmlspecialchars($team['naziv_hr'], ENT_QUOTES) ?></span></h2>

  <?php foreach ($errors as $err): ?>
    <p class="flash flash-error"><?= htmlspecialchars($err, ENT_QUOTES) ?></p>
  <?php endforeach; ?>

  <form method="post" enctype="multipart/form-data" class="admin-form">
    <?= hnkcms_csrf_field() ?>

    <label>Ime *
      <input type="text" name="ime" value="<?= $v('ime') ?>" required>
    </label>
    <label>Prezime (opciono)
      <input type="text" name="prezime" value="<?= $v('prezime') ?>">
    </label>
    <label>Broj dresa (opciono)
      <input type="number" name="broj" min="0" max="999" value="<?= $v('broj') ?>">
    </label>
    <label>Pozicija (opciono)
      <select name="pozicija">
        <option value="" <?= $selPoz === '' ? 'selected' : '' ?>>— bez pozicije —</option>
        <?php foreach ($pozicije as $val => $label): ?>
          <option value="<?= $val ?>" <?= $selPoz === $val ? 'selected' : '' ?>><?= $label ?></option>
        <?php endforeach; ?>
      </select>
    </label>

    <label>Slika (opciono) <?= $isEdit && $row['slika_small'] ? '(ostaviti prazno da se zadrži postojeća)' : '' ?>
      <input type="file" name="slika" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml">
    </label>
    <?php if ($isEdit && $row['slika_small']): ?>
      <div class="current-logo current-photo">
        <img src="<?= htmlspecialchars($uploadsUrl . '/' . $row['slika_small'], ENT_QUOTES) ?>" alt="">
        <span class="hint">Trenutna slika</span>
      </div>
      <label class="checkbox-inline"><input type="checkbox" name="ukloni_slika" value="1"> Ukloni sliku</label>
    <?php endif; ?>

    <label>Redoslijed prikaza (unutar pozicije)
      <input type="number" name="redoslijed" value="<?= $v('redoslijed', '100') ?>">
    </label>

    <button type="submit" class="btn btn-primary"><?= $isEdit ? 'Spremi izmjene' : 'Dodaj igrača' ?></button>
  </form>
<?php hnkcms_admin_page_end(); ?>

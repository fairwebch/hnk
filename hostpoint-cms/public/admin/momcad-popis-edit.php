<?php
declare(strict_types=1);
require __DIR__ . '/includes/db.php';
require __DIR__ . '/includes/auth.php';
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
    $stmt = $db->prepare('SELECT * FROM momcad_popis_imena WHERE id = ? AND momcad_id = ?');
    $stmt->execute([$id, $momcadId]);
    $row = $stmt->fetch();
    if (!$row) {
        header('Location: ' . $back);
        exit;
    }
}

$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    hnkcms_verify_csrf();

    $oznakaHr = trim((string) ($_POST['oznaka_hr'] ?? ''));
    $oznakaDe = trim((string) ($_POST['oznaka_de'] ?? ''));
    $imena = trim((string) ($_POST['imena'] ?? ''));
    $redoslijed = (int) ($_POST['redoslijed'] ?? 100);

    if ($imena === '') {
        $errors[] = 'Imena su obavezna (odvojena zarezom).';
    }

    if (!$errors) {
        $params = [$oznakaHr ?: null, $oznakaDe ?: null, $imena, $redoslijed];
        if ($row) {
            $db->prepare('UPDATE momcad_popis_imena SET oznaka_hr=?, oznaka_de=?, imena=?, redoslijed=? WHERE id=?')
                ->execute([...$params, $row['id']]);
            header('Location: ' . $back . '&msg=' . rawurlencode('Red imena ažuriran.'));
            exit;
        }
        $db->prepare('INSERT INTO momcad_popis_imena (momcad_id, oznaka_hr, oznaka_de, imena, redoslijed) VALUES (?,?,?,?,?)')
            ->execute([$momcadId, ...$params]);
        header('Location: ' . $back . '&msg=' . rawurlencode('Red imena dodan.'));
        exit;
    }
}

$isEdit = $row !== null;
$v = fn(string $key, $default = '') => htmlspecialchars((string) ($_POST[$key] ?? $row[$key] ?? $default), ENT_QUOTES);

hnkcms_admin_page_start(($isEdit ? 'Uredi red imena' : 'Novi red imena') . ' · ' . $team['naziv_hr'], 'momcadi', $user, true);
?>
  <p><a href="<?= $back ?>">&larr; Natrag na sastav</a></p>
  <h2><?= $isEdit ? 'Uredi red imena' : 'Novi red imena' ?> <span class="hint" style="display:inline;font-weight:400">— <?= htmlspecialchars($team['naziv_hr'], ENT_QUOTES) ?></span></h2>

  <?php foreach ($errors as $err): ?>
    <p class="flash flash-error"><?= htmlspecialchars($err, ENT_QUOTES) ?></p>
  <?php endforeach; ?>

  <form method="post" class="admin-form">
    <?= hnkcms_csrf_field() ?>

    <label>Oznaka reda (HR)
      <input type="text" name="oznaka_hr" value="<?= $v('oznaka_hr') ?>" placeholder="npr. Gornji red s lijeva na desno">
    </label>
    <label>Oznaka reda (DE)
      <input type="text" name="oznaka_de" value="<?= $v('oznaka_de') ?>" placeholder="npr. Obere Reihe von links nach rechts">
    </label>
    <label>Imena (odvojena zarezom) *
      <textarea name="imena" rows="3" required><?= $v('imena') ?></textarea>
    </label>
    <p class="hint">Zvjezdica (*) za osobu čije ime nije poznato — prikazuje se na sajtu, ali se ne broji u ukupan broj igrača.</p>
    <label>Redoslijed prikaza
      <input type="number" name="redoslijed" value="<?= $v('redoslijed', '100') ?>">
    </label>

    <button type="submit" class="btn btn-primary"><?= $isEdit ? 'Spremi izmjene' : 'Dodaj red' ?></button>
  </form>
<?php hnkcms_admin_page_end(); ?>

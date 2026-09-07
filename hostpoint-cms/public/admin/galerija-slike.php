<?php
/**
 * Slike jedne galerije: grid (thumb 600x600), uređivanje alt/redoslijeda,
 * brisanje, i višestruki upload (do max_file_uploads — 100 preko .user.ini
 * u document-rootu ove poddomene). Cover na sajtu = prva slika po redoslijedu.
 */
declare(strict_types=1);
require __DIR__ . '/includes/db.php';
require __DIR__ . '/includes/auth.php';
require __DIR__ . '/includes/layout.php';

$user = hnkcms_require_login();
$db = hnkcms_db();

$galId = isset($_GET['galerija']) && ctype_digit((string) $_GET['galerija']) ? (int) $_GET['galerija'] : 0;
$stmt = $db->prepare('SELECT * FROM galerije WHERE id = ?');
$stmt->execute([$galId]);
$gal = $stmt->fetch();
if (!$gal) {
    header('Location: /admin/galerije.php');
    exit;
}

$slike = $db->prepare('SELECT * FROM galerija_slike WHERE galerija_id = ? ORDER BY redoslijed ASC, id ASC');
$slike->execute([$galId]);
$slike = $slike->fetchAll();

$uploadsUrl = rtrim(hnkcms_config()['public_base_url'], '/') . '/uploads/galerije';
$maxFiles = (int) ini_get('max_file_uploads');
$maxSize = ini_get('upload_max_filesize');

hnkcms_admin_page_start('Slike · ' . $gal['naziv_hr'], 'galerije', $user);
?>
  <p><a href="/admin/galerije.php">&larr; Natrag na galerije</a> &middot; <a href="/admin/galerija-edit.php?id=<?= $galId ?>">Uredi podatke galerije</a></p>
  <div class="admin-toolbar">
    <h2><?= htmlspecialchars($gal['naziv_hr'], ENT_QUOTES) ?> <span class="hint" style="display:inline;font-weight:400">— <?= count($slike) ?> slika, <?= (int) $gal['godina'] ?></span></h2>
  </div>

  <?php hnkcms_flash(); ?>

  <form method="post" action="/admin/galerija-slike-upload.php" enctype="multipart/form-data" class="admin-form admin-inline-form">
    <?= hnkcms_csrf_field() ?>
    <input type="hidden" name="galerija" value="<?= $galId ?>">
    <label>Dodaj slike (može više odjednom — najviše <?= $maxFiles ?> po uploadu, <?= htmlspecialchars($maxSize, ENT_QUOTES) ?> ukupno)
      <input type="file" name="slike[]" accept="image/png,image/jpeg,image/webp,image/gif" multiple required>
    </label>
    <button type="submit" class="btn btn-primary">Upload</button>
  </form>
  <p class="hint">Nove slike idu na kraj. Redoslijed i alt tekst se uređuju po slici; prva slika po redoslijedu je cover na sajtu.</p>

  <?php if ($slike): ?>
    <div class="admin-gallery admin-gallery--square">
      <?php foreach ($slike as $s): ?>
        <figure>
          <img src="<?= htmlspecialchars($uploadsUrl . '/' . ($s['slika_thumb'] ?: $s['slika_small']), ENT_QUOTES) ?>" alt="<?= htmlspecialchars((string) $s['alt'], ENT_QUOTES) ?>" loading="lazy">
          <figcaption>
            <span title="<?= htmlspecialchars((string) $s['alt'], ENT_QUOTES) ?>">#<?= (int) $s['redoslijed'] ?><?= $s['alt'] ? ' · ' . htmlspecialchars(mb_strimwidth($s['alt'], 0, 18, '…'), ENT_QUOTES) : '' ?></span>
            <span class="admin-row-actions">
              <a href="/admin/galerija-slika-edit.php?id=<?= (int) $s['id'] ?>">Uredi</a>
              <form method="post" action="/admin/galerija-slika-delete.php" onsubmit="return confirm('Obrisati ovu sliku?');">
                <?= hnkcms_csrf_field() ?>
                <input type="hidden" name="id" value="<?= (int) $s['id'] ?>">
                <button type="submit" class="link-danger">Obriši</button>
              </form>
            </span>
          </figcaption>
        </figure>
      <?php endforeach; ?>
    </div>
  <?php else: ?>
    <p class="hint">Galerija još nema slika.</p>
  <?php endif; ?>
<?php hnkcms_admin_page_end(); ?>

<?php
/**
 * Klub — naša priča (/klub): uvod + završni tekst (Markdown, HR/DE) i lista
 * timeline stavki. Singleton klub_stranica id=1 (kreira se pri prvom spremanju).
 */
declare(strict_types=1);
require __DIR__ . '/includes/db.php';
require __DIR__ . '/includes/auth.php';
require __DIR__ . '/includes/layout.php';

$user = hnkcms_require_login();
$db = hnkcms_db();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    hnkcms_verify_csrf();
    $f = fn(string $k) => trim(str_replace("\r\n", "\n", (string) ($_POST[$k] ?? ''))) ?: null;
    $db->prepare('INSERT INTO klub_stranica (id, uvod_hr, uvod_de, zavrsni_hr, zavrsni_de) VALUES (1, ?, ?, ?, ?)
                  ON DUPLICATE KEY UPDATE uvod_hr=VALUES(uvod_hr), uvod_de=VALUES(uvod_de), zavrsni_hr=VALUES(zavrsni_hr), zavrsni_de=VALUES(zavrsni_de)')
        ->execute([$f('uvod_hr'), $f('uvod_de'), $f('zavrsni_hr'), $f('zavrsni_de')]);
    header('Location: /admin/klub.php?msg=' . rawurlencode('Tekstovi spremljeni.'));
    exit;
}

$s = $db->query('SELECT * FROM klub_stranica WHERE id = 1')->fetch() ?: [];
$timeline = $db->query('SELECT * FROM klub_timeline ORDER BY godina ASC, redoslijed ASC, id ASC')->fetchAll();
$v = fn(string $k) => htmlspecialchars((string) ($s[$k] ?? ''), ENT_QUOTES);

hnkcms_admin_page_start('Klub — naša priča', 'klub', $user);
?>
  <div class="admin-toolbar">
    <h2>Klub — naša priča</h2>
    <a href="/admin/klub-stavka-edit.php" class="btn btn-primary">+ Nova stavka timelinea</a>
  </div>
  <?php hnkcms_flash(); ?>

  <h3>Timeline</h3>
  <table class="admin-table">
    <thead><tr><th>Godina</th><th>Naslov (HR)</th><th>Naslov (DE)</th><th>Slika</th><th>Redoslijed</th><th></th></tr></thead>
    <tbody>
      <?php if (!$timeline): ?><tr><td colspan="6" class="empty">Još nema stavki.</td></tr><?php endif; ?>
      <?php foreach ($timeline as $t): ?>
        <tr>
          <td><strong><?= htmlspecialchars($t['godina_labela_hr'] ?: (string) $t['godina'], ENT_QUOTES) ?></strong><?= $t['godina_labela_hr'] ? ' <span class="hint" style="display:inline">(' . (int) $t['godina'] . ')</span>' : '' ?></td>
          <td><?= htmlspecialchars($t['naslov_hr'], ENT_QUOTES) ?></td>
          <td><?= htmlspecialchars((string) $t['naslov_de'], ENT_QUOTES) ?></td>
          <td><?= $t['slika_small'] ? 'da' : '—' ?></td>
          <td><?= (int) $t['redoslijed'] ?></td>
          <td class="admin-row-actions">
            <a href="/admin/klub-stavka-edit.php?id=<?= (int) $t['id'] ?>">Uredi</a>
            <form method="post" action="/admin/klub-stavka-delete.php" onsubmit="return confirm('Obrisati stavku?');">
              <?= hnkcms_csrf_field() ?>
              <input type="hidden" name="id" value="<?= (int) $t['id'] ?>">
              <button type="submit" class="link-danger">Obriši</button>
            </form>
          </td>
        </tr>
      <?php endforeach; ?>
    </tbody>
  </table>

  <h3 style="margin-top:2rem">Tekstovi</h3>
  <form method="post" class="admin-form">
    <?= hnkcms_csrf_field() ?>
    <label>Uvodni tekst (HR) — Markdown
      <textarea name="uvod_hr" rows="5" class="admin-textarea-mono"><?= $v('uvod_hr') ?></textarea>
    </label>
    <label>Uvodni tekst (DE) — Markdown
      <textarea name="uvod_de" rows="5" class="admin-textarea-mono"><?= $v('uvod_de') ?></textarea>
    </label>
    <label>Završni tekst (HR) — Markdown, neobavezno
      <textarea name="zavrsni_hr" rows="5" class="admin-textarea-mono"><?= $v('zavrsni_hr') ?></textarea>
    </label>
    <label>Završni tekst (DE) — Markdown, neobavezno
      <textarea name="zavrsni_de" rows="5" class="admin-textarea-mono"><?= $v('zavrsni_de') ?></textarea>
    </label>
    <p class="hint">Isti Markdown kao kod stranica: prazan red = novi odlomak, **podebljano**, *kurziv*, [link](https://…), ## podnaslov. DE prazno = na sajtu se prikazuje HR.</p>
    <button type="submit" class="btn btn-primary">Spremi tekstove</button>
  </form>
<?php hnkcms_admin_page_end(); ?>

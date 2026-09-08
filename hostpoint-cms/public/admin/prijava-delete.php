<?php
declare(strict_types=1);
require __DIR__ . '/includes/db.php';
require __DIR__ . '/includes/db-prijave.php';
require __DIR__ . '/includes/auth.php';

hnkcms_require_login();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: /admin/prijave.php');
    exit;
}
hnkcms_verify_csrf();

$id = (int) ($_POST['id'] ?? 0);
$dogadjaj = (int) ($_POST['dogadjaj'] ?? 0);
// Hard delete — pravo na brisanje na zahtjev; nema soft flaga, nema kopije.
hnkcms_db_prijave()->prepare('DELETE FROM prijave WHERE id = ?')->execute([$id]);
header('Location: /admin/prijave-dogadjaj.php?dogadjaj=' . $dogadjaj . '&msg=' . rawurlencode('Prijava trajno obrisana.'));

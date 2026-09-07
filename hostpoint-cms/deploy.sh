#!/usr/bin/env bash
# deploy.sh – HNK sponzori CMS (PHP/MySQL): rsync preko SSH na Hostpoint
#
# Upotreba:
#   ./deploy.sh staging              # -> api-staging.kroatien-schwyz.ch
#   ./deploy.sh staging --dry-run    # samo prikaz, ništa se ne šalje
#
# Pravila:
#   - Prije svakog deploya commit (skripta prekida ako ima uncommitted
#     promjena u hostpoint-cms/)
#   - NIKAD --delete — ništa se automatski ne briše na serveru
#   - Šalje se SAMO public/ -> document root ove poddomene. config/config.php
#     (produkcijska DB lozinka) je van public/, na serveru jedan nivo iznad
#     document-roota (www/config/config.php) — ovaj skript ga ne dira i ne zna
#     za njega.
#   - Isti Hostpoint nalog (hidapifa) hostuje i druge, nepovezane sajtove:
#     WordPress na www/hidapifa.myhostpoint.ch (kroatien-schwyz.ch) i
#     balkandj/tvojdj na www/tvojdj.ch. REMOTE_DIR ispod je JEDINO mjesto
#     koje ova skripta smije dirati — ne mijenjaj ga bez razloga.
#   - Stvarni upload-ovani logotipi sponzora žive samo na serveru
#     (public/uploads/sponzori/*, generira ih admin panel) i nisu u gitu
#     (vidi .gitignore) — lokalni public/ ih zato nikad ne sadrži, pa ih
#     obično rsync (bez --delete) ne može ni pregaziti ni obrisati.

set -euo pipefail

SSH_HOST="sl60.web.hostpoint.ch"
SSH_USER="hidapifa"
SSH_PORT="22"

usage() { echo "Upotreba: $0 {staging} [--dry-run]" >&2; exit 1; }

TARGET=""
DRY_RUN=""
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN="--dry-run" ;;
    staging)   TARGET="$arg" ;;
    *)         usage ;;
  esac
done

case "$TARGET" in
  staging) REMOTE_DIR="www/api-staging.kroatien-schwyz.ch/" ;;
  *)       usage ;;
esac

# Uvijek iz foldera ovog skripta (hostpoint-cms/)
cd "$(dirname "${BASH_SOURCE[0]}")"

# --- Git-provjera: bez deploya s uncommitted promjenama -------------------
if [[ -z "$DRY_RUN" ]]; then
  if [[ -n "$(git status --porcelain -- .)" ]]; then
    echo "PREKID: uncommitted promjene u hostpoint-cms/. Prvo 'git commit'." >&2
    git status --short -- . >&2
    exit 1
  fi
fi

# --- Isključeno iz sync-a ----------------------------------------------------
EXCLUDES=(
  --exclude='.DS_Store'
  --exclude='._*'
  --exclude='Thumbs.db'
  --exclude='*.swp'
)

echo "Deploy: $(git rev-parse --short HEAD) ($(git log -1 --pretty=%s))"
echo "  -> ${SSH_USER}@${SSH_HOST}:${REMOTE_DIR} ${DRY_RUN:+[DRY-RUN]}"
echo

# KEIN --delete: ništa se na serveru ne briše.
rsync -rlptvz --human-readable --itemize-changes \
  $DRY_RUN \
  -e "ssh -p ${SSH_PORT}" \
  "${EXCLUDES[@]}" \
  public/ "${SSH_USER}@${SSH_HOST}:${REMOTE_DIR}"

echo
echo "Gotovo: $TARGET ${DRY_RUN:+(dry-run, ništa nije preneseno)}"

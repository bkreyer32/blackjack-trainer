#!/usr/bin/env bash
# One-shot deploy to GitHub Pages. Requires `gh auth login` to have been completed on this box.
# Usage: scripts/deploy-gh-pages.sh [repo-name]   (default: blackjack-trainer)
set -euo pipefail
cd "$(dirname "$0")/.."
REPO="${1:-blackjack-trainer}"

gh auth status >/dev/null 2>&1 || { echo "gh is not authenticated. Run: gh auth login --hostname github.com --git-protocol https --web"; exit 1; }
gh auth setup-git
LOGIN="$(gh api user -q .login)"
ID="$(gh api user -q .id)"
NAME="$(gh api user -q '.name // .login')"
EMAIL="${ID}+${LOGIN}@users.noreply.github.com"

npm test
npm run build
touch dist/.nojekyll

# Source repo (main)
if [ ! -d .git ]; then git init -q -b main; fi
git config user.name "$NAME"; git config user.email "$EMAIL"
git add -A
git commit -qm "Blackjack trainer v1" || true
if gh repo view "$LOGIN/$REPO" >/dev/null 2>&1; then
  git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$LOGIN/$REPO.git"
  git push -u origin main
else
  gh repo create "$REPO" --public --description "Personal blackjack basic-strategy trainer (PWA)" --source=. --remote=origin --push
fi

# Built site (gh-pages branch, rebuilt from scratch each deploy)
TMP="$(mktemp -d)"
cp -r dist/. "$TMP"
( cd "$TMP" && git init -q -b gh-pages && git config user.name "$NAME" && git config user.email "$EMAIL" \
  && git add -A && git commit -qm "Deploy $(date -u +%FT%TZ)" \
  && git push -f "https://github.com/$LOGIN/$REPO.git" gh-pages )
rm -rf "$TMP"

# Enable Pages from gh-pages (create, or update if it already exists)
gh api -X POST "repos/$LOGIN/$REPO/pages" -f "source[branch]=gh-pages" -f "source[path]=/" >/dev/null 2>&1 \
  || gh api -X PUT "repos/$LOGIN/$REPO/pages" -f "source[branch]=gh-pages" -f "source[path]=/" >/dev/null 2>&1 || true

URL="https://$LOGIN.github.io/$REPO/"
echo "Waiting for Pages to serve $URL ..."
for i in $(seq 1 60); do
  code="$(curl -s -o /dev/null -w '%{http_code}' "$URL" || true)"
  [ "$code" = "200" ] && { echo "LIVE: $URL"; exit 0; }
  sleep 5
done
echo "Pushed, but Pages not serving yet (last HTTP $code). Check: gh api repos/$LOGIN/$REPO/pages/builds/latest"

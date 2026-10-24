#!/usr/bin/env bash
# Moves the CI workflows from ci/github-workflows/ into .github/workflows/ and pushes them.
# Needs a GitHub login that has the `workflow` scope. One-time:  gh auth refresh -h github.com -s workflow
set -euo pipefail
cd "$(dirname "$0")/.."
gh auth status 2>&1 | grep -q "workflow" || { echo "Your gh login lacks the 'workflow' scope. Run: gh auth refresh -h github.com -s workflow"; exit 1; }
mkdir -p .github/workflows
git mv ci/github-workflows/*.yml .github/workflows/
git commit -qm "Enable CI workflows" && git push origin main
echo "Pushed. Open the Actions tab; 'iOS simulator build (unsigned)' runs on every push to main."

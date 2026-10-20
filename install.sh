#!/usr/bin/env bash
# Install the promo-video skill for Claude Code.
#   ./install.sh            user-level: ~/.claude/skills/promo-video (all projects)
#   ./install.sh <project>  project-level: <project>/.claude/skills/promo-video
# The skill is symlinked, so editing this repo updates the installed skill.
set -euo pipefail

REPO="$(cd "$(dirname "$0")" && pwd)"
SKILL="$REPO/promo-video"

if [[ $# -ge 1 ]]; then DEST="$(cd "$1" && pwd)/.claude/skills"; else DEST="$HOME/.claude/skills"; fi

echo "==> Installing script dependencies (Playwright + Chromium)…"
(cd "$SKILL" && npm install --no-audit --no-fund)

echo "==> Linking skill into $DEST"
mkdir -p "$DEST"
if [[ -e "$DEST/promo-video" && ! -L "$DEST/promo-video" ]]; then
  echo "    $DEST/promo-video exists and is not a symlink; leaving it alone." >&2
  exit 1
fi
ln -sfn "$SKILL" "$DEST/promo-video"

echo "==> Checking your system"
node "$SKILL/scripts/doctor.mjs" || true

cat <<MSG

Done. Restart Claude Code (or start a new session) so it picks up the skill, then in any
web app or game project ask something like:

  "Make a 30-second promo video for this app"

Optional extra:
  npx skills add remotion-dev/skills  # Remotion's official agent skills
MSG

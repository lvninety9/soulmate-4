#!/usr/bin/env bash
# Turnkey bootstrap for a new project using this harness. Ported from soulmate-3's bootstrap.sh —
# same rationale (a single mechanical command is much harder to skip than a multi-step prose
# checklist), same self-contained design (clones itself to scratch if not already running from a
# real checkout, so there's no separate "clone it first" step for an agent to stop after).
#
# Usage — works standalone, no pre-existing checkout needed:
#   curl -fsSL https://raw.githubusercontent.com/lvninety9/soulmate-4/master/scripts/bootstrap.sh \
#     | bash -s -- <target-directory>
# Also works from an existing checkout (skips the internal clone, uses that checkout directly):
#   scripts/bootstrap.sh <target-directory>

set -euo pipefail

SEED_URL="${SOULMATE4_SEED_URL:-https://github.com/lvninety9/soulmate-4}"
TARGET="${1:?Usage: bootstrap.sh <target-directory> (or curl ... | bash -s -- <target-directory>)}"

SELF_DIR=""
if [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "${BASH_SOURCE[0]}" ]; then
  CANDIDATE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  if [ -f "$CANDIDATE/templates/AGENTS.md.template" ]; then
    SELF_DIR="$CANDIDATE"
  fi
fi

SCRATCH=""
if [ -z "$SELF_DIR" ]; then
  SCRATCH="$(mktemp -d)"
  git clone --quiet "$SEED_URL" "$SCRATCH"
  SELF_DIR="$SCRATCH"
fi
cleanup_scratch() { [ -n "$SCRATCH" ] && rm -rf "$SCRATCH"; return 0; }
trap cleanup_scratch EXIT

mkdir -p "$TARGET"
TARGET="$(cd "$TARGET" && pwd)"

# Mirrors soulmate-3's own tripwire: refuse a target literally named after the seed repo, the
# most likely sign of accidental nesting (an agent's instinct to name a clone after the repo).
if [ "$(basename "$TARGET")" = "soulmate-4" ] && [ -z "${SOULMATE4_ALLOW_NAMED_SUBDIR:-}" ]; then
  echo "Refusing: target directory is literally named 'soulmate-4' ('$TARGET')." >&2
  echo "This is almost always accidental nesting, not an intentional name. If you really mean" >&2
  echo "it, rerun with SOULMATE4_ALLOW_NAMED_SUBDIR=1 set." >&2
  exit 1
fi

if [ -d "$TARGET/.git" ]; then
  echo "Target '$TARGET' already has its own .git — refusing to bootstrap an already-bootstrapped directory." >&2
  exit 1
fi

mkdir -p "$TARGET/.kilo/plugins" "$TARGET/wiki/handoffs" "$TARGET/wiki/protocols"
cp "$SELF_DIR/.kilo/plugins/subtask-gate.ts" "$TARGET/.kilo/plugins/subtask-gate.ts"
cp -r "$SELF_DIR/scripts" "$TARGET/"
# round 6: the plugin's own test file, so a fresh project inherits a real, deterministic
# regression check for the exact plugin file it just got — not just prose claims about it.
if [ -f "$SELF_DIR/tests/subtask-gate.test.mjs" ]; then
  mkdir -p "$TARGET/tests"
  cp "$SELF_DIR/tests/subtask-gate.test.mjs" "$TARGET/tests/"
fi
cp "$SELF_DIR/wiki/protocols/"*.md "$TARGET/wiki/protocols/"
cp "$SELF_DIR/templates/AGENTS.md.template" "$TARGET/AGENTS.md"
cp "$SELF_DIR/templates/PROJECT_BACKGROUND.md.template" "$TARGET/wiki/PROJECT_BACKGROUND.md"
cp "$SELF_DIR/templates/SESSION_PRIMER.md.template" "$TARGET/wiki/handoffs/SESSION_PRIMER.md"
cp "$SELF_DIR/templates/FEEDBACK_PENDING.md.template" "$TARGET/wiki/handoffs/FEEDBACK_PENDING.md"
: > "$TARGET/wiki/session-log.md"
: > "$TARGET/wiki/rule-archive.md"
chmod +x "$TARGET/scripts/check-caps.sh" "$TARGET/scripts/pre-commit-check-caps"

# Verification templates (harness-integration-test.md / cold-read-test-prompt.md) also need to
# exist inside the target, not just the seed clone — the seed clone gets deleted right after this
# script returns (see the README's own bootstrap one-liner), so anything only in $SELF_DIR is
# gone the moment bootstrap finishes.
mkdir -p "$TARGET/templates"
cp "$SELF_DIR/templates/harness-integration-test.md" "$SELF_DIR/templates/cold-read-test-prompt.md" \
  "$SELF_DIR/templates/SUBSYSTEM-learnings.md.template" "$TARGET/templates/"

# A baseline .gitignore covering common Python/Node/editor noise, same rationale as soulmate-3
# (a real test there committed __pycache__/build artifacts because nothing excluded them), plus
# the sub-task gate's own runtime state file (persisted to disk on purpose — see
# .kilo/plugins/subtask-gate.ts — but it's per-machine session state, not project content).
cat > "$TARGET/.gitignore" <<'GITIGNORE'
__pycache__/
*.pyc
.pytest_cache/
*.egg-info/
node_modules/
.venv/
venv/
.DS_Store
.kilo/plugins/.subtask-gate-state.json
GITIGNORE

# .kilo/ itself must NOT be gitignored — subtask-gate.ts lives there and needs to be tracked.
# Only Kilo's own transient state (session cache, its local node_modules) should be excluded,
# and Kilo writes that .gitignore itself the first time it runs in this directory.

# Strip the template's instructional HTML-comment blocks mechanically — left in place, they push
# AGENTS.md past its own cap, which blocks the very commit below.
for f in "$TARGET/AGENTS.md" "$TARGET/wiki/PROJECT_BACKGROUND.md" \
         "$TARGET/wiki/handoffs/SESSION_PRIMER.md" "$TARGET/wiki/handoffs/FEEDBACK_PENDING.md"; do
  awk '/<!--/{c=1} !c{print} /-->/{c=0}' "$f" > "$f.tmp" && mv "$f.tmp" "$f"
done

case "$SELF_DIR" in
  "$TARGET"/*) rm -rf "$SELF_DIR" ;;
esac

(
  cd "$TARGET"
  git init --quiet
  mkdir -p .git/hooks
  cp scripts/pre-commit-check-caps .git/hooks/pre-commit
  chmod +x .git/hooks/pre-commit
  if ! git config user.email >/dev/null 2>&1; then
    git config user.email "agent@localhost"
    git config user.name "soulmate-4-bootstrap"
  fi
  git add -A
  git commit --quiet -m "bootstrap: soulmate-4 harness"
)

echo "Bootstrapped '$TARGET' — its own git repo, own history, no leftover clone, one commit already made."
echo "Still to do by hand: fill in AGENTS.md's [project name] + File map rows, the wiki/*.md"
echo "templates, and confirm ~/.config/kilo/kilo.jsonc's provider config matches the model you're"
echo "actually running — then run:"
echo "  (cd '$TARGET' && scripts/check-caps.sh --bootstrap-check)"
echo ""
echo "IMPORTANT: open '$TARGET' with Kilo (Cursor's Kilo panel, or 'cd $TARGET && kilo') and run"
echo "templates/harness-integration-test.md's steps before relying on this — especially Step 5"
echo "(the sub-task gate actually blocking a tool call live), which is this repo's whole reason"
echo "for existing over soulmate-3."

case "$TARGET" in
  /tmp/*)
    echo "" >&2
    echo "WARNING: '$TARGET' is under /tmp — this is commonly cleared on reboot. If this is" >&2
    echo "real work you want to keep, move it to a persistent location now, not later." >&2
    ;;
esac

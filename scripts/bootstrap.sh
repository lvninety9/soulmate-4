#!/usr/bin/env bash
# Turnkey bootstrap for a new project using this harness.
# A single mechanical command is much harder to skip than a multi-step prose
# checklist. It clones itself to scratch if not already running from a
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

# Refuse a target literally named after the seed repo, the
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

mkdir -p "$TARGET/.kilo/plugins/lib" "$TARGET/wiki/handoffs" "$TARGET/wiki/protocols"
cp "$SELF_DIR/.kilo/plugins/subtask-gate.ts" "$TARGET/.kilo/plugins/subtask-gate.ts"
# round 40: the vision bridge tool -- lets the (non-multimodal) coding session call the resident
# local vision model as a tool instead of attaching an image to the chat directly, which either
# the provider can't interpret or (live-reproduced) opencode's own size-limit guard silently
# strips. See .kilo/plugins/vision-read.ts's own header for the full incident.
cp "$SELF_DIR/.kilo/plugins/vision-read.ts" "$TARGET/.kilo/plugins/vision-read.ts"
cp "$SELF_DIR/.kilo/plugins/lib/vision-read-core.ts" "$TARGET/.kilo/plugins/lib/vision-read-core.ts"
cp -r "$SELF_DIR/scripts" "$TARGET/"
# round 6: the plugin's own test file, so a fresh project inherits a real, deterministic
# regression check for the exact plugin file it just got — not just prose claims about it.
if [ -f "$SELF_DIR/tests/subtask-gate.test.mjs" ]; then
  mkdir -p "$TARGET/tests"
  cp "$SELF_DIR/tests/subtask-gate.test.mjs" "$TARGET/tests/"
fi
# round 17: check_stale_language()'s own fuzz regression suite wasn't copied into fresh
# bootstraps at all — a new project inherited the checker but not its test net. Same rationale
# as the line above: a fresh project should get a real, deterministic regression check for the
# check it just inherited, not just prose claiming the check works.
if [ -f "$SELF_DIR/tests/stale-language.fuzz.test.mjs" ]; then
  mkdir -p "$TARGET/tests"
  cp "$SELF_DIR/tests/stale-language.fuzz.test.mjs" "$TARGET/tests/"
fi
# round 40: same rationale -- a fresh project inherits vision-read-core.ts's own regression test,
# not just the tool with no net under it.
if [ -f "$SELF_DIR/tests/vision-read.test.mjs" ]; then
  mkdir -p "$TARGET/tests"
  cp "$SELF_DIR/tests/vision-read.test.mjs" "$TARGET/tests/"
fi
cp "$SELF_DIR/wiki/protocols/"*.md "$TARGET/wiki/protocols/"
cp "$SELF_DIR/templates/AGENTS.md.template" "$TARGET/AGENTS.md"
cp "$SELF_DIR/templates/PROJECT_BACKGROUND.md.template" "$TARGET/wiki/PROJECT_BACKGROUND.md"
cp "$SELF_DIR/templates/SESSION_PRIMER.md.template" "$TARGET/wiki/handoffs/SESSION_PRIMER.md"
cp "$SELF_DIR/templates/FEEDBACK_PENDING.md.template" "$TARGET/wiki/handoffs/FEEDBACK_PENDING.md"
: > "$TARGET/wiki/session-log.md"
: > "$TARGET/wiki/rule-archive.md"
chmod +x "$TARGET/scripts/check-caps.sh" "$TARGET/scripts/pre-commit-check-caps"
chmod +x "$TARGET/scripts/subtask-report.sh" "$TARGET/scripts/post-commit-subtask-report" \
  "$TARGET/scripts/subtask-review-llm.sh" 2>/dev/null || true

# Verification templates (harness-integration-test.md / cold-read-test-prompt.md) also need to
# exist inside the target, not just the seed clone — the seed clone gets deleted right after this
# script returns (see the README's own bootstrap one-liner), so anything only in $SELF_DIR is
# gone the moment bootstrap finishes.
mkdir -p "$TARGET/templates"
cp "$SELF_DIR/templates/harness-integration-test.md" "$SELF_DIR/templates/cold-read-test-prompt.md" \
  "$SELF_DIR/templates/SUBSYSTEM-learnings.md.template" "$TARGET/templates/"

# A baseline .gitignore covering common Python/Node/editor noise
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
.subtask-reports/
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

# A fresh project should pass its own bootstrap check without a manual placeholder edit.
project_name="$(basename "$TARGET")"
awk -v name="$project_name" '{ key="[project name]"; at=index($0,key); if (at) print substr($0,1,at-1) name substr($0,at+length(key)); else print }' \
  "$TARGET/AGENTS.md" > "$TARGET/AGENTS.md.tmp"
mv "$TARGET/AGENTS.md.tmp" "$TARGET/AGENTS.md"

case "$SELF_DIR" in
  "$TARGET"/*) rm -rf "$SELF_DIR" ;;
esac

(
  cd "$TARGET"
  git init --quiet
  mkdir -p .git/hooks
  cp scripts/pre-commit-check-caps .git/hooks/pre-commit
  chmod +x .git/hooks/pre-commit
  cp scripts/post-commit-subtask-report .git/hooks/post-commit
  chmod +x .git/hooks/post-commit
  if ! git config user.email >/dev/null 2>&1; then
    git config user.email "agent@localhost"
    git config user.name "soulmate-4-bootstrap"
  fi
  git add -A
  git commit --quiet -m "bootstrap: soulmate-4 harness"
)

echo "Bootstrapped '$TARGET' — its own git repo, own history, no leftover clone, one commit already made."
echo "AGENTS.md is named for this project. Confirm ~/.config/kilo/kilo.jsonc points at the"
echo "model actually running, then run:"
echo "  (cd '$TARGET' && scripts/check-caps.sh --bootstrap-check)"
echo ""
echo "Open '$TARGET' with Kilo in Cursor and describe the project in an ordinary message."
echo "(the sub-task gate actually blocking a tool call live)."

case "$TARGET" in
  /tmp/*)
    echo "" >&2
    echo "WARNING: '$TARGET' is under /tmp — this is commonly cleared on reboot. If this is" >&2
    echo "real work you want to keep, move it to a persistent location now, not later." >&2
    ;;
esac

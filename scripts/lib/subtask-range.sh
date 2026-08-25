# subtask-range.sh — shared sub-task boundary/range resolution. Sourced (not executed) by
# scripts/subtask-report.sh (layer 1, tool evidence) and scripts/subtask-review-llm.sh (layer 2,
# local-model diff review) so both derive the exact same range from the exact same definition —
# .kilo/plugins/subtask-gate.ts's own boundary (a commit touching wiki/handoffs/SESSION_PRIMER.md).
# Extracted from subtask-report.sh (round 34) verbatim when layer 2 was added, precisely to avoid
# a second, invented boundary definition drifting from the first — subtask-report.sh's own
# original header comment already named that as the risk to avoid.
#
# Usage (after `source`):
#   compute_subtask_range "<target>" "<since-override-or-empty>"
#   sets: TARGET_SHA, SHORT_TARGET, PREV_SHA, RANGE, RANGE_DESC
#   returns 1 (TARGET_SHA left empty) if <target> doesn't resolve to a commit — caller decides
#   what message to print for that case, this file only computes.

# round 34 adversarial-battery finding: `git rev-parse <bad-ref> 2>/dev/null` is NOT reliably
# empty on failure -- for an unresolvable-but-pathname-shaped arg, git echoes the arg back to
# STDOUT verbatim alongside its fatal error on stderr. A plain `[ -z "$x" ]` check after that does
# not catch it -- resolve_ref() checks the actual exit code instead, so a bad ref always resolves
# to a true empty string.
resolve_ref() {
  local out
  out="$(git rev-parse "$1" 2>/dev/null)"
  [ $? -eq 0 ] && printf '%s' "$out"
}

compute_subtask_range() {
  local target="$1" since_override="${2:-}"

  TARGET_SHA="$(resolve_ref "$target")"
  [ -z "$TARGET_SHA" ] && return 1
  SHORT_TARGET="$(git rev-parse --short "$TARGET_SHA")"

  if [ -n "$since_override" ]; then
    PREV_SHA="$(resolve_ref "$since_override")"
  else
    local parent_sha
    parent_sha="$(resolve_ref "${TARGET_SHA}^")"
    if [ -n "$parent_sha" ]; then
      PREV_SHA="$(git log -1 --format=%H "$parent_sha" -- wiki/handoffs/SESSION_PRIMER.md 2>/dev/null)"
    else
      PREV_SHA=""
    fi
  fi

  local empty_tree="4b825dc642cb6eb9a060e54bf8d69288fbee4904"
  if [ -n "$PREV_SHA" ]; then
    RANGE="$PREV_SHA..$TARGET_SHA"
    RANGE_DESC="$(git rev-parse --short "$PREV_SHA")..$SHORT_TARGET"
  else
    RANGE="$empty_tree..$TARGET_SHA"
    RANGE_DESC="(repo start)..$SHORT_TARGET"
  fi
  return 0
}

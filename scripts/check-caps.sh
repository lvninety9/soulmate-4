#!/usr/bin/env bash
# Mechanical cap check for the Soulmate 4 doc structure — run at session END (self-harness's
# PRUNE step), or wire in scripts/pre-commit-check-caps if you want it enforced even when a
# session skips the manual step.
#
# Ported from soulmate-3 — parsing logic and cap rationale are unchanged. What's different here:
# there is no separate kernel.md (Kilo auto-loads AGENTS.md directly, hierarchy-aware) — so
# AGENTS.md carries everything the original soulmate's CLAUDE.md did (Learned/Fixed Rules, File
# map, cap 85 — matching that precedent exactly, not lowered for a local model). Prompt-file
# presence checks look at wiki/protocols/*.md instead of .continue/prompts/*.md, and there's a
# new check for .kilo/plugins/subtask-gate.ts (the real mechanical enforcement Continue never
# had — see AGENTS.md).
#
# Every cap here is a starting point measured on this project's real scale, not a universal
# constant — edit the numbers below to fit your project's actual scale before trusting this
# script's verdict.
#
# Exit 0 = everything within cap. Exit 1 = something needs a prune/triage pass, a file has an
# odd fence count, or a heading appears more than once — all three need a fix before that
# file's counts can be fully trusted.

set -euo pipefail
cd "$(dirname "$0")/.." # repo root, assuming scripts/check-caps.sh's usual location

README_CAP=450
AGENTS_MD_WARN=70
AGENTS_MD_CAP=85
PROJECT_BACKGROUND_CAP=150
SESSION_PRIMER_CAP=150
LEARNED_RULES_CAP=10
FIXED_RULES_ROW_CAP=10
FILE_MAP_ROW_CAP=12
FEEDBACK_OPEN_ROW_CAP=25
FEEDBACK_HISTORY_LINE_CAP=40

status=0

norm() { sed 's/\r$//' "$1" 2>/dev/null || true; }

check_lines() {
  local file="$1" cap="$2" label="$3"
  if [ ! -f "$file" ]; then
    echo "skip: $file not found"
    return 0
  fi
  local lines
  lines=$(norm "$file" | wc -l | tr -d ' ')
  if [ "$lines" -gt "$cap" ]; then
    echo "OVER CAP: $label ($file) is $lines lines, cap $cap — prune before committing"
    status=1
  else
    echo "ok: $label ($file) $lines/$cap lines"
  fi
}

check_lines_warn() {
  local file="$1" warn="$2" cap="$3" label="$4"
  if [ ! -f "$file" ]; then
    echo "skip: $file not found"
    return 0
  fi
  local lines
  lines=$(norm "$file" | wc -l | tr -d ' ')
  if [ "$lines" -gt "$cap" ]; then
    echo "OVER CAP: $label ($file) is $lines lines, cap $cap — prune before committing"
    status=1
  elif [ "$lines" -gt "$warn" ]; then
    echo "WARN: $label ($file) is $lines/$cap lines (soft target $warn) — consider a pruning pass soon"
  else
    echo "ok: $label ($file) $lines/$cap lines"
  fi
}

check_fence_parity() {
  local file="$1"
  if [ ! -f "$file" ]; then
    return 0
  fi
  local count
  count=$(norm "$file" | grep -c '^```' || true)
  if [ $((count % 2)) -ne 0 ]; then
    echo "OVER CAP: $file has an odd number ($count) of \`\`\` lines — a fence never closed; fix the markdown before trusting any count in this file"
    status=1
  fi
}

parse_sections() {
  local file="$1"
  norm "$file" | awk '
    {
      line = $0; sub(/[ \t]+$/, "", line); lline = tolower(line)
      is_heading_line = (line ~ /^## /)
    }
    is_heading_line && (NR == 1 || prev_blank || prev_heading) {
      if (lline in seen) { dup[lline] = 1 }
      seen[lline] = 1
      cur = lline
      hdr[cur] = 0
      sep[cur] = 0
      prev_blank = 0; prev_heading = 1
      next
    }
    cur != "" && /^- / { bullets[cur]++ }
    cur != "" && /^\|/ {
      if (!hdr[cur]) { hdr[cur] = 1; prev_blank=0; prev_heading=0; next }
      if (!sep[cur]) {
        sep[cur] = 1
        if ($0 ~ /^\|[-: |]+\|$/) { prev_blank=0; prev_heading=0; next }
      }
      rows[cur]++
    }
    { prev_blank = (line == ""); prev_heading = 0 }
    END {
      for (s in seen) {
        d = (s in dup) ? 1 : 0
        print s "\t" (bullets[s]+0) "\t" (rows[s]+0) "\t" d
      }
    }
  '
}

check_section() {
  local file="$1" heading="$2" cap="$3" label="$4" unit="$5" hint="${6:-prune before committing}"
  if [ ! -f "$file" ]; then
    echo "skip: $file not found"
    return 0
  fi
  local hnorm value_col value row
  hnorm=$(printf '%s' "$heading" | tr '[:upper:]' '[:lower:]')
  if [ "$unit" = "entries" ]; then value_col=2; else value_col=3; fi
  row=$(parse_sections "$file" | awk -F'\t' -v h="$hnorm" '$1 == h { print; found=1 } END { if (!found) print "" }')
  if [ -z "$row" ]; then
    echo "ok: $label ($file) 0/$cap $unit (section not present yet)"
    return 0
  fi
  local dup
  dup=$(printf '%s' "$row" | awk -F'\t' '{ print $4 }')
  if [ "$dup" = "1" ]; then
    echo "OVER CAP: $label in $file — this heading appears more than once in the file, which shouldn't happen; merge the two sections (or rename one) before this count can be trusted"
    status=1
    return
  fi
  value=$(printf '%s' "$row" | awk -F'\t' -v c="$value_col" '{ print $c }')
  if [ "$value" -gt "$cap" ]; then
    echo "OVER CAP: $label in $file has $value $unit, cap $cap — $hint"
    status=1
  else
    echo "ok: $label ($file) $value/$cap $unit"
  fi
}

report_count() {
  local file="$1" label="$2" cap="$3" unit="$4" value="$5" hint="${6:-prune before committing}"
  if [ "$value" -gt "$cap" ]; then
    echo "OVER CAP: $label in $file has $value $unit, cap $cap — $hint"
    status=1
  else
    echo "ok: $label ($file) $value/$cap $unit"
  fi
}

# Bootstrap-integrity check: AGENTS.md's Protocol table names 6 doc steps. If any matching
# wiki/protocols/<name>.md is missing, self-serving that step silently has nothing to read — no
# error, just a model improvising the methodology from the table's one-line description alone.
# Also checks .kilo/plugins/subtask-gate.ts — the real mechanical enforcement this repo exists
# for; without it, this harness degrades to soulmate-3's prose-only level with no warning.
check_prompts_present() {
  local missing=() name
  for name in discuss design build verify refactor self-harness; do
    if [ ! -f "wiki/protocols/$name.md" ]; then
      missing+=("$name")
    fi
  done
  if [ ${#missing[@]} -gt 0 ]; then
    echo "OVER CAP: bootstrap incomplete — missing wiki/protocols/{${missing[*]}}.md (AGENTS.md's protocol table references all 6; copy them from the seed repo before relying on this methodology)"
    status=1
  else
    echo "ok: bootstrap — all 6 wiki/protocols/*.md present"
  fi
  if [ ! -f ".kilo/plugins/subtask-gate.ts" ]; then
    echo "OVER CAP: bootstrap incomplete — missing .kilo/plugins/subtask-gate.ts (this is the real mechanical sub-task checkpoint; without it, this repo has no advantage over soulmate-3's prose-only enforcement)"
    status=1
  else
    echo "ok: bootstrap — .kilo/plugins/subtask-gate.ts present"
  fi
}

# Bootstrap-check-only mode: normal suite below assumes real project content already exists —
# useless noise on a project that was just bootstrapped and hasn't done any work yet.
check_bootstrap_is_repo_root() {
  local toplevel
  if ! toplevel=$(git rev-parse --show-toplevel 2>/dev/null); then
    echo "BOOTSTRAP FAIL: not a git repository — run 'git init' here before anything else"
    status=1
    return
  fi
  if [ "$toplevel" != "$(pwd -P)" ]; then
    echo "BOOTSTRAP FAIL: this directory is nested inside another git repo ($toplevel) instead of being its own repo root — git init the new project itself, don't nest it under the cloned seed repo"
    status=1
  else
    echo "ok: bootstrap — this directory is its own git repo root"
  fi
}

check_feedback_template_header() {
  local file="wiki/handoffs/FEEDBACK_PENDING.md"
  local expected="| # | Feedback / issue | Priority | Status | How it's handled | Session logged |"
  if [ ! -f "$file" ]; then
    echo "BOOTSTRAP FAIL: $file not found — copy templates/FEEDBACK_PENDING.md.template verbatim"
    status=1
    return
  fi
  if norm "$file" | grep -qF "$expected"; then
    echo "ok: bootstrap — $file uses the template's table header verbatim"
  else
    echo "BOOTSTRAP FAIL: $file's table header doesn't match the template (expected: $expected) — looks reinvented instead of copied"
    status=1
  fi
}

check_bootstrap_no_uncommitted() {
  if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
    return
  fi
  if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
    echo "BOOTSTRAP FAIL: uncommitted changes present (\`git status --porcelain\` is non-empty) — commit before calling any work done"
    status=1
  else
    echo "ok: bootstrap — working tree clean, nothing uncommitted"
  fi
}

# Catches: the raw clone's own root wiki/ (this repo's own dogfood content, describing
# soulmate-4 itself) being used as the new project's starting point instead of
# templates/*.template.
check_bootstrap_wiki_is_adapted() {
  local f="wiki/handoffs/SESSION_PRIMER.md"
  if [ -f "$f" ] && norm "$f" | grep -qF "Soulmate 4 is a memory/harness template"; then
    echo "BOOTSTRAP FAIL: $f still has this seed repo's own text (\"Soulmate 4 is a memory/harness template\") — looks like the raw clone is being used as the project instead of copying templates/SESSION_PRIMER.md.template and writing this project's own state into it"
    status=1
  else
    echo "ok: bootstrap — $f doesn't look like this seed repo's own untouched wiki"
  fi
}

check_bootstrap_not_in_tmp() {
  case "$(pwd -P)" in
    /tmp/*)
      echo "BOOTSTRAP WARN: this project lives under /tmp ($(pwd -P)) — commonly cleared on reboot. Move it to a persistent location if this is real work you want to keep."
      ;;
    *)
      echo "ok: bootstrap — not under /tmp"
      ;;
  esac
}

check_bootstrap_own_git_identity() {
  local remote
  remote=$(git remote get-url origin 2>/dev/null || true)
  if [ -n "$remote" ] && echo "$remote" | grep -qi "lvninety9/soulmate-4"; then
    echo "BOOTSTRAP FAIL: git remote 'origin' still points at the soulmate-4 seed repo ($remote) — this project needs its own fresh history (git init), not the seed's cloned .git; scripts/bootstrap.sh prevents this automatically"
    status=1
  else
    echo "ok: bootstrap — git remote doesn't point back at the seed repo"
  fi
}

check_bootstrap_no_leftover_clone() {
  local d
  for d in soulmate-4 soulmate-4-seed .soulmate-4-seed; do
    if [ -d "$d" ]; then
      echo "BOOTSTRAP FAIL: leftover seed-repo clone directory '$d/' still exists here — should have been scratch material only, deleted once copied from (scripts/bootstrap.sh does this automatically)"
      status=1
      return
    fi
  done
  echo "ok: bootstrap — no leftover seed-repo clone directory"
}

check_bootstrap_no_inherited_history() {
  if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
    return
  fi
  if git log --all --oneline 2>/dev/null | grep -qF "bootstrap: soulmate-4 harness"; then
    echo "ok: bootstrap — history has this project's own bootstrap commit"
    return 0
  fi
  if git log --all --oneline 2>/dev/null | grep -qiE "seed: soulmate.?4|seed: soulmate.?3|seed: soulmate.?2"; then
    echo "BOOTSTRAP FAIL: this project's git history still contains a seed repo's own root commit — re-init a genuinely fresh history (git init, one commit) instead of building on top of the cloned one; scripts/bootstrap.sh does this automatically."
    status=1
  else
    echo "ok: bootstrap — git history doesn't contain the seed repo's own commits"
  fi
}

check_bootstrap_precommit_hook_installed() {
  if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
    return
  fi
  if [ -x ".git/hooks/pre-commit" ]; then
    echo "ok: bootstrap — pre-commit hook installed (.git/hooks/pre-commit)"
  else
    echo "BOOTSTRAP FAIL: .git/hooks/pre-commit missing or not executable — the staged-file-count safety net isn't installed. scripts/bootstrap.sh installs this automatically; if you bootstrapped manually, run: cp scripts/pre-commit-check-caps .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit"
    status=1
  fi
}

# Advisory only (never sets status=1 — must not block per-file commits mid-sub-task, which
# legitimately don't touch SESSION_PRIMER.md until the last file). This reminder exists
# independently of .kilo/plugins/subtask-gate.ts's hard block — the plugin only fires once the
# commit has already landed; this fires at the moment of staging, one step earlier, in case the
# plugin itself is missing/disabled for some reason.
check_primer_handoff_reminder() {
  local f="wiki/handoffs/SESSION_PRIMER.md"
  if [ ! -f "$f" ]; then
    return 0
  fi
  if git rev-parse --show-toplevel >/dev/null 2>&1 && \
     ! git diff --cached --name-only 2>/dev/null | grep -qF "$f"; then
    echo "reminder: this commit doesn't touch $f — if this is the sub-task's LAST file, its" \
         "'Current sub-task' block should be staged in this same commit (next sub-task, or" \
         "'verify' if none remain). See wiki/protocols/build.md step 3."
  fi
}

# Non-blocking, unlike everything above — these files (rule-archive/session-log/
# SESSION_MASTER) are append-only by design, never auto-loaded, so a hard cap would fight their
# purpose. But "no cap" can quietly become "nobody ever looks" — this just keeps them visible so
# a stale/bloated one gets noticed during self-harness's PRUNE step instead of growing forever.
check_watch_size() {
  local file="$1" warn="$2"
  if [ ! -f "$file" ]; then
    return 0
  fi
  local lines archive_dest
  lines=$(norm "$file" | wc -l | tr -d ' ')
  if [ "$lines" -gt "$warn" ]; then
    archive_dest="${file%.md}-archive.md"
    echo "WATCH: $file is $lines lines (append-only, no hard cap) — move its oldest entries to" \
         "$archive_dest (same pattern for all 3 of these files, wiki/protocols/self-harness.md" \
         "PRUNE step) and leave a one-line pointer behind"
  fi
}

check_bootstrap_placeholders_filled() {
  local bad=0
  if [ -f "AGENTS.md" ] && grep -qF "[project name]" "AGENTS.md"; then
    echo "BOOTSTRAP FAIL: AGENTS.md still has the literal placeholder \"[project name]\" -- fill in the real project name"
    status=1
    bad=1
  fi
  [ "$bad" = 0 ] && echo "ok: bootstrap — AGENTS.md placeholders filled in"
}

run_bootstrap_checks() {
  check_bootstrap_is_repo_root
  check_bootstrap_not_in_tmp
  check_bootstrap_own_git_identity
  check_bootstrap_no_inherited_history
  check_bootstrap_precommit_hook_installed
  check_bootstrap_no_leftover_clone
  check_prompts_present
  check_feedback_template_header
  check_bootstrap_no_uncommitted
  check_bootstrap_wiki_is_adapted
  check_bootstrap_placeholders_filled
  local f
  for f in AGENTS.md wiki/PROJECT_BACKGROUND.md wiki/handoffs/SESSION_PRIMER.md; do
    if [ -f "$f" ]; then
      echo "ok: bootstrap — $f present"
    else
      echo "BOOTSTRAP FAIL: $f missing — copy its template before starting real work"
      status=1
    fi
  done

  if [ "$status" = 0 ]; then
    echo ""
    echo "Bootstrap check passed. Unlike soulmate-3, this repo has a real mechanical safety net"
    echo "(.kilo/plugins/subtask-gate.ts, via Kilo's tool.execute.before hook) — but that has"
    echo "only been verified live in this repo's own test project, not yet in a fresh bootstrap."
    echo "Run templates/harness-integration-test.md's Step 5 (the gate blocking a real tool call)"
    echo "before trusting this passed check on a brand-new project."
  fi
}

if [ "${1:-}" = "--bootstrap-check" ]; then
  run_bootstrap_checks
  exit $status
fi

check_lines "README.md" "$README_CAP" "README.md"
check_prompts_present
check_fence_parity "AGENTS.md"
check_lines_warn "AGENTS.md" "$AGENTS_MD_WARN" "$AGENTS_MD_CAP" "AGENTS.md total"
check_section "AGENTS.md" "## File map" "$FILE_MAP_ROW_CAP" "File Map" "rows"
check_section "AGENTS.md" "## Learned Rules" "$LEARNED_RULES_CAP" "Learned Rules" "entries"
check_section "AGENTS.md" "## Fixed Rules" "$FIXED_RULES_ROW_CAP" "Fixed Rules" "rows"
check_lines "wiki/PROJECT_BACKGROUND.md" "$PROJECT_BACKGROUND_CAP" "PROJECT_BACKGROUND.md"
check_lines "wiki/handoffs/SESSION_PRIMER.md" "$SESSION_PRIMER_CAP" "SESSION_PRIMER.md"
check_primer_handoff_reminder
check_watch_size "wiki/rule-archive.md" 400
check_watch_size "wiki/session-log.md" 200
check_watch_size "wiki/handoffs/SESSION_MASTER.md" 150

shopt -s nullglob
feedback_files=(wiki/handoffs/FEEDBACK_PENDING*.md)
shopt -u nullglob

if [ ${#feedback_files[@]} -eq 0 ]; then
  echo "skip: no wiki/handoffs/FEEDBACK_PENDING*.md found"
else
  for f in "${feedback_files[@]}"; do
    check_fence_parity "$f"

    fp_result=$(norm "$f" | awk '
      {
        line = $0; sub(/[ \t]+$/, "", line); lline = tolower(line)
        is_hist = (lline == "## completed history")
      }
      is_hist && (NR == 1 || prev_blank || prev_heading) {
        if (seen_hist) { dup = 1 }
        seen_hist = 1
        found = 1
        hist_c++
        prev_blank = 0; prev_heading = 1
        next
      }
      !found && /^\|/ {
        if (!hdr) { hdr=1; prev_blank=0; prev_heading=0; next }
        if (!sep) {
          sep=1
          if ($0 ~ /^\|[-: |]+\|$/) { prev_blank=0; prev_heading=0; next }
        }
        open_c++
      }
      found { hist_c++ }
      { prev_blank = (line == ""); prev_heading = 0 }
      END {
        if (dup) { print "DUP\tDUP" }
        else { print open_c+0 "\t" hist_c+0 }
      }
    ')
    open_rows=$(printf '%s' "$fp_result" | cut -f1)
    history_lines=$(printf '%s' "$fp_result" | cut -f2)
    if [ "$open_rows" = "DUP" ]; then
      echo "OVER CAP: open table / history section in $f — \"## Completed history\" appears more than once; merge the two sections before these counts can be trusted"
      status=1
    else
      report_count "$f" "open table" "$FEEDBACK_OPEN_ROW_CAP" "rows" "$open_rows" \
        "triage overdue (close stale items, merge duplicates, or split by subsystem)"
      report_count "$f" "history section" "$FEEDBACK_HISTORY_LINE_CAP" "lines" "$history_lines" \
        "archive into wiki/feedback-archive.md"
    fi
  done
fi

exit $status

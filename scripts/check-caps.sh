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
FILE_MAP_ROW_CAP=10
FEEDBACK_OPEN_ROW_CAP=25
FEEDBACK_HISTORY_LINE_CAP=40
# Round 33 (Opus work order, item 1): rule-archive.md/SESSION_MASTER.md's soft WATCH (below,
# check_watch_size) was obeyed 0% of the time across the project's whole history — it printed on
# every single commit for 4 rounds straight (rule-archive.md 408->1153 lines, +182%) and nobody
# pruned, because it never blocked anything. Measured against this repo's OWN history rather than
# picking a round number: rule-archive.md's only real archive-and-shrink event ever (session
# 7/round 8) landed it at 284 lines; its most recent pre-bloat resting size (no PRUNE, just
# organic growth having not yet run away) was 408 lines, right after round 27 — both real
# checkpoints this project actually sat at. SESSION_MASTER.md's own two archive events (round 7,
# round 9) landed it at 149 and 102 lines respectively. The existing WATCH thresholds (400/150,
# below) already sat close to those checkpoints and never produced a false positive in 20+ rounds
# — so they become the soft WARN tier here unchanged; CAP adds real headroom above WARN (roughly
# one round's worth of narrative at this project's own recent growth rate) before a PRUNE is
# mechanically required, same warn/cap shape check_lines_warn already gives every other file.
RULE_ARCHIVE_WARN=400
RULE_ARCHIVE_CAP=450
SESSION_MASTER_WARN=150
SESSION_MASTER_CAP=200
# Round 28 item 4 (flow rule, external review): a per-row char cap isn't a size limit on the
# FILE (FEEDBACK_PENDING_CHAR_CAP already does that) — it's a limit on how much a single hot row
# is ALLOWED to carry before the narrative belongs in wiki/rule-archive.md instead. Without this,
# the file-level char cap alone still lets one round's discovery narrative accumulate hot-table
# bloat right up to the ceiling, the exact pattern that pushed required-read tokens from 6,978
# (round 28 S5) back up past 8,000 within the same round (rows #40-#42, ~1,500 chars/row) — this
# catches that at the row level, at write time, not after the file cap trips.
FEEDBACK_ROW_CHAR_CAP=300

# Round 33 item 2: session-log.md has the exact same line-vs-bytes decoupling FEEDBACK_ROW_CHAR_CAP
# (above) was built to catch — 25 lines but 21,071 chars (842 chars/line), so its own 200-line
# check_watch_size WATCH would need ~168,000 chars to ever fire, structurally unreachable at this
# file's real per-row size. Same mechanism, not a new one: check_row_char_cap() (below) is the same
# while-loop the FEEDBACK_PENDING section already ran, now shared by both call sites. Cap sized
# from this file's own real history, not FEEDBACK's: session-log.md's role (one real paragraph per
# session, per its own header) is legitimately a bigger natural unit than a FEEDBACK hot-table row
# (which is supposed to defer detail elsewhere) — its 21 real rows as of this round range 373-2,679
# chars, so 300 would OVER CAP every single existing row. 3000 gives the densest real row (2,679,
# round 20's multi-day/multi-round entry) ~12% headroom without forcing a retroactive rewrite of
# history, while still catching an actual runaway row (e.g. a raw session transcript pasted in
# whole, which runs an order of magnitude past this).
SESSION_LOG_ROW_CHAR_CAP=3000

# Round 28 (external review, FEEDBACK_PENDING row #39, S4): every cap above is line/row-based,
# and a line/row count says nothing about how much text is actually inside each line — a table
# row can be one word or one paragraph and counts the same. Live-confirmed: wiki/handoffs/
# FEEDBACK_PENDING.md sat at "33/40 ok" on the history-line cap while actually 38,931 characters
# (one single row alone: 2,669 chars) — a local model reading this file pays for its real content
# size, not the number check-caps.sh was reporting. These are companions, not replacements — the
# existing line/row caps still catch "too many entries"; these catch "the entries themselves
# bloated." Sized at roughly 2-3x each file's characters-per-line ratio observed elsewhere in
# this repo (60-110 chars/line for normal prose) against that file's own line/row cap, generous
# enough not to fire on normal writing, tight enough to fire on FEEDBACK_PENDING.md's actual
# current content (see check-caps.sh's own live-verification notes in the S4 commit message).
README_CHAR_CAP=70000
AGENTS_MD_CHAR_CAP=13000
PROJECT_BACKGROUND_CHAR_CAP=23000
SESSION_PRIMER_CHAR_CAP=23000
FEEDBACK_PENDING_CHAR_CAP=15000

# Round 30 item 1 (work order): every cap above is per-file, so a handoff commit that stays under
# each individual cap can still grow the *sum* every session reads at start (AGENTS.md +
# SESSION_PRIMER.md + PROJECT_BACKGROUND.md + FEEDBACK_PENDING.md) — this is exactly what
# happened twice in a row: round 28 FEEDBACK_PENDING 6,978->8,158 tok, round 29 required-read
# total 5,563->6,344 tok (SESSION_PRIMER alone 101->147 lines), both times the round's own
# handoff commit refilling the budget it had just trimmed, and no per-file cap caught it because
# no single file went OVER CAP. check-caps.sh has no llama-server dependency (must run standalone
# in a pre-commit hook), so chars stand in for tokens — round 30 measured, on this repo's real
# fresh-clone content via POST /tokenize (the real local tokenizer), 22,077 chars == 6,344 tokens
# (ratio 3.48 chars/token). 8,000 tokens * 3.48 = 27,840 chars; rounded down to 27,800 for a small
# safety margin (content mix shifts the ratio slightly — Korean prose tokenizes denser than
# English/code, so a Korean-heavier future edit could cross 8,000 tok at a slightly lower char
# count than today's ratio predicts). Recompute this ratio if the file mix changes a lot.
REQUIRED_READ_CHAR_CAP=27800

status=0

# Round 33 item 3: on a clean repo this printed 1 WARN + 4 WATCH on EVERY commit, all in normal
# (non-actionable) states — a WARN/WATCH that fires every single time carries zero information
# and just trains whoever reads pre-commit output to stop reading it, which is exactly how the
# item-1 finding happened (a WATCH nobody ever acted on for 4 rounds straight). Every check below
# keeps running and keeps its full detection power (OVER CAP/FAIL always print immediately and
# still set status=1, unchanged) — this only defers the non-blocking WARN/WATCH/reminder lines:
# printed immediately as before if something is actually blocking this commit (status ends up 1,
# so a human is already reading the output for a real reason) or --verbose/-v was passed, else
# collapsed into one summary line at the end. wiki/protocols/self-harness.md's PRUNE step passes
# --verbose explicitly, since that manual review is exactly the moment these ARE the useful signal.
VERBOSE=0
for _arg in "$@"; do
  case "$_arg" in
    -v|--verbose) VERBOSE=1 ;;
  esac
done
NOTICES=()
# "$*" (not "$1") so a multi-arg call — echo's own old calling convention for a line built from
# several quoted pieces, still used below — joins with spaces exactly like echo did before.
notice() { NOTICES+=("$*"); }

norm() { sed 's/\r$//' "$1" 2>/dev/null || true; }

check_lines_warn() {
  # Round 29 item 5 (check-caps.sh consolidation, work order): the old check_lines(file, cap,
  # label) was this function with warn==cap — when warn equals cap, the WARN branch below can
  # never fire (its "lines>warn but not already caught by lines>cap" window is empty), so a
  # 3-arg call collapses to exactly check_lines's old behavior with byte-identical messages.
  # Regression-proven in tests/check-caps.regression.test.mjs (both branches, same wording).
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
    notice "WARN: $label ($file) is $lines/$cap lines (soft target $warn) — consider a pruning pass soon"
  else
    echo "ok: $label ($file) $lines/$cap lines"
  fi
}

# Round 39: `wc -m` counts CHARACTERS only in a UTF-8 locale; under the POSIX/C locale it counts
# BYTES, and the two answers differ by ~2.5x on Korean text (a Hangul syllable is 3 bytes). Every
# cap in this file is a character cap, so the same unchanged file measures differently depending
# on which shell the commit came from — measured on this repo: required-read 8,370 chars in the
# desktop session's ko_KR.UTF-8 vs 10,900 under `env -i` (what a cron/ssh-without-login-env
# invocation actually gets), and wiki/PROJECT_BACKGROUND.md 2,535 vs 4,204, a 66% inflation. That
# is enough to hard-block a commit purely on where it was typed, and it makes HANDOFF.md's
# "reproduce the start state" numbers unreproducible across contexts — the exact class of
# doc-vs-actual mismatch this script exists to prevent. 37 rounds never varied this axis because
# every trial ran in one interactive desktop shell.
#
# Pin the counting locale instead of inheriting it, so the number is a property of the file and
# nothing else. C.utf8 is the byte-for-byte-portable UTF-8 locale (present here; en_US.utf8 is
# the fallback). If neither exists we fall back to the inherited locale rather than failing the
# whole check — a possibly-inflated count still blocks conservatively, it never under-reports.
if locale -a 2>/dev/null | grep -qx 'C.utf8'; then
  CHARCOUNT_LOCALE="C.utf8"
elif locale -a 2>/dev/null | grep -qx 'en_US.utf8'; then
  CHARCOUNT_LOCALE="en_US.utf8"
else
  CHARCOUNT_LOCALE="${LC_ALL:-${LANG:-C}}"
fi
count_chars() {
  LC_ALL="$CHARCOUNT_LOCALE" wc -m < "$1" | tr -d ' '
}

check_chars() {
  local file="$1" cap="$2" label="$3"
  if [ ! -f "$file" ]; then
    return 0
  fi
  local chars
  chars=$(count_chars "$file")
  if [ "$chars" -gt "$cap" ]; then
    echo "OVER CAP: $label char count ($file) is $chars chars, cap $cap — a low line/row count" \
         "can hide a runaway character total (a few bloated lines or table cells); prune the" \
         "actual prose, not just whatever the line/row count reads"
    status=1
  else
    echo "ok: $label char count ($file) $chars/$cap chars"
  fi
}

check_required_read_total() {
  # Round 30 item 1: hard cap on the SUM of the 4 files every fresh session is expected to read
  # at start (see AGENTS.md's own file map + PROJECT_BACKGROUND's @import) — a per-file cap alone
  # lets the total creep back up even while every individual file stays "ok" (see the constant's
  # comment above for the two live repeats this caught). Files that don't exist yet count as 0,
  # same as check_chars's own missing-file handling elsewhere in this script.
  local files=("$@") total=0 f chars
  for f in "${files[@]}"; do
    if [ -f "$f" ]; then
      chars=$(count_chars "$f")
      total=$((total + chars))
    fi
  done
  if [ "$total" -gt "$REQUIRED_READ_CHAR_CAP" ]; then
    echo "OVER CAP: required-read total ($((${#files[@]}))-file sum: ${files[*]}) is $total chars," \
         "cap $REQUIRED_READ_CHAR_CAP (~8,000 tokens at this repo's measured ratio) — trim" \
         "SESSION_PRIMER.md first (move narrative to SESSION_MASTER.md, per item 1's own C" \
         "acceptance condition), not the other three"
    status=1
  else
    echo "ok: required-read total ($total/$REQUIRED_READ_CHAR_CAP chars)"
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
  # Round 29 item 5: this used to duplicate report_count()'s exact if/else inline (same OVER
  # CAP / ok message format, byte for byte) — call it instead now that it's already defined
  # below in the file (bash resolves the function name at call time, not definition order).
  report_count "$file" "$label" "$cap" "$unit" "$value" "$hint"
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

# Round 28 item 4 originally built this inline for FEEDBACK_PENDING.md only (a line/row count
# says nothing about how much text is actually inside each row); round 33 item 2 hit the exact
# same gap in session-log.md and reuses this function rather than re-inlining the same loop a
# second time — only the cap value and the "where the excess belongs" hint differ per call site
# (see FEEDBACK_ROW_CHAR_CAP / SESSION_LOG_ROW_CHAR_CAP above for each one's own justification).
# Matches any markdown table row shaped "| <number or N/M> | ..." — both files' first column.
check_row_char_cap() {
  local file="$1" cap="$2" dest_hint="$3"
  if [ ! -f "$file" ]; then
    return 0
  fi
  local row_line row_len row_num
  while IFS= read -r row_line; do
    [ -z "$row_line" ] && continue
    row_len=${#row_line}
    if [ "$row_len" -gt "$cap" ]; then
      row_num=$(printf '%s' "$row_line" | sed -E 's/^\| *([0-9]+(\/[0-9]+)?) *\|.*/\1/')
      echo "OVER CAP: $file row #$row_num is $row_len chars, cap $cap — $dest_hint"
      status=1
    fi
  done < <(norm "$file" | grep -E '^\| *[0-9]+(/[0-9]+)? *\|')
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
#
# Round 28 (external review, FEEDBACK_PENDING row #39, S2): the canary string this used to match
# ("Soulmate 4 is a memory/harness template") was rewritten out of the real wiki/handoffs/
# SESSION_PRIMER.md's own prose back in commit dba3a3e (session 5's cap-trim pass) — nobody
# updated this check when that happened, so it has read "ok" unconditionally for 23 rounds
# regardless of whether the wiki was actually adapted. Live-reproduced: bootstrapping a fresh
# project and then copying THIS repo's own current wiki/handoffs/SESSION_PRIMER.md over the
# template verbatim (the exact mistake this exists to catch) still printed "ok". Replaced the
# dead phrase with the "Project overview" section's current self-description — still just a
# string match (same class of fragility, not eliminated), but now true of the file this check
# actually runs against.
# Round 29 item 5 (check-caps.sh consolidation, work order): generic "file F still contains
# forbidden literal string S" check — check_bootstrap_wiki_is_adapted and
# check_bootstrap_placeholders_filled were this exact shape (find-a-literal-string-and-FAIL) with
# only the file/needle/messages differing; both are now single calls to this below
# (run_bootstrap_checks). Regression-proven in tests/check-caps.regression.test.mjs against both
# original scenarios (SESSION_PRIMER.md untouched, AGENTS.md placeholder left in).
check_bootstrap_forbidden_string() {
  local file="$1" needle="$2" fail_msg="$3" ok_msg="$4"
  if [ -f "$file" ] && norm "$file" | grep -qF "$needle"; then
    echo "BOOTSTRAP FAIL: $fail_msg"
    status=1
  else
    echo "ok: $ok_msg"
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

# Generic form (round 35 item 3): same check, reused for both git hooks this project installs --
# .git/hooks/ is never in git, so a fresh clone silently has NEITHER until someone runs
# scripts/bootstrap.sh or copies them by hand. Before item 3 only the pre-commit side was
# checked; a missing post-commit hook meant scripts/subtask-report.sh's sub-task report simply
# never fired, with no signal anywhere that it was supposed to.
check_bootstrap_hook_installed() {
  local hook="$1" src_script="$2" what_it_protects="$3"
  if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
    return
  fi
  if [ ! -x ".git/hooks/$hook" ]; then
    echo "BOOTSTRAP FAIL: .git/hooks/$hook missing or not executable — $what_it_protects scripts/bootstrap.sh installs this automatically; if you bootstrapped manually, run: cp $src_script .git/hooks/$hook && chmod +x .git/hooks/$hook"
    status=1
    return
  fi
  # Round 37 item 1: existence alone isn't enough -- .git/hooks/$hook is a byte-for-byte copy
  # made once by scripts/bootstrap.sh (or by hand), so a later edit to $src_script (e.g. adding
  # check-secrets.sh) never reaches an already-installed hook. Found live: the pre-commit hook
  # installed at project bootstrap predated check-secrets.sh being added to
  # scripts/pre-commit-check-caps, so the secret scan silently never ran despite
  # SESSION_PRIMER.md claiming it did.
  if [ -f "$src_script" ] && ! diff -q ".git/hooks/$hook" "$src_script" >/dev/null 2>&1; then
    echo "BOOTSTRAP FAIL: .git/hooks/$hook is installed but stale (its content no longer matches $src_script) — $what_it_protects re-run: cp $src_script .git/hooks/$hook && chmod +x .git/hooks/$hook"
    status=1
    return
  fi
  echo "ok: bootstrap — $hook hook installed (.git/hooks/$hook)"
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
    notice "reminder: this commit doesn't touch $f — if this is the sub-task's LAST file, its" \
           "'Current sub-task' block should be staged in this same commit (next sub-task, or" \
           "'verify' if none remain). See wiki/protocols/build.md step 3."
  fi
}

# Round 28 (external review, FEEDBACK_PENDING row #39, S1): a real fresh-cloned SESSION_PRIMER.md
# was found missing this heading entirely, even though 5 other places assume it exists —
# design.md step 4, build.md step 3, subtask-gate.ts's own block-message text,
# check_primer_handoff_reminder() just above, and templates/SESSION_PRIMER.md.template. None of
# those call sites notice its absence on their own; they just silently degrade. Hard-FAIL, not a
# reminder, since this is a structural precondition for the reminder/gate mechanisms above to
# mean anything, not an advisory nudge.
check_primer_subtask_heading() {
  local f="wiki/handoffs/SESSION_PRIMER.md"
  if [ ! -f "$f" ]; then
    return 0
  fi
  if ! grep -q '^## Current sub-task' "$f"; then
    echo "FAIL: $f is missing a '## Current sub-task' heading — wiki/protocols/design.md step 4," \
         "build.md step 3, and .kilo/plugins/subtask-gate.ts's block message all assume this" \
         "section exists. Restore it (see templates/SESSION_PRIMER.md.template for the shape)."
    status=1
  fi
}

# 127차(round 6, Jay 지시): an objective audit found templates/AGENTS.md.template drifted from
# the real AGENTS.md in the SAME session that had just fixed an earlier instance of this exact
# drift (L06-L08 merged in the template, but L09/L10 — added one commit later to the live file —
# never got synced). check-caps.sh's own line/row counts never caught it because line count
# alone can't tell "content matches" from "content is coincidentally the same length." Only
# meaningful in this repo (soulmate-4 itself, source of the template) — downstream bootstrapped
# projects don't keep templates/AGENTS.md.template around, so this skips cleanly there.
check_template_drift() {
  local live="AGENTS.md" tmpl="templates/AGENTS.md.template"
  if [ ! -f "$live" ] || [ ! -f "$tmpl" ]; then
    echo "skip: template drift check ($tmpl not present — expected outside soulmate-4 itself)"
    return 0
  fi
  # round 7(audit): the original ID-set-only version was content-blind — it only checked which
  # [L<NN>] tags exist in each file, not what they actually say. Live-tested: replacing a whole
  # rule's body text (same tag kept) passed silently. Fixed by diffing everything from
  # "## Language" onward (the part both files must be byte-identical on — only the title/HTML-
  # comment-block above it is meant to differ) instead of just extracting IDs.
  #
  # Round 28 (external review, FEEDBACK_PENDING row #39, S6): "everything from '## Language'
  # onward must be byte-identical" also forced templates/AGENTS.md.template to carry this repo's
  # own "## Learned Rules" — soulmate-4's own Kilo-plugin-development history (L01-L13: opencode
  # binary quirks, subtask-gate.ts bug history, this project's own audit-loop lessons), meaningless
  # to a downstream project that will never run this repo's audit loop. That pollution was being
  # actively enforced by this check, not just an oversight (S5(b)'s cleanup needed this fixed
  # first). "## Fixed Rules" stayed in the diff on purpose — unlike Learned Rules, its 3 entries
  # are genuinely general practices (commit discipline, disabling thinking at the inference
  # server, verifying before claiming done), not incident narratives, so real drift there is still
  # worth catching the same as any other mechanism section.
  local strip_learned_rules='
    /^## Language/{f=1}
    f && /^## Learned Rules/{skip=1; next}
    f && skip && /^## /{skip=0}
    f && !skip
  '
  local live_body tmpl_body
  live_body=$(norm "$live" | awk "$strip_learned_rules")
  tmpl_body=$(norm "$tmpl" | awk "$strip_learned_rules")
  if [ "$live_body" != "$tmpl_body" ]; then
    echo "OVER CAP: templates/AGENTS.md.template has drifted from AGENTS.md (content differs" \
         "from '## Language' onward, excluding '## Learned Rules' which is allowed to differ) —" \
         "sync the template."
    status=1
  else
    echo "ok: templates/AGENTS.md.template matches AGENTS.md content, '## Language' onward" \
         "excluding Learned Rules (no drift)"
  fi
}

# Non-blocking. rule-archive.md and SESSION_MASTER.md moved off this and onto a real hard cap
# (check_lines_warn, RULE_ARCHIVE_*/SESSION_MASTER_* below) in round 33 — this soft WATCH was
# obeyed 0% of the time across the project's history (see that constant's own comment), so an
# append-only doc that's actually read every session can no longer rely on it alone. What's left
# on this path: session-log.md (still genuinely append-only-forever by design, see round 33's
# session-log.md comment below for why a line cap doesn't fit it either) and the two code-size
# watches (subtask-gate.ts/check-caps.sh, hint param below) — splitting/refactoring code isn't
# the same move as archiving prose, so those keep getting advice that fits their own shape.
check_watch_size() {
  local file="$1" warn="$2" hint="${3:-}"
  if [ ! -f "$file" ]; then
    return 0
  fi
  local lines archive_dest
  lines=$(norm "$file" | wc -l | tr -d ' ')
  if [ "$lines" -gt "$warn" ]; then
    if [ -n "$hint" ]; then
      notice "WATCH: $file is $lines lines (no hard cap) — $hint"
    else
      archive_dest="${file%.md}-archive.md"
      notice "WATCH: $file is $lines lines (append-only, no hard cap) — move its oldest entries to" \
             "$archive_dest (per wiki/protocols/self-harness.md's PRUNE step) and leave a" \
             "one-line pointer behind"
    fi
  fi
}

# Round 11 meta-lesson (mirrors the original soulmate's own [L04]: "a mechanism that needs a
# fourth patch was the wrong shape from the second one"): the same bug — a doc/comment narrating
# a mechanism as broken/unverified after it was actually fixed — recurred 4 times (3 handoff
# docs, then README.md+subtask-gate.ts, then this very script) because each round's fix only
# re-checked the file class the *previous* audit happened to flag, never the whole repo. This
# replaces every one of those hand-picked greps with one pass over every tracked file, so there's
# no more file class left to accidentally leave out of scope.
#
# round 12(audit) + round 13(fix): this used to print WARN and never set status=1 — it ran
# automatically but enforced nothing, so a real pre-commit attempt with a stale claim staged
# landed anyway. That's the exact "mechanism narrated as more capable than it is" bug this check
# exists to catch, found inside itself. Live-tested against the current real repo before flipping
# to a hard fail (zero false positives on the actual phrase list, including inside
# FEEDBACK_PENDING.md's open table) — this is a real block now, not a reminder.
#
# round 14(audit) found 2 more bugs in this same function, live-reproduced: (1) a per-line grep
# never sees a stale phrase split across this repo's own ~90-100col hard-wrap house style — fixed
# by joining each run of non-blank lines (one wrapped paragraph) into a single string before
# matching; a blank line still ends a paragraph, so two genuinely separate claims can't bridge
# into a false match. (2) session-log.md was missing the "-archive" exemption sibling its two
# neighbors already had, so the routine archiving this repo already does for it would wrongly
# self-block — added, matching the existing pattern exactly.
#
# round 18(audit) found this had settled into "one more markdown construct per round" (fence ->
# inline-code/indent -> HTML comments + YAML frontmatter, each round finding what the last one's
# hand-rolled recognizer didn't know about). round 19: rather than add HTML-comment and
# frontmatter as two more bespoke special cases, the awk pass below now drives fence/frontmatter
# exclusion off a small (open-marker, close-marker) table — adding a future *symmetric* delimited
# construct is one table row, not new state-machine code. HTML comments are asymmetric
# (`<!--`/`-->` differ, and the common case is fully self-contained on one line, e.g.
# `<!-- todo -->`, where the surrounding prose on that same line still needs checking) so they're
# handled by their own small gsub-then-fallback block rather than forced into the symmetric
# table — that's a genuine shape difference, not laziness (same reasoning as why 4-space/tab
# indented code stayed its own per-line check instead of joining the table: it's a per-line
# property, not a delimited region with distinct start/end markers).
#
# This closes every non-prose construct found across 21 rounds of real adversarial testing
# (fenced code, indented code, inline code spans, HTML comments, YAML frontmatter). HTML-comment
# stripping in particular went through two failure shapes before landing here: round 19 added it
# as regex sub()/gsub() (missed the closing-line case entirely — round 20), round 20 patched that
# with a still-regex fix that was GREEDY and matched the wrong occurrence when a line had two
# closers (round 21). Round 21's strip_comments() replaced regex pattern-description with
# index()-based direct position search — pairing "nearest open" with "nearest close" this way
# makes matching the wrong occurrence structurally impossible, not just less likely, since
# index() has no greedy/non-greedy mode to misconfigure in the first place. Round 21's own audit
# then found one more way the false-positive-only goal could still be violated: a <!-- that never
# finds a --> ANYWHERE in the file left incmt stuck at 1 for the rest of the scan, silently
# exempting every real claim after the mistake to EOF with zero warning — round 22 closed that
# specific gap by reusing strip_comments()'s own incmt state (not a separate raw-text count, which
# was tried first and immediately produced real false positives on this repo's own docs, which
# legitimately quote "-->" in backtick spans with no real <!-- anywhere) to hard-FAIL, mirroring
# check_fence_parity's odd-fence-count treatment. The design GOAL for all 5 constructs is
# false-positive-only failure (annoying, not dangerous) — that specific unclosed-to-EOF violation
# is now closed and live-verified (round 22), but even a structurally-sounder mechanism is still a
# hand-rolled recognizer, not a proven parser, so treat the broader goal as actively defended by
# live pre-commit testing each round it's touched, not a formal guarantee that no other
# silent-miss edge exists anywhere else in it. It does NOT attempt full
# CommonMark coverage — tables, `<details>`/`<summary>` blocks, link-reference definitions, and
# any other construct nobody has hit yet are explicitly out of scope by decision, not oversight
# (see FEEDBACK_PENDING.md for the reasoning). Any of those is expected to fail as a false
# POSITIVE (blocks a legitimate commit until reworded) — the fix if one is ever hit in practice
# is either reword the line or add one row to the table above, not another audit-and-patch round.
#
# round 22's audit then found round 22's own new parity check produced a real false POSITIVE:
# comment detection ran on raw per-line text, and backtick-span stripping (the thing meant to
# make a quoted example token safe) only happened later on the joined paragraph buffer — so a
# backtick-quoted `<!--` example was misread as a genuinely unclosed opener. Same shape as
# rounds 14/18's earlier lesson (wrong pipeline order between exclusion mechanisms), recurring
# between a different pair of stages. round 23 fixed this by stripping same-line backtick spans
# BEFORE comment detection sees the raw text, on any line not already mid-comment — live-verified
# this closes the false positive without regressing round 17/18's wrap-split-code-span handling.
#
# round 22's audit also found a second, separate gap: a bare (no backticks) "<!--" in one
# paragraph can pair across a real blank-line paragraph break with an unrelated bare "-->" in a
# LATER paragraph, silently exempting real content in between. round 23 deliberately did NOT fix
# this — the obvious fix (force-close any suspected-unclosed comment at the next blank line) was
# tried and immediately broke real content: templates/FEEDBACK_PENDING.md.template and
# templates/SUBSYSTEM-learnings.md.template both have a genuine multi-paragraph instructional
# HTML comment with a blank line inside it, and there is no reliable syntactic signal that
# tells a real multi-paragraph comment apart from an accidental cross-paragraph pairing. This
# remains an accepted, documented gap (see FEEDBACK_PENDING.md).
#
# round 23's audit then found the "backtick-quoting avoids it" mitigation above is imprecise:
# same-line backtick-quoting (e.g. `<!--` alone on one line) IS verified safe — that's the round
# 23 fix. But a backtick SPAN that wraps across a hard-wrap line break (opens on one line, closes
# on the next, no blank line between — the exact legitimate authoring shape round 18 already
# proved happens in this repo's own prose style) is only protected later, at the buffer-level
# backtick-strip step that runs AFTER comment detection — so a wrap-split span containing "<!--"
# is NOT protected by this mitigation and falls under the same bare-token accepted gap above,
# live-confirmed round 23's own audit. So: backtick-quoting avoids this gap only when the quoted
# span stays on one physical line; a wrapped span offers no such guarantee.
check_stale_language() {
  local patterns=(
    "hasn't yet been" "has not yet been" "not yet verified"
    "hasn't been independently verified" "unpatched" "still unpatched"
    # Round 39: the six phrases above are English, and rounds 13-28 poured their entire effort
    # into the SCANNER (awk region handling, HTML-comment pairing, backtick spans, fence parity,
    # archive exemptions, a 42-assertion fuzz suite) while never once varying the VOCABULARY.
    # Measured: this repo's own docs — SESSION_PRIMER.md, PROJECT_BACKGROUND.md,
    # FEEDBACK_PENDING.md, session-log.md — are written in Korean, and all six phrases score 0
    # hits across all three live deployments. The sweep was reporting "ok: no possibly-stale
    # mechanism-state claims" vacuously: not because the docs were clean, but because the check
    # could not read them. This is the same species as the round 39 ambiguity-anchor finding, in
    # the opposite direction — there a detector fired where it had no signal, here one stayed
    # silent where it had no vocabulary.
    #
    # The phrase this check exists for is HANDOFF.md 3-2's real incident: a doc asserting a
    # mechanism was live when the installed hook was old. The Korean phrases below are the direct
    # equivalents of the English six and are deliberately kept just as narrow — this is a HARD
    # block, and round 13's own comment warns that a false positive here lands on Jay's routine
    # edits. Each was measured at 0 current hits across warms-mobile, the soulmate-4 template
    # (263 commits) and toss-in-app-mario-kart before being added, so adding them blocks nothing
    # that exists today. Note "아직 없음"/"아직 시작 전" (table placeholders this repo really does
    # use) deliberately do NOT match any of them.
    "미검증" "아직 검증" "검증되지 않" "미반영" "아직 반영" "아직 확인"
  )
  # Files whose entire purpose is to narrate what used to be true (this repo's own 4-tier doc
  # role separation, see AGENTS.md) — a stale-sounding phrase describing a past round here is
  # usually correct, not a bug. This script and tests/stale-language.fuzz.test.mjs are both
  # exempt from this check themselves (both necessarily quote these exact phrases as literal
  # fixtures to define/test them — caught live when this fuzz test's own commit tripped the
  # check it introduces, round 16).
  #
  # round 16 built a generic "*-archive.md" wildcard so a future PRUNE-archived file (see
  # check_watch_size(): archive_dest="${file%.md}-archive.md") wouldn't need a code change to be
  # recognized — but round 16's own audit then found the wildcard silently exempts ANY file that
  # happens to end in "-archive.md" for an unrelated reason (e.g. a real "wiki/deploy-archive.md"
  # deployment manifest, still-current content, wrongly swallowed as historical). Narrowed back
  # to the 3 known stems this repo's PRUNE convention actually produces, each with an explicit
  # "-archive" sibling — closes the collision risk entirely (an unrelated file matches none of
  # these) while losing zero real coverage (no other stem has ever been archived here).
  #
  # Round 28 (external review, FEEDBACK_PENDING row #39, S3): round 27's own PRUNE of
  # FEEDBACK_PENDING.md's "## Completed history" created wiki/feedback-archive.md — a 4th archive
  # file this list never learned about, since it didn't follow the "${file%.md}-archive.md"
  # convention self-harness.md:25-28 names (it should have been FEEDBACK_PENDING-archive.md, a
  # sibling of FEEDBACK_PENDING.md the same way rule-archive-archive.md is a sibling of
  # rule-archive.md). The next PRUNE touching that file would have hard-blocked on its own
  # historical content. Fixed by renaming the file to match the convention (not by widening the
  # regex back to a wildcard — round 16's own history above is exactly why that direction is
  # rejected) and adding it as a 4th enumerated stem, same shape as the other 3.
  local exempt='^(wiki/handoffs/SESSION_MASTER(-archive)?\.md|wiki/rule-archive(-archive)?\.md|wiki/session-log(-archive)?\.md|wiki/FEEDBACK_PENDING-archive\.md|scripts/check-caps\.sh|tests/stale-language\.fuzz\.test\.mjs)$'
  # round 13: FEEDBACK_PENDING.md used to be exempt whole-file — its open table legitimately uses
  # this language for real current gaps, but its "## Completed history" section (below a clean
  # heading boundary the repo already relies on elsewhere) is exactly as historical as the other
  # exempt files. Split instead of blanket-exempting, now that a false positive here would be a
  # real hard block on Jay's own routine feedback edits, not just a warning to skim past.
  local fp_file="wiki/handoffs/FEEDBACK_PENDING.md" fp_history_line=999999999
  if [ -f "$fp_file" ]; then
    fp_history_line=$(grep -n '^## Completed history' "$fp_file" | head -1 | cut -d: -f1)
    [ -z "$fp_history_line" ] && fp_history_line=999999999
  fi
  local hit=0
  local file
  while IFS= read -r file; do
    [[ "$file" =~ $exempt ]] && continue
    [ -f "$file" ] || continue
    while IFS=: read -r startline block; do
      [ -z "$block" ] && continue
      if [ "$block" = "__STALE_LANG_UNCLOSED_COMMENT__" ]; then
        # round 22: an <!-- that never finds a --> anywhere in the file (via the SAME index()
        # pairing strip_comments() already uses, not a separate raw-text count -- a naive
        # grep -c '<!--' vs grep -c '\-\->' count was tried first and immediately produced real
        # false positives on this repo's own SESSION_PRIMER.md/FEEDBACK_PENDING.md, both of which
        # legitimately contain standalone `-->` INSIDE inline-code spans documenting this exact
        # bug's own regex, with no <!-- anywhere in the file -- that's not an unclosed comment,
        # it's prose about one. Reusing strip_comments()'s own incmt state sidesteps this because
        # it only starts counting after it actually finds a real <!--, exactly like the normal
        # match path already does) leaves incmt=1 for the rest of the file -- every real claim
        # after it goes unswept, unbounded, unwarned (round 21's audit finding). Same shape as
        # check_fence_parity's odd-fence-count check: fail loudly before trusting any count in
        # this file, rather than silently trusting a scan that already broke.
        hit=1
        status=1
        echo "OVER CAP: $file has an HTML comment (\`<!--\`) that never closes anywhere in the file — fix the markdown before trusting the stale-language sweep on this file"
        continue
      fi
      if [ "$file" = "$fp_file" ] && [ "$startline" -ge "$fp_history_line" ]; then
        continue
      fi
      local pat matched="" lower_block="${block,,}"
      for pat in "${patterns[@]}"; do
        case "$lower_block" in *"${pat,,}"*) matched="$pat" ;; esac
        [ -n "$matched" ] && break
      done
      if [ -n "$matched" ]; then
        hit=1
        status=1
        echo "OVER CAP: possibly-stale mechanism-state claim in $file:$startline — \"$(printf '%s' "$block" | cut -c1-160)\" — verify it's still true, or if it's describing a past round move it into historical narrative (wiki/rule-archive.md / SESSION_MASTER.md)"
      fi
    done < <(awk '
      # generic delimited-region table (round 19) — o[i]/c[i] are symmetric open==close markers
      # (whole line IS the delimiter, never carries sibling prose, so a match just toggles
      # region state and consumes the line). Add a future symmetric construct here, not as new
      # code. lineonly[i] restricts a marker to line 1 only (frontmatter: a bare "---" later in
      # a file is a markdown horizontal rule, not a frontmatter boundary).
      BEGIN{
        buf=""; startline=0; region=0; incmt=0
        n=2
        o[1]="^```";               c[1]="^```";               lineonly[1]=0
        o[2]="^---[[:space:]]*$";  c[2]="^---[[:space:]]*$";  lineonly[2]=1
      }
      # round 21: HTML-comment stripping rewritten from regex sub()/gsub() to index()-based
      # direct position search. The old sub(/^.*-->/, "", $0) on a multi-line comment closing
      # line was GREEDY (POSIX ERE .* always matches as much as possible, and awk has no
      # non-greedy quantifier) -- a line with a trailing same-line comment after the true close
      # (still commented --> real claim. <!-- todo -->) consumed through the LAST closer,
      # silently swallowing "real claim." (round 20 finding, a genuine silent miss). index()
      # finds the FIRST occurrence by definition, so pairing nearest-open with nearest-close
      # this way makes matching the wrong occurrence structurally impossible, not just less
      # likely -- replaces both the old same-line and closing-line branches with one procedure.
      function strip_comments(s,    out, p, q) {
        out = ""
        if (incmt) {
          q = index(s, "-->")
          if (q == 0) return ""
          s = substr(s, q + 3)
          incmt = 0
        }
        while (1) {
          p = index(s, "<!--")
          if (p == 0) { out = out s; break }
          out = out substr(s, 1, p - 1)
          q = index(substr(s, p + 4), "-->")
          if (q == 0) { incmt = 1; break }
          s = substr(s, p + q + 6)
        }
        return out
      }
      region>0 { if ($0 ~ c[region]) region=0; next }
      {
        # round 23: fence/frontmatter region-open is checked on the RAW line, before any
        # stripping -- gsub-ing backticks first could otherwise mangle a literal "```" fence
        # delimiter (a "`[^`]*`" match eats 2 of its 3 backticks, e.g. turning "```python"
        # into "`python") and silently break fence detection. Only checked on a genuinely
        # fresh line (not mid-comment-continuation), matching the precedence this already
        # had before round 23 -- a line that is still resolving a prior line unclosed "<!--"
        # only ever gets scanned for its closer, same as always.
        was_incmt = incmt
        if (!was_incmt) {
          for (i=1;i<=n;i++) {
            if (lineonly[i] && NR!=1) continue
            if ($0 ~ o[i]) { region=i; next }
          }
          # round 23: strip same-line backtick spans BEFORE comment detection sees the raw
          # text, so a backtick-quoted example token like `<!--` can never be mistaken for a
          # real unclosed opener (round 22 audit finding: this repo own established "quote
          # it in backticks to be safe" convention gave zero protection here before). A span
          # split across a wrap (opening backtick on this line, closing on a later one) is not
          # caught by this early pass -- it is still caught by the existing buffer-level gsub
          # at flush time below, unchanged since round 18.
          gsub(/`[^`]*`/, "", $0)
        }
        $0 = strip_comments($0)
        if (incmt) next
      }
      /^[[:space:]]*$/ {
        if (buf!="") { gsub(/`[^`]*`/, "", buf); print startline":"buf }
        buf=""; next
      }
      /^(    |\t)/ { next }
      {
        line=$0
        gsub(/[ \t]+/, " ", line)
        if (buf=="") startline=NR
        buf = buf (buf=="" ? "" : " ") line
      }
      END{
        if (buf!="") { gsub(/`[^`]*`/, "", buf); print startline":"buf }
        if (incmt) print "-1:__STALE_LANG_UNCLOSED_COMMENT__"
      }
    ' "$file")
  done < <(git grep -Il '' -- . 2>/dev/null || true)
  if [ "$hit" -eq 0 ]; then
    echo "ok: stale-language sweep — no possibly-stale mechanism-state claims found outside historical narrative"
  fi
}

# Round 41 (Jay's own observation, not an audit): real dev work accumulates scratch/dummy/stale
# artifacts with nothing ever prompting a look back at them — a build dir cloned "-new" and never
# reconciled with the original, a leftover test script, a duplicated directory. Concrete instance
# on this project's own machine: llama.cpp-new, cloned at some point, never actually needed
# (round 41 measured the original build already loads/serves the exact model+mmproj that
# "required" the new clone), sitting untouched until today. That's outside this repo's own scope
# to fix (a sibling directory, not a git-tracked file here) — what IS in scope is making sure a
# NEW instance of the same pattern, inside a project this harness governs, doesn't just
# accumulate silently the same way.
#
# Non-blocking, same criterion as every other soft check in this file: annoying if wrong, never
# dangerous, so WATCH not a hard fail — this is a fresh, unaudited mechanism, and round 39's own
# lesson (a detector calibrated on the wrong vocabulary can run "clean" for 16 rounds while
# actually blind) argues for starting conservative, not confident. Matches names, not content —
# deliberately narrow to avoid false positives on this project's own real files: tests/*.test.mjs,
# wiki/*-archive.md, and templates/*.template are the established, intentional naming conventions
# for those roles and must not match. Live-tested against this repo's own full tracked+untracked
# listing before shipping: 0 hits (see wiki/rule-archive.md Round 41 for the positive-case table
# that proves the pattern isn't just tautologically empty).
check_artifact_sweep() {
  local pattern='(^|/)([A-Za-z0-9_.]*[-_](new|old|bak|backup|copy)|scratch[-_A-Za-z0-9]*|tmp[-_A-Za-z0-9]*|dummy[-_A-Za-z0-9]*)($|/|\.[A-Za-z0-9]+$)'
  local hits
  hits=$( { { git ls-files; git ls-files --others --exclude-standard; } 2>/dev/null \
    | grep -viE '\.test\.mjs$|-archive\.md$|\.template$' \
    | grep -iE "$pattern" | sort -u; } || true )
  if [ -n "$hits" ]; then
    local n first
    n=$(echo "$hits" | wc -l | tr -d ' ')
    first=$(echo "$hits" | head -3 | tr '\n' ' ')
    notice "WATCH: $n path(s) look like scratch/dummy/stale artifacts by name" \
           "(matched -new/-old/-backup/-copy/scratch*/tmp*/dummy*, e.g. $first) — review at" \
           "wiki/protocols/self-harness.md's PRUNE step: delete it, or promote it (real name +" \
           "a commit explaining why it's staying)"
  fi
}

run_bootstrap_checks() {
  check_bootstrap_is_repo_root
  check_bootstrap_not_in_tmp
  check_bootstrap_own_git_identity
  check_bootstrap_no_inherited_history
  check_bootstrap_hook_installed "pre-commit" "scripts/pre-commit-check-caps" "the staged-file-count/doc-cap/secret-scan safety net isn't installed."
  check_bootstrap_hook_installed "post-commit" "scripts/post-commit-subtask-report" "the sub-task report generator (scripts/subtask-report.sh) never fires."
  check_bootstrap_no_leftover_clone
  check_prompts_present
  check_feedback_template_header
  check_bootstrap_no_uncommitted
  check_bootstrap_forbidden_string "wiki/handoffs/SESSION_PRIMER.md" \
    "session-handoff harness template for coding agents" \
    "wiki/handoffs/SESSION_PRIMER.md still has this seed repo's own self-description (\"session-handoff harness template for coding agents\") — looks like the raw clone's wiki/ is being used as the project instead of copying templates/SESSION_PRIMER.md.template and writing this project's own state into it" \
    "bootstrap — wiki/handoffs/SESSION_PRIMER.md doesn't look like this seed repo's own untouched wiki"
  check_bootstrap_forbidden_string "AGENTS.md" \
    "[project name]" \
    "AGENTS.md still has the literal placeholder \"[project name]\" -- fill in the real project name" \
    "bootstrap — AGENTS.md placeholders filled in"
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
    echo "(.kilo/plugins/subtask-gate.ts, via Kilo's tool.execute.before hook) — independently"
    echo "verified live against a fresh bootstrap output twice (rounds 9 and 10), not just in"
    echo "this repo's own dogfooded copy. Re-run templates/harness-integration-test.md's Step 5"
    echo "yourself if you want to reconfirm it on your own project rather than trust this claim."
  fi
}

if [ "${1:-}" = "--bootstrap-check" ]; then
  run_bootstrap_checks
  exit $status
fi

check_lines_warn "README.md" "$README_CAP" "$README_CAP" "README.md"
check_chars "README.md" "$README_CHAR_CAP" "README.md"
check_prompts_present
check_fence_parity "AGENTS.md"
check_lines_warn "AGENTS.md" "$AGENTS_MD_WARN" "$AGENTS_MD_CAP" "AGENTS.md total"
check_chars "AGENTS.md" "$AGENTS_MD_CHAR_CAP" "AGENTS.md total"
check_section "AGENTS.md" "## File map" "$FILE_MAP_ROW_CAP" "File Map" "rows"
check_section "AGENTS.md" "## Learned Rules" "$LEARNED_RULES_CAP" "Learned Rules" "entries"
check_section "AGENTS.md" "## Fixed Rules" "$FIXED_RULES_ROW_CAP" "Fixed Rules" "rows"
check_template_drift
check_lines_warn "wiki/PROJECT_BACKGROUND.md" "$PROJECT_BACKGROUND_CAP" "$PROJECT_BACKGROUND_CAP" "PROJECT_BACKGROUND.md"
check_chars "wiki/PROJECT_BACKGROUND.md" "$PROJECT_BACKGROUND_CHAR_CAP" "PROJECT_BACKGROUND.md"
check_lines_warn "wiki/handoffs/SESSION_PRIMER.md" "$SESSION_PRIMER_CAP" "$SESSION_PRIMER_CAP" "SESSION_PRIMER.md"
check_chars "wiki/handoffs/SESSION_PRIMER.md" "$SESSION_PRIMER_CHAR_CAP" "SESSION_PRIMER.md"
check_primer_subtask_heading
check_primer_handoff_reminder
# Round 33: rule-archive.md/SESSION_MASTER.md moved off the soft WATCH (check_watch_size) and
# onto a real hard cap — see RULE_ARCHIVE_*/SESSION_MASTER_* above for the numbers' justification.
check_lines_warn "wiki/rule-archive.md" "$RULE_ARCHIVE_WARN" "$RULE_ARCHIVE_CAP" "wiki/rule-archive.md"
check_lines_warn "wiki/handoffs/SESSION_MASTER.md" "$SESSION_MASTER_WARN" "$SESSION_MASTER_CAP" "wiki/handoffs/SESSION_MASTER.md"
check_watch_size "wiki/session-log.md" 200
# Round 33 item 2: same line-vs-bytes gap FEEDBACK_ROW_CHAR_CAP already closes (see
# SESSION_LOG_ROW_CHAR_CAP above) — a single runaway session-log.md row could keep the WATCH
# above structurally unreachable indefinitely without this.
check_row_char_cap "wiki/session-log.md" "$SESSION_LOG_ROW_CHAR_CAP" \
  "condense this session's row to a real one-paragraph summary; move detailed narrative to wiki/rule-archive.md or wiki/handoffs/SESSION_MASTER.md instead"
# Round 28 (external review, FEEDBACK_PENDING row #39, S4): code files had zero size monitoring
# at all — .kilo/plugins/subtask-gate.ts grew 230->482 lines (+110%) and scripts/check-caps.sh
# itself grew 455->738+ lines (+62%+) across this project's own 28 rounds, unwatched the whole
# way. Reusing check_watch_size's "-archive.md" advice would be nonsense for code (you split/
# refactor a plugin, you don't move its oldest lines to a same-named archive file) — the new
# optional hint param lets these two get advice that actually fits.
check_watch_size ".kilo/plugins/subtask-gate.ts" 400 \
"this is mechanical enforcement code, not append-only narrative — review for a genuinely splittable concern (e.g. one hook's worth of logic into its own module) during self-harness's PRUNE step, don't just let it accumulate"
check_watch_size "scripts/check-caps.sh" 600 \
"this script itself has never been pruned in 28 rounds of additions — during self-harness's PRUNE step, check whether any closed-out finding's fix (e.g. a narrowly-scoped one-round check) can be merged into a more general one instead of living forever as its own function"
check_stale_language
check_artifact_sweep

shopt -s nullglob
feedback_files=(wiki/handoffs/FEEDBACK_PENDING*.md)
shopt -u nullglob

if [ ${#feedback_files[@]} -eq 0 ]; then
  echo "skip: no wiki/handoffs/FEEDBACK_PENDING*.md found"
else
  for f in "${feedback_files[@]}"; do
    check_fence_parity "$f"
    check_chars "$f" "$FEEDBACK_PENDING_CHAR_CAP" "$f total"

    # Flow rule (round 28 item 4): each open-table data row (starts "| <number or N/M> |") over
    # FEEDBACK_ROW_CHAR_CAP chars means real narrative belongs in wiki/rule-archive.md, not here
    # — a real block, "기계적으로 강제" per item 4's own spec, same as every other char cap in
    # this file. Move the row's evidence/reproduction/root-cause text to a "Round N" section in
    # wiki/rule-archive.md and leave only symptom + status + a pointer here.
    check_row_char_cap "$f" "$FEEDBACK_ROW_CHAR_CAP" \
      'move its full narrative to wiki/rule-archive.md ("Round N" section) and leave a pointer, per the flow rule (item 4)'

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
        "archive into wiki/FEEDBACK_PENDING-archive.md"
    fi
  done
fi

check_required_read_total AGENTS.md wiki/handoffs/SESSION_PRIMER.md \
  wiki/PROJECT_BACKGROUND.md wiki/handoffs/FEEDBACK_PENDING.md

# Round 33 item 3: flush the buffered WARN/WATCH/reminder notices in full whenever there's an
# actual reason to (something is blocking this commit, or --verbose was asked for) — otherwise
# collapse them into one summary line so a clean commit's routine output stays short. Detection
# power is unchanged either way: every OVER CAP/FAIL above already printed immediately and set
# status=1, regardless of this.
if [ "${#NOTICES[@]}" -gt 0 ]; then
  if [ "$status" -ne 0 ] || [ "$VERBOSE" = "1" ]; then
    printf '%s\n' "${NOTICES[@]}"
  else
    echo "(${#NOTICES[@]} non-blocking notice(s) suppressed — rerun with --verbose to see them)"
  fi
fi

exit $status

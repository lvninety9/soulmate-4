#!/usr/bin/env bash
# Scripted, k/N-scored version of templates/harness-integration-test.md's Steps 1-6.
#
# Round 28 (external review, FEEDBACK_PENDING row #39, S7): the doc it's built from is already a
# machine-checkable benchmark (pass conditions like "first tool call fails with [subtask-gate]",
# "multiple small commits, NOT one") but had gone 28 rounds without ever actually being run as a
# repeatable script — every round scored the harness with a subjective /100 instead. This
# replaces that with a real number: N fresh live trials per step, k/N passed, no human judgment
# call in the loop for the mechanical steps (4, 5, 6). Steps 1-3 still need light text-heuristic
# grading since they check what the model *said*, not just repo state — documented per-step below,
# and every raw transcript is kept on disk so a human (or Opus) can re-grade by hand.
#
# Usage: scripts/harness-integration-test.sh [N] [work_dir]
#   N        number of fresh trials per step (default 5, per FEEDBACK_PENDING row #39's H2)
#   work_dir base directory for throwaway bootstrapped projects (default /tmp/sm4-hit)
#
# Requires: kilo on PATH or $KILO_BIN set, a running local model backend, this repo's own
# scripts/bootstrap.sh. Never run this against the seed repo itself — every trial bootstraps a
# fresh throwaway project, same as templates/harness-integration-test.md's own Step 0 warning.

set -uo pipefail

SEED_REPO="$(cd "$(dirname "$0")/.." && pwd)"
N="${1:-5}"
WORK_DIR="${2:-/tmp/sm4-hit}"
KILO="${KILO_BIN:-kilo}"
# Pinned to the local model on purpose — this project's whole point is a local-model-shaped
# harness (RTX 3080, hard context ceiling), not whichever cloud model kilo defaults to. Override
# with KILO_MODEL if your kilo.jsonc names it differently.
MODEL="${KILO_MODEL:-qwen-3-6/Qwen3.6-35B-A3B-UD-Q3_K_M.gguf}"

if ! command -v "$KILO" >/dev/null 2>&1; then
  echo "kilo not found on PATH (set KILO_BIN=/path/to/kilo) — cannot run live trials." >&2
  exit 1
fi

mkdir -p "$WORK_DIR"
declare -A pass
for step in 1 2 3 4 5 6; do pass[$step]=0; done

# Smoke-test round-trip found a real agentic turn (multi-file read + reasoning) takes low
# single-digit minutes on this RTX 3080 / Qwen3.6-35B-A3B-Q3_K_M setup, well past a "quick
# question" latency — 600s per call is generous headroom, not a guess.
STEP_TIMEOUT_S="${STEP_TIMEOUT_S:-600}"

run_step() {
  # run_step <target_dir> <continue_flag: new|cont> <message...>
  local target="$1" flag="$2"; shift 2
  if [ "$flag" = "new" ]; then
    timeout "$STEP_TIMEOUT_S" "$KILO" run --dir "$target" -m "$MODEL" "$@" 2>&1
  else
    timeout "$STEP_TIMEOUT_S" "$KILO" run --dir "$target" -m "$MODEL" -c "$@" 2>&1
  fi
}

for i in $(seq 1 "$N"); do
  target="$WORK_DIR/trial-$i"
  log="$WORK_DIR/trial-$i.log"
  rm -rf "$target"
  echo "=== trial $i/$N: bootstrapping $target ===" | tee "$log"

  if ! bash "$SEED_REPO/scripts/bootstrap.sh" "$target" >>"$log" 2>&1; then
    echo "trial $i: bootstrap failed, skipping this trial for all steps" | tee -a "$log"
    continue
  fi
  ( cd "$target" && git config user.name "harness-integration-test" \
      && git config user.email "test@local" ) >>"$log" 2>&1

  real_cap=$(grep -oP 'this file ≤\K[0-9]+' "$target/AGENTS.md" | head -1)

  # --- Step 1: does AGENTS.md actually auto-load? ---
  out1=$(run_step "$target" new \
    "Without me telling you anything about this project, what does your AGENTS.md say your Language rule is, and what's the exact cap number on this file itself?")
  echo "--- step1 ---" >>"$log"; echo "$out1" >>"$log"
  if echo "$out1" | grep -qi "korean" && [ -n "$real_cap" ] && echo "$out1" | grep -q "$real_cap"; then
    pass[1]=$((pass[1]+1))
  fi

  # --- Step 2: rule-zero (grep vs whole-file read, JUDGED against AGENTS.md's own ~50-line
  # threshold — not "did it grep" in isolation). Smoke-test round-trip caught a real scripting
  # bug here: a fresh bootstrap's FEEDBACK_PENDING.md is genuinely under 20 lines, so "I read the
  # whole file, it's well under Rule Zero's ~50-line threshold" is the CORRECT answer, not a
  # failure — the original grading (any "whole file" mention = fail) would have punished a model
  # for reasoning about the actual rule correctly. Re-measure the real file's line count each
  # trial and grade against it instead of a fixed expectation.
  fp_lines=$( (cd "$target" && wc -l < wiki/handoffs/FEEDBACK_PENDING.md 2>/dev/null) || echo 0)
  out2=$(run_step "$target" cont \
    "Read wiki/handoffs/FEEDBACK_PENDING.md and tell me how many open items it has and what the highest-priority one is. Then tell me: did you read the whole file, or search/grep for a specific part, and why?")
  echo "--- step2 ---" >>"$log"; echo "$out2" >>"$log"
  echo "(real file line count this trial: $fp_lines)" >>"$log"
  if [ "$fp_lines" -gt 50 ]; then
    if echo "$out2" | grep -qiE "search|grep|specific (part|section)|not the whole" \
       && ! echo "$out2" | grep -qiE "read the whole|entire file"; then
      pass[2]=$((pass[2]+1))
    fi
  else
    if echo "$out2" | grep -qiE "read the whole|entire file" \
       && echo "$out2" | grep -qiE "rule zero|50.?line|under|short|small"; then
      pass[2]=$((pass[2]+1))
    fi
  fi

  # --- Step 3: "discuss" on an ambiguous ask — clarifying questions, not straight to code ---
  out3=$(run_step "$target" cont \
    "discuss: add a small CLI tool to this project — a word counter you can run from the command line.")
  echo "--- step3 ---" >>"$log"; echo "$out3" >>"$log"
  # Heuristic: a real question mark present, and no sign it already wrote/edited a file this turn.
  if echo "$out3" | grep -q '?' && ! echo "$out3" | grep -qiE "tool_use.*(write|edit)|Wrote to|Edited "; then
    pass[3]=$((pass[3]+1))
  fi

  # Human's answer to Step 3's clarifying questions — deviates from templates/
  # harness-integration-test.md's exact wording on purpose. A 2nd smoke-test round-trip found
  # the doc's own original phrasing ("one basic test file") scopes to only 2 files, which
  # design.md's own rule ("Skip for a small, clearly-scoped task: go straight to build.md, no
  # ceremony") correctly treats as build-only — the model skipped design entirely and went
  # straight to a correct, real 2-commit build, then reported already being done when asked to
  # "design" and "build" again. That's the harness working as documented, not a bug (Opus row
  # #39's own H1: don't file a finding you can't phrase as "the model misbehaved in scenario X")
  # — but it meant this test's Step 4/5/6 never got the scenario they're meant to check. Scoped
  # explicitly to 3+ files here so design.md's own "3+ files" trigger applies unambiguously.
  run_step "$target" cont \
    "Python, argparse. Split into 3 files: tools/wordcount.py (CLI entry point), tools/wordcount_core.py (the actual counting logic, importable on its own), tests/test_wordcount.py (tests for the core module)." >/dev/null

  # --- Step 4: "design" — plan + sub-task block written + committed, then it should stop ---
  before4=$( (cd "$target" && git rev-parse HEAD) )
  out4=$(run_step "$target" cont "design")
  echo "--- step4 ---" >>"$log"; echo "$out4" >>"$log"
  after4=$( (cd "$target" && git rev-parse HEAD) )
  primer_has_subtask=$( (cd "$target" && grep -c '^## Current sub-task' wiki/handoffs/SESSION_PRIMER.md 2>/dev/null) || echo 0)
  subtask_body=$( (cd "$target" && sed -n '/^## Current sub-task/,/^## /p' wiki/handoffs/SESSION_PRIMER.md 2>/dev/null) )
  if [ "$before4" != "$after4" ] && [ "$primer_has_subtask" -ge 1 ] \
     && ! echo "$subtask_body" | grep -q '<exact files/greps'; then
    pass[4]=$((pass[4]+1))
  fi

  # --- Step 5: the sub-task gate, live — first tool call this turn must be blocked ---
  out5=$(run_step "$target" cont "continue")
  echo "--- step5 ---" >>"$log"; echo "$out5" >>"$log"
  if echo "$out5" | grep -q '\[subtask-gate\]'; then
    pass[5]=$((pass[5]+1))
  fi

  # --- Step 6: "build" — multiple small commits, not one bundling everything ---
  before6=$( (cd "$target" && git rev-list --count HEAD) )
  out6=$(run_step "$target" cont "build")
  echo "--- step6 ---" >>"$log"; echo "$out6" >>"$log"
  after6=$( (cd "$target" && git rev-list --count HEAD) )
  new_commits=$((after6 - before6))
  if [ "$new_commits" -ge 2 ]; then
    pass[6]=$((pass[6]+1))
  fi

  echo "trial $i done: step1=${pass[1]} step2=${pass[2]} step3=${pass[3]} step4=${pass[4]} step5=${pass[5]} step6=${pass[6]} (cumulative)"
done

echo
echo "=== harness-integration-test.sh results: $N trial(s) ==="
printf '%-45s %s\n' "Step 1 (AGENTS.md auto-load)"         "${pass[1]}/$N"
printf '%-45s %s\n' "Step 2 (rule-zero grep, not whole-read)" "${pass[2]}/$N"
printf '%-45s %s\n' "Step 3 (discuss asks, doesn't build)"  "${pass[3]}/$N"
printf '%-45s %s\n' "Step 4 (design writes+commits sub-task)" "${pass[4]}/$N"
printf '%-45s %s\n' "Step 5 (subtask-gate blocks live)"      "${pass[5]}/$N"
printf '%-45s %s\n' "Step 6 (build: multiple commits)"       "${pass[6]}/$N"
echo
echo "Raw transcripts: $WORK_DIR/trial-*.log (re-grade steps 1-3 by hand if a k/N looks off —"
echo "their pass conditions are text heuristics on the model's own wording, not pure repo state,"
echo "same limitation this whole benchmark's Steps 1/2/3/7/8 have always had)."

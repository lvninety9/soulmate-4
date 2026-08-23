#!/usr/bin/env bash
# Round 29 item 6, axis C (work order): "where does this stack stop working" — escalates task
# complexity one step at a time inside the SAME bootstrapped project per trial (unlike
# harness-integration-test.sh's 6 fixed steps on one scenario, this cascades through 5
# increasingly demanding levels).
#
# Round 30 item 6 (work order): the original design stopped a trial's ladder at its first real
# failure, so N collapses level over level (round 29's own numbers: L1=5, L2=5, L3=4, L4=2, L5=1)
# — but results were reported as a per-level rate (2/4, 1/2, 0/1) as if each were its own clean
# measurement. That's a CUMULATIVE rate ("probability of reaching level N in one session"), not a
# MARGINAL rate ("probability of succeeding at level N starting from a clean, already-set-up
# state") — the latter is what finding the real knee needs, and the former silently drops sample
# size level over level, which is a different thing being reported under the same k/N shape.
#
# Fixed here: each level gets its own dedicated N=5 fresh trials (5 levels x N=5 = 25 total
# executions, each a fresh bootstrap). A trial testing level L drives through levels 1..L-1's
# prompts first as UNSCORED setup (state level L's task needs to make sense — e.g. level 3's
# refactor prompt needs level 2's files to exist) — only level L's own outcome is scored. Setup
# prompts are not graded and their success/failure is not used to skip or short-circuit anything;
# this deliberately does NOT try to reuse a shared trial's earlier-level artifacts across levels,
# since that's exactly the cascading structure that caused the N mismatch in the first place.
#
# Levels (fixed, not regenerated per run, same reproducibility reasoning as
# harness-integration-test.sh's SCENARIOS):
#   1. 1 file            — a single small CLI script, no split
#   2. 3 files            — CLI entry + core logic + test (same shape as the existing harness
#                            bench's own scenarios)
#   3. 3 files + refactor — add docstring + type hints to the core module without changing
#                            behavior, tests must stay green
#   4. + tests             — add a genuinely new edge-case test, must pass
#   5. multi-sub-task chain — a second, different 3-file tool, THEN (as an explicit new sub-task)
#                            a script that imports and demos both tools — tests whether the gate
#                            correctly checkpoints a real multi-commit chain, not just one prompt
#
# Every check below is deterministic (file exists, real command exit code, pytest result) — no
# LLM-judged text heuristics, unlike harness-integration-test.sh's Steps 1-3.
#
# Usage: scripts/complexity-ladder-test.sh [N] [work_dir]
#   N        number of fresh trials PER LEVEL (default 5) — total executions = 5 * N
#   work_dir base directory for throwaway bootstrapped projects (default /tmp/sm4-ladder)
#
# Requires: kilo on PATH or $KILO_BIN set, a running local model backend, this repo's own
# scripts/bootstrap.sh. Never run this against the seed repo itself.
# Round 30 note (GPU-shared-with-Hermes constraint, PROJECT_BACKGROUND.md's own schedule table):
# 25 executions at ~1-10 min each can run well over an hour — schedule outside 11:00-19:00 KST
# and watch for the 19:30 forced shutdown timer, same as any other live-trial run this project does.

set -uo pipefail

SEED_REPO="$(cd "$(dirname "$0")/.." && pwd)"
N="${1:-5}"
WORK_DIR="${2:-/tmp/sm4-ladder}"
KILO="${KILO_BIN:-kilo}"
MODEL="${KILO_MODEL:-qwen-3-6/Qwen3.6-35B-A3B-UD-Q4_K_M.gguf}"
STEP_TIMEOUT_S="${STEP_TIMEOUT_S:-600}"

if ! command -v "$KILO" >/dev/null 2>&1; then
  echo "kilo not found on PATH (set KILO_BIN=/path/to/kilo) — cannot run live trials." >&2
  exit 1
fi

mkdir -p "$WORK_DIR"

# name|build_scope (3-file split description, same shape as harness-integration-test.sh's own
# SCENARIOS) — cycled by trial index for variety across trials, same reproducibility reasoning.
LADDER_SCENARIOS=(
  "wordcount|Python, argparse. Split into 3 files: tools/wordcount.py (CLI entry point), tools/wordcount_core.py (the actual counting logic, importable on its own), tests/test_wordcount.py (tests for the core module)."
  "tempconvert|Python, argparse. Split into 3 files: tools/tempconvert.py (CLI entry point), tools/tempconvert_core.py (the actual C/F/K conversion logic, importable on its own), tests/test_tempconvert.py (tests for the core module)."
  "pwgen|Python, argparse. Split into 3 files: tools/pwgen.py (CLI entry point), tools/pwgen_core.py (the actual password generation logic, importable on its own), tests/test_pwgen.py (tests for the core module)."
)

run_step() {
  # run_step <target_dir> <continue_flag: new|cont> <message...>
  local target="$1" flag="$2"; shift 2
  if [ "$flag" = "new" ]; then
    timeout "$STEP_TIMEOUT_S" "$KILO" run --dir "$target" -m "$MODEL" "$@" 2>&1
  else
    timeout "$STEP_TIMEOUT_S" "$KILO" run --dir "$target" -m "$MODEL" -c "$@" 2>&1
  fi
}

pytest_green() {
  local target="$1"
  (cd "$target" && python3 -m pytest tests/ -q) >/dev/null 2>&1
}

# Round 29 live run found two real bugs here, both from the original grep-based version — kept
# fixed as-is in the round 30 redesign, unrelated to the N-mismatch fix above:
# (1) `grep -c PATTERN file || echo 0` double-prints when grep finds zero matches — grep still
#     exits 1 ("no match") even though it already printed "0", so the `||` fallback ALSO fires,
#     producing "0\n0" (collapsed to "0 0" by the command substitution), which crashes the later
#     `-gt` integer comparison. Fixed below with `${var:-0}` instead of a chained `|| echo`.
# (2) `grep -c '^def test_'` is blind to class-based test organization (`class Foo:` with indented
#     `def test_...` methods) — `pytest --collect-only` counts real collected test items
#     regardless of function/class/parametrized style, so this replaces the regex entirely.
count_tests() {
  local target="$1" file="$2"
  local n
  n=$( (cd "$target" && python3 -m pytest "$file" --collect-only -q 2>/dev/null) | grep -c '::' )
  echo "${n:-0}"
}

LEVEL1_PROMPT="add a small CLI tool to this project — tools/reverse_string.py, argparse, takes one string argument and prints it reversed to stdout. Single file, no separate test file needed for this one."
LEVEL3_PROMPT_TMPL="refactor: add a module-level docstring to tools/%s_core.py describing what it does, and add type hints to its primary function's signature. Do not change behavior — all existing tests must still pass."
LEVEL4_PROMPT_TMPL="add at least one new test case to tests/test_%s.py covering an edge case (e.g. empty input, invalid input, or a boundary value) not already covered. Make sure it passes."
LEVEL5A_PROMPT="add a second, different small CLI tool to this project: tools/rot13.py (CLI entry point) + tools/rot13_core.py (the ROT13 cipher logic) + tests/test_rot13.py (tests). Same 3-file pattern as before. Commit each file separately as you finish it, then stop and summarize before doing anything else."
LEVEL5B_PROMPT_TMPL="Now, as a new sub-task: add tools/run_all.py that imports both %s_core and rot13_core, and prints one demo line from each when run."

# Drives a fresh trial through levels 1..(setup_through)'s prompts, unscored — building the repo
# state a later level's own prompt needs to make sense. Used both for setup (setup_through =
# target level - 1) and, by the caller passing the full target level, to also fire that level's
# own prompt as the final (this time scored by the caller) step. flag starts "new" (first message
# in a fresh session) and becomes "cont" after.
run_levels_through() {
  local target="$1" through="$2" scenario_name="$3" build_scope="$4"
  local flag="new"
  local lvl=1
  while [ "$lvl" -le "$through" ]; do
    case "$lvl" in
      1) run_step "$target" "$flag" "$LEVEL1_PROMPT" >/dev/null ;;
      2) run_step "$target" "$flag" \
           "add a small CLI tool to this project — a ${scenario_name} tool you can run from the command line. $build_scope" >/dev/null ;;
      3) run_step "$target" "$flag" "$(printf "$LEVEL3_PROMPT_TMPL" "$scenario_name")" >/dev/null ;;
      4) run_step "$target" "$flag" "$(printf "$LEVEL4_PROMPT_TMPL" "$scenario_name")" >/dev/null ;;
      5)
        run_step "$target" "$flag" "$LEVEL5A_PROMPT" >/dev/null
        run_step "$target" cont "$(printf "$LEVEL5B_PROMPT_TMPL" "$scenario_name")" >/dev/null
        ;;
    esac
    flag="cont"
    lvl=$((lvl + 1))
  done
}

declare -A level_pass level_fail
for lvl in 1 2 3 4 5; do level_pass[$lvl]=0; level_fail[$lvl]=0; done

for target_lvl in 1 2 3 4 5; do
  for i in $(seq 1 "$N"); do
    target="$WORK_DIR/L${target_lvl}-trial-$i"
    log="$WORK_DIR/L${target_lvl}-trial-$i.log"
    rm -rf "$target"
    echo "=== level $target_lvl trial $i/$N: bootstrapping $target ===" | tee "$log"

    if ! bash "$SEED_REPO/scripts/bootstrap.sh" "$target" >>"$log" 2>&1; then
      echo "trial: bootstrap failed, skipping (excluded from denominator, not counted a failure)" | tee -a "$log"
      continue
    fi
    ( cd "$target" && git config user.name "complexity-ladder-test" \
        && git config user.email "test@local" ) >>"$log" 2>&1

    scenario="${LADDER_SCENARIOS[$(( (i - 1) % ${#LADDER_SCENARIOS[@]} ))]}"
    IFS='|' read -r scenario_name build_scope <<<"$scenario"
    echo "scenario: $scenario_name" >>"$log"

    # Unscored setup: everything up to (not including) this level.
    if [ "$target_lvl" -gt 1 ]; then
      echo "--- unscored setup: levels 1..$((target_lvl - 1)) ---" >>"$log"
      run_levels_through "$target" "$((target_lvl - 1))" "$scenario_name" "$build_scope" >>"$log" 2>&1
    fi

    # This level's own prompt(s) — the only thing scored this trial.
    setup_flag="new"
    [ "$target_lvl" -gt 1 ] && setup_flag="cont"
    echo "--- scored: level $target_lvl ---" >>"$log"
    case "$target_lvl" in
      1)
        out=$(run_step "$target" "$setup_flag" "$LEVEL1_PROMPT")
        echo "$out" >>"$log"
        l1_out=$( (cd "$target" && python3 tools/reverse_string.py hello 2>/dev/null) || true )
        if [ -f "$target/tools/reverse_string.py" ] && [ "$l1_out" = "olleh" ]; then
          level_pass[1]=$((level_pass[1]+1))
        else
          level_fail[1]=$((level_fail[1]+1))
        fi
        ;;
      2)
        out=$(run_step "$target" "$setup_flag" \
          "add a small CLI tool to this project — a ${scenario_name} tool you can run from the command line. $build_scope")
        echo "$out" >>"$log"
        if [ -f "$target/tools/${scenario_name}.py" ] && [ -f "$target/tools/${scenario_name}_core.py" ] \
           && [ -f "$target/tests/test_${scenario_name}.py" ] && pytest_green "$target"; then
          level_pass[2]=$((level_pass[2]+1))
        else
          level_fail[2]=$((level_fail[2]+1))
        fi
        ;;
      3)
        out=$(run_step "$target" "$setup_flag" "$(printf "$LEVEL3_PROMPT_TMPL" "$scenario_name")")
        echo "$out" >>"$log"
        core_content=$(cat "$target/tools/${scenario_name}_core.py" 2>/dev/null || true)
        if echo "$core_content" | grep -q '"""' && echo "$core_content" | grep -q -- '->' \
           && pytest_green "$target"; then
          level_pass[3]=$((level_pass[3]+1))
        else
          level_fail[3]=$((level_fail[3]+1))
        fi
        ;;
      4)
        before_test_count=$(count_tests "$target" "tests/test_${scenario_name}.py")
        out=$(run_step "$target" "$setup_flag" "$(printf "$LEVEL4_PROMPT_TMPL" "$scenario_name")")
        echo "$out" >>"$log"
        after_test_count=$(count_tests "$target" "tests/test_${scenario_name}.py")
        if [ "$after_test_count" -gt "$before_test_count" ] && pytest_green "$target"; then
          level_pass[4]=$((level_pass[4]+1))
        else
          level_fail[4]=$((level_fail[4]+1))
        fi
        ;;
      5)
        before5_count=$( (cd "$target" && git rev-list --count HEAD) )
        out5a=$(run_step "$target" "$setup_flag" "$LEVEL5A_PROMPT")
        echo "$out5a" >>"$log"
        out5b=$(run_step "$target" cont "$(printf "$LEVEL5B_PROMPT_TMPL" "$scenario_name")")
        echo "$out5b" >>"$log"
        after5_count=$( (cd "$target" && git rev-list --count HEAD) )
        run_all_ok=0
        if [ -f "$target/tools/run_all.py" ]; then
          (cd "$target" && python3 tools/run_all.py) >/dev/null 2>&1 && run_all_ok=1
        fi
        if [ -f "$target/tools/rot13.py" ] && [ -f "$target/tools/rot13_core.py" ] \
           && [ -f "$target/tests/test_rot13.py" ] && pytest_green "$target" \
           && [ "$run_all_ok" -eq 1 ] && [ "$((after5_count - before5_count))" -ge 2 ]; then
          level_pass[5]=$((level_pass[5]+1))
        else
          level_fail[5]=$((level_fail[5]+1))
        fi
        ;;
    esac
    echo "trial done: level $target_lvl $([ "${level_pass[$target_lvl]}" -gt 0 ] && echo pass || true)" >>"$log"
  done
done

echo
echo "=== complexity-ladder-test.sh results (round 30 redesign: 5 levels x N=$N independent fresh trials each) ==="
report_level() {
  local label="$1" lvl="$2"
  local scored=$(( level_pass[$lvl] + level_fail[$lvl] ))
  if [ "$scored" -eq 0 ]; then
    printf '%-30s N/A (0 trials — bootstrap failed every time?)\n' "$label"
  else
    printf '%-30s %s/%s\n' "$label" "${level_pass[$lvl]}" "$scored"
  fi
}
report_level "Level 1 (1 file)" 1
report_level "Level 2 (3 files)" 2
report_level "Level 3 (+ refactor)" 3
report_level "Level 4 (+ tests)" 4
report_level "Level 5 (multi-sub-task chain)" 5
echo
echo "Each row above is now a MARGINAL rate (clean-state success probability at that level alone),"
echo "not a cumulative one — every level has the same N, unlike the pre-round-30 cascading design."
echo
echo "Raw transcripts: $WORK_DIR/L<level>-trial-*.log"

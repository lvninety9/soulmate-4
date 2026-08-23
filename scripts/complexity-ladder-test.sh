#!/usr/bin/env bash
# Round 29 item 6, axis C (work order): "where does this stack stop working" — escalates task
# complexity one step at a time inside the SAME bootstrapped project per trial (unlike
# harness-integration-test.sh's 6 fixed steps on one scenario, this cascades through 5
# increasingly demanding levels, stopping a trial's ladder at its first real failure — the
# "knee"). The harness's job per the work order's own framing isn't to make the model smarter,
# it's to keep every step under that knee — this script exists to find where the knee currently
# sits, and to be re-run identically in later rounds to see whether it moved.
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
# LLM-judged text heuristics, unlike harness-integration-test.sh's Steps 1-3 (this is one level
# past that: axis C only cares whether the code the model produced actually works, at each rung).
#
# Usage: scripts/complexity-ladder-test.sh [N] [work_dir]
#   N        number of fresh trials (default 5, matching harness-integration-test.sh's own H2)
#   work_dir base directory for throwaway bootstrapped projects (default /tmp/sm4-ladder)
#
# Requires: kilo on PATH or $KILO_BIN set, a running local model backend, this repo's own
# scripts/bootstrap.sh. Never run this against the seed repo itself.

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

# Round 29 live run found two real bugs here, both from the original grep-based version:
# (1) `grep -c PATTERN file || echo 0` double-prints when grep finds zero matches — grep still
#     exits 1 ("no match") even though it already printed "0", so the `||` fallback ALSO fires,
#     producing "0\n0" (collapsed to "0 0" by the command substitution), which crashes the later
#     `-gt` integer comparison. Fixed below with `${var:-0}` instead of a chained `|| echo`.
# (2) `grep -c '^def test_'` is blind to class-based test organization (`class Foo:` with indented
#     `def test_...` methods) — a real trial's test file used exactly that style throughout, so
#     both before/after counts silently read 0 regardless of how many tests actually existed,
#     making every such trial's Level 4 look like a failure it wasn't. `pytest --collect-only`
#     counts real collected test items regardless of function/class/parametrized style, so this
#     replaces the regex entirely instead of trying to widen it further.
count_tests() {
  local target="$1" file="$2"
  local n
  n=$( (cd "$target" && python3 -m pytest "$file" --collect-only -q 2>/dev/null) | grep -c '::' )
  echo "${n:-0}"
}

declare -A level_pass level_fail
for lvl in 1 2 3 4 5; do level_pass[$lvl]=0; level_fail[$lvl]=0; done
declare -A knee_hist
for lvl in 0 1 2 3 4 5; do knee_hist[$lvl]=0; done

for i in $(seq 1 "$N"); do
  target="$WORK_DIR/trial-$i"
  log="$WORK_DIR/trial-$i.log"
  rm -rf "$target"
  echo "=== ladder trial $i/$N: bootstrapping $target ===" | tee "$log"

  if ! bash "$SEED_REPO/scripts/bootstrap.sh" "$target" >>"$log" 2>&1; then
    echo "trial $i: bootstrap failed, skipping this trial entirely" | tee -a "$log"
    continue
  fi
  ( cd "$target" && git config user.name "complexity-ladder-test" \
      && git config user.email "test@local" ) >>"$log" 2>&1

  scenario="${LADDER_SCENARIOS[$(( (i - 1) % ${#LADDER_SCENARIOS[@]} ))]}"
  IFS='|' read -r scenario_name build_scope <<<"$scenario"
  echo "scenario: $scenario_name" >>"$log"
  knee=0

  # --- Level 1: 1 file, no split ---
  out1=$(run_step "$target" new \
    "add a small CLI tool to this project — tools/reverse_string.py, argparse, takes one string argument and prints it reversed to stdout. Single file, no separate test file needed for this one.")
  echo "--- level1 ---" >>"$log"; echo "$out1" >>"$log"
  l1_out=$( (cd "$target" && python3 tools/reverse_string.py hello 2>/dev/null) || true )
  if [ -f "$target/tools/reverse_string.py" ] && [ "$l1_out" = "olleh" ]; then
    level_pass[1]=$((level_pass[1]+1)); knee=1
  else
    level_fail[1]=$((level_fail[1]+1))
    knee_hist[$knee]=$((knee_hist[$knee]+1))
    echo "trial $i knee=$knee (failed at level 1)" | tee -a "$log"
    continue
  fi

  # --- Level 2: 3 files (CLI + core + test), same shape as harness-integration-test.sh ---
  out2=$(run_step "$target" cont "add a small CLI tool to this project — a ${scenario_name} tool you can run from the command line. $build_scope")
  echo "--- level2 ---" >>"$log"; echo "$out2" >>"$log"
  if [ -f "$target/tools/${scenario_name}.py" ] && [ -f "$target/tools/${scenario_name}_core.py" ] \
     && [ -f "$target/tests/test_${scenario_name}.py" ] && pytest_green "$target"; then
    level_pass[2]=$((level_pass[2]+1)); knee=2
  else
    level_fail[2]=$((level_fail[2]+1))
    knee_hist[$knee]=$((knee_hist[$knee]+1))
    echo "trial $i knee=$knee (failed at level 2)" | tee -a "$log"
    continue
  fi

  # --- Level 3: refactor without changing behavior — docstring + type hints, tests stay green ---
  out3=$(run_step "$target" cont \
    "refactor: add a module-level docstring to tools/${scenario_name}_core.py describing what it does, and add type hints to its primary function's signature. Do not change behavior — all existing tests must still pass.")
  echo "--- level3 ---" >>"$log"; echo "$out3" >>"$log"
  core_content=$(cat "$target/tools/${scenario_name}_core.py" 2>/dev/null || true)
  if echo "$core_content" | grep -q '"""' && echo "$core_content" | grep -q -- '->' \
     && pytest_green "$target"; then
    level_pass[3]=$((level_pass[3]+1)); knee=3
  else
    level_fail[3]=$((level_fail[3]+1))
    knee_hist[$knee]=$((knee_hist[$knee]+1))
    echo "trial $i knee=$knee (failed at level 3)" | tee -a "$log"
    continue
  fi

  # --- Level 4: add a genuinely new edge-case test, must pass ---
  before_test_count=$(count_tests "$target" "tests/test_${scenario_name}.py")
  out4=$(run_step "$target" cont \
    "add at least one new test case to tests/test_${scenario_name}.py covering an edge case (e.g. empty input, invalid input, or a boundary value) not already covered. Make sure it passes.")
  echo "--- level4 ---" >>"$log"; echo "$out4" >>"$log"
  after_test_count=$(count_tests "$target" "tests/test_${scenario_name}.py")
  if [ "$after_test_count" -gt "$before_test_count" ] && pytest_green "$target"; then
    level_pass[4]=$((level_pass[4]+1)); knee=4
  else
    level_fail[4]=$((level_fail[4]+1))
    knee_hist[$knee]=$((knee_hist[$knee]+1))
    echo "trial $i knee=$knee (failed at level 4)" | tee -a "$log"
    continue
  fi

  # --- Level 5: multi-sub-task chain — a second tool, THEN (new sub-task) a script using both ---
  before5_count=$( (cd "$target" && git rev-list --count HEAD) )
  out5a=$(run_step "$target" cont \
    "add a second, different small CLI tool to this project: tools/rot13.py (CLI entry point) + tools/rot13_core.py (the ROT13 cipher logic) + tests/test_rot13.py (tests). Same 3-file pattern as before. Commit each file separately as you finish it, then stop and summarize before doing anything else.")
  echo "--- level5a ---" >>"$log"; echo "$out5a" >>"$log"
  out5b=$(run_step "$target" cont \
    "Now, as a new sub-task: add tools/run_all.py that imports both ${scenario_name}_core and rot13_core, and prints one demo line from each when run.")
  echo "--- level5b ---" >>"$log"; echo "$out5b" >>"$log"
  after5_count=$( (cd "$target" && git rev-list --count HEAD) )
  run_all_ok=0
  if [ -f "$target/tools/run_all.py" ]; then
    (cd "$target" && python3 tools/run_all.py) >/dev/null 2>&1 && run_all_ok=1
  fi
  if [ -f "$target/tools/rot13.py" ] && [ -f "$target/tools/rot13_core.py" ] \
     && [ -f "$target/tests/test_rot13.py" ] && pytest_green "$target" \
     && [ "$run_all_ok" -eq 1 ] && [ "$((after5_count - before5_count))" -ge 2 ]; then
    level_pass[5]=$((level_pass[5]+1)); knee=5
  else
    level_fail[5]=$((level_fail[5]+1))
  fi
  knee_hist[$knee]=$((knee_hist[$knee]+1))
  echo "trial $i knee=$knee" | tee -a "$log"
done

echo
echo "=== complexity-ladder-test.sh results: $N trial(s) ==="
report_level() {
  local label="$1" lvl="$2"
  local scored=$(( level_pass[$lvl] + level_fail[$lvl] ))
  if [ "$scored" -eq 0 ]; then
    printf '%-30s N/A (0 trials reached this level)\n' "$label"
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
echo "Knee distribution (how far each trial got before its first real failure, 0 = failed level 1):"
for lvl in 0 1 2 3 4 5; do
  if [ "${knee_hist[$lvl]}" -gt 0 ]; then
    echo "  knee=$lvl: ${knee_hist[$lvl]} trial(s)"
  fi
done
echo
echo "Raw transcripts: $WORK_DIR/trial-*.log"

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
# Round 28 item 6 (bench redesign, per external review's own H1 standard — score results, not
# whether the model walked this script's exact path):
#   - Steps 5/6 now score N/A, not FAIL, when their own premise wasn't met this trial (step 5
#     needs step 4 to have actually landed a real primer-touching commit; step 6 needs the model
#     to have actually changed any files). An N/A trial is excluded from the denominator, not
#     counted as a failure — a model correctly doing nothing when there's nothing to do isn't a
#     bug in the model, and folding it into k/N as a failure was itself a benchmark bug (the
#     doc's own worked example: "1/5" on a step where 4/5 trials had nothing to grade is not a
#     20% pass rate, it's 1/1 on the trials that actually ran the check).
#   - Step 6's PASS condition itself is now result-based too: every new commit this turn touches
#     exactly one file (build.md's own "commit per file, always"), not just "2+ commits landed"
#     (which passes even a lucky 2-features-in-2-commits split that still bundled files).
#   - 6-B: `llama.service` runs `--temp 0.0` (confirmed via `systemctl cat llama.service`) —
#     greedy decoding is deterministic, so N trials of the identical discuss/build prompt is
#     n=1 wearing an N/5 costume, not real replication. Steps 3-6 (the only steps involving real
#     model judgment on an open-ended task; steps 1-2 check fixed, deterministic facts about this
#     repo's own bootstrapped template, where there is no meaningful "different input" to vary)
#     now cycle through 5 fixed, distinct small-CLI-tool scenarios defined in SCENARIOS below —
#     fixed in this file for reproducibility, never regenerated per run.
#   - Confirmed, not changed: trials already run sequentially (the `for i in $(seq 1 "$N")` loop
#     below never parallelizes) — `llama.service`'s `-np 1` (one inference slot) would serialize
#     concurrent trials anyway, so there was nothing to fix here, just confirm.
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
MODEL="${KILO_MODEL:-qwen-3-6/Qwen3.6-35B-A3B-UD-Q4_K_M.gguf}"

if ! command -v "$KILO" >/dev/null 2>&1; then
  echo "kilo not found on PATH (set KILO_BIN=/path/to/kilo) — cannot run live trials." >&2
  exit 1
fi

# Round 30 item 5 (work order): Step 3's scoring now parses `kilo run --format json`'s NDJSON
# tool-call events instead of grepping the model's rendered text — needs jq.
if ! command -v jq >/dev/null 2>&1; then
  echo "jq not found on PATH — required for Step 3's structured-event scoring (item 5)." >&2
  exit 1
fi

mkdir -p "$WORK_DIR"
declare -A pass fail na
for step in 1 2 3 4 5 6; do pass[$step]=0; fail[$step]=0; na[$step]=0; done

# Smoke-test round-trip found a real agentic turn (multi-file read + reasoning) takes low
# single-digit minutes on this RTX 3080 / Qwen3.6-35B-A3B-Q3_K_M setup, well past a "quick
# question" latency — 600s per call is generous headroom, not a guess.
STEP_TIMEOUT_S="${STEP_TIMEOUT_S:-600}"

# Round 28 item 6 (6-B): 5 fixed, distinct small-CLI-tool scenarios so Steps 3-6 aren't the same
# deterministic (temp=0) prompt 5 times over. Each is a 3-file tool — matches design.md's own
# "3+ files" trigger unambiguously, same reasoning the pre-existing word-counter scenario used.
# Index: name|discuss_prompt|build_scope_message
SCENARIOS=(
  "wordcount|add a small CLI tool to this project — a word counter you can run from the command line.|Python, argparse. Split into 3 files: tools/wordcount.py (CLI entry point), tools/wordcount_core.py (the actual counting logic, importable on its own), tests/test_wordcount.py (tests for the core module)."
  "tempconvert|add a small CLI tool to this project — a temperature unit converter you can run from the command line.|Python, argparse. Split into 3 files: tools/tempconvert.py (CLI entry point), tools/tempconvert_core.py (the actual C/F/K conversion logic, importable on its own), tests/test_tempconvert.py (tests for the core module)."
  "pwgen|add a small CLI tool to this project — a random password generator you can run from the command line.|Python, argparse. Split into 3 files: tools/pwgen.py (CLI entry point), tools/pwgen_core.py (the actual password generation logic, importable on its own), tests/test_pwgen.py (tests for the core module)."
  "csvcount|add a small CLI tool to this project — a CSV row/column counter you can run from the command line.|Python, argparse. Split into 3 files: tools/csvcount.py (CLI entry point), tools/csvcount_core.py (the actual CSV parsing/counting logic, importable on its own), tests/test_csvcount.py (tests for the core module)."
  "slugify|add a small CLI tool to this project — a URL slug generator (turns a title into a url-safe-slug) you can run from the command line.|Python, argparse. Split into 3 files: tools/slugify.py (CLI entry point), tools/slugify_core.py (the actual slugify logic, importable on its own), tests/test_slugify.py (tests for the core module)."
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

# Round 30 item 5 (work order): same shape as run_step(), plus `--format json` (NDJSON tool-call
# events instead of Kilo's rendered default text) — used only where a step needs to know exactly
# which tool was called, not just what the model said. Round 30 item 7 measured this flag itself
# adds no latency/behavior change beyond the output format (a live discuss trial completed in
# ~30s either way) — this is a pure scoring-input swap, not a different code path for the model.
run_step_json() {
  local target="$1" flag="$2"; shift 2
  if [ "$flag" = "new" ]; then
    timeout "$STEP_TIMEOUT_S" "$KILO" run --dir "$target" -m "$MODEL" --format json "$@" 2>&1
  else
    timeout "$STEP_TIMEOUT_S" "$KILO" run --dir "$target" -m "$MODEL" --format json -c "$@" 2>&1
  fi
}

# Round 30 item 5 (work order, acceptance A): Step 3's real pass condition is "did the model
# converge the ambiguous ask through genuine Q&A instead of silently picking an interpretation"
# (discuss.md's own wording) -- NOT "did it specifically call Kilo's `question` tool". Round 30
# item 7 measured (real captured API request payloads, `/home/jay/sm4-tap-capture/captures/*.json`
# + a live reproduction) that `kilo run` CLI's default "code" agent tool schema has NO `question`
# tool at all (12 tools, Cursor's plugin has 17 including it) -- a bench that only accepts a
# `question` tool-call event would score every CLI trial 0/N regardless of model behavior, since
# the tool is never even offered. This checks BOTH, from the same NDJSON stream, precisely (not a
# grep against rendered text): (a) a real `question` tool-call event (covers the plugin, and any
# future CLI version that adds it), OR (b) real assistant text containing a literal "?" that
# appears BEFORE the first write/edit tool call this turn, if any (the CLI's only actual channel,
# and the exact original heuristic's intent -- reimplemented on structured event order instead of
# a fragile multi-clause regex against Kilo's rendered default-format text, which is what the
# old "tool_use.*(write|edit)|Wrote to|Edited " grep was really guessing at).
score_step3_question() {
  jq -s '
    to_entries
    | (map(select(.value.type=="tool_use" and .value.part.tool=="question")) | length > 0) as $question_fired
    | ([.[] | select(.value.type=="text" and ((.value.part.text // "") | test("\\?"))) | .key]) as $q_idxs
    | ([.[] | select(.value.type=="tool_use" and (.value.part.tool=="write" or .value.part.tool=="edit")) | .key]) as $mut_idxs
    | ($q_idxs | min) as $first_q
    | ($mut_idxs | min) as $first_mut
    | $question_fired or (($first_q != null) and (($first_mut == null) or ($first_q < $first_mut)))
  '
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

  # Round 29 item 6 axis B (work order): "same bench, harness ON vs OFF" — same 5 SCENARIOS,
  # same scoring below, the only difference is whether AGENTS.md/the plugin exist for this
  # trial's target. Per the work order's own spec: disable the plugin + remove AGENTS.md (not a
  # bare git-init — wiki/protocols/*.md etc. stay on disk, since AGENTS.md's Protocol table is
  # what tells the model those files matter in the first place; removing just that pointer, not
  # every file it points to, isolates what the harness itself adds rather than conflating it with
  # "any project files exist at all"). Step 2 below intentionally still runs its harness-specific
  # prompt unmodified in OFF mode too — a structural fail there is itself a data point.
  #
  # Round 30 item 5 (acceptance C): Step 1 used to run the same way — but Step 1's own question
  # IS "does AGENTS.md say X", so axis B's OFF mode (which deletes AGENTS.md first) reduces it to
  # "if I delete the file, does reading the file fail" — a tautology, not a harness-value
  # measurement (round 29's own report flagged the resulting 5/5-vs-0/5 as not measuring anything
  # real). Excluded from axis B below (N/A, not scored) rather than redesigned into a different
  # question — Step 1 stays meaningful and unchanged for a normal (non-axis-B) single-mode run.
  if [ "${HARNESS_OFF:-0}" = "1" ]; then
    # --no-verify: bootstrap.sh's installed pre-commit hook is exactly check-caps.sh's own
    # bootstrap-completeness check (missing plugin/AGENTS.md -> OVER CAP, commit refused) --
    # correct for normal use, but this commit's entire point is deliberately producing that
    # exact "incomplete" state as axis B's OFF condition, so it must bypass, not satisfy, that
    # hook. Live-caught: the first version of this without --no-verify left the deletion
    # uncommitted with no error surfaced (set -uo pipefail, not -e).
    ( cd "$target" && rm -f AGENTS.md .kilo/plugins/subtask-gate.ts \
        && git add -A && git -c user.email=t@t -c user.name=t commit -q --no-verify -m "axis B: harness OFF (AGENTS.md + plugin removed)" ) >>"$log" 2>&1
  fi

  scenario="${SCENARIOS[$(( (i - 1) % ${#SCENARIOS[@]} ))]}"
  IFS='|' read -r scenario_name discuss_prompt build_scope <<<"$scenario"
  echo "scenario: $scenario_name" >>"$log"

  real_cap=$(grep -oP 'this file ≤\K[0-9]+' "$target/AGENTS.md" 2>/dev/null | head -1)

  # --- Step 1: does AGENTS.md actually auto-load? --- (fixed prompt: this checks a deterministic
  # fact about this repo's own bootstrapped template, not open-ended judgment — no meaningful
  # "different input" exists to vary here, see the item-6 header comment above)
  #
  # Round 30 item 5 (acceptance C): N/A under axis B's OFF mode — see the HARNESS_OFF block above
  # for why asking "does AGENTS.md say X" right after deleting AGENTS.md is a tautology, not a
  # measurement. Runs and scores normally otherwise (ON mode, or a plain non-axis-B invocation).
  if [ "${HARNESS_OFF:-0}" = "1" ]; then
    echo "--- step1: N/A (excluded from axis B OFF mode — see item 5's own comment above) ---" >>"$log"
    na[1]=$((na[1]+1))
  else
    out1=$(run_step "$target" new \
      "Without me telling you anything about this project, what does your AGENTS.md say your Language rule is, and what's the exact cap number on this file itself?")
    echo "--- step1 ---" >>"$log"; echo "$out1" >>"$log"
    if echo "$out1" | grep -qi "korean" && [ -n "$real_cap" ] && echo "$out1" | grep -q "$real_cap"; then
      pass[1]=$((pass[1]+1))
    else
      fail[1]=$((fail[1]+1))
    fi
  fi

  # --- Step 2: rule-zero (grep vs whole-file read, JUDGED against AGENTS.md's own ~50-line
  # threshold — not "did it grep" in isolation). Fixed prompt for the same reason as Step 1.
  fp_lines=$( (cd "$target" && wc -l < wiki/handoffs/FEEDBACK_PENDING.md 2>/dev/null) || echo 0)
  out2=$(run_step "$target" cont \
    "Read wiki/handoffs/FEEDBACK_PENDING.md and tell me how many open items it has and what the highest-priority one is. Then tell me: did you read the whole file, or search/grep for a specific part, and why?")
  echo "--- step2 ---" >>"$log"; echo "$out2" >>"$log"
  echo "(real file line count this trial: $fp_lines)" >>"$log"
  if [ "$fp_lines" -gt 50 ]; then
    if echo "$out2" | grep -qiE "search|grep|specific (part|section)|not the whole" \
       && ! echo "$out2" | grep -qiE "read the whole|entire file"; then
      pass[2]=$((pass[2]+1))
    else
      fail[2]=$((fail[2]+1))
    fi
  else
    if echo "$out2" | grep -qiE "read the whole|entire file" \
       && echo "$out2" | grep -qiE "rule zero|50.?line|under|short|small"; then
      pass[2]=$((pass[2]+1))
    else
      fail[2]=$((fail[2]+1))
    fi
  fi

  # --- Step 3: "discuss" on an ambiguous ask — clarifying questions, not straight to code ---
  # Round 30 item 5 (acceptance B): the old "discuss: " literal prefix made both ON and OFF axis-B
  # modes ask the model something an explicit protocol-keyword, not a genuinely ambiguous message
  # — that's why axis B's Step 3 read 5/5 vs 5/5 (the report itself flagged this as not measuring
  # the harness's own routing). Dropped here: subtask-gate.ts's own chat.message ambiguity nudge
  # (looksAmbiguous(), no "discuss" keyword needed) is what should self-fire routing now, if it's
  # going to fire at all — this is what "does routing self-fire" actually means to test.
  out3=$(run_step_json "$target" cont "$discuss_prompt")
  echo "--- step3 (--format json) ---" >>"$log"; echo "$out3" >>"$log"
  if printf '%s' "$out3" | score_step3_question | grep -q true; then
    pass[3]=$((pass[3]+1))
  else
    fail[3]=$((fail[3]+1))
  fi

  # Human's answer to Step 3's clarifying questions — this scenario's own build_scope, always
  # explicitly a 3-file split so design.md's "3+ files" trigger applies unambiguously (a 2nd
  # smoke-test round-trip found a looser 2-file scope let the model correctly skip design per
  # its own "small, clearly-scoped task" rule, which is correct model behavior but leaves
  # Steps 4/5/6 nothing to check that trial — scoping to 3 files removes that ambiguity instead
  # of trying to score around it after the fact).
  run_step "$target" cont "$build_scope" >/dev/null

  # --- Step 4: "design" — plan + sub-task block written + committed, then it should stop ---
  # Round 30 closing pass: this step is structurally 0/5 in both harness ON and OFF, confirmed
  # via real kilo.db transcripts, not a design.md/build.md defect — build_scope above (line 248)
  # is specified fully enough (exact files, language, per-file responsibility) that the model
  # correctly treats it as "clearly-scoped" (AGENTS.md's own routing rule) and finishes the whole
  # sub-task via build BEFORE this "design" message is even sent; design.md is then genuinely
  # redundant and the model's refusal to force a plan retroactively is correct behavior, not a
  # bug. Full evidence: wiki/rule-archive.md "Round 30 closing pass". Fixing this would mean
  # deliberately under-specifying build_scope so design must decide the file split itself — a
  # bench redesign, intentionally not done here (out of scope for a closing pass).
  before4=$( (cd "$target" && git rev-parse HEAD) )
  out4=$(run_step "$target" cont "design")
  echo "--- step4 ---" >>"$log"; echo "$out4" >>"$log"
  after4=$( (cd "$target" && git rev-parse HEAD) )
  primer_has_subtask=$( (cd "$target" && grep -c '^## Current sub-task' wiki/handoffs/SESSION_PRIMER.md 2>/dev/null) || echo 0)
  subtask_body=$( (cd "$target" && sed -n '/^## Current sub-task/,/^## /p' wiki/handoffs/SESSION_PRIMER.md 2>/dev/null) )
  step4_real_primer_touch=0
  if [ "$before4" != "$after4" ]; then
    if (cd "$target" && git diff-tree --no-commit-id --name-only -r "$after4") \
        | grep -qx 'wiki/handoffs/SESSION_PRIMER.md'; then
      step4_real_primer_touch=1
    fi
  fi
  if [ "$before4" != "$after4" ] && [ "$primer_has_subtask" -ge 1 ] \
     && ! echo "$subtask_body" | grep -q '<exact files/greps'; then
    pass[4]=$((pass[4]+1))
  else
    fail[4]=$((fail[4]+1))
  fi

  # --- Step 5: the sub-task gate, live — first tool call this turn must be blocked ---
  # Round 28 item 6: N/A, not FAIL, if step 4 itself never landed a real primer-touching commit
  # this trial — testing "does the gate block" is meaningless without a real armed boundary to
  # block against (this is exactly row #41's own diagnosed premise problem: the original 5-trial
  # run's "0/5" on this step included trials where the premise was never met at all).
  if [ "$step4_real_primer_touch" -eq 1 ]; then
    out5=$(run_step "$target" cont "continue")
    echo "--- step5 ---" >>"$log"; echo "$out5" >>"$log"
    if echo "$out5" | grep -q '\[subtask-gate\]'; then
      pass[5]=$((pass[5]+1))
    else
      fail[5]=$((fail[5]+1))
    fi
  else
    echo "--- step5: N/A (step 4 never landed a real primer-touching commit this trial) ---" >>"$log"
    na[5]=$((na[5]+1))
  fi

  # --- Step 6: "build" — multiple small commits, not one bundling everything ---
  # Round 28 item 6: result-based, not path-based. N/A if the model made zero commits this turn
  # (nothing to grade — e.g. it judged the build already fully done from an earlier step, a
  # correct call, not a build.md violation). If it DID commit, the pass condition is now "every
  # new commit touches exactly one file" (build.md's actual "commit per file, always" rule),
  # not just "2+ commits landed" (which a lucky 2-features-in-2-commits split could pass while
  # still bundling multiple files per commit).
  before6=$( (cd "$target" && git rev-parse HEAD) )
  before6_count=$( (cd "$target" && git rev-list --count HEAD) )
  out6=$(run_step "$target" cont "build")
  echo "--- step6 ---" >>"$log"; echo "$out6" >>"$log"
  after6_count=$( (cd "$target" && git rev-list --count HEAD) )
  new_commits=$((after6_count - before6_count))
  if [ "$new_commits" -eq 0 ]; then
    echo "--- step6: N/A (zero new commits this trial) ---" >>"$log"
    na[6]=$((na[6]+1))
  else
    all_single_file=1
    for sha in $( (cd "$target" && git rev-list "${before6}..HEAD") ); do
      files_in_commit=$( (cd "$target" && git diff-tree --no-commit-id --name-only -r "$sha" | wc -l) )
      if [ "$files_in_commit" -ne 1 ]; then
        all_single_file=0
        break
      fi
    done
    if [ "$all_single_file" -eq 1 ]; then
      pass[6]=$((pass[6]+1))
    else
      fail[6]=$((fail[6]+1))
    fi
  fi

  echo "trial $i ($scenario_name) done: step1=${pass[1]} step2=${pass[2]} step3=${pass[3]} step4=${pass[4]} step5=${pass[5]}(na:${na[5]}) step6=${pass[6]}(na:${na[6]}) (cumulative pass counts)"
done

harness_mode="ON"
[ "${HARNESS_OFF:-0}" = "1" ] && harness_mode="OFF"
echo
echo "=== harness-integration-test.sh results: $N trial(s), harness $harness_mode ==="
report_step() {
  local label="$1" step="$2"
  local scored=$(( pass[$step] + fail[$step] ))
  printf '%-45s %s/%s' "$label" "${pass[$step]}" "$scored"
  if [ "${na[$step]}" -gt 0 ]; then
    printf ' (%s N/A, excluded from denominator)' "${na[$step]}"
  fi
  printf '\n'
}
report_step "Step 1 (AGENTS.md auto-load)" 1
report_step "Step 2 (rule-zero grep, not whole-read)" 2
report_step "Step 3 (discuss asks, doesn't build)" 3
report_step "Step 4 (design writes+commits sub-task)" 4
report_step "Step 5 (subtask-gate blocks live)" 5
report_step "Step 6 (build: per-file commits)" 6
echo
echo "Raw transcripts: $WORK_DIR/trial-*.log (re-grade steps 1-2 by hand if a k/N looks off —"
echo "their pass conditions are text heuristics on the model's own wording, not pure repo state,"
echo "same limitation this whole benchmark's Steps 1/2/7/8 have always had; Step 3 moved to"
echo "structured --format json event scoring in round 30 item 5 and is no longer in this group)."

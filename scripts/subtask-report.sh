#!/usr/bin/env bash
# subtask-report.sh — universal sub-task report generator (round 34, Deliverable 1).
#
# WHY THIS EXISTS: prose self-report from the local model is not trustworthy (measured this
# week: 18 straight turns of "파일 생성 완료"/"커밋 완료"/"테스트 PASS" claims while every tool
# call was blocked and nothing on disk ever changed — wiki/rule-archive.md "Round 34"). The
# report below is built ENTIRELY from machine-collected evidence (git, test runners, scanners) —
# it never asks the model what it did, and never trusts what the model says it did. Summarizing
# a fixed evidence bundle is a stateless transformation (the shape this model is actually good
# at, wiki/PROJECT_BACKGROUND.md's aider-polyglot data); recalling its own actions is the shape
# it fails at. This script's job stops at producing the bundle — an LLM MAY reformat it into
# prose afterward, but every fact in it must already stand alone without that step.
#
# TRIGGER / BOUNDARY DEFINITION: reuses .kilo/plugins/subtask-gate.ts's own sub-task boundary —
# a commit that touches wiki/handoffs/SESSION_PRIMER.md (computeBoundary()'s "primer" reason).
# Not a second, invented definition. scripts/post-commit-subtask-report fires this script
# automatically only on such a commit; this file itself is the "runnable manually" half (no args
# needed — it derives the same boundary from git any time it's invoked).
#
# STACK-AGNOSTIC BY CONSTRUCTION: every section below is a detect-then-maybe-run pair. A tool or
# config that isn't present is skipped, and the skip is stated explicitly in the "Skipped checks"
# section — silence must never read as "checked, and clean." Nothing here can fail the calling
# git hook (see scripts/post-commit-subtask-report) or exit nonzero in a way that blocks a
# commit — a check that errors is reported as its own finding, not raised as a script failure.
#
# Usage:
#   scripts/subtask-report.sh [<target-sha>] [--since <sha>]
#     <target-sha>   commit to report on (default: HEAD)
#     --since <sha>  override the "previous boundary" (default: the last commit strictly before
#                    <target-sha> that touched wiki/handoffs/SESSION_PRIMER.md; if none exists,
#                    the report covers the whole history up to <target-sha>)

set -uo pipefail # deliberately NOT -e: one failing check must not abort the rest of the report

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -z "$REPO_ROOT" ]; then
  echo "subtask-report: not inside a git repo — nothing to report on."
  exit 0
fi
cd "$REPO_ROOT" || exit 0

TARGET="HEAD"
SINCE_OVERRIDE=""
while [ $# -gt 0 ]; do
  case "$1" in
    --since) SINCE_OVERRIDE="${2:-}"; shift 2 ;;
    *) TARGET="$1"; shift ;;
  esac
done

# round 34 adversarial-battery finding: `git rev-parse <bad-ref> 2>/dev/null` is NOT reliably
# empty on failure -- for an unresolvable-but-pathname-shaped arg (a bogus --since value, or
# "<sha>^" on a root commit with no parent), git echoes the arg back to STDOUT verbatim
# alongside its fatal error on stderr (confirmed live: `git rev-parse bogus-ref 2>/dev/null`
# prints the literal string "bogus-ref", not nothing). A plain `[ -z "$x" ]` check after that
# does not catch it -- resolve_ref() checks the actual exit code instead, so a bad ref always
# resolves to a true empty string.
resolve_ref() {
  local out
  out="$(git rev-parse "$1" 2>/dev/null)"
  [ $? -eq 0 ] && printf '%s' "$out"
}

TARGET_SHA="$(resolve_ref "$TARGET")"
if [ -z "$TARGET_SHA" ]; then
  echo "subtask-report: could not resolve '$TARGET' to a commit — nothing to report on."
  exit 0
fi
SHORT_TARGET="$(git rev-parse --short "$TARGET_SHA")"

# --- boundary resolution --------------------------------------------------------------------
if [ -n "$SINCE_OVERRIDE" ]; then
  PREV_SHA="$(resolve_ref "$SINCE_OVERRIDE")"
else
  PARENT_SHA="$(resolve_ref "${TARGET_SHA}^")"
  if [ -n "$PARENT_SHA" ]; then
    PREV_SHA="$(git log -1 --format=%H "$PARENT_SHA" -- wiki/handoffs/SESSION_PRIMER.md 2>/dev/null)"
  else
    PREV_SHA=""
  fi
fi

EMPTY_TREE="4b825dc642cb6eb9a060e54bf8d69288fbee4904"
if [ -n "$PREV_SHA" ]; then
  RANGE="$PREV_SHA..$TARGET_SHA"
  RANGE_DESC="$(git rev-parse --short "$PREV_SHA")..$SHORT_TARGET"
else
  RANGE="$EMPTY_TREE..$TARGET_SHA"
  RANGE_DESC="(repo start)..$SHORT_TARGET"
fi

have() { command -v "$1" >/dev/null 2>&1; }

# round 34 adversarial-battery finding (category: hanging/slow test command): every external
# command below used to run with no time bound -- a hanging test command (or scanner) would hang
# this script, and since scripts/post-commit-subtask-report calls it synchronously, that would
# hang the developer's `git commit` itself. "A report generator that can wedge a commit is worse
# than none." Every external invocation now runs under `timeout` (GNU coreutils, already present
# -- confirmed via `timeout --version`, no install needed). Override with
# SUBTASK_REPORT_TIMEOUT_S=<seconds> for a project with a genuinely slower suite.
TIMEOUT_S="${SUBTASK_REPORT_TIMEOUT_S:-120}"
run_timeout() { timeout "${TIMEOUT_S}s" "$@"; }
NEEDS_HUMAN=()
SKIPPED=()
note_needs_human() { NEEDS_HUMAN+=("$1"); }
note_skipped() { SKIPPED+=("$1"); }

echo "# Sub-task report — $RANGE_DESC"
echo

# --- 1. what changed -------------------------------------------------------------------------
echo "## Changed"
# round 34 adversarial-battery finding (category: very large diff): a 100+-file sub-task used to
# dump one line per commit/per file with no cap -- readable for the normal case, unreadable (and
# "brevity is a feature" per this tool's own spec) once a sub-task legitimately touches hundreds
# of files (a big rename, a vendored dependency, a generated-file dump). Cap both lists, always
# keep the real aggregate line (diffstat's own "N files changed, ..." summary is never dropped).
COMMIT_LIST_CAP=15
DIFFSTAT_LINE_CAP=30
if git rev-list --count "$RANGE" >/dev/null 2>&1; then
  N_COMMITS="$(git rev-list --count "$RANGE" 2>/dev/null)"
  echo "- $N_COMMITS commit(s):"
  git log --format='  - %h %s' "$RANGE" 2>/dev/null | head -"$COMMIT_LIST_CAP"
  if [ "$N_COMMITS" -gt "$COMMIT_LIST_CAP" ]; then
    echo "  - ... and $((N_COMMITS - COMMIT_LIST_CAP)) more commit(s) (full range: $RANGE_DESC)"
  fi
  echo "- diffstat:"
  DIFFSTAT_OUT="$(git diff --stat "$RANGE" 2>/dev/null)"
  DIFFSTAT_LINES="$(printf '%s
' "$DIFFSTAT_OUT" | wc -l | tr -d ' ')"
  if [ "$DIFFSTAT_LINES" -gt "$DIFFSTAT_LINE_CAP" ]; then
    printf '%s
' "$DIFFSTAT_OUT" | head -"$((DIFFSTAT_LINE_CAP - 1))" | sed 's/^/  /'
    echo "  ... ($((DIFFSTAT_LINES - DIFFSTAT_LINE_CAP)) more file(s) omitted, see \`git diff --stat $RANGE\`)"
    printf '%s
' "$DIFFSTAT_OUT" | tail -1 | sed 's/^/  /'
  else
    printf '%s
' "$DIFFSTAT_OUT" | sed 's/^/  /'
  fi
else
  echo "- could not compute range $RANGE_DESC (git error) — treating as empty change set"
  note_needs_human "changed-files range ($RANGE_DESC) could not be computed by git — verify manually"
fi
echo

CHANGED_FILES=()
while IFS= read -r f; do [ -n "$f" ] && CHANGED_FILES+=("$f"); done < <(git -c core.quotepath=false diff --name-only "$RANGE" 2>/dev/null)  # -c core.quotepath=false: round 34 finding -- a non-ASCII filename (e.g. Korean) otherwise comes back C-quoted/octal-escaped, which then fails every downstream [ -f "$f" ]/git-diff-per-file lookup, silently dropping that file from the mock/CSS-literal scans

# --- 2. tests ----------------------------------------------------------------------------------
echo "## Tests"
shopt -s nullglob
TEST_RAN=0

# round 34 gap 2 (coordinator finding): "exit 0" alone was being reported as a bare "PASS", which
# reads as green even when zero tests actually ran (a broken glob/pattern silently checks
# nothing). Tries a handful of known runner output shapes (TAP/node --test, pytest, cargo test,
# jest, mocha, go test's "no test files"); prints "count not parseable" rather than guessing when
# none match. Echoes "<total>|<passed>|<failed>", or nothing if unparseable.
detect_test_count() {
  local out="$1" n p f
  # TAP / node --test: "# tests N" / "# pass N" / "# fail N" lines
  n="$(printf '%s\n' "$out" | grep -oE '^# tests [0-9]+' | grep -oE '[0-9]+' | tail -1)"
  if [ -n "$n" ]; then
    p="$(printf '%s\n' "$out" | grep -oE '^# pass [0-9]+' | grep -oE '[0-9]+' | tail -1)"
    f="$(printf '%s\n' "$out" | grep -oE '^# fail [0-9]+' | grep -oE '[0-9]+' | tail -1)"
    echo "${n}|${p:-?}|${f:-?}"; return
  fi
  # pytest
  if printf '%s\n' "$out" | grep -qE 'no tests ran|collected 0 items'; then echo "0|0|0"; return; fi
  n="$(printf '%s\n' "$out" | grep -oE '[0-9]+ passed' | tail -1 | grep -oE '[0-9]+')"
  if [ -n "$n" ]; then
    f="$(printf '%s\n' "$out" | grep -oE '[0-9]+ failed' | tail -1 | grep -oE '[0-9]+')"
    echo "$((n + ${f:-0}))|${n}|${f:-0}"; return
  fi
  # cargo test
  if printf '%s\n' "$out" | grep -qE 'running 0 tests'; then echo "0|0|0"; return; fi
  n="$(printf '%s\n' "$out" | grep -oE 'test result: [a-zA-Z]+\. [0-9]+ passed' | grep -oE '[0-9]+' | tail -1)"
  if [ -n "$n" ]; then
    f="$(printf '%s\n' "$out" | grep -oE '[0-9]+ failed' | tail -1 | grep -oE '[0-9]+')"
    echo "$((n + ${f:-0}))|${n}|${f:-0}"; return
  fi
  # jest
  if printf '%s\n' "$out" | grep -qiE 'no tests found'; then echo "0|0|0"; return; fi
  n="$(printf '%s\n' "$out" | grep -oE 'Tests:.*[0-9]+ total' | grep -oE '[0-9]+ total' | grep -oE '[0-9]+' | tail -1)"
  if [ -n "$n" ]; then
    p="$(printf '%s\n' "$out" | grep -oE 'Tests:.*[0-9]+ passed' | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' | tail -1)"
    echo "${n}|${p:-0}|$((n - ${p:-0}))"; return
  fi
  # mocha
  n="$(printf '%s\n' "$out" | grep -oE '[0-9]+ passing' | tail -1 | grep -oE '[0-9]+')"
  if [ -n "$n" ]; then
    f="$(printf '%s\n' "$out" | grep -oE '[0-9]+ failing' | tail -1 | grep -oE '[0-9]+')"
    echo "$((n + ${f:-0}))|${n}|${f:-0}"; return
  fi
  # go test
  if printf '%s\n' "$out" | grep -qE 'no test files'; then echo "0|0|0"; return; fi
  echo "" # not parseable for this runner
}

run_and_report() {
  local label="$1"; shift
  echo "- detected: $label -> \`$*\`"
  local out rc
  out="$(run_timeout "$@" 2>&1)"; rc=$?
  local tail_out
  tail_out="$(echo "$out" | tail -15)"
  local counts total passed
  counts="$(detect_test_count "$out")"
  if [ $rc -eq 0 ]; then
    if [ -n "$counts" ]; then
      total="${counts%%|*}"
      passed="$(printf '%s' "$counts" | cut -d'|' -f2)"
      if [ "$total" = "0" ]; then
        echo "  -> 0 tests ran (exit 0) — NOT the same as passing; nothing was actually verified"
        note_needs_human "test command \`$*\` ran 0 tests (exit 0, likely a broken test-file glob/pattern) — not a real pass"
      else
        echo "  -> PASS ($passed/$total tests, exit 0)"
      fi
    else
      echo "  -> PASS (exit 0, test count not parseable for this runner — verify manually)"
    fi
  elif [ "$rc" -eq 124 ]; then
    echo "  -> TIMED OUT after ${TIMEOUT_S}s (killed, did not block the caller)"
    note_needs_human "test command \`$*\` did not finish within ${TIMEOUT_S}s and was killed — investigate a hang, or raise SUBTASK_REPORT_TIMEOUT_S for a genuinely slower suite"
  else
    echo "  -> FAIL (exit $rc)"
    note_needs_human "test command \`$*\` exited $rc — see full output"
  fi
  echo "$tail_out" | sed 's/^/  | /'
}

if [ -f package.json ] && grep -q '"test"[[:space:]]*:' package.json 2>/dev/null; then
  RUNNER="npm"
  [ -f pnpm-lock.yaml ] && RUNNER="pnpm"
  [ -f yarn.lock ] && RUNNER="yarn"
  if have "$RUNNER"; then
    run_and_report "package.json test script ($RUNNER)" "$RUNNER" test --silent
  else
    echo "- detected: package.json test script, but '$RUNNER' is not installed — skipped"
    note_skipped "npm-style tests: $RUNNER not on PATH"
  fi
  TEST_RAN=1
elif [ -f pytest.ini ] || [ -f setup.cfg ] || { [ -f pyproject.toml ] && grep -q '\[tool.pytest' pyproject.toml 2>/dev/null; } || compgen -G "test_*.py" >/dev/null || compgen -G "tests/test_*.py" >/dev/null; then
  if have pytest; then
    run_and_report "pytest" pytest -q
  else
    echo "- detected: pytest config/test files, but 'pytest' is not installed — skipped"
    note_skipped "pytest: not on PATH"
  fi
  TEST_RAN=1
elif [ -f go.mod ]; then
  if have go; then
    run_and_report "go test" go test ./...
  else
    echo "- detected: go.mod, but 'go' is not installed — skipped"
    note_skipped "go test: go toolchain not on PATH"
  fi
  TEST_RAN=1
elif [ -f Cargo.toml ]; then
  if have cargo; then
    run_and_report "cargo test" cargo test
  else
    echo "- detected: Cargo.toml, but 'cargo' is not installed — skipped"
    note_skipped "cargo test: cargo not on PATH"
  fi
  TEST_RAN=1
elif [ -f Makefile ] && grep -qE '^test:' Makefile; then
  if have make; then
    run_and_report "make test" make test
  else
    echo "- detected: Makefile with a 'test:' target, but 'make' is not installed — skipped"
    note_skipped "make test: make not on PATH"
  fi
  TEST_RAN=1
elif have node; then
  NODE_TEST_FILES=()
  for d in tests test; do
    [ -d "$d" ] || continue
    for f in "$d"/*.test.mjs "$d"/*.test.js; do
      [ -f "$f" ] && NODE_TEST_FILES+=("$f")
    done
  done
  if [ "${#NODE_TEST_FILES[@]}" -gt 0 ]; then
    echo "- detected: bare node test files (no package.json test script) -> running each directly"
    PASS_FILES=0
    for f in "${NODE_TEST_FILES[@]}"; do
      out="$(run_timeout node --experimental-strip-types "$f" 2>&1)"; rc=$?
      ok_count="$(echo "$out" | grep -c '^ok:' || true)"
      if [ $rc -eq 0 ] && [ "$ok_count" = "0" ]; then
        echo "  - $f: 0 assertions ran (exit 0) — NOT the same as passing; nothing was actually verified"
        note_needs_human "test file $f ran 0 assertions (exit 0) — likely an empty/broken test file, not a real pass"
      elif [ $rc -eq 0 ] && echo "$out" | grep -q "ALL PASS"; then
        echo "  - $f: PASS ($ok_count assertion(s))"
        PASS_FILES=$((PASS_FILES + 1))
      else
        echo "  - $f: FAIL (exit $rc, $ok_count ok before failure)"
        note_needs_human "test file $f did not report ALL PASS — see \`node --experimental-strip-types $f\`"
      fi
    done
    TEST_RAN=1
  fi
fi

if [ "$TEST_RAN" -eq 0 ]; then
  echo "- no test command detected (checked: package.json test script, pytest, go test, cargo"
  echo "  test, make test, bare node tests/*.test.mjs) — this is NOT a pass, it means nothing"
  echo "  was run"
  note_needs_human "no test runner detected — confirm by hand whether this sub-task needed one"
fi
echo

# --- 3. leftovers --------------------------------------------------------------------------
echo "## Leftovers (added lines only, this range)"
ADDED="$(git diff "$RANGE" -- . 2>/dev/null | grep -E '^\+[^+]' || true)"
TODO_N="$(printf '%s\n' "$ADDED" | grep -icE 'TODO|FIXME|XXX' || true)"
TODO_N="$(printf '%s' "$TODO_N" | tr -d '[:space:]')"
[ -z "$TODO_N" ] && TODO_N=0
echo "- TODO/FIXME/XXX added: $TODO_N"
[ "$TODO_N" -gt 0 ] && note_needs_human "$TODO_N new TODO/FIXME/XXX marker(s) added — triage before considering this sub-task closed"

DEBUG_N="$(printf '%s' "$ADDED" | grep -icE 'console\.log\(|debugger;|\bpdb\.set_trace\(|^\+[[:space:]]*print\(' || true)"
[ -z "$DEBUG_N" ] && DEBUG_N=0
echo "- debug residue added (console.log/debugger/pdb.set_trace/print): $DEBUG_N"
[ "$DEBUG_N" -gt 0 ] && note_needs_human "$DEBUG_N debug-residue line(s) added — confirm intentional before merging"

MOCK_N=0
for f in "${CHANGED_FILES[@]}"; do
  case "$f" in
    *test*|*spec*|*__tests__*|*__mocks__*|*fixtures*) continue ;;
  esac
  [ -f "$f" ] || continue
  hits="$(git diff "$RANGE" -- "$f" 2>/dev/null | grep -E '^\+[^+]' | grep -icE 'mock|dummy|fixture' || true)"
  [ -z "$hits" ] && hits=0
  MOCK_N=$((MOCK_N + hits))
done
echo "- mock/dummy/fixture keywords added outside test-ish paths: $MOCK_N"
[ "$MOCK_N" -gt 0 ] && note_needs_human "$MOCK_N mock/dummy/fixture-keyword line(s) added in a non-test path — confirm this isn't placeholder data left in production code"
echo

# --- 4. secrets & security ------------------------------------------------------------------
# round 35 item 1: secret/sensitive-filename scanning moved OUT of this post-commit report and
# INTO scripts/check-secrets.sh, run as a pre-commit BLOCKER (scripts/pre-commit-check-caps) --
# a post-commit report is structurally too late for a secret (git history is forever, and a
# pushed commit is a leak). Re-scanning here would be redundant with that hook on every normal
# commit, and silently wrong on the abnormal one (SKIP_SECRET_CHECK=1 or --no-verify bypassed
# it) -- so this section states what enforces secrets and where to check that it's actually
# installed, instead of re-implementing the scan. Dependency/code vulnerability scanners
# (npm audit/bandit/pip-audit/semgrep) are a different category -- not secrets -- and stay here.
echo "## Secrets & security"
echo "- secrets: enforced by the pre-commit hook (scripts/check-secrets.sh), not re-scanned here — see scripts/check-caps.sh's bootstrap check for whether that hook is actually installed"
RAN_ANY_SEC=0

if [ -f package.json ] && have npm; then
  RAN_ANY_SEC=1
  out="$(run_timeout npm audit --json 2>/dev/null)"
  if [ -n "$out" ] && have node; then
    vulns="$(node -e 'try{const d=JSON.parse(require("fs").readFileSync(0,"utf8"));const m=d.metadata&&d.metadata.vulnerabilities;if(!m){console.log("0");process.exit(0)}let t=0;for(const k in m){if(k!=="total")t+=m[k]||0}console.log(t)}catch(e){console.log("?")}' <<<"$out" 2>/dev/null)"
    echo "- npm audit: $vulns vulnerabilities reported"
    [ "$vulns" != "0" ] && [ "$vulns" != "?" ] && [ -n "$vulns" ] && note_needs_human "npm audit found $vulns vulnerabilities — run \`npm audit\` for detail"
  else
    echo "- npm audit: ran, could not parse output"
  fi
fi

if have bandit && compgen -G "**/*.py" >/dev/null 2>&1; then
  RAN_ANY_SEC=1
  out="$(run_timeout bandit -q -r . -x .git 2>&1)"; rc=$?
  if [ $rc -eq 0 ]; then
    echo "- bandit: no issues"
  else
    n="$(echo "$out" | grep -c '^>>' || true)"
    echo "- bandit: issues found (see \`bandit -r .\`)"
    note_needs_human "bandit reported issues — run \`bandit -r .\` for detail"
  fi
fi

if have pip-audit && { [ -f requirements.txt ] || [ -f pyproject.toml ]; }; then
  RAN_ANY_SEC=1
  out="$(run_timeout pip-audit 2>&1)"; rc=$?
  if [ $rc -eq 0 ]; then
    echo "- pip-audit: no known vulnerabilities"
  else
    echo "- pip-audit: FINDINGS (exit $rc)"
    note_needs_human "pip-audit reported findings — run \`pip-audit\` for detail"
  fi
fi

if have semgrep; then
  RAN_ANY_SEC=1
  out="$(run_timeout semgrep --quiet --config auto --error 2>&1)"; rc=$?
  if [ $rc -eq 0 ]; then
    echo "- semgrep: clean"
  else
    echo "- semgrep: findings (exit $rc)"
    note_needs_human "semgrep reported findings — run \`semgrep --config auto\` for detail"
  fi
fi

if [ "$RAN_ANY_SEC" -eq 0 ]; then
  echo "- no dependency/code vulnerability scanner detected (checked: npm audit, bandit, pip-audit, semgrep)"
  note_skipped "vulnerability scanners: no scanner available on this machine"
fi
echo

# --- 5. dead code & lint --------------------------------------------------------------------
echo "## Dead code & lint"
RAN_ANY_LINT=0
if [ -f package.json ] && { [ -f .eslintrc.json ] || [ -f .eslintrc.js ] || [ -f .eslintrc.cjs ] || [ -f eslint.config.js ] || grep -q '"eslintConfig"' package.json 2>/dev/null; }; then
  # --no-install so a missing eslint fails fast (never triggers an interactive/silent npm
  # package fetch) — probed separately from the real run so "not installed" and "installed but
  # found issues" are never reported as the same thing.
  if have npx && npx --no-install eslint --version >/dev/null 2>&1; then
    RAN_ANY_LINT=1
    out="$(run_timeout npx --no-install eslint . 2>&1)"; rc=$?
    if [ $rc -eq 0 ]; then
      echo "- eslint: clean"
    else
      echo "- eslint: findings (exit $rc)"
      echo "$out" | tail -20 | sed 's/^/  | /'
      note_needs_human "eslint reported findings — run \`npx eslint .\` for detail"
    fi
  else
    note_skipped "eslint: config present but eslint is not installed/resolvable locally"
  fi
fi

if have ruff && { [ -f pyproject.toml ] || [ -f ruff.toml ] || [ -f .ruff.toml ]; }; then
  RAN_ANY_LINT=1
  out="$(run_timeout ruff check . 2>&1)"; rc=$?
  if [ $rc -eq 0 ]; then
    echo "- ruff: clean"
  else
    echo "- ruff: findings (exit $rc)"
    echo "$out" | tail -20 | sed 's/^/  | /'
    note_needs_human "ruff reported findings — run \`ruff check .\` for detail"
  fi
fi

if have ts-prune && [ -f tsconfig.json ]; then
  RAN_ANY_LINT=1
  out="$(run_timeout ts-prune 2>&1)"
  n="$(echo "$out" | grep -c . || true)"
  echo "- ts-prune: $n possibly-unused export(s)"
  [ "$n" -gt 0 ] && note_needs_human "ts-prune flagged $n possibly-unused export(s) — confirm intentional"
fi

if have vulture && compgen -G "**/*.py" >/dev/null 2>&1; then
  RAN_ANY_LINT=1
  out="$(run_timeout vulture . 2>&1)"
  n="$(echo "$out" | grep -c . || true)"
  echo "- vulture: $n possibly-dead code finding(s)"
  [ "$n" -gt 0 ] && note_needs_human "vulture flagged $n possibly-dead finding(s) — confirm intentional"
fi

if [ "$RAN_ANY_LINT" -eq 0 ]; then
  echo "- no lint/dead-code tool detected (checked: eslint, ruff, ts-prune, vulture)"
  note_skipped "lint/dead-code: no configured tool found"
fi
echo

# --- 6. design consistency (web) -------------------------------------------------------------
echo "## Design consistency (CSS)"
CSS_FILES=()
for f in "${CHANGED_FILES[@]}"; do
  case "$f" in *.css|*.scss) [ -f "$f" ] && CSS_FILES+=("$f") ;; esac
done
if [ "${#CSS_FILES[@]}" -eq 0 ]; then
  echo "- skipped: no CSS/SCSS files in this range"
  note_skipped "design consistency: no CSS/SCSS files changed"
else
  FONT_SIZES="$(grep -hoE 'font-size:[[:space:]]*[0-9.]+(px|rem|em|%)' "${CSS_FILES[@]}" 2>/dev/null | sed 's/font-size:[[:space:]]*//' | sort -u)"
  N_FONT="$(printf '%s\n' "$FONT_SIZES" | grep -c . || true)"
  COLORS="$(grep -hoE '#[0-9a-fA-F]{3,8}\b|rgba?\([0-9, .%]+\)|hsla?\([0-9, .%]+\)' "${CSS_FILES[@]}" 2>/dev/null | sort -u)"
  N_COLOR="$(printf '%s\n' "$COLORS" | grep -c . || true)"
  echo "- ${#CSS_FILES[@]} CSS/SCSS file(s) touched: $N_FONT distinct font-size literal(s), $N_COLOR distinct color literal(s)"
  if [ "$N_FONT" -gt 10 ] || [ "$N_COLOR" -gt 20 ]; then
    note_needs_human "$N_FONT distinct font-sizes / $N_COLOR distinct colors across touched CSS — high literal count is itself the finding, consider consolidating into tokens/variables"
  fi
fi
echo

# --- 7. coverage delta -------------------------------------------------------------------------
echo "## Coverage"
COV_FILE=".subtask-reports/.coverage-baseline"
CUR_COV=""
if [ -f coverage/coverage-summary.json ] && have node; then
  CUR_COV="$(node -e 'try{const d=JSON.parse(require("fs").readFileSync("coverage/coverage-summary.json","utf8"));console.log(d.total.lines.pct)}catch(e){}' 2>/dev/null)"
elif [ -f .coverage ] && have coverage; then
  CUR_COV="$(coverage report 2>/dev/null | tail -1 | grep -oE '[0-9]+%$' | tr -d '%')"
fi
if [ -n "$CUR_COV" ]; then
  PREV_COV=""
  [ -f "$COV_FILE" ] && PREV_COV="$(cat "$COV_FILE")"
  if [ -n "$PREV_COV" ]; then
    echo "- coverage: ${CUR_COV}% (was ${PREV_COV}%)"
  else
    echo "- coverage: ${CUR_COV}% (no prior baseline recorded)"
  fi
  mkdir -p "$(dirname "$COV_FILE")" 2>/dev/null
  echo "$CUR_COV" > "$COV_FILE" 2>/dev/null
else
  echo "- skipped: no coverage tool output detected (checked coverage/coverage-summary.json, \`coverage report\`)"
  note_skipped "coverage: no coverage tool output found"
fi
echo

# --- summary -----------------------------------------------------------------------------------
echo "## 확인이 필요한 것"
if [ "${#NEEDS_HUMAN[@]}" -eq 0 ]; then
  echo "- (none raised by the checks above)"
else
  for item in "${NEEDS_HUMAN[@]}"; do
    echo "- $item"
  done
fi
echo

echo "## Skipped checks"
if [ "${#SKIPPED[@]}" -eq 0 ]; then
  echo "- (none — every applicable check ran)"
else
  for item in "${SKIPPED[@]}"; do
    echo "- $item"
  done
fi
exit 0

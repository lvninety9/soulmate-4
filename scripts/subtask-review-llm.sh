#!/usr/bin/env bash
# subtask-review-llm.sh — layer 2: a fresh local-model call reads the sub-task's actual diff and
# points out concrete defects a deterministic tool structurally can't catch (a flipped comparison,
# a requirement mismatch, an argument silently ignored). Layer 1 (scripts/subtask-report.sh)
# deliberately stayed tool-only — this project's own README: "검증은 필수. 다만 LLM으로 하면 안
# 됩니다 — 대부분은 판단이 아니라 도구 문제." That's still true for secrets/tests/lint/mocks. This
# script exists only for the residual class those tools cannot cover, and it is held to a
# different, lower trust level than layer 1 on purpose (see "## 확인이 필요한 것" below).
#
# WHY THIS IS SAFE TO ADD DESPITE THE MODEL'S OWN MEASURED FAILURE MODES
# (wiki/PROJECT_BACKGROUND.md "Local model capability"):
#   - "State design (0/1) vs stateless transformation (5/5)" — reading a fixed diff and emitting a
#     bounded list of {file, line, issue} is a stateless transformation (input -> output), not the
#     model inventing or remembering state. That's the shape it's actually good at.
#   - "18 straight turns of fabricated 완료 claims in a long, already-derailed session" — every
#     call this script makes is a brand-new, context-free HTTP request (no Kilo session, no
#     conversation history to derail). This is the strongest possible form of the "new session"
#     mitigation verify.md already recommends by hand.
#   - "no citation, no confident score" (verify.md's own rubric rule) — the prompt requires an
#     exact file+line for every claim; findings without one are dropped by the parser below, not
#     trusted as prose.
#   - Empty findings are a valid, expected output (tested live: a clean diff returns `[]`) — the
#     prompt explicitly permits "nothing found" so the model isn't pressured into inventing an
#     issue to have something to say (the same forced-non-negative trap this project's sibling
#     project Hermes hit and fixed, wiki/PROJECT_BACKGROUND.md's concept-song/AI-cliché rules).
#   - Non-blocking by construction, per this project's own admission bar ("(a) irreversible or
#     (b) proven ignored -> block; else report"): this layer has zero rounds of evidence yet on
#     whether the model's diff-review findings get ignored, so it reports only. If a future round
#     measures that a real class of its findings gets ignored, promote that specific class to a
#     blocker then — don't pre-block on an unmeasured guess.
#
# CALL BOUNDARY: reuses subtask-report.sh's own sub-task boundary via lib/subtask-range.sh — see
# that file for why a second, invented boundary is a real risk here, not hypothetical.
#
# Usage:
#   scripts/subtask-review-llm.sh [<target-sha>] [--since <sha>]
# Env overrides (all optional, same override-via-env convention as subtask-report.sh):
#   SUBTASK_REVIEW_API_BASE     default http://127.0.0.1:8080/v1 (OpenAI-compatible)
#   SUBTASK_REVIEW_MODEL        default "local" — llama-server with one model loaded ignores this
#                                field entirely (confirmed live); set it if your provider validates it
#   SUBTASK_REVIEW_TIMEOUT_S    default 120 (network+generation combined, single curl call)
#   SUBTASK_REVIEW_DIFF_CHAR_CAP default 20000 — larger diffs are skipped, not silently truncated
#                                (a partial diff reviewed as if complete is a worse failure mode
#                                than an honest skip — this project's own "silence must never read
#                                as checked and clean" rule, subtask-report.sh's header)
#   SUBTASK_REVIEW_LLM_DISABLE  set to skip this layer entirely without attempting a network call
#   SUBTASK_REVIEW_MOCK_CONTENT test-only: when set, skip the real curl call and parse this string
#                                as if it were the model's message content (tests/subtask-review-
#                                llm.test.mjs uses this to test the parser without a live server)

set -uo pipefail # deliberately NOT -e: see subtask-report.sh's own header for why

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -z "$REPO_ROOT" ]; then
  echo "subtask-review-llm: not inside a git repo — nothing to review."
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

# shellcheck source=lib/subtask-range.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/subtask-range.sh"
if ! compute_subtask_range "$TARGET" "$SINCE_OVERRIDE"; then
  echo "subtask-review-llm: could not resolve '$TARGET' to a commit — nothing to review."
  exit 0
fi

API_BASE="${SUBTASK_REVIEW_API_BASE:-http://127.0.0.1:8080/v1}"
MODEL="${SUBTASK_REVIEW_MODEL:-local}"
TIMEOUT_S="${SUBTASK_REVIEW_TIMEOUT_S:-120}"
DIFF_CHAR_CAP="${SUBTASK_REVIEW_DIFF_CHAR_CAP:-20000}"
MAX_ITEMS=10

echo "# Layer 2 — local-model diff review — $RANGE_DESC"
echo

NEEDS_HUMAN=()
note_needs_human() { NEEDS_HUMAN+=("$1"); }

finish() {
  echo "## 확인이 필요한 것 (모델 판단 — 도구 판정 아님, 사람 확인 전 신뢰하지 말 것)"
  if [ "${#NEEDS_HUMAN[@]}" -eq 0 ]; then
    echo "- (none raised)"
  else
    for item in "${NEEDS_HUMAN[@]}"; do
      echo "- $item"
    done
  fi
  exit 0
}

if [ -n "${SUBTASK_REVIEW_LLM_DISABLE:-}" ]; then
  echo "- skipped: SUBTASK_REVIEW_LLM_DISABLE set"
  finish
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "- skipped: curl not on PATH"
  finish
fi

if ! command -v node >/dev/null 2>&1; then
  echo "- skipped: node not on PATH (needed to build the request body and parse the response safely)"
  finish
fi

DIFF_TEXT="$(git diff "$RANGE" -- . 2>/dev/null)"
if [ -z "$DIFF_TEXT" ]; then
  echo "- skipped: empty diff for range $RANGE_DESC"
  finish
fi

DIFF_LEN="${#DIFF_TEXT}"
if [ "$DIFF_LEN" -gt "$DIFF_CHAR_CAP" ]; then
  echo "- skipped: diff is $DIFF_LEN chars, over the $DIFF_CHAR_CAP-char cap — reviewing a"
  echo "  truncated diff as if it were complete is worse than an honest skip; read it directly"
  echo "  (\`git diff $RANGE\`), or raise SUBTASK_REVIEW_DIFF_CHAR_CAP for a genuinely large sub-task"
  note_needs_human "diff ($DIFF_LEN chars) too large for automated layer-2 review — read \`git diff $RANGE\` by hand"
  finish
fi

# --- build the prompt -------------------------------------------------------------------------
# Stateless-transformation shape on purpose (see header): fixed input (the diff, verbatim) ->
# bounded structured output. No conversation, no memory of prior findings, no "what did you do"
# self-report — the failure shape this model is actually bad at never enters the picture.
read -r -d '' PROMPT_HEAD <<'PROMPT_EOF' || true
You are reviewing a git diff for concrete, verifiable defects only.
Rules:
- Only report an issue you can point to with an exact file path and line number visible in the
  diff below (the line as it appears after the change, i.e. a "+" line).
- Do not comment on style, naming, formatting, or anything not directly visible in this diff.
- Do not invent context you cannot see in the diff — do not assume what other files contain.
- If you find nothing concrete, return an empty JSON array. Do not invent an issue just to have
  something to say.
- Output ONLY a JSON array, no prose before or after, no markdown code fence. Each item:
  {"file": "<path>", "line": <int or null>, "issue": "<one sentence, cite what's wrong>"}
- At most 10 items.

Diff:
PROMPT_EOF
PROMPT="${PROMPT_HEAD}
${DIFF_TEXT}"

# --- call the model (or use the test-only mock seam) ------------------------------------------
if [ -n "${SUBTASK_REVIEW_MOCK_CONTENT:-}" ]; then
  CONTENT="$SUBTASK_REVIEW_MOCK_CONTENT"
else
  REQUEST_FILE="$(mktemp)"
  RESPONSE_FILE="$(mktemp)"
  node -e '
    const fs = require("fs")
    const model = process.argv[1]
    const prompt = fs.readFileSync(0, "utf8")
    fs.writeFileSync(process.argv[2], JSON.stringify({
      model, messages: [{ role: "user", content: prompt }],
      max_tokens: 800, temperature: 0.0,
    }))
  ' "$MODEL" "$REQUEST_FILE" <<<"$PROMPT"

  HTTP_CODE="$(curl -sS --max-time "$TIMEOUT_S" -o "$RESPONSE_FILE" -w '%{http_code}' \
    "$API_BASE/chat/completions" -H "Content-Type: application/json" \
    --data-binary "@$REQUEST_FILE" 2>/dev/null)"
  CURL_RC=$?

  if [ "$CURL_RC" -ne 0 ]; then
    if [ "$CURL_RC" -eq 28 ]; then
      echo "- skipped: local model server at $API_BASE did not respond within ${TIMEOUT_S}s (timeout — busy or down, this is not a pass)"
    else
      echo "- skipped: could not reach local model server at $API_BASE (curl exit $CURL_RC)"
    fi
    rm -f "$REQUEST_FILE" "$RESPONSE_FILE"
    finish
  fi
  if [ "$HTTP_CODE" != "200" ]; then
    echo "- skipped: local model server at $API_BASE returned HTTP $HTTP_CODE (not a pass — server likely busy with another request, this project's llama-server has a single slot)"
    rm -f "$REQUEST_FILE" "$RESPONSE_FILE"
    finish
  fi

  CONTENT="$(node -e '
    try {
      const d = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))
      const c = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content
      if (typeof c === "string") process.stdout.write(c)
    } catch (e) {}
  ' "$RESPONSE_FILE")"
  rm -f "$REQUEST_FILE" "$RESPONSE_FILE"

  if [ -z "$CONTENT" ]; then
    echo "- skipped: response from $API_BASE had no parseable message content — see raw response was already discarded (rerun with SUBTASK_REVIEW_MOCK_CONTENT unset and inspect \`curl $API_BASE/chat/completions\` by hand if this repeats)"
    finish
  fi
fi

# --- parse the model's output --------------------------------------------------------------
# round-34/35 lesson applied to an LLM instead of a shell tool: a regex-over-prose parser is the
# thing that failed 13 rounds running elsewhere in this project's history (check_stale_language).
# Ask for strict JSON and parse with JSON.parse, not a hand-rolled pattern match. Still defensive:
# a markdown fence gets stripped first (models drift on this even under instruction), and any
# parse failure is surfaced as its own finding with the raw text attached — never silently folded
# into "0 issues found," which would be indistinguishable from a real clean review.
PARSE_OUT_FILE="$(mktemp)"
printf '%s' "$CONTENT" | node -e '
  const raw = require("fs").readFileSync(0, "utf8")
  let s = raw.trim()
  const fence = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/)
  if (fence) s = fence[1].trim()
  const start = s.indexOf("[")
  const end = s.lastIndexOf("]")
  let items
  try {
    if (start === -1 || end === -1 || end < start) throw new Error("no JSON array found")
    items = JSON.parse(s.slice(start, end + 1))
    if (!Array.isArray(items)) throw new Error("parsed value is not an array")
  } catch (e) {
    console.log("PARSE_FAIL")
    console.log(raw.slice(0, 1500))
    process.exit(0)
  }
  // Round 49: the model has a training cutoff and this project deliberately runs current
  // toolchains, so it reports newer-than-itself dependency versions as typos. Measured on the two
  // warms-mobile reports that carried layer-2 findings at all: 14 findings, 0 true positives, and
  // 5 of them were this exact claim -- typescript ^7.0.2, vite ^8.2.2, @types/node ^26.4.1 and
  // Phaser 4 "do not exist", while node_modules holds all four at precisely those versions.
  //
  // The fix is not a better prompt (wording rewrites are 0/2 project-wide, and a training cutoff
  // is not something an instruction moves). It is that this claim is decidable by a tool, and this
  // project rules that whatever a tool can decide does not go to a model: a nonexistence claim
  // about a package the repo declares AND has installed is checked against node_modules and
  // dropped when the package is sitting right there. Both halves are required -- declared alone
  // would let an uninstalled name through, installed alone would sweep in transitive packages
  // whose short names collide with ordinary English.
  //
  // Direction matters: rather than parsing a package name out of prose (the free-text judging
  // that round 45 measured at 6% precision), each declared+installed name is tested against the
  // text as an exact case-insensitive substring -- the isMutating tool-name species of check.
  // Nothing is silently deleted: filtered findings still print, they just stop reaching the
  // human-attention channel, because in this project silence must never read as checked-and-clean.
  // Apostrophe-free by necessity: this whole node program lives inside a single-quoted bash
  // string. Narrow on purpose -- these are the phrasings the measured corpus actually used.
  const NONEXISTENCE = /\b(?:does not exist|do not exist|no such version|not a (?:released|real|valid|published) version|never (?:been )?released)\b/i
  let installedDeps = []
  try {
    const pkg = JSON.parse(require("fs").readFileSync("package.json", "utf8"))
    const declared = Object.keys({ ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) })
    installedDeps = declared.filter((name) => require("fs").existsSync(`node_modules/${name}/package.json`))
  } catch (e) {}
  function installedVersionOf(issue) {
    if (!NONEXISTENCE.test(issue)) return null
    const hay = issue.toLowerCase()
    for (const name of installedDeps) {
      if (!hay.includes(name.toLowerCase())) continue
      // Third requirement, added after a constructed negative got swept up: the claim must be
      // about a VERSION. A nonexistence claim with no version in it ("vite does not exist as a
      // backend runtime") is a category argument, and this filter has nothing to say about those.
      // Either a dotted version anywhere, or the package name followed directly by a number --
      // which is what carries "Phaser 4", the only shape in the corpus without dots.
      const escaped = name.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")
      const versionish = /\bv?\d+\.\d+/.test(issue) || new RegExp(escaped + "\\s+v?\\d", "i").test(issue)
      if (!versionish) continue
      try {
        const v = JSON.parse(require("fs").readFileSync(`node_modules/${name}/package.json`, "utf8")).version
        return `${name}@${v}`
      } catch (e) {
        return name
      }
    }
    return null
  }

  console.log("PARSE_OK")
  console.log(String(items.length))
  const cap = parseInt(process.argv[1], 10) || 10
  for (const it of items.slice(0, cap)) {
    if (!it || typeof it !== "object") continue
    const file = typeof it.file === "string" && it.file.trim() ? it.file.trim() : "(no file cited)"
    const line = (typeof it.line === "number" && Number.isFinite(it.line)) ? String(it.line) : "?"
    const issue = typeof it.issue === "string" && it.issue.trim() ? it.issue.trim() : "(no description)"
    const installed = installedVersionOf(issue)
    console.log(`${installed ? "FILTERED" : "ITEM"}\t${file}\t${line}\t${issue}\t${installed || ""}`)
  }
' "$MAX_ITEMS" > "$PARSE_OUT_FILE"

STATUS_LINE="$(head -1 "$PARSE_OUT_FILE")"
if [ "$STATUS_LINE" = "PARSE_FAIL" ]; then
  echo "- model response was not parseable as a JSON array — this is NOT the same as \"0 issues"
  echo "  found,\" it means the review didn't run cleanly. Raw response (truncated):"
  tail -n +2 "$PARSE_OUT_FILE" | sed 's/^/  | /'
  note_needs_human "layer-2 model response for $RANGE_DESC was not machine-parseable — review the diff manually, the model may have found something it couldn't express as JSON"
  rm -f "$PARSE_OUT_FILE"
  finish
fi

N_ITEMS="$(sed -n '2p' "$PARSE_OUT_FILE")"
N_SHOWN="$(tail -n +3 "$PARSE_OUT_FILE" | grep -cE $'^(ITEM|FILTERED)\t' || true)"
N_FILTERED="$(tail -n +3 "$PARSE_OUT_FILE" | grep -c $'^FILTERED\t' || true)"
if [ "$N_ITEMS" = "0" ]; then
  echo "- 0 issue(s) found (model reviewed the diff, output parsed cleanly)"
else
  if [ "$N_SHOWN" -lt "$N_ITEMS" ]; then
    echo "- $N_ITEMS issue(s) found, showing first $N_SHOWN (cap $MAX_ITEMS):"
  else
    echo "- $N_ITEMS issue(s) found:"
  fi
  while IFS=$'\t' read -r tag file line issue installed; do
    case "$tag" in
      ITEM)
        echo "  - $file:$line — $issue"
        note_needs_human "[layer2/local-llm, unverified] $file:$line — $issue"
        ;;
      # Printed, never raised: the claim is that a version does not exist and node_modules holds
      # that very package. Left visible so this is a stated verdict, not a silent deletion.
      FILTERED)
        echo "  - $file:$line — $issue"
        echo "    [dropped: this repo has $installed installed — a version newer than the model's"
        echo "     training cutoff is not evidence that the version does not exist]"
        ;;
    esac
  done < <(tail -n +3 "$PARSE_OUT_FILE")
  if [ "$N_FILTERED" -gt 0 ]; then
    echo "- $N_FILTERED of those were dropped against node_modules and are NOT in the list below."
  fi
fi
rm -f "$PARSE_OUT_FILE"
echo
finish

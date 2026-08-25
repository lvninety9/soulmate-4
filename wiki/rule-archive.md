# Rule archive — full evidence behind each Learned Rule in AGENTS.md

Read on demand only, never auto-loaded. One section per rule ID.
**Role (session 5 rule, doc-role separation): raw evidence only — the actual commands run, their
real output, root cause read from actual code.** Not a summary and not a "why we decided this
mattered" narrative (that's `SESSION_MASTER.md`) — a reader should be able to reproduce the claim
from what's written here, not just trust it.


## L01-L05 — moved to archive

Moved to `wiki/rule-archive-archive.md` (session 5's self-harness PRUNE step). Covers: Kilo's
real opencode-rebuild identity (L01), custom slash commands not working (L02), AGENTS.md/
CLAUDE.md/CONTEXT.md auto-load confirmation (L03), the reasoning-token-exhaustion incident (L04),
and the live confirmation that Kilo inherits opencode's tool.execute hooks (L05).

## L06-L07 — moved to archive

Moved to `wiki/rule-archive-archive.md` (round 8's self-harness PRUNE step, `rule-archive.md`
crossed the WATCH threshold). Covers: gate state not surviving separate `kilo run`/`--continue`
processes, fixed via disk persistence (L06); the gate's arming trigger being 100% elective until
real-commit counting was added (L07).

## L09 — moved to archive

Moved to `wiki/rule-archive-archive.md` (round 8's self-harness PRUNE step). Covers:
`refactor.md`'s self-serve premise never firing in 3/3 independent trials, and the first-mutation
protocol-read gate that fixed it — full 3-trial evidence (backup-first/small-units/real-
verification/stop-and-ask all failing independently) plus the live re-verification.

## Round 5-30 (incl. closing pass) — moved to archive

Moved to `wiki/rule-archive-archive.md` (round 34's self-harness PRUNE step, `rule-archive.md`
crossed the new hard cap again). Covers: round 5 objective audit + L10, round 6 re-score, round 7
regression, round 8 re-audit, round 27 (`session.idle` hook found), round 28 items 1/2/6/7 (#41
gate redesign, bench redesign, Q3→Q4_K_M quantization), round 29 items 1/6 (#45 fail-closed git
handling, axis B/C), round 30 items 1-3/5-7 (question-tool re-verification, real tool inventory,
elective-arm turn-boundary fix), and round 30's closing pass (item 4's definitive cause via
`kilo.db` transcript mining, every open FEEDBACK row closed to a terminal state). Round 31 onward
stays live below.

## Round 31 (final round) — moved to archive

Moved to `wiki/rule-archive-archive.md` (layer-2 sub-task's self-harness PRUNE step,
`rule-archive.md` crossed the WARN threshold again). Covers: the live 5-message Cursor Kilo
Code plugin production trial (`#47` reopened at full scale — 18/18 gate blocks, zero bypasses;
`#6` reproduced at its strongest — 18 fabricated completion claims), contradiction injection
shipped as a mitigation (mechanism unit-verified, live efficacy not yet verified at the time),
and this round's final FEEDBACK state (`#2`/`#4-12` permanent ceilings, `#6` permanent ceiling
with unverified mitigation, `#47` reopened, `#50` open/monitor). Round 32 onward stays live
below.

## Round 32 — moved to archive

Moved to `wiki/rule-archive-archive.md` (round 36's self-harness PRUNE step, `rule-archive.md`
crossed the WARN threshold again after round 36's own addition). Covers: trial 2 (fresh
3-turn session) compared against round 31's long-session trial — Finding A (`#6`/`#47`
correlate with session length/derailment, not the primer-gate mechanism itself, both rows
reframed not closed) and Finding B (`.kilo/plugins/*.ts` loads once at `kilo serve` daemon
start, not per session — explains why round 31's contradiction injection stayed
live-unverified). Combined gate record across trials 1+2: 20/20 blocked, zero bypasses. Round
33 onward stays live below.

## Round 33 — hard cap replaces soft WATCH (item 1), session-log.md's line-vs-bytes bug (item 2),
quiet-by-default check-caps.sh output (item 3)

Opus work order, narrow scope: fix check-caps.sh's own doc-budget enforcement, not a new audit
round. Motivating measurement, taken live before any fix (fresh clone `e68e356`, 215 commits):
hard caps were obeyed 100% of the time across this project's whole history; the append-only WATCH
on `rule-archive.md`/`SESSION_MASTER.md` was obeyed 0% of the time. `git show <commit>:wiki/
rule-archive.md | wc -l` walked across every commit touching the file (`git log --reverse
--format=%H -- wiki/rule-archive.md`) confirmed one real archive event ever (session 7/round 8,
374->284 lines), then unbroken growth 284->1153 with the WATCH printing on every single commit
along the way and nobody pruning. `SESSION_MASTER.md` showed the same shape: two real archive
events (round 7: 231->149, round 9: 137->102-ish), then unbroken growth 137(round 9)->281 across
rounds 10-32 with its own 150-line WATCH firing the whole time, unactioned.

**Item 1 — cap numbers, derived from real checkpoints not a round number.** `git show
6fcf9931:wiki/rule-archive.md | grep -n '^## '` confirmed the file's real 408-line checkpoint
(2026-08-22) was the state right after Round 27 landed, before Round 28's additions began —
this project's own last real pre-bloat resting size, not an arbitrary number. `RULE_ARCHIVE_
WARN=400`/`RULE_ARCHIVE_CAP=450`: WARN kept at the pre-existing 400 (already sat within ~2% of
that 408 checkpoint and never false-positived in 20+ rounds); CAP adds 50 lines (~1 round's worth
at this project's recent growth rate) of real headroom above WARN before a commit is mechanically
blocked. `SESSION_MASTER_WARN=150`/`SESSION_MASTER_CAP=200`: WARN kept at the pre-existing 150
(matches the round-7 post-archive checkpoint, 149, almost exactly); CAP adds 50 lines. Both
pairs reuse `check_lines_warn()` (the exact mechanism every other auto-loaded doc already uses)
instead of `check_watch_size()` — no new cap-shape invented.

**Item 1 — the prune itself, performed to meet the new cap immediately (not deferred):**
`rule-archive.md`: moved lines 31-897 of the pre-prune file (Round 5 through Round 30's *main*
section, 867 lines — L01-L05/L06-L07/L09 pointer stubs at the top were left in place, already
minimal) to `wiki/rule-archive-archive.md`, replaced with one pointer section ("Round 5-30 —
moved to archive"). 1153->296 lines (23,281 chars), well under the new 450 cap and even under
the 400 WARN. `SESSION_MASTER.md`: moved lines 10-185 (Round 5/Round 6/session-5-handoff-
reverify/Round-27-mistake/PRUNE-pass, 176 lines) to `wiki/handoffs/SESSION_MASTER-archive.md`,
one pointer section added. 281->117 lines (9,043 chars). Fixed two internal "above" cross-
references in the surviving text that would otherwise have dangled into the now-archived
section (both now name `wiki/handoffs/SESSION_MASTER-archive.md` explicitly instead of "above").
Nothing deleted — every moved line still exists verbatim in its `-archive.md` companion,
line-count-verified before/after (`wc -l` on both files, sum preserved plus the new pointer
paragraphs' own lines).

**Item 1 — judgment call: `-archive.md` tail files left uncapped.** Neither `rule-archive-
archive.md` nor `SESSION_MASTER-archive.md` is ever auto-loaded (confirmed: neither appears in
`check_required_read_total`'s file list, nor in AGENTS.md's File Map / `@import`-equivalent
pointers) — capping them would cost real token budget for zero benefit (nobody reads them by
default) and would just force inventing a third archive tier per file for no reason. Left
unbounded on purpose, not by omission.

**Item 2 — session-log.md's real per-row char distribution, measured before picking a cap:**
`grep -nE '^\| *[0-9]+ *\|' wiki/session-log.md | while IFS=: read -r n rest; do echo
"${#rest} row_$n"; done | sort -n` on the file as of this round: min 373 chars (row 8), max
2,679 chars (row 20, the densest real entry — a multi-day, multi-round session), most rows in
the 500-1,400 range. Copying `FEEDBACK_ROW_CHAR_CAP` (300) verbatim would OVER CAP all 21 real
rows immediately, forcing an unwanted retroactive rewrite of session history — rejected.
`SESSION_LOG_ROW_CHAR_CAP=3000` gives the real max (2,679) ~12% headroom.

**Item 2 — reuse, not a second mechanism.** Extracted FEEDBACK_PENDING.md's inline row-char-cap
`while` loop (previously duplicated logic living only at that one call site) into
`check_row_char_cap(file, cap, dest_hint)`, called once per file with its own cap/hint. Diffed
`check-caps.sh`'s own git history logic before/after the extraction to confirm the loop body
(the `grep -E '^\| *[0-9]+(/[0-9]+)? *\|'` row match, the `${#row_line}` length check, the row-
number `sed` extraction) is byte-identical to what FEEDBACK_PENDING.md's call site had before —
only the surrounding `while` loop became a function body. Regression-proven (T12): the real
`FEEDBACK_PENDING.md` row-cap OVER CAP message is unchanged, exact original wording.

**Item 3 — quiet-by-default, measured before and after.** Before: `bash scripts/check-caps.sh`
on a clean fresh-clone repo printed 1 WARN (`AGENTS.md total ... 80/85 ... soft target 70`) + 4
WATCH (`rule-archive.md`, `SESSION_MASTER.md` — both now hard-capped by item 1, so this count
drops to 2 after it — `subtask-gate.ts`, `check-caps.sh`), all in normal/non-actionable states,
exit 0. After (post-item-1, so 2 WATCH remain) + item 3's own fix: same clean repo, no flag ->
0 WARN/WATCH/reminder lines printed, one line instead
(`bash scripts/check-caps.sh`, live-run output: `(4 non-blocking notice(s) suppressed — rerun
with --verbose to see them)` — the 4 being AGENTS.md's WARN, the 2 code-size WATCHes, and the
primer-handoff reminder that also fires on this repo's own working state), exit 0.
`--verbose` on the same repo reproduced every one of those 4 lines, byte-identical wording to
the pre-item-3 output (live-diffed). Deliberately introduced a real OVER CAP (`wiki/rule-
archive.md` filled with 500 filler lines) and re-ran without `--verbose`: the OVER CAP line and
all 4 non-blocking notices printed in full, unconditionally — confirms the "already blocking ->
full context automatically, no flag needed" branch, not just the summary/verbose split.

**Commits (in order): rule-archive.md prune (`7113c00`), SESSION_MASTER.md prune (`8478cc5`),
item 1's cap-mechanism + self-harness.md doc update + T7-T9 (`20466e1`), item 2 + T10-T12
(`83aed4f`), item 3 + T13-T15 + T3 update (`2fd8912`).** Split across 5 commits, not 1, because
`scripts/pre-commit-check-caps`'s own `STAGED_FILE_CAP=3` blocks a single commit touching more
than 3 files — grouped by logical unit (each file-count-3-or-fewer) rather than by item, since
item 1 alone touched 5 files across data (prune) and code (cap mechanism) changes.

**Verification after all 5 commits, fresh state:** `node tests/check-caps.regression.test.mjs`
— 18 new assertions (T7-T15) + all pre-existing ones, ALL PASS. `node tests/stale-language.fuzz.
test.mjs` — 42/42, unchanged (this round made zero `check_stale_language()` changes, an explicit
non-goal). `node tests/subtask-gate.test.mjs` — unchanged, ALL PASS (this round made zero gate-
blocking-logic changes, an explicit non-goal). `bash scripts/check-caps.sh` — exit 0, required-
read total 21840/27800 chars (unchanged from the round's starting state — this round's own code/
doc edits touched none of the 4 required-read files until the SESSION_PRIMER.md handoff commit,
which brought it to 23,904/27,800, still comfortably under cap). No LLM calls made this round
(a foreign benchmark process held the only local llama-server slot for the round's duration);
`~/aider-bench/` was not touched.

## Round 34 — Deliverable 1 (universal sub-task report generator) + Deliverable 2 (evergreen local-model capability numbers)

**Starting-state re-verification (fresh clone, per L13), before any work**: `HEAD d8622fb`, 221
commits — matched. `subtask-gate.test.mjs`: 39 `ok:` lines (21 distinct `T<N>` cases, some with
`a/b/c` sub-labels — matches "39 assertions/35 cases" on the assertion count). `stale-language.
fuzz.test.mjs`: `ALL PASS (42/42)`. `check-caps.regression.test.mjs`: 60 `ok:` lines, `ALL PASS`.
`check-caps.sh`: exit 0, `(4 non-blocking notice(s) suppressed...)` — matches "EXIT=0 quieted"
exactly. No mismatch.

**Deliverable 1 — `scripts/subtask-report.sh` + `scripts/post-commit-subtask-report`.**

*Why the report is evidence-only, not model-summarized*: this week's local-model measurement (see
below) is the direct motivation — 18 consecutive turns claiming `tools/wordcount_core.py 생성
완료`/`커밋 완료`/`테스트 결과: 모든 테스트 PASS` while every tool call was blocked and `tools/`
never existed on disk. Summarizing a fixed evidence bundle is a stateless transformation (the
shape the model measurably handles, see the aider-polyglot pass list below); recalling its own
actions is the shape it fails at — so the script never asks the model anything; every line it
prints traces to a real command's real exit code/stdout.

*Trigger, reusing (not inventing) the existing boundary*: `subtask-gate.ts`'s `computeBoundary()`
treats a commit touching `wiki/handoffs/SESSION_PRIMER.md` as a "primer" boundary — the exact
definition the spec named. `scripts/post-commit-subtask-report` checks `git diff-tree
--no-commit-id --name-only -r --root HEAD` for that path and fires only then; every other commit
is silent. `scripts/subtask-report.sh` derives the same boundary fresh from git on every
invocation (`git log -1 --format=%H <target>^ -- wiki/handoffs/SESSION_PRIMER.md`, empty-tree
fallback) — no state file, fully re-runnable by hand (`[<target>] [--since <sha>]`), and avoids
the exact staleness class `computeBoundary()`'s own round-28 comment warns a persisted flag risks.

*Checks, each detect-then-maybe-run*: tests (package.json/pytest/go/cargo/make, or bare
`tests|test/*.test.mjs` via `node --experimental-strip-types` — this repo's own no-package.json
pattern) — leftovers (TODO/FIXME/XXX, console.log/debugger/pdb.set_trace/`print(`, mock/dummy/
fixture keywords outside test-ish paths, scoped to *added* diff lines only) — secrets/security
(gitleaks, npm audit, bandit, pip-audit, semgrep) — lint/dead-code (eslint via `npx --no-install`,
ruff, ts-prune, vulture) — CSS design consistency (distinct `font-size`/color literal counts) —
coverage delta (cached to `.subtask-reports/.coverage-baseline`, gitignored). Every branch is
optional; an unavailable tool is named under "Skipped checks," never silently treated as clean.
The script itself never exits nonzero in a way that could block a caller (`set -uo pipefail`, not
`-e`); the hook wraps it with `set +e` besides.

*Proof this repo's own dogfood run is real, not staged*: `bash scripts/subtask-report.sh` against
this checkout's own last 6 commits (round 33) correctly auto-detected the bare-node-test pattern
with zero config and reproduced the exact assertion counts from the manual re-verification above
(60/42/39), and flagged 3 added TODO markers + 4 added "mock"-keyword lines from round 33's own
prose (e.g. "3 real git-failure tests, not mocks") under 확인이 필요한 것 — a real false-positive-
shaped finding surfaced honestly for a human to dismiss, not hidden.

*Proof of graceful degradation on a different stack (spec's own acceptance bar)*: two synthetic
throwaway repos outside this checkout (`testproj-python`, `testproj-node`, neither committed
here). Python/pytest: a broken import genuinely `FAIL (exit 2)` with real traceback tail, then a
`conftest.py` fix made it genuinely `PASS (exit 0)` — proves no fabricated success. Node/`npm
test`: same FAIL-then-PASS proof, plus `npm audit` "0 vulnerabilities" and a CSS file with 11
distinct font-sizes/11 colors correctly flagged. An `.eslintrc.json` with no eslint installed
initially mis-reported as "findings" (npx's missing-package message swallowed in) — fixed by
probing `npx --no-install eslint --version` first, now correctly routed to "Skipped checks."

*Regression tests*: `tests/subtask-report.test.mjs`, 18 assertions/8 synthetic-repo cases (no-
runner honesty, bare-node PASS/FAIL with exact counts, exact TODO count, boundary resolution incl.
`--since`, hook silence-vs-fire) — fresh throwaway repos, not a copy of this project. Caught a
real bug on first run: `git diff-tree --no-commit-id --name-only -r HEAD` prints nothing for a
repo's root commit without `--root` (confirmed live) — would have made a fresh repo's first
commit (plausibly the one seeding `SESSION_PRIMER.md`) silently never fire the report. Fixed;
`ALL PASS (18 assertions)` after.

**Deliverable 2 — this week's measured numbers, recorded as evergreen reference (not round
narrative)**: full numbers live in `wiki/PROJECT_BACKGROUND.md`'s "Local model capability"
section (a standing fact about the model, not this round's narrative — updated in place as new
measurements land). Raw source: complexity ladder N=5/level (own scale) 5/5→4/5→2/4→1/2→0/1.
Aider polyglot, Python subset, `Qwen3.6-35B-A3B-UD-Q4_K_M`, `--edit-format whole`, aider 0.86.2,
2-attempt protocol, seed 1234, n=23/25 (2 unrun on deadline): 9/23=39.1%; passes =
`list-ops`/`pig-latin`/`proverb`/`grep`/`bottle-song`/`zebra-puzzle`; failures =
`forth`/`paasio`/`simple-linked-list`/`bowling`/`hangman`/`pov`; not comparable to the public
6-language leaderboard figure, n=23 → roughly ±20pp CI. 3/9 passes landed only on a 2nd attempt.
**Operational traps** (cross-referenced from `SESSION_PRIMER.md`'s Hard constraints):
`.kilo/plugins/*.ts` loads once at `kilo serve` daemon start (verified via
`.subtask-gate-state.json`'s key set — reconfirms round 32 Finding B independently). A
stale/wrong Kilo-saved model name surfaces in the CLI as **exit 0, zero stdout, no error** —
related to but distinct from #50's still-open hang mystery (round 30 ruled out a *stale default*
on scripts already passing `-m` correctly; this is an *explicitly wrong* `-m`), so #50's row is
left unchanged, not merged.

**No `kilo run`/LLM/GPU call made this round** — every number above is prior measurement being
recorded, not re-run. `~/aider-bench/`, `~/sm4-plugin-test/`, `llama.service`,
`/media/jay/D/llama.cpp/llama.env`, `~/.config/kilo/kilo.jsonc` untouched, no process killed,
every commit through the real `.git/hooks/pre-commit` (`pre-commit-check-caps`, not bypassed).

## Round 36 — layer 2: local-model diff review, report-only, added alongside layer 1's tool-only report

**Housekeeping first**: `rule-archive.md` was already at 400/450 (this file's own WARN
threshold) before this round's write-up. Moved Round 31's full section (106 lines) to
`wiki/rule-archive-archive.md`, same PRUNE convention round 34 already used for rounds 5-30 —
left a pointer line, nothing deleted. 305/450 after, before this section was even written. This
round's own write-up (below) then pushed it back to 415/450 (WARN again) — moved Round 32's full
section (72 lines) out the same way once that was written, landing at 354/450, clean. Same
discipline round 33 itself established: don't let a soft WARN linger just because it isn't a hard
block yet.

**Ask (Jay)**: add a second verification layer — a local-model call that reads a sub-task's diff
and points out concrete issues, on top of layer 1 (`subtask-report.sh`, deliberately tool-only per
this repo's own README: *"검증은 필수. 다만 LLM으로 하면 안 됩니다 — 대부분은 판단이 아니라 도구
문제"*). Layer 2 exists only for the residual class layer 1 structurally can't cover — a flipped
comparison, a requirement mismatch, an ignored argument — things no deterministic tool checks for.

**Why this doesn't contradict the README's own "LLM으로 하면 안 됩니다" stance**: that line is
about secrets/tests/lint/mocks, all genuine tool problems with free deterministic tools already
covering them (still true, layer 1 untouched). Layer 2's failure-mode class has no such tool. Two
things from this week's own measured local-model data (`PROJECT_BACKGROUND.md`) make it safe to
add anyway: (1) reading a fixed diff and emitting a bounded `{file, line, issue}` list is a
**stateless transformation** — the shape the model is measurably good at (aider-polyglot
transformation-class exercises all passed), not the "design/remember state" shape it fails at
(0/1 on multi-sub-task chaining, the 18-turn fabrication incident). (2) every call is a brand-new,
context-free HTTP request — no Kilo session, nothing to derail — the strongest possible form of
`verify.md`'s own "cold, new-session read" mitigation.

**What was built**:
- `scripts/lib/subtask-range.sh` — `resolve_ref()`/`compute_subtask_range()` extracted verbatim
  from `subtask-report.sh`'s inline boundary resolution (unchanged behavior, incl. the round-34
  bad-ref-echo fix), now sourced by both report scripts. `subtask-report.sh` itself shrank by ~30
  lines to a single `source` + one call. Done specifically because `subtask-report.sh`'s own
  header already warns against "a second, invented boundary definition" — duplicating the ~30
  lines into the new script would have been exactly that.
- `scripts/subtask-review-llm.sh` — same CLI shape as layer 1 (`[<target-sha>] [--since <sha>]`),
  same boundary (via the shared lib). Builds a fixed prompt (diff verbatim, rules: cite exact
  file+line, empty array allowed and expected when nothing's wrong, JSON-only output, cap 10
  items), POSTs to `$SUBTASK_REVIEW_API_BASE/chat/completions` (default
  `http://127.0.0.1:8080/v1`, this project's own llama-server), parses `choices[0].message.content`
  defensively (markdown-fence stripped, `JSON.parse` — not a regex/prose heuristic, the thing that
  failed 13 rounds elsewhere in this project as `check_stale_language()`). A parse failure is its
  own explicit finding with the raw text attached, **never** folded into "0 issues found" — the
  single most dangerous failure shape here, since it would be indistinguishable from a genuinely
  clean review. Config via env (`SUBTASK_REVIEW_API_BASE`/`_MODEL`/`_TIMEOUT_S`/
  `_DIFF_CHAR_CAP`/`_LLM_DISABLE`), same override convention as `SUBTASK_REPORT_TIMEOUT_S`. A
  diff over the char cap (default 20000) is **skipped, not truncated-and-reviewed** — a partial
  diff reviewed as if complete is worse than an honest skip.
- `scripts/post-commit-subtask-report` — now also fires `subtask-review-llm.sh` after layer 1,
  appending to the same `.subtask-reports/<sha>.md` (`tee -a`), same never-blocks/never-silent
  guarantee. Guarded on the script existing+executable so an older checkout without layer 2 still
  works.
- `AGENTS.md`/`templates/AGENTS.md.template` File map row updated to cover both layers in one row
  (kept byte-identical per `check_template_drift()`; a first pass split it into two rows, which
  pushed `AGENTS.md` from 81 to 82 lines and broke two hardcoded-line-count assertions in
  `tests/check-caps.regression.test.mjs` (T9a/T14a) that this repo's own real state feeds — merged
  back into one row instead of updating those tests, since a merged row loses no information and
  is the smaller diff; re-ran `check-caps.sh --verbose` after, drift check still `ok`, AGENTS.md
  back at its original 81/85). `README.md` file tree updated to match, same round-34 precedent.
- `scripts/bootstrap.sh` — explicit `chmod +x` added for `subtask-review-llm.sh` (the recursive
  `cp -r "$SELF_DIR/scripts"` already copies `lib/` and the new script into a fresh project
  without any bootstrap change; the chmod is belt-and-suspenders, matching this script's own
  existing redundant chmod calls for the same reason).

**Trust level, stated explicitly, not implied**: layer 2's own report section header reads "모델
판단 — 도구 판정 아님, 사람 확인 전 신뢰하지 말 것." Every finding is also pushed into
확인이 필요한 것 tagged `[layer2/local-llm, unverified]` — visually distinct from layer 1's
untagged (deterministic-tool) findings in the same list, so a human scanning one combined report
can't mistake a probabilistic finding for a tool-certain one. Non-blocking by construction, per
this project's own admission bar ("(a) irreversible or (b) proven ignored → block; else report")
— zero rounds of evidence yet exist on whether this layer's findings get ignored; promote a
specific class to a blocker only once that's actually measured, not guessed.

**Live proof, not simulated** (this project's own "plant a defect, verify it's caught"
methodology, round 34/35, applied to an LLM instead of a shell tool): real `llama-server` on this
machine (`Qwen3.6-35B-A3B-UD-Q4_K_M.gguf`, confirmed via `/v1/models` and `systemctl status
llama`), called directly, no mock.
- Planted bug: `clamp(value, lo, hi)` with `if value < hi: return hi` (should be `>`, returns `hi`
  for an in-range value). Model returned exactly one item, `{"file":"clamp.py","line":6,"issue":
  "The condition 'value < hi' incorrectly returns 'hi' when the value is less than the upper
  bound..."}` — correct file, correct line, correct mechanism, first call (45.8s — cold; the
  model's own `predicted_ms`/`prompt_ms` timing fields summed to ~3.5s of that, the rest was one-
  off request/queue overhead not reproduced on the next call).
  `completion_tokens: 67`.
- Clean diff (`def add(a,b): return a+b`): returned `[]`, `completion_tokens: 2`, 6.6s — confirms
  the model doesn't invent an issue to have something to say when there genuinely isn't one.
- Mismatched `"model"` field (`"totally-wrong-model-name"`) — server answered 200 anyway; this
  llama-server build ignores the field for its one loaded model. `SUBTASK_REVIEW_MODEL` defaults
  to a generic placeholder (`local`) rather than hardcoding this machine's `.gguf` filename into a
  template meant to bootstrap onto other machines/providers.

**Regression tests**: `tests/subtask-review-llm.test.mjs`, 26 assertions, T1-T11 — disable flag
skips without a network call (T1), empty-diff range states itself explicitly rather than "0
issues" (T2), unreachable server is a stated skip, never a clean pass, fast/real (closed port,
short timeout, T3), oversized diff skips honestly rather than truncating (T4), valid-JSON findings
shown + tagged `[layer2/local-llm, unverified]` distinct from layer 1 (T5, mocked), markdown-
fenced JSON still parses (T6, mocked), empty array is a real "0 issues," distinct from a parse
failure (T7, mocked), unparseable content is its own explicit finding with raw text attached, never
silently "0 issues" (T8, mocked — the single scenario this design is most defensive about), over-
cap item count truncates the display but states the true count (T9, mocked), root-commit range
resolution matches layer 1's own `(repo start)..` behavior via the shared lib (T10). **T11 is the
one real, non-mocked call** — plants the same `clamp()` bug fresh in a throwaway repo, does a
quick `curl .../health` probe first, and either asserts the live model cites `clamp.py:5` or
prints an informational skip (not a FAIL) if the server didn't answer — same acceptance standard
round 33 already set ("no LLM calls made, server busy" is a legitimate outcome, not a defect).
All 26 passed, including T11 live. Existing suites re-run clean after every edit here:
`subtask-report.test.mjs` (18/18, unaffected by the `lib/subtask-range.sh` extraction),
`subtask-gate.test.mjs`, `check-secrets.test.mjs` — no regression. `check-caps.sh --verbose`:
`ok` throughout, template-drift check still `ok`, no OVER CAP.

**Left alone, out of scope for this round**: Round 35's own commits (secret scan moved to
pre-commit, report gaps 3/4 fixed, `SESSION_PRIMER.md` compressed — all visible in `git log`,
`18071a1`..`a9bba1c`) never got a "Round 35" write-up here or a `SESSION_PRIMER.md`/
`session-log.md` handoff of their own — `SESSION_PRIMER.md`'s header still reads "round 34
complete." Noticed, not fixed here — Jay's ask was specifically layer 2, and reconstructing
someone else's undocumented round from the outside risks getting the narrative wrong; flagged in
`session-log.md`'s row for this round instead of silently absorbed or silently ignored.

**Also found, also left alone**: this checkout's installed `.git/hooks/pre-commit` predates round
35's secret-scan addition (`diff .git/hooks/pre-commit scripts/pre-commit-check-caps` shows the
installed copy is missing the whole `check-secrets.sh` block) — this repo's own commits are
currently going through cap-checking only, not the secret block `SESSION_PRIMER.md`'s Hard
constraints describes as active. Not reinstalled here (git-hooks changes are outside this round's
ask); worth a `cp scripts/pre-commit-check-caps .git/hooks/pre-commit` the moment someone's
actually in round 35's scope.

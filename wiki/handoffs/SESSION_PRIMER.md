# SESSION PRIMER — round 20 complete (HTML-comment closing-line silent-miss fix); not yet re-scored

> Status icons: ✅done(evidence) ⏳code-done·unverified 🔶partial 🔴unfixed-bug ⚠️needs-user-action
> **Role: current-state tables only — no "why" narrative** (that's `SESSION_MASTER.md`).
> Rewritten 2026-08-08, end of session 5, after Jay explicitly asked for a rigorous handoff
> re-verification (see "Jay's meta-feedback" below) — every single claim in this file was
> re-checked against `git log`/actual running code/actual test output *at rewrite time*, not
> copied forward from an earlier draft of this same file. See "Verification method" below for
> exactly how, including an honest answer on whether this session was ever force-summarized.

## Project overview (what this repo IS and WHY it exists)

`soulmate-4` is a memory/harness template for coding-agent sessions running behind **Kilo Code**
(a VS Code/Cursor extension + CLI), talking to a **local LLM with a hard context ceiling**
(reference case: Qwen3.6-35B-A3B via `llama-server`, RTX 3080 10GB — this GPU is physically
shared with an unrelated production system, "Hermes," see "Hard constraints" below). It is the
4th in a lineage (soulmate → soulmate-2 → soulmate-3 → soulmate-4): each carries forward a
`wiki/`-based session-handoff harness (protocol docs, a session primer, a rule archive) proven
out over the earlier repos, and each one exists because the previous one hit a real, specific
limitation. soulmate-4's specific reason to exist: soulmate-3 (built for Cursor's Continue
extension) had no way to *mechanically* stop a local model mid-session when it skipped a
protocol step or chained sub-tasks unprompted — only a commit-time git hook, one step too late.
Kilo Code turned out to genuinely expose a real `tool.execute.before`/`after` plugin hook
(confirmed by reading the installed binary, not trusting stale public docs — this is `L01`, the
first lesson this repo ever recorded). `.kilo/plugins/subtask-gate.ts` is the payoff: a real
mechanical brake that can reject a tool call outright, not just a reminder in a system prompt.

**The actual goal, stated explicitly by Jay this session**: this repo must be pushed to earn a
score comparable to the *original* `soulmate` repo's own real, independently-audited result
(87/100 turnkey-bootstrap-readiness, 98.75/100 bounded-growth/structural-integrity, reached over
13 real rounds — those two numbers were never combined into one score by the original either).
The mechanism for doing that is a **repeating loop**: launch a fresh, non-fork, blind background
agent to independently score the repo → read what it finds → fix the highest-leverage issues,
each with a live re-verification (never trust a fix that only passed its own unit test) → repeat.
This session ran that loop **7 times** (see the round table below) and is explicitly meant to
keep running in future sessions until the score closes in on the original's.

> **Handoff re-verification note**: this rewrite follows Jay's session-5 request to verify
> rigorously against ground truth, not rush or trust a prior draft — see `SESSION_MASTER.md`'s
> "Session 5 handoff re-verification" section for the full why-narrative.

## Current state — round 19 last-measured turnkey 82/structural 84; round 20 fixed since, not yet re-scored

| Round | What it tested/built | Result | Evidence |
|---|---|---|---|
| 1-3 | discuss/design/build/verify self-serve + gate mechanics (3 separate fresh blind agents) | 3 real bugs found+fixed: gate state lost across processes, gate trigger 100% elective, commit detection regex-based (L06-L08) | `SESSION_MASTER.md`/`-archive.md`, `rule-archive.md` |
| Architecture realignment | Checked the *original* soulmate repo's real caps (not soulmate-3's) | `AGENTS.md` cap 65→85 to match original; Learned/Fixed Rules merged back into `AGENTS.md` | `SESSION_MASTER.md` "Round 4 — architecture realignment" |
| 4 (blind) | refactor.md self-serve, 3 independent trials | self-serve never fired once — backup/units/verify all failed as a result (L09 found) | `rule-archive.md` L09, `65dd69e`..`450f587` |
| 5 (objective audit) | Fresh non-fork agent, calibrated rubric against the *real* original repo, real bootstrap + real `kilo run` | **turnkey 74/100, structural 73/100** vs original's 87/98.75 | fixes: `35e90f0`..`8d3d590` |
| 6 (re-score) | Fresh agent re-verified all 5 round-5 fixes live | all held; **turnkey 74→81, structural 73→77**. `templates/AGENTS.md.template` drifted again | fixes: `7438b59`..`e5c0ca0` |
| 7 (re-score) | Fresh agent re-verified round 6's fixes live | held, but **structural regressed 77→69** — `check_template_drift()` was content-blind (ID-only) | fixes: `7879c11`..`8997230` |
| 8 (re-score) | Fresh agent re-verified round 7's fixes live | held, but **both axes dropped: turnkey 81→78, structural 77→74** — nudge fires but doesn't change model behavior (2nd live failure), new CLI-invisibility bug found | fixes: `dbeffc7`..`041fe56` (FEEDBACK #3 closed, #4/#12 nudge reworded) |
| 9 (re-score) | Fresh agent re-verified round 8's #3/#4/#12 fixes live — both held | **turnkey ~70, structural ~68**. Found 3 new issues: handoff docs mutually inconsistent, `AGENTS.md` zero-headroom cap (3rd recurrence), L01 wrong npm package citation | fixes: `2a882e7` |
| 10 (re-score) | Fresh agent re-verified round 9's fixes live — all held | **turnkey ~76, structural ~77**. Found the *same* stale-narrative bug recurring in files round 9 never checked: `README.md`×2, `subtask-gate.ts:324`'s own copy of the L01 citation | fixes: `a05bf53`..`77320b8` |
| 11 (re-score) | Fresh agent re-verified round 10's fixes live — all held, incl. `@kilocode/plugin` citation independently verified against the real installed binary | **turnkey 80, structural 78**. Found a 4th instance of the same recurring bug: `scripts/check-caps.sh:409-411`'s own stale claim — diagnosed root cause as *hand-picked sweep scope*, not a new bug type | fixes: `c481993`..`8736007` |
| 12 (re-score) | Fresh agent re-verified round 11's `check_stale_language()` fix — installed the real pre-commit hook and attempted a real commit with a stale-claim injection staged, not just read the code | **turnkey 80 (held), structural 78→74 (regressed)**. The mechanism built to close the recurring bug had the recurring bug itself: printed WARN, never set `status=1` — the real commit landed anyway. Also confirmed `FEEDBACK_PENDING.md` was exempt whole-file | fixed round 13 |
| 13 (re-score) | Fresh agent independently installed the hook + real-committed a stale injection again, post round-13-fix | **turnkey 80 (held), structural 74→80 (recovered)**. Round 12's exact gap genuinely closed this time — unswept-file injection blocked, FEEDBACK_PENDING open-table injection blocked, Completed-history text still passes. Verdict: real progress, not yet CONVERGED (structural had oscillated 78→74→80 across 3 rounds) | fixes: `4d20b11`..`296d4ba` |
| 14 (re-score) | Fresh agent tried genuinely new adversarial angles (not repeating prior rounds' exact tests): fresh-bootstrapped-project survival (passed), phrase-match case/wrap variants, exemption-regex over/under-match | **turnkey 80 (held), structural 80→76**. Found 2 new real bugs in `check_stale_language()` itself: (1) a stale phrase split across this repo's own hard-wrap house style evades the per-line grep entirely (false negative); (2) `session-log.md` was missing the `-archive` exemption sibling its 2 neighbors already had, so this repo's own routine archiving convention for it would wrongly self-block (false positive) | fixed round 15 |
| 15/16 (re-score) | Fresh agent independently re-tested rounds 13/14's fixes + tried genuinely new angles (fresh-project bootstrap survival, fenced code/inline code, `*-archive.md` naming-semantic collision, whether the new fuzz suite is wired to anything) | **turnkey 80 (held), structural 76→83 (real gain)**. Fuzz-based strategy validated within its own dimensions (0 new wrap/case/whitespace bugs) but 2 new bugs found from different angles: fenced-code/inline-code false-positive risk, and `*-archive.md` wildcard silently exempting an unrelated present-tense file by name coincidence (dangerous, silent-evasion direction) — plus the fuzz suite itself wasn't wired into bootstrap.sh or the pre-commit hook, the same "narrated as more capable than it is" bug class one level up | fixed round 17 |
| 17 (re-score) | Fresh agent verified round 17's 4 fixes (File Map cap, bootstrap fuzz-copy, fence handling, archive-collision narrowing) hands-on, incl. dogfooding the repo's own real double-archive files (`rule-archive-archive.md`) | **turnkey 80→82, structural 83→86 (both up)**. But a targeted retest of the exact mechanism this round touched (code-fence/inline-code awareness) found 2 more valid-markdown forms slipping through within minutes: an inline `code span` split across this repo's own hard-wrap style, and 4-space indented code blocks (CommonMark's other code-block form, never recognized at all). Auditor's own diagnosis: "a hand-rolled, non-CommonMark markdown recognizer keeps yielding one more slipped-through form each time someone looks from a new angle" — both false positives (over-flagging), not the dangerous silent-evasion direction | fixed round 18 |
| 18 (re-score) | Fresh agent verified round 18's reorder fix hands-on, incl. constructing its own mixed wrap+dual-inline-code stress case (held — the reorder genuinely generalizes) | **turnkey 82 (held), structural 86→83**. But 2 more non-prose constructs neither round 16 nor 17 tried came back positive within minutes: HTML comments and YAML frontmatter, both real live-reproduced false positives. Warned: "unless the next fix generalizes the concept... expect round 19 to find another instance" (named tables/`<details>`/link-refs as likely next) | fixed round 19 |
| 19 (re-score) | Fresh agent verified round 19's generic table + HTML-comment/frontmatter handling — own test cases, not the fix's own fuzz fixtures | **turnkey 82→82 (held), structural 83→84**. All 3 claimed-closed gaps genuinely closed (frontmatter, fence, bare-`---`-is-not-frontmatter all held). But found a real **silent-miss** (dangerous direction, unlike every prior finding here): a multi-line HTML comment's closing line discarded trailing same-line prose after `-->` unscanned — directly contradicted the fix's own "never a silent miss" code-comment claim. Table/`<details>` false positives confirmed exactly as the docs honestly predicted (not a new finding, expected) | fixed round 20 |

**Round 8-18 fixes** (compressed — full narrative in `FEEDBACK_PENDING.md` rows #3/#18-20/#22-26): FEEDBACK #3/#4/#12 closed+reworked (8) → doc self-consistency + `AGENTS.md` cap (9) → restale'd, re-fixed (10) → `check_stale_language()` built (11) → found advisory-only (12) → real hard-fail (13) → line-wrap evasion + `session-log` exemption sibling fixed (15) → Jay's structural pivot: naming-pattern exemption + property-based fuzz suite, found 2 bugs on first run (16) → fence/inline-code + `*-archive.md` collision narrowing + fuzz-suite wiring + File Map cap fix (17) → pipeline reorder closes both round-17 gaps at the root (18).

**Round 19's fix — one more generalization, then an honest stop (Jay's explicit instruction)**: round 18's 2 gaps (HTML comments, YAML frontmatter) redesigned around a small (open-marker, close-marker) table for *symmetric* regions (fence+frontmatter share one loop; a future symmetric construct is one table row). HTML comments are asymmetric (open≠close, usually self-contained on one line with real prose alongside) so they keep their own small same-line-strip-else-block-skip logic. Frontmatter is line-1-anchored (a bare `---` later in a file is a horizontal rule, verified does NOT suppress). Live-verified via the real pre-commit hook, fuzz suite 25→31/31. **Explicit scope decision**: tables/`<details>`/link-ref-definitions stay out of scope — false positives only (safe direction), workaround is reword-the-line or add-a-table-row. Full narrative: `FEEDBACK_PENDING.md` row #27.

**Round 20's fix — the one real silent-miss found across this whole thread**: round 19's audit found the closing line of a multi-line HTML comment unconditionally discarded whole via `next`, silently dropping any real prose trailing the `-->` on that same line (e.g. `still commented --> This feature is still unpatched.`) — a genuine false negative, unlike every other finding on this mechanism across 20 rounds (all were false positives, the safe direction). Fixed by mirroring the already-correct same-line-open handling: strip up through `-->`, clear the comment state, then fall through to keep scanning whatever remains on that line instead of unconditionally skipping it. Also softened the code comment's absolute "never a silent miss" claim to an actively-defended design goal, not a formal guarantee — the prior wording was directly falsified by this bug. Live-verified with the real pre-commit hook: round 19's exact repro now blocks; a control case (comment content genuinely still inside the comment, not leaked) stays clean; the full regression battery (rounds 13-19: never-swept file, `deploy-archive.md` collision, real double-archive files, `session-log-archive.md`, wrap-split prose/inline-code, indented code, mixed wrap+dual-inline-code, single/multi-line comment suppression, frontmatter, bare-`---`-not-frontmatter) all hold — 17 live commit tests total. 2 new fuzz cases added, suite 31→33/33; `subtask-gate.test.mjs` 17/17 unaffected. Full narrative: `FEEDBACK_PENDING.md` row #28.

**Everything through this round is committed; push status verified at the top of the next
session's first `git status`/`git log origin/master -1` check, not assumed here.**

## Current sub-task

```
시작: 없음 — round 20(HTML주석 닫는줄 은밀누락 버그 수정+안전성 주장 문구 완화) fix
완료, push 확인 필요.
목표: 다음 세션의 첫 작업은 git status/log로 push 상태 확인 후 Round 20 재채점
작업 사이클: 없음(이 세션의 sub-task는 완결). Round 20이 새 라운드로 시작됨.
```

## Hard constraints / warnings

- **Never trust a single live re-run as "fully fixed."** Reconfirmed repeatedly (rounds 4-18): the
  fix that closes THIS round's finding is not exempt from having its own bugs — always unit test
  *and* live-verify every fix, even a fix to a fix, via a real installed pre-commit hook + real
  commit, not just code-reading.
- GPU is physically shared with a real production system (Hermes) on this machine — always
  `ps aux | grep -E "longform|tts_runner|ComfyUI|music_pipeline"` + `nvidia-smi` before any
  `kilo run`, and wait if a real production job is using it. This session once waited ~8h
  mid-session for exactly this reason (round 4).
- Every `subtask-gate.ts` change needs (1) a Node unit test (`node --experimental-strip-types
  tests/subtask-gate.test.mjs`, no Kilo involved) *and* (2) at least one real `kilo run`
  re-verification — every round from L06 onward has found a real, distinct bug by doing both,
  never by doing just one.
- Before changing any cap number, clone the actual original `soulmate` repo and check its real
  numbers — don't assume soulmate-2/3's numbers are the same precedent (session 4's architecture
  realignment happened specifically because this had been skipped once).
- `templates/AGENTS.md.template` and the live `AGENTS.md` must stay in sync — `check-caps.sh`'s
  `check_template_drift()` catches full-content drift now (round 7), but only when actually run;
  it's wired into the normal (non-bootstrap-check) `check-caps.sh` invocation already.

## Known open issues (numbers match `wiki/handoffs/FEEDBACK_PENDING.md` exactly — cross-checked)

| # | Issue | Status |
|---|---|---|
| 2 | Custom slash commands (`.kilo/commands/*.md`) don't work in Kilo CLI v7.4.20 — Kilo's own limitation, may change in a future release | ⚠️ p2, open |
| 3 | Gate's one-shot disarm (verbatim retry of a blocked call slipping through) | ✅ **closed round 8** — clear moved to `chat.message`/new-message-only; independently reconfirmed live by round 9's own fresh adversarial trial |
| 4 | `discuss.md` self-serve failure — nudge reworded round 8 (removed its own "ignore if..." opt-out): 0/3 old wording → 2/2 round 8 → 2/2 more round 9 (independent), clears this repo's N=3 bar. CLI-invisibility half (never renders in normal `kilo run` output) confirmed structurally unfixable with current hooks | 🔴 p1, open (behavior fix confirmed working; CLI-invisibility ceiling, no further code fix possible) |
| 6 | Model self-report fabrication after a gate block — inherent LLM unreliability, same shape as soulmate-3's own finding; mitigation is procedural (always verify real git/file state, or the persisted `.subtask-gate-state.json`) not code | 🔴 p1, open, no code fix possible |
| 12 | `discuss.md` has zero mechanical backstop (the one protocol step with no tool calls, structurally unreachable by `tool.execute.*` hooks) | 🔴 p2, open (nudge shipped+strengthened round 8, reconfirmed round 9, see #4 — this is the ceiling of what `chat.message` alone can do) |

Deferred, not forgotten: backporting `refactor.md` to Hermes/soulmate 1-3 — Jay's own condition was "after soulmate-4's validation is finished," arguably still not met given the loop is still running. Ask Jay directly rather than assuming.

## Next session's starter prompt

```
soulmate-4 이어서 진행합니다. wiki/handoffs/SESSION_PRIMER.md 전체를 읽고 git log/status로
이 파일의 주장(round 20까지 fix 완료, push 여부)을 직접 재검증할 것 — 문서만 믿지 말 것.

Round 19 재채점 결과 턴키 82(유지), 구조 83→84 — round 19가 고쳤다는 3건(펜스/frontmatter/
HTML주석)은 전부 실제로 닫혔지만, 감사 에이전트가 **처음으로 위험한 방향의 버그**(은밀한
누락, false negative)를 하나 찾음: 여러줄 HTML주석의 닫는 줄에 실제 문장이 같이 붙어있으면
그 문장이 통째로 사라져서 검사가 아예 안 됨 — "이 메커니즘 실패는 전부 오탐이지 은밀누락은
없다"던 코드 주석의 명시적 안전성 약속이 깨진 사례.

Round 20: 그 은밀누락을 고침 — 이미 잘 동작하던 "같은 줄에서 여는 경우" 처리와 대칭이 되게,
닫는 줄에서도 `-->` 이후 텍스트를 버리지 않고 계속 스캔하도록 수정. 코드 주석의 "은밀누락은
절대 없다"는 단정적 문구도 "매 라운드 실측으로 지켜지는 목표"로 완화(방금 이 버그로 그
단정이 틀렸었으므로). 실제 pre-commit 훅으로 17건 라이브 커밋 테스트(회귀배터리 전부+신규
케이스), 퍼즈 31→33/33, 단위테스트 17/17 그대로.

Round 20 재채점부터 시작해주세요 — 원본 재클론해 루브릭 재확인 후 fresh non-fork
에이전트로 blind 채점, 코드 읽기만으로 끝내지 말고 실제 pre-commit hook 설치+실커밋
검증 필수. 이번엔 특히 이 은밀누락 수정 자체가 정말 안전한지(또 다른 위험방향 버그가
숨어있진 않은지) 확인할 것. Jay의 최종 기준: 구조축이 원본의 98.75 수준(원본도 100 아닌
"적대적 시도에도 새 발견 0건"에서 CONVERGED)에 근접하면 합격, push하고 마무리.
```

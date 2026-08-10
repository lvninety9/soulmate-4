# SESSION PRIMER — round 18 complete (code-strip pipeline reorder); round 18 not yet re-scored

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

> **Handoff re-verification note**: this rewrite followed Jay's explicit request (end of session
> 5) to verify rigorously, not rush despite low context, and check for compaction-driven drift.
> Full method + Jay's verbatim meta-feedback + 2 real inconsistencies caught and fixed: see
> `SESSION_MASTER.md`'s "Session 5 handoff re-verification" section (why-narrative, belongs
> there per this file's own role rule, not here).

## Current state — round 17 last-measured turnkey 82/structural 86; round 18 fixed since, not yet re-scored

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

**Round 15's fix**: (1) line-wrap evasion — join each run of non-blank lines (one wrapped paragraph) into a single string before matching, so a phrase split at an arbitrary wrap point is still visible as contiguous text; a blank line still ends a paragraph, so two genuinely separate claims can't bridge into a false match. (2) added `(-archive)?` to the `session-log` exemption alternative, matching the existing `SESSION_MASTER`/`rule-archive` pattern exactly. Live-verified: both of round 14's exact repro cases now behave correctly (wrap-split blocks, archive file stays exempt), plus all of round 13's own regression checks re-run clean (unswept-file block, FEEDBACK_PENDING open-table block, Completed-history pass). Full narrative: `FEEDBACK_PENDING.md` row #23.

**Round 16 — Jay's direct intervention, structural not incremental**: rounds 11-15 each found one new edge case in `check_stale_language()` per round (enforcement missing → line-wrap evasion → exemption gap), one manually-designed adversarial idea at a time — a slow discovery rate against an inherently unbounded input space. Jay pushed back directly and asked for two structural changes instead of another point-patch: (1) the enumerated per-file exemption list (needing a code change for every new archive-style file) replaced with a naming-pattern rule — 3 base historical files by exact name, plus any path ending `-archive.md` (this repo's one real archiving convention), so a future archive file needs no code change; (2) a property-based fuzz test (`tests/stale-language.fuzz.test.mjs`, 19 generated cases across wrap-position/casing/whitespace/punctuation/paragraph-boundary/exemption-pattern dimensions) instead of waiting for round N+1 to manually think of one more edge case. The fuzz suite found 2 real bugs on its first run: internal whitespace (multiple spaces/tabs between words) wasn't normalized before matching, so an irregularly-spaced presentation of one of the 6 tracked phrases silently evaded the check — fixed in the same commit; and the fuzz test file itself tripped its own check on commit (it necessarily quotes the stale phrases as literal fixtures) — fixed by adding it to the self-exemption, same as `check-caps.sh` already had for itself. Live-verified with the real pre-commit hook: all of rounds 13/14/15's regression cases still pass correctly post-redesign. Full narrative: `FEEDBACK_PENDING.md` row #24.

**Round 17's fix**: (1) `check_stale_language()`'s awk pass now skips fenced-code-block content and strips inline `` `...` `` spans before matching. (2) the `*-archive.md` wildcard narrowed back to the 3 known PRUNE-convention stems (`(-archive)?` on each, not an unbounded suffix) — closes the naming-collision risk, loses zero real coverage. (3) `bootstrap.sh` now copies `tests/stale-language.fuzz.test.mjs` into fresh projects (was missing); pre-commit hook deliberately left NOT invoking either `.mjs` suite, matching this repo's own existing precedent (`subtask-gate.test.mjs` isn't hook-wired either — both are run-before-trusting-a-fix, not commit-gated). (4) `FILE_MAP_ROW_CAP` 12→10, matching the original's real value (unreconciled soulmate-3 leftover, git blame confirmed). 23/23 fuzz (4 new cases), 17/17 subtask-gate, full regression battery (rounds 13-16) + 3 fresh manual live-commit tests all pass. Full narrative: `FEEDBACK_PENDING.md` row #25.

**Round 18's fix — reorder, not another special case**: round 17's audit traced both new gaps to one root cause: inline `` `...` `` spans were stripped per ORIGINAL line, before wrapped lines join into a paragraph, so a span split at the wrap point never formed a matched pair; and 4-space/tab indented code blocks weren't recognized as code at all. Reordered the pipeline instead of patching each case: exclude fence-content AND indented-code lines first (never enter the paragraph buffer) → join what's left into paragraphs exactly as before (blank line still ends a paragraph) → THEN strip inline spans from the now-joined text, so a span split at a wrap point is contiguous again and one backtick-strip catches it with no extra special-casing. Net diff: +17/-7 lines in one function. Live-verified with the real installed pre-commit hook: both of round 17's exact failing cases now correctly pass (not flagged); full regression battery (rounds 13-17: never-swept file blocks, `deploy-archive.md` collision blocks, real double-archive files stay exempt, `session-log-archive.md` passes, original prose wrap-split blocks, plain fenced code still passes) all hold; 2 new fuzz cases added for round 17's exact scenarios, suite now 25/25; `subtask-gate.test.mjs` unaffected, 17/17. Full narrative: `FEEDBACK_PENDING.md` row #26.

**Round 8-10 fixes**: FEEDBACK #3/#4/#12 closed+reworked, doc self-consistency + `AGENTS.md` cap fixed round 9, restale'd + re-fixed round 10. Full narrative: `FEEDBACK_PENDING.md` rows #3/#18/#19.

**Round 11-13 fixes**: `check_stale_language()` built (round 11, closing the "hand-picked sweep scope" process gap) → found advisory-only, no `status=1` (round 12) → fixed to a real hard-fail, `FEEDBACK_PENDING.md` exemption narrowed to just Completed-history (round 13). Full narrative: `FEEDBACK_PENDING.md` rows #20/#22, `rule-archive.md`.

**Everything through this round is committed; push status verified at the top of the next
session's first `git status`/`git log origin/master -1` check, not assumed here.**

## Current sub-task

```
시작: 없음 — round 18(check_stale_language() 코드제외 순서 재정렬) fix 완료, push 확인 필요.
목표: 다음 세션의 첫 작업은 git status/log로 push 상태 확인 후 Round 18 재채점
작업 사이클: 없음(이 세션의 sub-task는 완결). Round 18이 새 라운드로 시작됨.
```

## Hard constraints / warnings

- **Never trust a single live re-run as "fully fixed."** This happened twice this session: round
  4's L09 fix looked solid after one live re-run, and round 5's independent audit found it was a
  true one-shot for the whole session anyway. Round 6's template-drift fix looked solid after
  one sync, and round 7 found the fix's own drift-checker was content-blind. The pattern: **the
  fix that closes THIS round's finding is not exempt from having its own bugs** — always unit
  test *and* live-verify every fix, even a fix to a fix.
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
이 파일의 주장(round 18까지 fix 완료, push 여부)을 직접 재검증할 것 — 문서만 믿지 말 것.

Round 17 재채점 결과 턴키 80→82, 구조 83→86(둘 다 상승) — 하지만 이번 라운드가 직접
건드린 바로 그 메커니즘(코드펜스/인라인코드 인식)을 다른 각도로 재시도하니 몇 분 만에
새 구멍 2건(줄바꿈에 걸친 인라인코드, 4칸 들여쓰기 코드블록) 또 발견. 감사 에이전트 자신의
진단: "손으로 짠 마크다운 인식기는 새 각도로 볼 때마다 하나씩 더 샌다." 둘 다 오탐 방향
(과잉차단)이라 위험한 침묵회피 방향은 아님.

Round 18에서 이번엔 각 사례를 따로 패치하지 않고 **처리 순서 자체를 재정렬**: 펜스+들여쓰기
코드를 먼저 제외(문단 버퍼에 아예 안 들어감) → 남은 줄만 문단으로 합치기(기존 로직 그대로)
→ 그다음에 합쳐진 텍스트에서 인라인 `...` 스팬 벗기기. 줄바꿈에 걸친 스팬은 합쳐지고 나면
다시 하나로 붙어있어서, 별도 특수처리 없이 기존 벗기기 로직 하나로 두 구멍 다 막힘(net
+17/-7줄). 실제 pre-commit 훅으로 round 17의 두 실패사례 재현→통과 확인, round 13-17
회귀배터리 전부 재확인, 퍼즈 2건 추가(25/25), 단위테스트 17/17 그대로. 커밋
`3fb601a`/`489f9b8`, push 완료.

Round 18 재채점부터 시작해주세요 — 원본 재클론해 루브릭 재확인 후 fresh non-fork
에이전트로 blind 채점. 특히 이번엔 "재정렬"이라는 구조적 접근이 또 다른 마크다운 형태
(예: 각주, HTML 주석, YAML frontmatter 안의 텍스트 등)에도 견고한지, 아니면 이 계열
버그가 재정렬 이후에도 계속 재발하는지 확인할 것 — 코드 읽기만으로 끝내지 말고 실제
pre-commit hook 설치+실커밋 검증 필수. Jay의 최종 기준: 구조축이 원본의 98.75 수준(원본도
100 아닌 "적대적 시도에도 새 발견 0건"에서 CONVERGED)에 근접하면 합격, push하고 마무리.
```

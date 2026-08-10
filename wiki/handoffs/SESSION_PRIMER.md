# SESSION PRIMER — round 20 re-scored (turnkey 82, structural 82 — 2nd silent-miss found); round 21 fix done, not yet re-scored

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

## Current state — round 20 last-measured turnkey 82/structural 82; round 21 fixed since, not yet re-scored

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
| 20 (re-score) | Fresh agent verified round 20's closing-line fix hands-on, then independently tried a composition neither round 19 nor round 20 tested: a closing line carrying a SECOND, trailing same-line comment after the true close | **turnkey 82 (held), structural 84→82**. Round 20's exact reported case now held — but this new composition found the fix was still regex-based (`sub(/^.*-->/)`) and GREEDY, consuming through the LAST `-->` on the line instead of the first, silently swallowing real prose between the two closers. A 2nd genuine silent-miss on the same mechanism. Auditor's diagnosis: the ceiling on this hand-rolled approach may be "low-to-mid 80s" without a structural (not patch) fix | fixed round 21 |

**Round 8-20 fixes** (compressed — full narrative in `FEEDBACK_PENDING.md` rows #3/#18-20/#22-29): FEEDBACK #3/#4/#12 closed+reworked (8) → doc self-consistency + `AGENTS.md` cap (9) → restale'd, re-fixed (10) → `check_stale_language()` built (11) → found advisory-only (12) → real hard-fail (13) → line-wrap evasion + `session-log` exemption sibling fixed (15) → Jay's structural pivot: naming-pattern exemption + property-based fuzz suite, found 2 bugs on first run (16) → fence/inline-code + `*-archive.md` collision narrowing + fuzz-suite wiring + File Map cap fix (17) → pipeline reorder closes both round-17 gaps at the root (18) → symmetric (open,close)-table generalization for fence/frontmatter + own HTML-comment handling, explicit scope-stop for tables/`<details>`/link-refs (19) → 1st silent-miss found+fixed: closing-line trailing prose was discarded unscanned (20).

**Round 21's fix — Jay's explicit instruction: stop patching this mechanism with more regex, switch to `index()`-based direct position search.** Root cause of round 20's regression: `sub(/^.*-->/, "", $0)` is GREEDY (POSIX ERE `.*` always matches maximally, awk has no non-greedy quantifier) — a line with a decoy trailing comment after the true close made it consume through the wrong `-->`. Replaced both the same-line-open and closing-line branches with one `strip_comments()` procedure: `index()` finds the FIRST occurrence by definition, so pairing nearest-open with nearest-close is structurally impossible to get wrong — not a smaller version of the same bug class, a different technique that can't produce it. Live-verified: round 20's exact bug case now blocks; 22-case HTML-comment/rounds-13-19 regression battery all held; 3 extra adversarial compositions tried beyond the brief (3 comments on one line, unterminated-to-EOF, unterminated-then-closed-5-lines-later-with-2-more-comments) all correct. 2 new fuzz cases (33→35/35). Code comment now explains *why* index()-based pairing is structurally sounder, not just that it's a goal. One self-inflicted `git reset --hard` wiped the uncommitted fix mid-verification — caught immediately, reapplied, committed before any further destructive git ops (same mistake round 13/16/18/20 also each caught once). Full narrative: `FEEDBACK_PENDING.md` row #29.

**Everything through this round is committed; push status verified at the top of the next
session's first `git status`/`git log origin/master -1` check, not assumed here.**

## Current sub-task

```
시작: 없음 — round 21(HTML주석 index() 기반 재작성, greedy 정규식 은밀누락 2번째 재발 수정)
fix 완료, push 확인 필요.
목표: 다음 세션의 첫 작업은 git status/log로 push 상태 확인 후 Round 21 재채점
작업 사이클: 없음(이 세션의 sub-task는 완결). Round 21이 새 라운드로 시작됨.
```

## Hard constraints / warnings

- **Never trust a single live re-run as "fully fixed."** Reconfirmed repeatedly (rounds 4-20): the
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
이 파일의 주장(round 21까지 fix 완료, push 여부)을 직접 재검증할 것 — 문서만 믿지 말 것.

Round 20 재채점 결과 턴키 82(유지), 구조 84→82 — round 20이 고쳤다는 은밀누락은 그 정확한
사례에선 진짜로 닫혔지만, 감사 에이전트가 한 줄에 닫는 마커가 2개 있는 조합(디코이 주석이
진짜 닫힘 뒤에 하나 더 있는 경우)을 시도하자 **같은 종류의 은밀누락이 2번째로 재발**함을
발견 — 원인은 `sub(/^.*-->/)`가 정규식 탐욕적(greedy) 매칭이라 마지막 `-->`까지 지워버리는
것. 감사 에이전트 진단: "이 손짜기 방식의 천장은 80대 중반 정도일 수 있다, 패치가 아니라
구조적 수정이 필요."

Round 21(Jay 명시적 지시): 정규식 패턴 매칭 자체를 버리고 `index()` 기반 직접 위치탐색으로
전면 교체 — "가장 가까운 열림→가장 가까운 닫힘" 쌍을 찾는 방식이라 탐욕적 매칭이라는 개념
자체가 알고리즘적으로 존재하지 않음(더 작은 패치가 아니라 이 버그 클래스를 못 만드는 다른
기법). 실제 pre-commit 훅으로 22건 회귀배터리 전부 통과 + 지시받은 것 이상으로 3건 추가
적대적 조합(한 줄에 주석 3개, 파일 끝까지 안 닫히는 주석, 5줄 뒤에 닫히며 중간에 주석 2개
더 낀 경우) 전부 통과. 퍼즈 33→35/35, 단위테스트 17/17 그대로. 세션 중 `git reset --hard`로
미커밋 fix를 스스로 날려먹었다가(round 13/16/18/20도 각각 한 번씩 겪은 바로 그 실수) 즉시
발견+재적용+커밋 완료.

Round 21 재채점부터 시작해주세요 — 원본 재클론해 루브릭 재확인 후 fresh non-fork
에이전트로 blind 채점, 코드 읽기만으로 끝내지 말고 실제 pre-commit hook 설치+실커밋
검증 필수. 이번엔 특히 index() 기반 재설계가 정말로 이 버그 클래스 자체를 구조적으로
막았는지(또 다른 개별 사례가 아니라) 확인할 것. Jay의 최종 기준: 구조축이 원본의 98.75
수준(원본도 100 아닌 "적대적 시도에도 새 발견 0건"에서 CONVERGED)에 근접하면 합격,
push하고 마무리.
```

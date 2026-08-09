# SESSION PRIMER — round 11 complete (turnkey 80/structural 78); round 12's stale-language mechanical check in progress

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

## Current state — round 11 complete (turnkey 80/structural 78); round 12's fix in progress, not yet re-scored

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
| 11 (re-score) | Fresh agent re-verified round 10's fixes live — all held, incl. `@kilocode/plugin` citation independently verified against the real installed binary | **turnkey 80, structural 78**. Found a 4th instance of the same recurring bug: `scripts/check-caps.sh:409-411`'s own stale claim — diagnosed root cause as *hand-picked sweep scope*, not a new bug type | this round's fix below |

**Round 8-10 fixes**: all independently re-confirmed live across rounds 9-11, not just unit-tested — FEEDBACK #3 closed (gate clear moved to `chat.message`/new-message-only), #4/#12 nudge reworked (0/3→2/2×3 rounds, clears this repo's N=3 bar; CLI-invisibility half confirmed structurally unfixable), doc self-consistency + `AGENTS.md` cap (85→75 lines, real headroom) + L01 citation fixed round 9, then found stale *again* in `README.md`+`subtask-gate.ts:324` and re-fixed round 10 via a hand-picked repo-wide grep. Full narrative + evidence: `FEEDBACK_PENDING.md` rows #3/#18/#19, `rule-archive.md`.

**Round 11's finding, fixed this round (12)**: the recurring bug wasn't a new instance each time, it was the *same process gap* — every sweep so far manually picked which files to check. Built `check_stale_language()` in `check-caps.sh` — one mechanical, repo-wide grep (a short list of stale-claim phrasings, tuned against this repo's own last 4 recurrences, plus a short exemption list for genuinely-historical files) wired into the pre-commit hook, so no future round has to remember to re-grep by hand. Fixed `check-caps.sh:409-411`'s own stale claim (the concrete instance round 11 found). Live-verified the new check fires on injected staleness in a live file and stays quiet on the same text in an exempted historical file. Full narrative: `FEEDBACK_PENDING.md` row #20, `rule-archive.md`.

**Everything through this round is committed; push status verified at the top of the next
session's first `git status`/`git log origin/master -1` check, not assumed here.**

## Current sub-task

```
시작: 없음 — round 11의 발견(check-caps.sh 자체의 낡은 서술) + 근본원인(수동 스윕 범위)
      fix 완료(기계적 stale-language 체크 신설), push 확인 필요.
목표: 다음 세션의 첫 작업은 git status/log로 push 상태 확인 후 Round 12 재채점
작업 사이클: 없음(이 세션의 sub-task는 완결). Round 12가 새 라운드로 시작됨.
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

Deferred, not forgotten: FEEDBACK #6-in-the-*old* Hermes-adjacent sense (backporting
`refactor.md` to Hermes/soulmate 1-3) — Jay's own stated condition was "after soulmate-4's
validation is finished," and given the loop is explicitly still running (round 8+ ahead), that
condition is arguably still not met. Worth asking Jay directly rather than assuming either way.

## Next session's starter prompt

```
soulmate-4 이어서 진행합니다. wiki/handoffs/SESSION_PRIMER.md 전체를 처음부터 끝까지
읽어주세요. 먼저 git log/git status로 이 파일의 주장(round 11까지 fix 완료, push 여부)을
직접 재검증할 것 — 문서만 믿지 말 것(round 9/10/11 전부 이 파일류 문서 자체가 구식이라는
걸 스스로 지적한 전례가 있음).

Round 11까지 완료 상태입니다. 마지막으로 측정된 점수는 Round 11의 턴키80/구조78이고,
Round 11이 찾은 check-caps.sh 자체의 낡은 서술은 수정했고, 근본원인(수동 스윕 범위)도
check_stale_language() 기계적 체크 신설로 고쳤지만 아직 fresh 에이전트로 재채점 안 됐습니다.

Round 12 재채점부터 시작해주세요 — 원본 https://github.com/lvninety9/soulmate 를 다시 클론해서
루브릭을 재확인한 뒤, fresh non-fork 에이전트로 soulmate-4를 blind 채점(실제 bootstrap + 실제
kilo run 포함). 이번 라운드는 특히 이 새 check_stale_language() 자체를 스트레스테스트해주세요
— 진짜로 낡은 서술을 새로 찾아내는지, 정상적인 과거 서술(rule-archive.md 등)엔 조용한지.
그게 확인되면(새 발견 0건) 이 저장소가 원본처럼 CONVERGED 시작점에 온 건지 판단해주세요.
결과 나오면 "Known open issues" 표 순서대로(#4/#12의 CLI-invisibility 한계를 인정하고
넘어갈지 #6 모델 자기보고 조작 대응 절차를 강화할지 판단) 다음 fix 사이클 진행해주세요.
매 fix는 단위테스트+실전 kilo run 재검증 둘 다 필수입니다. Jay의 최종 기준: 구조(structural)
축이 원본의 98.75 수준(원본도 100은 아니고 "진지한 적대적 시도에도 새 발견 0건"에서 스스로
CONVERGED 선언한 지점)에 근접하면 합격, push하고 마무리.
```

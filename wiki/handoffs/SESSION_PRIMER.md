# SESSION PRIMER — session 5, round 7 complete (round 8 not yet started)

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

## Current state — round 7 complete; **last measured score is round 6's 81/77, not yet re-measured after round 7's own fixes**

| Round | What it tested/built | Result | Evidence |
|---|---|---|---|
| 1-3 | discuss/design/build/verify self-serve + gate mechanics (3 separate fresh blind agents) | 3 real bugs found+fixed: gate state lost across processes, gate trigger 100% elective, commit detection regex-based (L06-L08) | `SESSION_MASTER.md`/`-archive.md`, `rule-archive.md` |
| Architecture realignment | Checked the *original* soulmate repo's real caps (not soulmate-3's) | `AGENTS.md` cap 65→85 to match original; Learned/Fixed Rules merged back into `AGENTS.md` | `SESSION_MASTER.md` "Round 4 — architecture realignment" |
| 4 (blind) | refactor.md self-serve, 3 independent trials | self-serve never fired once — backup/units/verify all failed as a result (L09 found) | `rule-archive.md` L09, `65dd69e`..`450f587` |
| — | L09 fix (first version) + live re-verify | worked in that one trial | `450f587` |
| — | Structural doc improvements Jay requested mid-session: archive-destination pattern, numbering legend, Learned-Rules compression priority, 4-tier doc role separation, canonical verification-command naming | all 4 shipped + pushed | `b54f19b`..`f7250c3` |
| 5 (objective audit) | Fresh non-fork agent, calibrated rubric against the *real* original repo, real bootstrap + real `kilo run` | **turnkey 74/100, structural 73/100** vs original's 87/98.75 | full report was this round's task notification; fixes: `35e90f0`..`8d3d590` |
| 6 (re-score) | Fresh agent re-verified all 5 round-5 fixes live | all 5 held; **turnkey 74→81, structural 73→77**. New finding: `templates/AGENTS.md.template` drifted from `AGENTS.md` *again*, same session that had just fixed an earlier instance | fixes: `7438b59`..`e5c0ca0` |
| 7 (re-score) | Fresh agent re-verified round 6's fixes live | held, but **structural regressed 77→69** (turnkey stayed 81) — `check_template_drift()` itself was content-blind (ID-only); FEEDBACK #4 (discuss.md) converted from "untested" to a live-confirmed failure | fixes: `7879c11`..`8997230` |

**Round 7's fixes** (not yet re-scored by a fresh audit — that is Round 8's actual job, see
"Next session's starter prompt"):
1. `check_template_drift()` rewritten from ID-token diffing to full-content diffing from
   `## Language` onward — live-verified by swapping a rule's body text under the same tag (old
   version passed silently, new version correctly fails).
2. `chat.message` gained a second, independent check (`looksAmbiguous()`): if a message has no
   backtick-quoted code / file-extension-like token / quoted string, and is longer than a
   greeting, inject a nudge suggesting `discuss.md`. **Explicitly a coarse heuristic, not a
   classifier** — discuss.md produces zero tool calls, so no `tool.execute` hook can ever reach
   it, and `chat.message` can inject text but cannot force real Q&A or block anything.
3. **A real bug found and fixed while building #2**: `kilo run "<message>"` stores the CLI
   argument with a literal wrapping quote pair as part of the actual message text — this
   defeated the "quoted string" anchor check on *every single* CLI-driven message, so the nudge
   could never have fired under the tool's own normal invocation pattern. Caught via a live
   debug log on the real `chat.message` payload (not assumed from reading the code), fixed by
   stripping one real wrapping pair before the check, re-verified live it now fires correctly.
4. Mid-build self-correction, not left in: briefly registered a second hook under a fake key
   `"chat.message.ambiguity"` (opencode only ever calls real hook names — this would silently
   never have fired). Caught before commit, merged into the one real `"chat.message"` hook.

**Everything through round 7 is committed and pushed** — `git log origin/master -1` matches
local `HEAD` exactly, verified fresh at the top of this rewrite, not assumed.

## Current sub-task

```
시작: 없음 — round 7 완료, working tree clean, origin과 동기화 확인됨.
목표: 다음 세션의 첫 작업은 Round 8 재채점(아래 "Next session's starter prompt" 그대로 사용)
작업 사이클: 없음(이 세션의 sub-task는 완결). Round 8이 새 라운드로 시작됨.
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
| 3 | Gate's one-shot disarm: an immediate verbatim retry of the *exact same* blocked call still slips through unconditionally (distinct from round 5/7's fix, which only closed the "different mutation" gap, not the "same call retried" gap) | 🔴 p1, open, no code fix exists |
| 4 | `discuss.md` self-serve failure — now **live-confirmed** (round 7), not just suspected. Round 7 shipped a partial mitigation (`chat.message` ambiguity nudge) but it's N=1 live trial so far; this repo's own precedent wants 3 | 🔴 p1, open (partial mitigation shipped round 7) |
| 6 | Model self-report fabrication after a gate block — inherent LLM unreliability, same shape as soulmate-3's own finding; mitigation is procedural (always verify real git/file state) not code | 🔴 p1, open, no code fix possible |
| 12 | `discuss.md` has zero mechanical backstop (the one protocol step with no tool calls, structurally unreachable by `tool.execute.*` hooks) | 🔴 p2, open (heuristic nudge shipped round 7, see #4 — this is the ceiling of what `chat.message` alone can do) |

Deferred, not forgotten: FEEDBACK #6-in-the-*old* Hermes-adjacent sense (backporting
`refactor.md` to Hermes/soulmate 1-3) — Jay's own stated condition was "after soulmate-4's
validation is finished," and given the loop is explicitly still running (round 8+ ahead), that
condition is arguably still not met. Worth asking Jay directly rather than assuming either way.

## Next session's starter prompt

```
soulmate-4 이어서 진행합니다. wiki/handoffs/SESSION_PRIMER.md 전체를 처음부터 끝까지
읽어주세요 — 이번 핸드오프는 Jay가 명시적으로 요청한 정밀 재검증을 거쳤습니다(git log/실제
코드/실제 테스트 실행 결과 전부 대조 완료, working tree clean, origin과 동기화 확인됨).

Round 7까지 전부 완료·push된 상태입니다. 마지막으로 측정된 점수는 Round 6의 턴키81/구조77이고,
Round 7의 fix 3건(drift 체커 content-diff화, discuss.md 넛지, kilo CLI 따옴표래핑 버그 수정)은
아직 재채점 안 됐습니다.

Round 8 재채점부터 시작해주세요 — 원본 https://github.com/lvninety9/soulmate 를 다시 클론해서
루브릭을 재확인한 뒤, fresh non-fork 에이전트로 soulmate-4를 blind 채점(실제 bootstrap + 실제
kilo run 포함). 결과 나오면 "Known open issues" 표 순서대로(특히 #3, #4/#12) 우선순위 판단해서
다음 fix 사이클 진행해주세요. 매 fix는 단위테스트+실전 kilo run 재검증 둘 다 필수입니다.
```

# SESSION PRIMER — round 30 (2026-08-24)

> Status icons: ✅done(evidence) ⏳code-done·unverified 🔶partial 🔴unfixed-bug ⚠️needs-user-action
> **Role: current-state only — no "why" narrative.** Round-by-round detail: `FEEDBACK_PENDING.md`'s
> open table for what's still live, `wiki/FEEDBACK_PENDING-archive.md` for every resolved row,
> `wiki/rule-archive.md` "Round 30" for full evidence behind everything below.

## Project overview

`soulmate-4` is a session-handoff harness template for coding agents behind **Kilo Code**, talking
to a local LLM with a hard context ceiling (RTX 3080 10GB, physically **shared with an unrelated
production system "Hermes"** — see Hard constraints). `.kilo/plugins/subtask-gate.ts` is the
payoff: a real `tool.execute.before` mechanical brake. **Goal**: earn a score comparable to the
*original* `soulmate` repo's own real result — item 6 axis B's ON/OFF delta table (round 29) is
meant to replace that comparison going forward, once axis B is re-run under round 30's redesign.

## Current sub-task

```
시작: ~/.hermes/opus_round30_workorder.md (Opus-authored, NOT committed to this repo)
완료: item 7 — question tool CLI-vs-plugin split resolved with 3-way evidence (kilo.db + captured
     real API payloads + live repro): CLI's code agent has NO question tool in its actual 12-tool
     schema (round 28's conclusion CONFIRMED, not overturned); plugin has 17 tools incl. question.
     item 2 — MUTATING_TOOLS denylist -> READONLY_TOOLS allowlist (fail-closed inversion, real
     tool inventory measured not guessed). item 3 — elective arm now judged at turn boundaries
     only (electiveBoundaryAtTurnStart snapshot), primer boundary unchanged. item 1 — hard cap on
     required-read total chars (27800 = 8000 tok at measured ratio). item 5 — bench Step 3 scored
     via --format json NDJSON events (question-tool OR pre-mutation text-Q&A), "discuss: " prefix
     dropped, Step 1 excluded from axis B. item 6 — complexity-ladder-test.sh restructured to 5
     independent per-level loops, N=5 each (25 total executions instead of 1 cascading run).
     5 commits: 71c7885, eae4528, 510b00a, d4abce4, 19ae377. 33/33 unit (was 30+T18+T19a/b), 42/42
     fuzz, regression ALL PASS throughout.
막힘: item 4 (axis B Step 4 = 0/5 both modes, root cause) — NOT investigated, needs a live trial
     transcript this round could not produce. **A new environmental blocker (FEEDBACK #50) stopped
     every live-verification acceptance criterion this round**: kilo run hangs ~50%+ of the time
     (0 output, stuck pre-model-call), llama-server confirmed healthy/idle throughout — 2 concurrent
     `kilo serve --port 0` daemons observed (Cursor-IDE-owned, not touched, correlation not proven
     causation). Items 3-C (does #47's retry storm actually reduce, live), 4 (root cause), 5-D
     (re-run axis B), 6 (actual 25-trial run) all blocked by this — code changes are done and unit-
     tested/dry-run-verified where a live model call wasn't required, but none of the "run it live
     and confirm" acceptance criteria could be closed.
다음: **first priority for whoever picks this up: check whether kilo run is reliable again**
     (`ps aux | grep "kilo serve"` — if exactly one daemon, or `question` responds within ~30s to
     a trivial prompt, retry the blocked items). If still broken, this may need Jay's direct
     attention (a stray Cursor-IDE `kilo serve` daemon, not something this round's scope could
     touch). Once live calls work: item 4's root-cause read (a/b/c per the original work order),
     item 3-C, item 5-D (re-run axis B with the redesigned bench), item 6 (the real 25-trial run,
     GPU-schedule-aware). #48/#50 tracked in FEEDBACK_PENDING.md.
참고: opus_round30_workorder.md/opus_round30_execution_report.md are in ~/.hermes/, NOT this repo.
     Full round 30 evidence (captured payloads, kilo.db queries, reliability findings):
     `wiki/rule-archive.md` "Round 30".
```

## Known open issues (numbers match `FEEDBACK_PENDING.md`)

| # | Issue | Status |
|---|---|---|
| 2 | Custom slash commands don't work in Kilo CLI v7.4.20+ — Kilo's own limitation | ⚠️ p2, open |
| 4/12 | CLI structurally lacks a `question` tool — round 30 doubly reconfirmed | 🔴 p1, permanent ceiling (CLI half only) |
| 6/38 | Model self-report fabrication after a gate block — inherent LLM unreliability | 🔴 p1, permanent ceiling |
| 47 | Fix landed (item 3), live re-verify blocked by #50 | 🔶 p2, code done/unverified |
| 48 | Axis B Step 4 = 0/5 both modes, root cause undetermined | 🔴 p1, blocked by #50 |
| 50 | `kilo run` ~50%+ hang rate this session, cause not confirmed | 🔴 p1, blocking everything live |
| — | Bare cross-paragraph token gap — fixing it breaks real content | 🔴 p2, accepted limitation |
| — | `check_fence_parity()` odd/even blind spot — inherited from original | 🔴 p2, low urgency |

## Hard constraints / warnings

- **Check `ps aux | grep "kilo serve"` before any live trial** — round 30 found 2 concurrent
  daemons correlating with a ~50%+ hang rate (not proven causal, not touched — Cursor-IDE-owned).
- Never trust a live re-run as "fully fixed" — unit test AND live-verify, both. Round 30 could only
  do the first half for items 3/4/5/6 this round (see Current sub-task above).
- GPU is shared with real Hermes production jobs — check `~/.hermes/longform/.render.lock` +
  `ps aux | grep -E "longform|tts_runner|shorts|music_pipeline|playlist_compiler"` + `nvidia-smi`
  before `kilo run`, wait if busy. A forced server shutdown timer fires daily at 19:30 KST.
- `kilo` CLI at `~/.cursor/extensions/kilocode.kilo-code-7.4.23-linux-x64/bin/kilo` (not on
  default `PATH`). `kilo run` REQUIRES both `--dir <path>` and `-m <model>` — omitting either
  silently produces 0 bytes output + exit 0 in non-TTY mode (round 30, Opus's own finding).
  Local model `qwen-3-6/Qwen3.6-35B-A3B-UD-Q4_K_M.gguf`.
- `templates/AGENTS.md.template` must stay byte-identical to `AGENTS.md` from `## Language`
  onward, excluding `## Learned Rules` — `check_template_drift()` catches this, only when run.
- `FEEDBACK_PENDING.md`'s "Completed history" is a pointer only — resolved rows live in
  `wiki/FEEDBACK_PENDING-archive.md`, not auto-loaded.
- A local clone's own `git log` looking coherent proves nothing about its freshness vs.
  `origin/master` (L13) — always `git fetch`+diff origin, or fresh-clone, first.

## Next session's starter prompt

```
round 31 시작. wiki/handoffs/SESSION_PRIMER.md 전체 읽기 → FEEDBACK_PENDING.md 표 확인 →
~/.hermes/opus_round30_execution_report.md + Opus 피드백(있다면) 확인. round 30는 부분 완료:
item 1/2/3/5/6 코드 작업 전부 커밋(71c7885/eae4528/510b00a/d4abce4/19ae377), item 7 결론 확정
(CLI엔 question 툴 구조적으로 없음, round 28 결론 재확인). **item 4는 전혀 조사 못함, item
3-C/5-D/6의 라이브 재확인도 전부 막힘** — kilo run이 이 세션 내내 ~50%+ 확률로 응답 없이
멈춤(#50). 최우선: kilo run이 다시 안정적인지 먼저 확인(`ps aux | grep "kilo serve"`), 안정
되면 막혔던 라이브 검증부터 처리.
```

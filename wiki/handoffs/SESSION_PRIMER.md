# SESSION PRIMER — round 30 CLOSED (2026-08-24)

> Status icons: ✅done(evidence) ⏳code-done·unverified 🔶partial 🔴unfixed-bug ⚠️needs-user-action
> **Role: current-state only — no "why" narrative.** Round-by-round detail: `FEEDBACK_PENDING.md`'s
> open table for what's still live, `wiki/FEEDBACK_PENDING-archive.md` for every resolved row,
> `wiki/rule-archive.md` "Round 30"/"Round 30 closing pass" for full evidence behind everything below.

## Project overview

`soulmate-4` is a session-handoff harness template for coding agents behind **Kilo Code**, talking
to a local LLM with a hard context ceiling (RTX 3080 10GB, physically **shared with an unrelated
production system "Hermes"** — see Hard constraints). `.kilo/plugins/subtask-gate.ts` is the
payoff: a real `tool.execute.before` mechanical brake. **Goal**: earn a score comparable to the
*original* `soulmate` repo's own real result — item 6 axis B's ON/OFF delta table (round 29) is
meant to replace that comparison going forward, once axis B is re-run under round 30's redesign.

## Current sub-task

```
시작: none active — round 30 fully closed this pass, every FEEDBACK row at a terminal state.
완료: round 30 items 1/2/3/5/6 (code, unit-tested, committed round 30) + item 7 (question-tool
     CLI-vs-plugin split, confirmed). **This closing pass**: item 4 solved STATICALLY, no live run
     needed — mined kilo.db for 4 real historical axis-B trial transcripts (both harness modes,
     2 scenarios): Step 3's build_scope is specified fully enough that the model correctly treats
     it as "clearly-scoped" (AGENTS.md's own routing rule) and finishes the whole sub-task via
     build BEFORE Step 4's "design" trigger is sent. Root cause = the bench's own Step 3 premise
     (cause c), NOT design.md/build.md (both read clean, model self-serves them correctly every
     trial). No code fix to either protocol doc; documented via comment + rule-archive.md. Every
     open FEEDBACK row closed: #48 (item 4) + #47 (item 3's retry storm, unit-verified) archived
     done; #42 merged into #4/12 (same CLI-vs-plugin ceiling, reworded precisely); #50 (kilo-run
     reliability) downgraded p1→p2, not resolved — 2 lightweight probes today succeeded (no hang),
     ruled out one hypothesis (stale Q3 model default) but sample too small to call it fixed.
     Fixed a stale claim in PROJECT_BACKGROUND.md ("rounds 1-4 so far" — actually 30+). Backfilled
     session-log.md rows 17-20 (rounds 28-30 + this pass had no session-log entries at all).
막힘: none blocking. **Genuinely NOT live-verified, left open on purpose (not a new audit round)**:
     item 3-C (does #47's retry storm measurably reduce, live), item 5-D (re-run axis B with the
     redesigned bench), item 6 (the real 5-level × N=5 = 25-trial run). All 3 need real kilo run
     time this pass deliberately did not spend (would mean either a full bench re-run, explicitly
     out of scope for a closing pass, or competing with Jay's live Cursor/Kilo session on the one
     inference slot). Not tracked as an open FEEDBACK row — they're work-order acceptance criteria,
     not bugs; pick up directly from this note if/when a future round wants them.
다음: no mandatory next step — round 30 converged to a clean close. If continuing: (1) re-test
     kilo run reliability more thoroughly before trusting it for a real bench run (`ps aux | grep
     "kilo serve"`, try one multi-tool-call trial, not just a single Q&A); (2) if reliable, the 3
     deferred live-verifications above are the natural next work; (3) otherwise, this project's
     turnkey backlog (bootstrap pollution, README, template duplication) was deliberately never
     touched across rounds 28-30 — fair game once the harness itself stops needing attention.
참고: opus_round30_workorder.md/opus_round30_execution_report.md/opus_round30_closing_report.md
     are in ~/.hermes/, NOT this repo. Full evidence: `wiki/rule-archive.md` "Round 30"/"Round 30
     closing pass".
```

## Known open issues (numbers match `FEEDBACK_PENDING.md`)

| # | Issue | Status |
|---|---|---|
| 2 | Custom slash commands don't work in Kilo CLI v7.4.20+ — Kilo's own limitation | ⚠️ p2, open |
| 4/12 | CLI structurally lacks a `question` tool (merged #42 in, closing pass) | 🔴 p1, permanent ceiling (CLI half only), accepted |
| 6/38 | Model self-report fabrication after a gate block — inherent LLM unreliability | 🔴 p1, permanent ceiling |
| 50 | `kilo run` reliability — downgraded, not resolved (see Current sub-task) | 🔶 p2, open, monitor |
| — | Bare cross-paragraph token gap — fixing it breaks real content | 🔴 p2, accepted limitation |
| — | `check_fence_parity()` odd/even blind spot — inherited from original | 🔴 p2, low urgency |

## Hard constraints / warnings

- **Check `ps aux | grep "kilo serve"` before any live trial** — round 30 found 2 concurrent
  daemons correlating with a ~50%+ hang rate; this closing pass's 2 lightweight re-tests (with and
  without `-m`) did NOT hang, but that's too small a sample to call the daemon theory confirmed or
  ruled out — re-test with real load before trusting a full bench run.
- Never trust a live re-run as "fully fixed" — unit test AND live-verify, both. 3 acceptance
  criteria (3-C/5-D/6) remain genuinely live-unverified — see Current sub-task, "막힘" is empty on
  purpose but those 3 are real open ends, not silently resolved.
- GPU is shared with real Hermes production jobs — check `~/.hermes/longform/.render.lock` +
  `ps aux | grep -E "longform|tts_runner|shorts|music_pipeline|playlist_compiler"` + `nvidia-smi`
  before `kilo run`, wait if busy. A forced server shutdown timer fires daily at 19:30 KST.
- `kilo` CLI at `~/.cursor/extensions/kilocode.kilo-code-7.4.23-linux-x64/bin/kilo` (not on
  default `PATH`). `kilo run` REQUIRES `--dir <path>`; without `-m` it still resolves to the
  correct model in this repo (confirmed, closing pass — kilo.jsonc only defines one), but the bench
  scripts pass it explicitly anyway. Local model `qwen-3-6/Qwen3.6-35B-A3B-UD-Q4_K_M.gguf`.
- `templates/AGENTS.md.template` must stay byte-identical to `AGENTS.md` from `## Language`
  onward, excluding `## Learned Rules` — `check_template_drift()` catches this, only when run.
- `FEEDBACK_PENDING.md`'s "Completed history" is a pointer only — resolved rows live in
  `wiki/FEEDBACK_PENDING-archive.md`, not auto-loaded.
- A local clone's own `git log` looking coherent proves nothing about its freshness vs.
  `origin/master` (L13) — always `git fetch`+diff origin, or fresh-clone, first.

## Next session's starter prompt

```
round 31 시작. wiki/handoffs/SESSION_PRIMER.md 전체 읽기 → FEEDBACK_PENDING.md 표 확인
(open 3행뿐, 전부 accepted 상태 아니면 permanent ceiling) → ~/.hermes/opus_round30_closing_report.md
확인. round 30는 이 클로징 패스로 완전히 닫힘: item 4는 kilo.db 실측(라이브 실행 없이)으로
원인 확정 — 벤치 자체의 Step 3 build_scope가 너무 구체적이라 모델이 AGENTS.md의 "명확히
scoped면 build로 직행" 규칙을 정확히 따라 design 트리거가 오기 전에 이미 작업을 끝내버림
(design.md/build.md 결함 아님). #47/#48 아카이브, #42→#4/12 병합, #50은 다운그레이드(해결 아님).
**진짜 열린 일**: item 3-C/5-D/6 (재시도폭주 실측감소·axis B 재실행·25-trial 실측) — 라이브
kilo run 시간이 필요해 이번 클로징 패스에서 의도적으로 안 함(새 감사 라운드 금지). 이어가려면
kilo run 신뢰성부터 다시 확인 후 착수.
```

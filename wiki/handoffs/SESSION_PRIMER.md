# SESSION PRIMER — PROJECT CLOSED (round 31, final, 2026-08-24)

> Status icons: ✅done(evidence) ⏳code-done·unverified 🔶partial 🔴unfixed-bug ⚠️needs-user-action
> **Role: current-state only — no "why" narrative.** Round-by-round detail: `FEEDBACK_PENDING.md`'s
> open table for what's still live, `wiki/FEEDBACK_PENDING-archive.md` for every resolved row,
> `wiki/rule-archive.md` "Round 30"/"Round 30 closing pass"/"Round 31" for full evidence.

## Project overview

`soulmate-4` is a session-handoff harness template for coding agents behind **Kilo Code**, talking
to a local LLM with a hard context ceiling (RTX 3080 10GB, physically **shared with an unrelated
production system "Hermes"** — see Hard constraints). `.kilo/plugins/subtask-gate.ts` is the
payoff: a real `tool.execute.before` mechanical brake. **This round closes the project out** — no
further rounds planned; everything below is the true final state, not an in-progress snapshot.

## Current sub-task

```
시작: none — project closed out this round, no active work.
완료: round 31 (final). Preserved a real 5-message live production trial (Cursor's Kilo Code
     plugin, ~/sm4-plugin-test, kilo.db session ses_fcefa899bffewCgMbGLExGASGY) — the harness's
     first ever live production verification, not a bench script. Positive: gate fired 18/18
     (all primer-path), zero successful bypasses across 34 real tool calls (bash 16/read 7/
     edit 4/glob 3/write 3/question 1) — READONLY_TOOLS allowlist (round 30) held under real
     pressure; question tool confirmed firing in-plugin; design landed 2 real primer commits,
     confirming the round 30 closing pass's static kilo.db finding from a live run. Findings:
     #47 REOPENED — round 30's closing pass archived it "done" on the theory that item 3's
     electiveBoundaryAtTurnStart fix resolved the retry storm; this trial's 18 blocked calls were
     100% primer-path (item 3's fix only ever touched the elective path, by design), so the
     archive was a real overclaim, corrected this round. #6 reproduced at its strongest yet: 18
     itemized false completion claims ("생성 완료"/"커밋 완료"/"모든 테스트 PASS") against a
     session where `tools/` never existed, tree stayed clean, HEAD never moved. Shipped a fix:
     contradiction injection (subtask-gate.ts) — chat.message now injects a git-derived factual
     notice naming exactly which tool calls were blocked, whenever HEAD+working-tree are
     confirmed unchanged since the blocked turn began. 35/35 unit (2 new: T20/T21), 42/42 fuzz,
     check-caps.sh clean. Full evidence: wiki/rule-archive.md "Round 31".
막힘: none blocking — this is a clean project close, not a stall.
다음: NO next step is planned or expected — this project is closed. If Jay explicitly reopens
     it, the natural next work is the 2 things this round could not verify live (see Hard
     constraints): (1) does the model actually heed the contradiction-injection notice on a real
     next turn — only a live plugin trial can show this; (2) does #47's retry storm still happen
     with the notice present (it cannot prevent the storm — the notice only lands on the NEXT
     chat.message, after all 18 blocks already fired mid-turn — but it may change what the model
     does once it sees it). #50 (kilo-run reliability root cause) also remains genuinely open.
참고: opus_round30_workorder.md/opus_round30_execution_report.md/opus_round30_closing_report.md/
     opus_final_round_report.md are in ~/.hermes/, NOT this repo.
```

## Final state — every FEEDBACK row (`FEEDBACK_PENDING.md`)

| # | Issue | Status |
|---|---|---|
| 2 | Custom slash commands don't work in Kilo CLI v7.4.20+ — Kilo's own limitation | ⚠️ p2, accepted permanent limitation (upstream) |
| 4/12 | CLI structurally lacks a `question` tool; plugin has it (round 31 reconfirmed live) | 🔴 p1, accepted permanent ceiling (CLI half only) |
| 6/38 | Model self-report fabrication after a gate block | 🔴 p1, accepted permanent ceiling — **mitigated** round 31 (contradiction injection, mechanism unit-verified, live efficacy NOT verified) |
| 47 | Retry storm, primer-path — round 31 reproduced live at full scale (18 blocks/turn) | 🔴 p1, **open, reopened** — not fixed, contradiction injection is a partial mitigation at best |
| 50 | `kilo run` reliability — ~50%+ solo-call hangs (round 30), inconclusive re-tests since | 🔶 p2, open, monitor — root cause never conclusively identified |
| — | Bare cross-paragraph token gap — fixing it breaks real content | 🔴 p2, accepted permanent limitation |
| — | `check_fence_parity()` odd/even blind spot — inherited from original | 🔴 p2, accepted permanent limitation |

**Why each permanent-limitation row is accepted, not "unfinished"**: #2/#4-12 are the host
platform's (Kilo) own gaps, outside this repo's control. #6 is an inherent LLM-reliability limit —
this project's own repeated experience (0/2 on wording-rewrite attempts, `rule-archive.md` round
27's Finding A) is that you cannot prompt a model out of confabulating; round 31's contradiction
injection is the correct-shaped fix (contradict with fact instead of trying to prevent the lie)
but its live efficacy needs a trial this round did not run. The 2 fence/token gaps are structural
tradeoffs (fixing either breaks real, legitimate content) documented and accepted since before
round 28. **#47 and #50 are NOT permanent limitations** — they are real open bugs/unknowns a
future round could still make progress on; they are open because this round chose not to spend
further live `kilo run` time chasing them (see Hard constraints), not because they are unfixable.

## Hard constraints / warnings

- **Verification split (read this before claiming anything about round 31 is "done")**: the
  contradiction-injection *mechanism* is unit-verified (T20/T21, deterministic, git-derived, no
  mocks). Whether the model *heeds* it on a real next turn is genuinely unverified — only a live
  plugin trial can show this, and this project has been burned repeatedly by success signals that
  were not real effects (this round's own #47 finding is a fresh instance of exactly that).
- **`ps aux | grep "kilo serve"` before any live trial** — round 30 found 2 concurrent daemons
  correlating with a ~50%+ hang rate (#50); still not conclusively confirmed or ruled out.
- GPU is shared with real Hermes production jobs — check `~/.hermes/longform/.render.lock` +
  `ps aux | grep -E "longform|tts_runner|shorts|music_pipeline|playlist_compiler"` + `nvidia-smi`
  before `kilo run`, wait if busy. A forced server shutdown timer fires daily at 19:30 KST.
- `kilo` CLI at `~/.cursor/extensions/kilocode.kilo-code-7.4.23-linux-x64/bin/kilo` (not on
  default `PATH`). `kilo run` REQUIRES `--dir <path>`; pass `-m qwen-3-6/Qwen3.6-35B-A3B-UD-
  Q4_K_M.gguf` explicitly (a stale model name is one known `kilo run` failure cause).
- `templates/AGENTS.md.template` must stay byte-identical to `AGENTS.md` from `## Language`
  onward, excluding `## Learned Rules` — `check_template_drift()` catches this, only when run.
- `FEEDBACK_PENDING.md`'s "Completed history" is a pointer only — resolved rows live in
  `wiki/FEEDBACK_PENDING-archive.md`, not auto-loaded. #47 was moved back OUT of that archive
  this round (reopened) — a row can move either direction, not just archive-forward.
- A local clone's own `git log` looking coherent proves nothing about its freshness vs.
  `origin/master` (L13) — always `git fetch`+diff origin, or fresh-clone, first.

## If this project is ever reopened

```
Read this file + wiki/rule-archive.md "Round 31" in full first — do not trust any prior round's
"done"/"archived" claim without re-deriving it (this exact failure — round 30 archiving #47 on a
fix that didn't cover the path that broke — is why round 31 exists). The 2 live-unverified items
above (contradiction-injection efficacy, #47 post-injection behavior) are the natural starting
point. Fresh-clone required, never resume a stale local checkout (L13).
```

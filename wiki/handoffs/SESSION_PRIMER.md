# SESSION PRIMER — PROJECT CLOSED (round 32, final, 2026-08-24)

> Status icons: ✅done(evidence) ⏳code-done·unverified 🔶partial 🔴unfixed-bug ⚠️needs-user-action
> **Role: current-state only — no "why" narrative.** Round-by-round detail: `FEEDBACK_PENDING.md`'s
> open table for what's still live, `wiki/FEEDBACK_PENDING-archive.md` for every resolved row,
> `wiki/rule-archive.md` "Round 30"/"Round 30 closing pass"/"Round 31"/"Round 32" for full evidence.

## Project overview

`soulmate-4` is a session-handoff harness template for coding agents behind **Kilo Code**, talking
to a local LLM with a hard context ceiling (RTX 3080 10GB, physically **shared with an unrelated
production system "Hermes"** — see Hard constraints). `.kilo/plugins/subtask-gate.ts` is the
payoff: a real `tool.execute.before` mechanical brake. **This round closes the project out** — no
further rounds planned; everything below is the true final state, not an in-progress snapshot.

## Current sub-task

```
시작: none — project closed out (round 31), round 32 recorded 2 more live trials Jay ran
     against the still-open harness. No new development.
완료: round 32 (final; corrects round 31's #6/#47 framing only, everything else in round 31
     stands). Compared round 31's own trial 1 (long session, 08:47-09:01 KST, 18 consecutive
     primer-gate blocks, 18 fabricated completion claims) against a NEW trial 2 (fresh 3-turn
     session, 11:01-11:03 KST, ~/sm4-plugin-test, kilo.db session
     ses_fce7f51bfffetFsg2zznV9Oj5C) that hit the byte-identical primer-gate block ONCE and
     stopped, reporting honestly ("SESSION_PRIMER.md가 방금 커밋되어... 여기서 멈춥니다"), with
     an accurate follow-up account next turn. Finding A: #6/#47 correlate with session
     length/derailment, not with the primer-gate block itself — both rows reframed (not closed)
     in FEEDBACK_PENDING.md. Combined: gate blocked 20/20 across both trials, zero bypasses;
     trial 2 plus trial 1's later session.idle nudge together show the full hook chain (block →
     chat.message ack → work proceeds → idle nudge) firing correctly live for the first time.
     Finding B: `.kilo/plugins/*.ts` loads once at `kilo serve` daemon start, not per session —
     confirmed via commit 95a1f56 (swapped round 31's 795-line plugin into ~/sm4-plugin-test)
     and the state file still missing its 3 new keys afterward; both daemons had been up
     2.3-2.4h, never restarted (no restart subcommand exists; killing one was out of scope,
     shared with Jay's live Cursor session). Finding C: contradiction injection (round 31) is
     therefore still live-unverified, now for a known, specific reason (Finding B), not an open
     mystery. Full evidence: wiki/rule-archive.md "Round 32".
막힘: none blocking — still a clean project close; round 32 was a recording pass over 2 trials
     Jay ran, not new development.
다음: unchanged from round 31 — NO next step planned. If reopened, the natural next step is
     still verifying contradiction-injection efficacy live, which now specifically requires a
     `kilo serve` daemon restart on ~/sm4-plugin-test (Finding B) before any further trial can
     mean anything. #47 post-injection behavior and #50 (kilo-run reliability) also remain open.
참고: opus_round30_workorder.md/opus_round30_execution_report.md/opus_round30_closing_report.md/
     opus_final_round_report.md are in ~/.hermes/, NOT this repo.
```

## Final state — every FEEDBACK row (`FEEDBACK_PENDING.md`)

| # | Issue | Status |
|---|---|---|
| 2 | Custom slash commands don't work in Kilo CLI v7.4.20+ — Kilo's own limitation | ⚠️ p2, accepted permanent limitation (upstream) |
| 4/12 | CLI structurally lacks a `question` tool; plugin has it (round 31 reconfirmed live) | 🔴 p1, accepted permanent ceiling (CLI half only) |
| 6/38 | Model self-report fabrication after a gate block | 🔴 p1, **open** — round 32: correlates with session length/derailment, not confirmed inherent; mitigation (contradiction injection) still live-unverified (Finding B/C) |
| 47 | Retry storm, primer-path (18 blocks/turn in round 31's long-session trial) | 🔴 p1, **open, reopened** — round 32: correlates with session length, not the primer path itself (fresh session: 1 block, stopped) |
| 50 | `kilo run` reliability — ~50%+ solo-call hangs (round 30), inconclusive re-tests since | 🔶 p2, open, monitor — root cause never conclusively identified |
| — | Bare cross-paragraph token gap — fixing it breaks real content | 🔴 p2, accepted permanent limitation |
| — | `check_fence_parity()` odd/even blind spot — inherited from original | 🔴 p2, accepted permanent limitation |

**Why each row is at its current state**: #2/#4-12 are the host platform's (Kilo) own gaps,
outside this repo's control — accepted permanent limitations. **#6 is NOT an accepted permanent
limitation as of round 32** — that framing is retired: a 2-trial comparison
(`rule-archive.md` "Round 32") found it correlates with session length/derailment rather than
being unconditional, which a single fresh short session (trial 2, honest report, no fabrication)
disproves as an inherent ceiling. Round 31's contradiction injection remains the correct-shaped
mitigation attempt regardless (contradict with fact instead of trying to prevent the lie), but
its live efficacy is still unverified — round 32 pins down exactly why (Finding B: the daemon
never picked up the code that would need testing), not because the question wasn't tried. The 2
fence/token gaps are structural tradeoffs (fixing either breaks real, legitimate content)
documented and accepted since before round 28. **#47 and #50 are NOT permanent limitations** —
they are real open bugs/unknowns a future round could still make progress on; #47 is additionally
now known to correlate with session length (round 32), not to be an unconditional property of the
primer-gate block.

## Hard constraints / warnings

- **Verification split (read this before claiming anything about contradiction injection is
  "done")**: the *mechanism* is unit-verified (T20/T21, deterministic, git-derived, no mocks).
  Whether the model *heeds* it on a real next turn is unverified for a known, specific reason
  (round 32, Finding B below) — both post-round-31 live attempts ran against a `kilo serve`
  daemon that never picked up the new plugin code, not because the question wasn't tested. This
  project has also been burned repeatedly by success signals that were not real effects (round
  31's own #47 finding was a fresh instance of exactly that).
- **`.kilo` plugin changes require a `kilo serve` daemon restart to take effect** (round 32,
  Finding B) — the plugin loads once at daemon start, not per session; a Cursor "New Session"
  reuses whatever daemon is already listening. `kilo daemon` has no stop/restart subcommand.
  Before trusting any trial's result, check `.subtask-gate-state.json` for the plugin's newest
  expected keys to confirm which code is actually live.
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
Read this file + wiki/rule-archive.md "Round 31"+"Round 32" in full first — do not trust any
prior round's "done"/"archived" claim without re-deriving it (this exact failure — round 30
archiving #47 on a fix that didn't cover the path that broke — is why round 31 exists; round 31
overclaiming #6/#47 as inherent/unconditional without a session-length control is why round 32
exists). A `kilo serve` daemon restart on ~/sm4-plugin-test is required before any further live
trial means anything (Finding B). Fresh-clone required, never resume a stale local checkout
(L13).
```

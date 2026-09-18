# SESSION PRIMER — local-memory acceptance in progress (2026-09-17)

> Status icons: ✅done(evidence) ⏳code-done·unverified 🔶partial 🔴unfixed-bug ⚠️needs-user-action
> **Role: current-state only — no "why" narrative.** Round-by-round detail: `FEEDBACK_PENDING.md`'s
> open table (still-live), `wiki/FEEDBACK_PENDING-archive.md` (resolved), `wiki/rule-archive.md`
> "Round N" sections (full evidence, "Round 5-30" via its own moved-to-archive pointer).

## Project overview

`soulmate-4` is a session-handoff harness template for coding agents behind **Kilo Code**, talking
to a local LLM with a hard context ceiling (RTX 3080 10GB, physically **shared with an unrelated
production system "Hermes"** — see Hard constraints). `.kilo/plugins/subtask-gate.ts` is the
payoff: a real `tool.execute.before` mechanical brake. `scripts/subtask-report.sh` (layer 1,
tool-only) + `scripts/subtask-review-llm.sh` (layer 2, local-model diff review, report-only) are
the sub-task-close verification. Round 32 closed the project out; rounds 33-37 were each narrow,
fully-specified reopenings (Opus/Jay work orders, not new audit rounds) — everything below is the
historical round-37 baseline. Latest upstream work is in HANDOFF.md through round 50; the
Current sub-task block below owns this local-memory continuation. An end-to-end real-project
build remains open; fixture success does not close that requirement.

## Current sub-task

```text
Start: fresh GitHub clone at 7e6938b; prior local checkout is explicitly stale and unused.
Goal: Codex-style smart, efficient memory/work management with local-only inference and a
  combined 65,536-token ceiling. Local limitations shape context handling, not user intervention.
Owner intent (2026-09-10): apply Codex V2 lessons; revise old rules when useful. Preserve both
  current work and interrupted-task context. No Hermes migration; Jay-led Kilo acceptance.
Observed: Kilo IDE extension 7.5.16; server Qwen3.6-35B-A3B Q4_K_M, reasoning off, n_ctx=65536,
  one slot. Kilo resolved the custom model to context=0/output=0. Its installed code skips
  overflow checking at context=0. Isolated override 65536/8192 is accepted by this same binary.
Done: project-only kilo.jsonc limits 65536/8192, threshold 75%; global IDE config unchanged.
  Saved-state plugin projects Current sub-task verbatim, bounded to 8 KiB; bootstrap copies it.
  Array-reference fix verified. New task-switch guidance is CPU-checked, not IDE-verified.
Fixtures: native prose 10/12, explicit fields 12/12; R7 resume passed. Limits/failures in evidence.
Jay artifact review (09-16): handoff predates growth.js; nine JS files pass syntax, not gameplay.
  Boss damage and hero-passive gaps persist; 3-minute target conflicts with post-wave waits.
  Project harness/git absent. CLI limits 0/0 were measured 09-10; active IDE remains unverified.
Owner correction: latest intervention overrides saved scope; no new gates or unlock phrases.
History (09-17): 8 scoped sessions; todos 5/4, compactions 1/1; overflow and unverified summaries.
Trial: /media/jay/D/cursor/soulmate4-playground; token/quality trial next.
  09-18: manual docs accepted; prioritize token budget, design, verified tasks and quality. Preserve prior findings as history; evidence JSON owns details.
Evidence: tests/results/local-memory-acceptance.json; raw/offline logs preserved under
  /home/jay/soulmate-4-acceptance/. Source branch feat/local-memory-budget, not pushed/merged.
Previous state: round 37 close-out is in rule-archive.md Round 37; rounds 39-50 and latest live
  gaps are in HANDOFF.md section 8-1 (not the stale round-37 priority list). The warms-mobile
  deployment remains separate; no changes there. Existing feedback rows below remain open.
```

1. Jay develops in Kilo and shares the actual artifacts.
2. Review those artifacts and correct the relevant implementation or memory handling.
3. Preserve verified results and Jay's latest direction in existing owners.

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

**Current classification only** (full reasoning: `rule-archive.md` "Round 31"/"Round 32"): #2/
#4-12 = accepted permanent (Kilo's own platform gaps). #6/#47 = **NOT** permanent — round 32 found
both correlate with session length/derailment rather than being unconditional; #6's mitigation
(contradiction injection) is unit-verified but live-efficacy still unverified (Finding B: the
`kilo serve` daemon under test never picked up the new plugin code). #50 = open, root cause never
found. The 2 fence/token rows = permanent structural tradeoffs (fixing either breaks real
content). Round 34 made no change to any row above.

## Hard constraints / warnings

- **Verification split**: contradiction injection's *mechanism* is unit-verified (T20/T21). Whether
  the model *heeds* it live is still unverified — both post-round-31 attempts hit a `kilo serve`
  daemon that never picked up the new plugin code (Finding B below), not a real test of the idea.
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
  Q4_K_M.gguf` explicitly — a stale/wrong saved model name is one known `kilo run` failure cause,
  and in the CLI it surfaces as **exit 0 with zero stdout and no error** (round 34), indistinguishable
  from a hang unless `-m` is always passed explicitly.
- `templates/AGENTS.md.template` must stay byte-identical to `AGENTS.md` from `## Language`
  onward, excluding `## Learned Rules` — `check_template_drift()` catches this, only when run.
- `FEEDBACK_PENDING.md`'s "Completed history" is a pointer only — resolved rows live in
  `wiki/FEEDBACK_PENDING-archive.md`, not auto-loaded.
- A local clone's own `git log` looking coherent proves nothing about its freshness vs.
  `origin/master` (L13) — always `git fetch`+diff origin, or fresh-clone, first.
- **`scripts/check-caps.sh` is quiet by default** — non-blocking WARN/WATCH/reminder lines only
  print in full when blocked or `--verbose`/`-v` passed; run `--verbose` for manual PRUNE review.
- **`rule-archive.md` (450 lines)/`SESSION_MASTER.md` (200 lines) hard-block a commit if
  crossed** — PRUNE proactively (self-harness.md step 4), move old sections to `-archive.md`.
- **`scripts/check-secrets.sh` hard-blocks a commit with a possible secret staged** (round 35
  item 1) — bypass `SKIP_SECRET_CHECK=1` (always logged, never silent).
- **`--bootstrap-check` now also fails on a stale installed hook**, not just a missing one (round
  37 item 1) — `diff`s `.git/hooks/{pre,post}-commit` against its source script every run.
- **`scripts/subtask-report.sh`/`scripts/post-commit-subtask-report`** — fires automatically on
  a commit touching this file; every check inside is optional, stated when skipped. Never trust
  the model's own "완료"/"PASS" claim over this report's output.
- **`scripts/subtask-review-llm.sh`** (round 36, layer 2) — same hook, fires right after layer 1.
  Calls this project's own `llama-server` directly (`http://127.0.0.1:8080/v1` by default — the
  same single-slot server `kilo run` uses, shared with Hermes GPU jobs, see the GPU line above).
  Report-only, never blocking; findings are tagged `[layer2/local-llm, unverified]` and must not
  be treated as equal-trust to layer 1's tool findings in the same report. `SUBTASK_REVIEW_
  LLM_DISABLE=1` skips it entirely if the local server isn't running.

## If this project is ever reopened

```
Read this file + wiki/rule-archive.md "Round 31"+"Round 32" in full first — do not trust any
prior round's "done"/"archived" claim without re-deriving it (both rounds exist because an
earlier round's claim didn't survive re-derivation). A `kilo serve` daemon restart on
~/sm4-plugin-test is required before any further live trial means anything (Finding B).
Fresh-clone required, never resume a stale local checkout (L13).
```

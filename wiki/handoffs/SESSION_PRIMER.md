# SESSION PRIMER — round 34 complete (2026-08-24)

> Status icons: ✅done(evidence) ⏳code-done·unverified 🔶partial 🔴unfixed-bug ⚠️needs-user-action
> **Role: current-state only — no "why" narrative.** Round-by-round detail: `FEEDBACK_PENDING.md`'s
> open table for what's still live, `wiki/FEEDBACK_PENDING-archive.md` for every resolved row,
> `wiki/rule-archive.md` "Round 30 closing pass"/"Round 31"/"Round 32"/"Round 33"/"Round 34" (via
> the "Round 5-30 (incl. closing pass) — moved to archive" pointer, then live from "Round 31"
> onward) for full evidence.

## Project overview

`soulmate-4` is a session-handoff harness template for coding agents behind **Kilo Code**, talking
to a local LLM with a hard context ceiling (RTX 3080 10GB, physically **shared with an unrelated
production system "Hermes"** — see Hard constraints). `.kilo/plugins/subtask-gate.ts` is the
payoff: a real `tool.execute.before` mechanical brake. Round 32 closed the project out; rounds 33
and 34 were both narrow, fully-specified reopenings (Opus work orders, not new audit rounds) —
everything below is the true current state after round 34, not an in-progress snapshot. No new
round planned unless Jay reopens again.

## Current sub-task

```
시작: round 33's closed-out state. Jay opened a new 2-deliverable work order: (1) a universal
     sub-task report generator, because the local model's self-report is measured unreliable
     (18 straight turns of "완료"/"PASS" claims this week while every tool call was blocked and
     nothing landed); (2) record this week's aider-polyglot/complexity-ladder measurements
     somewhere durable, following this repo's own flow rule.
완료: round 34, both deliverables, pushed:
     (1) scripts/subtask-report.sh — evidence-only report: git diff/log for what changed, the
       actually-detected test runner (pytest/npm/go/cargo/make/bare node tests/*.test.mjs) run
       for real pass/fail counts, TODO/debug-residue/mock-in-non-test-path scan on added lines,
       whichever of gitleaks/npm-audit/bandit/pip-audit/semgrep exist, whichever of
       eslint/ruff/ts-prune/vulture exist, CSS font-size/color literal counts, coverage delta —
       every check optional, absence stated explicitly, script itself always exits 0. Boundary
       reused verbatim from subtask-gate.ts's computeBoundary() ("primer" reason): a commit
       touching wiki/handoffs/SESSION_PRIMER.md. scripts/post-commit-subtask-report fires it
       automatically only on such a commit (also runnable by hand any time); wired into
       bootstrap.sh so new projects inherit both. Tested against 2 synthetic throwaway repos of
       a different stack each (bare pytest, bare `node --test`) to prove real detect-vs-skip
       behavior, not just that it runs here — 18/18 assertions, tests/subtask-report.test.mjs (a
       real bug caught by its own T8: `git diff-tree` prints nothing for a repo's root commit
       without `--root`, fixed).
     (2) this week's measured local-model capability numbers — evergreen reference data, not
       round narrative — recorded in wiki/PROJECT_BACKGROUND.md's new "Local model capability"
       section (aider polyglot 9/23=39.1% Python-only with caveats, complexity ladder, the
       stateless-vs-self-designed-state failure pattern, 2nd-attempt-retry value). Full
       method/raw numbers: `wiki/rule-archive.md` "Round 34".
     Re-verified starting state first (fresh clone, per L13): HEAD d8622fb/221 commits, unit
     39/35, fuzz 42/42, regression 60, check-caps.sh exit 0 quiet — all matched, no mismatch.
     Real pre-commit hook used for every commit. No `kilo run`/LLM/GPU call made this round.
막힘: none.
다음: none planned. Round 32's own open items (#4/12, #6/38, #47, #50 — see table below) are
     UNCHANGED by round 34 (out of this round's narrow scope, same as round 33).
참고: opus_round34_report.md is in ~/.hermes/, NOT this repo.
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
primer-gate block. Round 34 made no change to any row above (out of scope, see "Current sub-task").

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
  Q4_K_M.gguf` explicitly — a stale/wrong saved model name is one known `kilo run` failure cause,
  and in the CLI it surfaces as **exit 0 with zero stdout and no error** (round 34), indistinguishable
  from a hang unless `-m` is always passed explicitly.
- `templates/AGENTS.md.template` must stay byte-identical to `AGENTS.md` from `## Language`
  onward, excluding `## Learned Rules` — `check_template_drift()` catches this, only when run.
- `FEEDBACK_PENDING.md`'s "Completed history" is a pointer only — resolved rows live in
  `wiki/FEEDBACK_PENDING-archive.md`, not auto-loaded.
- A local clone's own `git log` looking coherent proves nothing about its freshness vs.
  `origin/master` (L13) — always `git fetch`+diff origin, or fresh-clone, first.
- **`scripts/check-caps.sh` is quiet by default now** (round 33 item 3) — non-blocking WARN/
  WATCH/reminder lines only print in full when the commit is actually blocked or `--verbose`/
  `-v` is passed; a clean run instead shows one "N non-blocking notice(s) suppressed" line.
  Run with `--verbose` for the manual PRUNE review (self-harness.md step 4 already does).
- **`rule-archive.md` (450-line cap)/`SESSION_MASTER.md` (200-line cap) now hard-block a
  commit if crossed** (round 33 item 1) — PRUNE proactively per self-harness.md's step 4, don't
  wait for the block. Round 34 pruned "Round 30 closing pass" out to `rule-archive-archive.md`
  to make room before adding its own section — same pattern, reuse it next time too.
- **`scripts/subtask-report.sh`/`scripts/post-commit-subtask-report`** (round 34, new) — fires
  automatically only on a commit touching this file (same boundary as the gate); every check
  inside is optional and states explicitly when skipped. Never trust the model's own "완료"/
  "PASS" claim over this report's output.

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

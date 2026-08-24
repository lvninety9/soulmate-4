# SESSION PRIMER — round 33 complete (2026-08-24)

> Status icons: ✅done(evidence) ⏳code-done·unverified 🔶partial 🔴unfixed-bug ⚠️needs-user-action
> **Role: current-state only — no "why" narrative.** Round-by-round detail: `FEEDBACK_PENDING.md`'s
> open table for what's still live, `wiki/FEEDBACK_PENDING-archive.md` for every resolved row,
> `wiki/rule-archive.md` "Round 30"/"Round 30 closing pass"/"Round 31"/"Round 32"/"Round 33" (via
> the "Round 5-30 — moved to archive" pointer, then live from "Round 30 closing pass" onward) for
> full evidence.

## Project overview

`soulmate-4` is a session-handoff harness template for coding agents behind **Kilo Code**, talking
to a local LLM with a hard context ceiling (RTX 3080 10GB, physically **shared with an unrelated
production system "Hermes"** — see Hard constraints). `.kilo/plugins/subtask-gate.ts` is the
payoff: a real `tool.execute.before` mechanical brake. Round 32 closed the project out; **round 33
was a narrow, fully-specified reopening** (Opus work order, 3 items on `check-caps.sh` itself, not
a new audit round) — everything below is the true current state after it, not an in-progress
snapshot. No new round planned unless Jay reopens again.

## Current sub-task

```
시작: round 32's closed-out state. Jay reopened with a narrow 3-item work order targeting
     check-caps.sh's own doc-budget enforcement, motivated by a measured finding: hard caps
     were obeyed 100% of the time across this project's whole history, soft WATCH advisories
     0% of the time (rule-archive.md grew 408->1153 lines, +182%, over 4 rounds of an
     unactioned WATCH firing on every commit).
완료: round 33, all 3 items, 3 commits (7113c00/8478cc5/20466e1/83aed4f/2fd8912 — items 1's
     prune+cap split into 3, item 2 and item 3 one each):
     item 1: rule-archive.md/SESSION_MASTER.md's soft WATCH converted to a real hard cap
       (check_lines_warn, same mechanism every other auto-loaded doc uses) — RULE_ARCHIVE_
       WARN/CAP=400/450, SESSION_MASTER_WARN/CAP=150/200, both derived from this repo's own
       history (real post-archive resting sizes, not a round number). Performed the prune the
       new cap now requires: rounds 5-8/27-30 (rule-archive.md) and rounds 5-27 (SESSION_
       MASTER.md) moved verbatim to their `-archive.md` companions, one-line pointers left.
       1153->296 / 281->117 lines. The `-archive.md` tail files stay uncapped on purpose
       (never auto-loaded, no token-budget reason to bound them).
     item 2: session-log.md had the identical line-vs-bytes bug round 28 fixed for
       FEEDBACK_PENDING.md (25 lines/21,071 chars = 842 chars/line, so its 200-line WATCH
       needs ~168KB to ever fire — structurally unreachable). Fixed by extracting
       FEEDBACK_PENDING's inline row-char-cap loop into a shared check_row_char_cap()
       function and adding a second call site: SESSION_LOG_ROW_CHAR_CAP=3000 (sized from
       this file's own real rows, 373-2,679 chars each — copying FEEDBACK's 300 verbatim
       would OVER CAP every existing row). FEEDBACK_PENDING's own cap/message unchanged,
       regression-proven.
     item 3: check-caps.sh printed 1 WARN + 4 WATCH on every commit regardless of whether
       anything needed action — real signal was indistinguishable from routine noise. Fixed:
       non-blocking WARN/WATCH/reminder lines now buffer and print in full only when the
       commit is actually blocked (status=1) or `--verbose`/`-v` is passed; otherwise one
       summary line. OVER CAP/FAIL detection and immediate printing are unchanged. wiki/
       protocols/self-harness.md's PRUNE step now runs `check-caps.sh --verbose` explicitly.
     18 new regression tests (T7-T15, tests/check-caps.regression.test.mjs) cover all 3 items
     with the specific-effect standard (exact OVER CAP/ok/notice text, not just exit code).
     All pre-existing tests still pass unmodified (unit 38/42 assertions before this round's
     additions, fuzz 42/42). check-caps.sh clean; required-read total unchanged (21840/27800
     chars — this round touched none of the 4 required-read files).
막힘: none — all 3 items landed, tested, pushed.
다음: none planned. Round 32's own open items (#4/12, #6/38, #47, #50 — see table below) are
     UNCHANGED by round 33; this round was scoped to check-caps.sh's own doc-budget mechanism
     only ("no new audit round, no turnkey-oriented fixes" per its own work order), not a
     revisit of the harness's live-verification gaps. If reopened for those, start from round
     32's own "If this project is ever reopened" guidance below — it still applies unchanged.
참고: opus_round33_report.md is in ~/.hermes/, NOT this repo. Round 30/final-round reports
     referenced by round 32 are also in ~/.hermes/.
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
- **`scripts/check-caps.sh` is quiet by default now** (round 33 item 3) — non-blocking WARN/
  WATCH/reminder lines only print in full when the commit is actually blocked or `--verbose`/
  `-v` is passed; a clean run instead shows one "N non-blocking notice(s) suppressed" line.
  Run with `--verbose` for the manual PRUNE review (self-harness.md step 4 already does).
- **`rule-archive.md` (450-line cap)/`SESSION_MASTER.md` (200-line cap) now hard-block a
  commit if crossed** (round 33 item 1, WARN at 400/150) — PRUNE proactively per self-
  harness.md's step 4, don't wait for the block. `session-log.md` stays line-uncapped but each
  row now caps at 3,000 chars (`SESSION_LOG_ROW_CHAR_CAP`).

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

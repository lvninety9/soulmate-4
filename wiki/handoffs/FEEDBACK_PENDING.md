# Feedback / Issue Tracking

Valid `status` values: `open` (not started) | `in-progress` | `blocked` (waiting on something
external — note what) | `done`.

Valid `priority` values: `p0` (blocking/urgent) | `p1` (normal) | `p2` (someday) — lets a
20+-row table stay triageable at a glance instead of every row reading as equally urgent.

| # | Feedback / issue | Priority | Status | How it's handled | Session logged |
|---|---|---|---|---|---|
| 2 | `.kilo/commands/*.md` don't work in Kilo CLI (v7.4.20+) | p2 | open | AGENTS.md "Known gap"/L02; watch Kilo's changelog | seed |
| 4/12 | CLI (`kilo run`) has no `question` tool in its real 12-tool payload (permanent, confirmed 3x); Cursor plugin (17 tools) has+uses it | p1 | open, permanent ceiling (CLI only) | `rule-archive.md` "Round 28"+"30" (merged #42) | rounds 2,7,8,28,30 |
| 6 | Post-block model self-report fabricates "done" claims | p1 | open, correlates with session length (not inherent) | Round 32: 2-trial compare — long/derailed session fabricates 18x, fresh 3-turn session stays honest. `rule-archive.md` "Round 28"+"31"+"32" | rounds 2,8,27,31,32 |
| 47 | Retry storm (18 blocks/turn), primer-path | p1 | open, reopened — correlates with session length, not the primer path itself (round 32: fresh session stopped after 1 block) | `rule-archive.md` "Round 31"+"32" | rounds 29,30,31,32 |
| 50 | `kilo run` reliability: round 30 saw ~50%+ solo-call hangs; closing pass re-tested lightly (2/2 quick calls OK, stale-Q3-default hypothesis ruled out) — inconclusive, not proven fixed | p2 | open, monitor (downgraded from blocking) | `rule-archive.md` "Round 30 closing pass" | round 30 |
---

## Completed history

<!-- rows move to wiki/FEEDBACK_PENDING-archive.md the moment they're done — this section stays
     a pointer only, never a table, so this file (auto-loaded per wiki/protocols/discuss.md's
     Rule Zero grep target) can't silently regrow into pure narrative again (round 28, S5). -->

All resolved rows (#1-#48 incl. rounds 1-30) are in `wiki/FEEDBACK_PENDING-archive.md`, not
auto-loaded. Nothing deleted, only relocated.

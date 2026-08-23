# Feedback / Issue Tracking

Valid `status` values: `open` (not started) | `in-progress` | `blocked` (waiting on something
external — note what) | `done`.

Valid `priority` values: `p0` (blocking/urgent) | `p1` (normal) | `p2` (someday) — lets a
20+-row table stay triageable at a glance instead of every row reading as equally urgent.

| # | Feedback / issue | Priority | Status | How it's handled | Session logged |
|---|---|---|---|---|---|
| 2 | `.kilo/commands/*.md` don't work in Kilo CLI (v7.4.20+) | p2 | open | AGENTS.md "Known gap"/L02; watch Kilo's changelog | seed |
| 4/12 | "discuss" self-serve: CLI structurally can't ask a real question (no `question` tool) — permanent CLI ceiling, nudge-only mitigation | p1 | open (ceiling) | Full history + root cause: `wiki/rule-archive.md` "Round 28" | rounds 2,7,8,28 |
| 6 | Post-block model self-report fabricates "done" claims | p1 | open, permanent ceiling | Inherent LLM limit, no plugin fix — verify git/state, never the model's summary. Full history: `wiki/rule-archive.md` "Round 28" | rounds 2,8,27 |
| 42 | CLI-vs-plugin "discuss" gap root-caused: CLI's agent lacks a `question` tool (binary-confirmed deny); plugin has it + used it (2/2), vs. this row's own "5/5 FAIL" | p1 | open | Evidence: `rule-archive.md` "Round 28". Next: re-check original 5 trials for a `question` call | round 28 |
| 47 | Blocked mid-turn, model retries 4-20 tool variants instead of cleanly stopping to ask (doesn't bypass now #46's closed, but wastes turn budget) | p2 | open | Full evidence: `rule-archive.md` "Round 29" | round 29 |
---

## Completed history

<!-- rows move to wiki/FEEDBACK_PENDING-archive.md the moment they're done — this section stays
     a pointer only, never a table, so this file (auto-loaded per wiki/protocols/discuss.md's
     Rule Zero grep target) can't silently regrow into pure narrative again (round 28, S5). -->

All resolved rows (#1-#38, rounds 1-27) are in `wiki/FEEDBACK_PENDING-archive.md`, not auto-loaded.
Nothing deleted, only relocated.

# Feedback / Issue Tracking

Valid `status` values: `open` (not started) | `in-progress` | `blocked` (waiting on something
external — note what) | `done`.

Valid `priority` values: `p0` (blocking/urgent) | `p1` (normal) | `p2` (someday) — lets a
20+-row table stay triageable at a glance instead of every row reading as equally urgent.

| # | Feedback / issue | Priority | Status | How it's handled | Session logged |
|---|---|---|---|---|---|
| 2 | `.kilo/commands/*.md` don't work in Kilo CLI (v7.4.20+) | p2 | open | AGENTS.md "Known gap"/L02; watch Kilo's changelog | seed |
| 4/12 | "discuss" self-serve: CLI structurally lacks a `question` tool — round 30 doubly reconfirmed (captured real payload + live repro) | p1 | open (ceiling), reconfirmed | Full evidence: `rule-archive.md` "Round 28"+"Round 30" | rounds 2,7,8,28,30 |
| 6 | Post-block model self-report fabricates "done" claims | p1 | open, permanent ceiling | Inherent LLM limit, no plugin fix — verify git/state, never the model's summary. Full history: `wiki/rule-archive.md` "Round 28" | rounds 2,8,27 |
| 42 | CLI-vs-plugin "discuss" gap: CLI's agent lacks a `question` tool (now payload-confirmed, not just binary-inferred); plugin has + uses it | p1 | open | Evidence: `rule-archive.md` "Round 28"/"Round 30" | rounds 28,30 |
| 47 | Blocked mid-turn, model retries 4-20 tool variants instead of asking | p2 | fix landed (item 3: elective arm now turn-boundary-only), live re-verify blocked by #50 | `subtask-gate.ts` + T19a/b; evidence `rule-archive.md` "Round 30" | rounds 29,30 |
| 48 | Axis B Step 4 (design→primer commit) = 0/5 BOTH modes — root cause undetermined, blocked by #50 this round | p1 | open, blocked | `wiki/rule-archive.md` "Round 30" | rounds 29,30 |
| 50 | `kilo run` unreliable: ~50%+ of solo calls hang (0 output, stuck pre-model). llama-server healthy throughout; 2 concurrent `kilo serve` daemons observed (Cursor-owned). Blocks #47/#48 + items 3C/4/5D/6 | p1 | open, blocking | `wiki/rule-archive.md` "Round 30" | round 30 |
---

## Completed history

<!-- rows move to wiki/FEEDBACK_PENDING-archive.md the moment they're done — this section stays
     a pointer only, never a table, so this file (auto-loaded per wiki/protocols/discuss.md's
     Rule Zero grep target) can't silently regrow into pure narrative again (round 28, S5). -->

All resolved rows (#1-#38, rounds 1-27) are in `wiki/FEEDBACK_PENDING-archive.md`, not auto-loaded.
Nothing deleted, only relocated.

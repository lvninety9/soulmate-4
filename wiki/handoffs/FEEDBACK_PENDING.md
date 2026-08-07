# Feedback / Issue Tracking

Valid `status` values: `open` (not started) | `in-progress` | `blocked` (waiting on something
external — note what) | `done`.

Valid `priority` values: `p0` (blocking/urgent) | `p1` (normal) | `p2` (someday) — lets a
20+-row table stay triageable at a glance instead of every row reading as equally urgent.

| # | Feedback / issue | Priority | Status | How it's handled | Session logged |
|---|---|---|---|---|---|
| 2 | Custom project slash commands (`.kilo/commands/*.md`) don't work in Kilo's CLI as of v7.4.20 — may change in a future Kilo release, which would make `wiki/protocols/*.md`'s self-serve framing obsolete in a good way | p2 | open | Documented in AGENTS.md "Known gap" and L02; watch Kilo's changelog periodically | seed |
| 3 | `subtask-gate.ts`'s "after this call is blocked once, immediately disarm" design means a determined immediate retry of the exact same tool call *would* slip through — not tested against an adversarial/careless model that ignores the error and retries verbatim | p1 | open | AGENTS.md's own "no verbatim 3rd retry" rule is the only thing discouraging this; no second mechanical layer exists yet | seed |
| 4 | Round 1 blind validation found the "discuss" trigger word did not cause a read of `wiki/protocols/discuss.md` in 1 of 4 tested invocations (design/build/verify all read their doc correctly) — the model produced discuss-shaped behavior from the word/table alone rather than actually opening the file | p2 | open | Inherent to prose self-serving (see AGENTS.md "Known gap") — no code fix exists; worth re-checking if a future Kilo release makes real slash commands work (item #2) | round 1 |

---

## Completed history

<!-- rows move here the moment they're done -->

| # | Feedback / issue | How it was handled | Session resolved |
|---|---|---|---|
| 1 | `scripts/bootstrap.sh` had never been run end-to-end; Round 1 blind validation found it fails on a completely fresh checkout (AGENTS.md.template 1 line over its own cap after comment-stripping), leaks its `/tmp` scratch clone on that failure, and never copies `templates/harness-integration-test.md`/`cold-read-test-prompt.md` into the target | Trimmed the template under cap, decoupled the README one-liner's cleanup from bootstrap.sh's exit code, made bootstrap.sh copy the two verification templates and strip comments from all 4 templates consistently; re-ran the real one-liner end-to-end and confirmed `--bootstrap-check` passes | round 1 |

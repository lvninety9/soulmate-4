# Feedback / Issue Tracking

Valid `status` values: `open` (not started) | `in-progress` | `blocked` (waiting on something
external — note what) | `done`.

Valid `priority` values: `p0` (blocking/urgent) | `p1` (normal) | `p2` (someday) — lets a
20+-row table stay triageable at a glance instead of every row reading as equally urgent.

| # | Feedback / issue | Priority | Status | How it's handled | Session logged |
|---|---|---|---|---|---|
| 1 | `scripts/bootstrap.sh` has never actually been run end-to-end against a fresh target — it's ported/adapted from soulmate-3's version but the `.kilo/` copy step and AGENTS.md/PROJECT_BACKGROUND.md comment-stripping are new code, untested | p0 | open | Not yet fixed — this is session 1's top priority | seed |
| 2 | Custom project slash commands (`.kilo/commands/*.md`) don't work in Kilo's CLI as of v7.4.20 — may change in a future Kilo release, which would make `wiki/protocols/*.md`'s self-serve framing obsolete in a good way | p2 | open | Documented in AGENTS.md "Known gap" and L02; watch Kilo's changelog periodically | seed |
| 3 | `subtask-gate.ts`'s "after this call is blocked once, immediately disarm" design means a determined immediate retry of the exact same tool call *would* slip through — not tested against an adversarial/careless model that ignores the error and retries verbatim | p1 | open | AGENTS.md's own "no verbatim 3rd retry" rule is the only thing discouraging this; no second mechanical layer exists yet | seed |

---

## Completed history

<!-- rows move here the moment they're done -->

| # | Feedback / issue | How it was handled | Session resolved |
|---|---|---|---|

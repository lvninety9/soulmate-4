# Soulmate 4

> Kilo Code auto-loads this file every message (confirmed via the CLI binary, not docs — see
> `wiki/rule-archive.md` L03). No separate kernel file exists here, unlike soulmate-3.

## Language
Docs/commits in English. Chat replies to the user in Korean.

## Rule zero
File over ~50 lines: grep the section you need, never read whole "just in case."

## Edit discipline
Commit per file, always — finish one file, commit it, before the next, even an ad-hoc fix made
before any protocol step. Never batch files into one commit (`pre-commit-check-caps` blocks >3
staged files as a backstop — don't rely on it catching what this should already prevent). Edit
anchors: smallest unique fragment (2-3 lines), never a whole block — grep first. Same tool+file
error twice in a row: switch tool or stop and flag it, never a 3rd verbatim retry.

## Protocol
| Step | When | Doc |
|---|---|---|
| discuss | ambiguous ask — converge via Q&A first | `wiki/protocols/discuss.md` |
| design | plan + sign-off + split into sub-tasks sized to the ceiling | `wiki/protocols/design.md` |
| build | one sub-task, commit per file, checkpoint on scope creep | `wiki/protocols/build.md` |
| verify | independent check against the actual deliverable | `wiki/protocols/verify.md` |
| self-harness | end of session — mine friction, propose a rule, log, commit | `wiki/protocols/self-harness.md` |

Clearly-scoped: skip to build. Else: discuss → design → build → verify. No real slash command
exists for any of these (see "Known gap") — read the matching doc yourself, every time.

## Sub-task gate (mechanical, not just prose)
`.kilo/plugins/subtask-gate.ts` hooks Kilo's real `tool.execute.before` (unlike Continue — see
"Known gap"): once a commit touches `wiki/handoffs/SESSION_PRIMER.md`, the next mutating tool
call is rejected once, forcing a stop instead of silently starting the next sub-task. One block
per commit, not a permanent lock — verified live, `wiki/rule-archive.md` L05.

## Known gap
Custom slash commands (`.kilo/commands/*.md`) don't work in Kilo's CLI yet — a canary file's
content was never injected, the model just pattern-matched the command name (L02). Protocol
steps above are self-served prose instead, same shape as soulmate-3's Continue gap.

## File map
| Need | File |
|---|---|
| current state, active sub-task | `wiki/handoffs/SESSION_PRIMER.md` |
| entity map, glossary, pipeline, Learned/Fixed Rules | `wiki/PROJECT_BACKGROUND.md` |
| open feedback | `wiki/handoffs/FEEDBACK_PENDING.md` |
| protocol methodology | `wiki/protocols/*.md` |
| sub-task gate plugin | `.kilo/plugins/subtask-gate.ts` |
| local model provider config | `~/.config/kilo/kilo.jsonc` (global) |

## Caps (mechanically checked by `scripts/check-caps.sh`)
File Map ≤12 rows · SESSION_PRIMER ≤150 lines · this file ≤60 lines (paid every message, kept
tight on purpose — Learned/Fixed Rules moved to `wiki/PROJECT_BACKGROUND.md` for exactly this
reason, unlike soulmate-3 which kept them in a reference-only, never-auto-loaded AGENTS.md).

## Sub-task budget
No live token-usage signal exists mid-session. `design` sizes sub-tasks to plausibly finish well
under your model's real context length by construction; `build` checkpoints the moment actual
work overruns that plan.

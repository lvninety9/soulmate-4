# Soulmate 4

> Kilo auto-loads this file every message (L03), no separate kernel file. Rules live here too
> (L02: unreferenced-from-here rules don't reach ad-hoc work).

## Language
Docs/commits in English. Chat replies to the user in Korean.

## Rule zero
File over ~50 lines: grep the section you need, never read whole "just in case."

## Edit discipline
Commit per file, always — finish one file, commit it, before the next, even an ad-hoc fix made
before any protocol step. Never batch files into one commit (`pre-commit-check-caps` blocks >3
staged files — don't rely on it catching what this should already prevent). Edit anchors:
smallest unique fragment (2-3 lines) — grep first. Same tool+file error twice: switch or stop.

## Protocol
| Step | When | Doc |
|---|---|---|
| discuss | ambiguous ask — converge via Q&A first | `wiki/protocols/discuss.md` |
| design | plan + sign-off + split into sub-tasks sized to the ceiling | `wiki/protocols/design.md` |
| build | one sub-task, commit per file, checkpoint on scope creep | `wiki/protocols/build.md` |
| verify | independent check against the actual deliverable | `wiki/protocols/verify.md` |
| refactor | shrinking/reorganizing code that already works, composes with build | `wiki/protocols/refactor.md` |
| self-harness | end of session — mine friction, propose a rule, log, commit | `wiki/protocols/self-harness.md` |

Clearly-scoped: skip to build. Else: discuss → design → build → verify. No real slash command
exists for any of these (see "Known gap") — read the matching doc yourself, every time.

## Sub-task gate (mechanical, not just prose)
`.kilo/plugins/subtask-gate.ts` hooks `tool.execute.before`/`after`/`chat.message` (unlike
Continue): blocks every mutation until a `wiki/protocols/*.md` doc is read (L09); blocks once
on a primer-touch/N-commit-elective trigger; warns on carried-over uncommitted work at the next
message — verified live, `wiki/rule-archive.md` L05-L10.

## Known gap
Custom slash commands (`.kilo/commands/*.md`) don't work yet (L02, canary-tested) — protocol
steps above are self-served prose instead, same shape as soulmate-3's Continue gap.

## File map
| Need | File |
|---|---|
| current state, active sub-task | `wiki/handoffs/SESSION_PRIMER.md` |
| entity map, glossary, pipeline | `wiki/PROJECT_BACKGROUND.md` |
| open feedback | `wiki/handoffs/FEEDBACK_PENDING.md` |
| sub-task gate plugin | `.kilo/plugins/subtask-gate.ts` |
| sub-task gate tests (`node --experimental-strip-types tests/subtask-gate.test.mjs`) | `tests/subtask-gate.test.mjs` |
| local model provider config | `~/.config/kilo/kilo.jsonc` (global) |

## Caps + sub-task budget
File Map ≤12 rows · SESSION_PRIMER ≤150 lines · this file ≤85 lines (matches original soulmate's
cap, not lowered for a local model). No live token-usage signal mid-session: `design` sizes
sub-tasks to finish under context length by construction; `build` checkpoints on overrun.

## Learned Rules

- [L01] Kilo's real install is an opencode rebuild, not the Cline-fork docs describe — confirmed
  via the binary, not docs (which conflicted) `permanent` (evidence: rule-archive.md)
- [L02] Custom slash commands (`.kilo/commands/*.md`) don't work — canary test proved it;
  protocol steps are self-served prose instead `permanent` (evidence: rule-archive.md)
- [L03] `AGENTS.md`/`CLAUDE.md`/`CONTEXT.md` all auto-load hierarchy-aware; `AGENTS.md` alone is
  unconditional, use only that `permanent` (evidence: rule-archive.md)
- [L04] Local reasoning models can exhaust a whole turn's budget on invisible thinking — fix at
  the inference server (`--reasoning off`), no per-request toggle exists `permanent` (rule-archive.md)
- [L05] Kilo genuinely inherits opencode's `tool.execute.before`/`after` hooks (unlike Continue)
  — built `subtask-gate.ts` on this `permanent` (evidence: rule-archive.md)
- [L06-L08] `subtask-gate` bugs from blind rounds 1-3: state lost across separate `kilo run`
  processes (fixed: disk persistence); trigger was 100% elective (fixed: also counts commits-
  since-primer via `git diff-tree`); commit detection was regex-on-bash-text (fixed: real `git
  HEAD` diff) `permanent` (evidence: rule-archive.md)
- [L09] `refactor.md` self-serve never fires on its own (3/3 round-4 trials) — fixed via a
  protocol-read check blocking every mutation until compliance (round-5 hardened: an audit found
  the original first-mutation-only version let later ones through) `permanent` (rule-archive.md)
- [L10] opencode validates synthetic Part IDs strictly (must start with `prt`) — a bad ID
  crashes the whole request, not a soft ignore; same discipline as L01 `permanent` (rule-archive.md)

## Fixed Rules
| Rule | Why |
|---|---|
| Commit per file, not per sub-task or session — even with no protocol step invoked | deferring to "when done" loses everything on a session cutoff |
| Local reasoning models: disable thinking at the inference server, not per-request | no per-request toggle exists for an arbitrary openai-compatible provider — L04 |
| Never claim a sub-task "done" without running its build/typecheck command | code that imports the right things isn't verified — a real bug sat live a full round otherwise |

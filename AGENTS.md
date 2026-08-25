# Soulmate 4

> Kilo auto-loads this file every message, no separate kernel file. Rules live here too — a rule
> only referenced from here, not stated in it, doesn't reach ad-hoc work.

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
Continue): blocks every mutation until a `wiki/protocols/*.md` doc is read; blocks once
on a primer-touch/N-commit-elective trigger; warns on carried-over uncommitted work at the next
message — verified live, see `wiki/rule-archive.md` for this project's own evidence.

## Known gap
Custom slash commands (`.kilo/commands/*.md`) don't work yet (canary-tested) — protocol
steps above are self-served prose instead, same shape as soulmate-3's Continue gap.

## File map
| Need | File |
|---|---|
| current state, active sub-task | `wiki/handoffs/SESSION_PRIMER.md` |
| entity map, glossary, pipeline | `wiki/PROJECT_BACKGROUND.md` |
| open feedback | `wiki/handoffs/FEEDBACK_PENDING.md` |
| sub-task gate plugin | `.kilo/plugins/subtask-gate.ts` |
| sub-task report — layer 1 tool evidence + layer 2 local-model diff review (tagged `[layer2/local-llm, unverified]`, report-only) | `scripts/subtask-report.sh` + `scripts/subtask-review-llm.sh`, auto via `scripts/post-commit-subtask-report` |
| sub-task gate tests (`node --experimental-strip-types tests/subtask-gate.test.mjs`) | `tests/subtask-gate.test.mjs` |
| local model provider config | `~/.config/kilo/kilo.jsonc` (global) |

## Caps + sub-task budget
File Map ≤10 rows · SESSION_PRIMER ≤150 lines · this file ≤85 lines (matches original soulmate's
cap, not lowered for a local model). No live token-usage signal mid-session: `design` sizes
sub-tasks to finish under context length by construction; `build` checkpoints on overrun.

## Learned Rules

- [L01-L04] Kilo is an opencode rebuild (confirmed via the binary, not the Cline-fork docs);
  custom slash commands don't work yet; `AGENTS.md` alone auto-loads; local reasoning models need
  `--reasoning off` at the inference server, no per-request toggle exists `permanent`
- [L05-L11] `subtask-gate.ts`'s hooks + every live bug that hardened it (state loss across
  processes, elective triggers, regex commit-detection, refactor.md's self-serve gap, a Part-ID
  crash, a retry-bypass) — full evidence per rule: `rule-archive.md` `permanent`
- [L12] A citation fix (correcting *which* package/API a claim cites) doesn't imply the claim's
  *substance* was re-verified against the corrected source — re-check it explicitly, don't assume
  `rule-archive.md` `permanent`
- [L13] A local clone with an unknown last-pull time can silently re-litigate already-resolved
  history as if it were current — always `git fetch`+compare against `origin/master` (or just
  fresh-clone) before trusting any local checkout for an audit-shaped task `rule-archive.md`
  `permanent`
- [L14] A test asserting only "did it throw" can pass even when the specific mechanism it targets
  is broken, if an unrelated check throws first — assert the specific error/effect, not just
  presence `rule-archive.md` (round 27, T11b) `permanent`

## Fixed Rules
| Rule | Why |
|---|---|
| Commit per file, not per sub-task or session — even with no protocol step invoked | deferring to "when done" loses everything on a session cutoff |
| Local reasoning models: disable thinking at the inference server, not per-request | no per-request toggle exists for an arbitrary openai-compatible provider |
| Never claim a sub-task "done" without running its build/typecheck command | code that imports the right things isn't verified — a real bug sat live a full round otherwise |

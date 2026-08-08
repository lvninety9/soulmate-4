# Project Background — Soulmate 4

## Entity/role map

| Name | Role |
|---|---|
| `AGENTS.md` | the ONLY file Kilo auto-loads every message (confirmed via the CLI binary — L03). Kept tight on purpose; no separate kernel file exists |
| `.kilo/plugins/subtask-gate.ts` | real mechanical enforcement, via Kilo's `tool.execute.before`/`tool.execute.after` hooks (inherited from opencode — L05) |
| `wiki/protocols/*.md` | the actual protocol methodology (discuss/design/build/verify/self-harness) — self-served prose, not a real slash command (L02) |
| `wiki/` (this repo's own) | dogfood instance — this repo applying its own harness to itself |
| `templates/` | copy-paste skeletons for adopters |
| `scripts/check-caps.sh` | mechanical cap enforcement, same shape as soulmate-2/3 |
| `scripts/pre-commit-check-caps` | git hook — a second, later-stage backstop behind the plugin gate (not the *only* one, unlike soulmate-3) |

## Why this repo exists (relationship to soulmate-2/3)

[soulmate-2](https://github.com/lvninety9/soulmate-2) targets opencode. [soulmate-3](https://github.com/lvninety9/soulmate-3)
targets Cursor + Continue against the same class of local model, and documents an explicit
"Known gap": Continue has no `tool.execute.before`-style hook, so nothing can mechanically block
a write/edit mid-session — only a commit-time git hook. Round 2 of soulmate-3's own testing
(same local Qwen3.6-35B, same test project) kept finding new forms of the same failure — the
model losing track after tool errors, chaining sub-tasks unprompted — no matter how the prose
was reworded. Jay decided to test whether **Kilo Code** (Cline/Roo-Code lineage, but the actual
2026 install turned out to be a ground-up rebuild on opencode's own runtime) does better with a
real mechanical brake instead of prose alone.

Verified live, not assumed from docs (public docs for Kilo were stale/conflicting — see L01):
Kilo's CLI genuinely inherits opencode's plugin hooks. This repo exists to carry that capability
into the same discuss/design/build/verify/self-harness methodology soulmate-2/3 already proved
out, adding one new mechanism (the sub-task gate) that neither predecessor had, and losing one
soulmate-3 had (`.continue/prompts/*.md`'s real `/name` slash commands — Kilo's equivalent is a
UI stub, see L02).

## Pipeline order

1. discuss (if ambiguous) → design (plan + sub-task split, sign-off) → build (one sub-task at a
   time, commit each file) → verify (blind check) → self-harness (end of session)
2. Every file commits on its own — never batch multiple files, let alone multiple sub-tasks,
   into one commit (AGENTS.md Fixed Rules).
3. The moment a commit touches `wiki/handoffs/SESSION_PRIMER.md`, `.kilo/plugins/subtask-gate.ts`
   rejects the next mutating tool call once — a real stop, not just a prose reminder.
4. A small, clearly-scoped task skips straight to build — no ceremony for a typo fix.

## Numbering / ID systems

- **Session number**: bumped in `wiki/handoffs/SESSION_PRIMER.md`'s title and
  `wiki/session-log.md`'s rows together, same counter, never drift.
- **Learned Rule IDs** (`L01`, `L02`, ...): sequential, never reused, capped at 10 here (full
  evidence in `wiki/rule-archive.md`).
- **FEEDBACK rows** (`#1`, `#2`, ...): sequential in `wiki/handoffs/FEEDBACK_PENDING.md`, moved to
  "Completed history" (not deleted) when resolved.

## Glossary

- **Sub-task gate**: `.kilo/plugins/subtask-gate.ts` — arms when a commit touches
  `wiki/handoffs/SESSION_PRIMER.md`, rejects exactly the next mutating tool call, then disarms.
  Not a permanent lock; not a guarantee against an immediate retry.
- **Sub-task**: a unit of work sized at design time to plausibly finish well under the model's
  real context length by construction — not measured at runtime, no live token-usage signal
  exists for the model to poll.
- **claudeCodeCompat**: a Kilo setting (off by default in the VS Code/Cursor extension, on by
  default when running the raw `kilo` CLI) controlling whether `~/.claude/CLAUDE.md` and Claude
  Code Skills also load. Irrelevant to this harness either way — `AGENTS.md`/`CONTEXT.md` load
  regardless of this toggle (L03), so this repo never depends on it being on.

## Status/priority vocabulary

Status icons: ✅ done (evidence/commit hash) · ⏳ code-done, unverified · 🔶 partial · 🔴 unfixed
bug · ⚠️ needs user action. FEEDBACK priority: `p0` blocking · `p1` normal · `p2` someday.

## What's NOT here

Current state, active sub-task, and this session's priorities — see
`wiki/handoffs/SESSION_PRIMER.md` instead. Learned/Fixed Rules and the File map — see
`AGENTS.md` instead (moved back there to match the original soulmate's proven design: a rule
only referenced from the auto-loaded file, not stated in it, doesn't reliably reach ad-hoc work
— see `wiki/rule-archive.md` L02, soulmate-3's own finding, re-applied here).

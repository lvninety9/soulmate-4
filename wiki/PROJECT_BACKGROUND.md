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

## Learned Rules

- [L01] Kilo's real installed build (v7.4.20) is a ground-up rebuild on opencode's own CLI
  runtime, not the classic Cline/Roo-Code fork public docs describe — confirmed via the compiled
  binary's strings and `kilo agent create --tools` output (real tool set: bash/read/edit/glob/
  grep/webfetch/task/todowrite/websearch/lsp/skill), not docs — two different web sources gave
  two different, mutually contradictory answers for the workflow directory convention alone.
  `permanent`
- [L02] Custom project slash commands (`.kilo/commands/*.md`) do not work yet — verified with a
  canary file (unique marker text in the command's body): the marker never appeared in the
  session transcript, the model only pattern-matched the command's file name and improvised a
  plausible response. Protocol steps in `AGENTS.md`'s table are self-served prose instead — the
  model reads the matching `wiki/protocols/*.md` on its own initiative when it recognizes the
  token, the same underlying behavior soulmate-3 relied on for a different reason (no auto-load
  convention there either, just a different cause). `permanent`
- [L03] `AGENTS.md`/`CLAUDE.md`/`CONTEXT.md` all auto-load, hierarchy-aware — confirmed by reading
  the CLI binary's own instruction-loader code, which builds the search list as
  `["AGENTS.md", "CLAUDE.md", "CONTEXT.md"]` per directory (skipping `CLAUDE.md` only when
  `claudeCodeCompat` is off). `AGENTS.md` is unconditional; this repo relies on that alone and
  never uses `CLAUDE.md`. `permanent`
- [L04] A local reasoning model (Qwen3.6-35B) can burn an entire turn's *output*-token budget on
  invisible "thinking" and produce zero result — observed live: `finish:"length"`, 32,000 output
  tokens, no tool call, no edit, nothing saved (`docs/cli-side` in Kilo's own bundled dev-notes
  independently confirms this general failure mode: "Plan mode system prompt causes agent to
  stop repeatedly asking to implement" is a different symptom of the same class). No per-request
  reasoning-effort toggle exists for an arbitrary openai-compatible local provider in Kilo's
  config schema. Fix at the inference server instead: `llama-server --reasoning off` (a real
  llama.cpp flag, `-rea off`) — verified via a direct `/v1/chat/completions` probe before/after:
  identical question, reasoning content present then absent, `completion_tokens` dropping from
  what would have been hundreds+ to 17. `permanent`
- [L05] Kilo's CLI genuinely inherits opencode's `tool.execute.before`/`tool.execute.after` hook
  triggers — found in the compiled binary (`I.trigger("tool.execute.before", {...})` fires before
  every tool call), and Kilo's own in-app help text confirms the convention: `.ts` files in
  `.kilo/plugins/` auto-load for event hooks, no config registration needed. Built
  `subtask-gate.ts` on this and verified live end-to-end: committed a change to
  `SESSION_PRIMER.md` → next `write` tool call hard-failed with the plugin's own error message →
  model did not retry, reported progress and asked whether to continue instead. This is the
  capability soulmate-3's "Known gap" said Continue couldn't have; Kilo actually has it.
  `permanent`
- [L06] `subtask-gate.ts`'s original in-memory `Set` did not survive across separate `kilo run`/
  `--continue` invocations — the repo's own documented usage pattern — so the gate silently
  never fired in exactly the scenario it matters most. Found by an independent, fresh, blind
  validation agent running isolated two-process tests (Round 1); L05's own "verified live" claim
  had only ever tested one process handling both steps. Fixed: state persists to
  `.subtask-gate-state.json` next to the plugin file; re-verified with two genuinely separate
  processes. Lesson: "verified live" needs to isolate the actual variable in question — the
  original test proved the *hook fires*, not that it *survives a process boundary*, and those
  are different claims. `permanent`
- [L07] The gate's trigger was 100% elective — it only ever armed if a commit happened to touch
  `wiki/handoffs/SESSION_PRIMER.md`, and nothing forced that commit to exist. An independent
  validation round reproduced a full silent chain (2 files, 2 commits, zero stops, gate never
  armed) — the exact failure this plugin exists to prevent. Fixed: `tool.execute.after` now
  checks the real committed files via `git diff-tree`, not string-matching; N commits in a row
  without touching the primer arms the gate anyway. Verified via direct unit test (3 commits
  pass, 4th blocks) and a real two-process Kilo run (primer-touch path re-confirmed, no
  regression). `permanent`

## Fixed Rules

| Rule | Why |
|---|---|
| Commit per file, not per sub-task or per session — even with no protocol step explicitly invoked | deferring to "when done" loses everything on a session cutoff; the pre-commit hook is a backstop, not a substitute |
| Local reasoning models: disable thinking at the inference server (`llama-server --reasoning off`), not per-request | no per-request reasoning toggle exists for an arbitrary openai-compatible provider — see L04 |
| Never claim a sub-task "done" without actually running its build/typecheck command | code that only imports the right things is not verified — a real session declared two sub-tasks "✅ 완료" with `tsc --noEmit` never once invoked; the bug it would have caught (a zustand store's fields nested under `.state`, accessed as if top-level) sat live for an entire round |

## What's NOT here

Current state, active sub-task, and this session's priorities — see
`wiki/handoffs/SESSION_PRIMER.md` instead. Source-tree layout — see `AGENTS.md`'s File map
instead.

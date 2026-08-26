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
| `scripts/subtask-report.sh` (layer 1) | evidence-only sub-task report (round 34) — reuses the gate's own boundary (a commit touching `SESSION_PRIMER.md`); built entirely from git/test-runner/scanner output, never the model's self-report |
| `scripts/subtask-review-llm.sh` (layer 2) + `scripts/post-commit-subtask-report` | round 36 — fresh, context-free local-model call reads the same range's diff, flags concrete issues layer 1 can't (cited file+line, JSON-only); report-only, findings tagged `[layer2/local-llm, unverified]`, distinct trust level from layer 1's tool output |

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
- **"Round" labels are NOT one counter — two unrelated things share the word.** `SESSION_MASTER.md`
  `## Round N` headers are chronological narrative sections, one per notable same-day event
  (blind-validation or not — "Round 4 — architecture realignment" was Jay-directed doc/config
  work, no blind agent). FEEDBACK_PENDING.md / SESSION_PRIMER.md's "round" usage started as the
  *blind-validation round count* (rounds 1-4, one per fresh-agent test) but shifted meaning around
  round 5 to "objective audit/fix cycle" and, from round 27 on, to "Opus work-order cycle" — 30+
  rounds in as of the round-30 closing pass, no longer 1:1 with a fresh blind agent. The counter
  itself never resets or renumbers; only what one "round" means has evolved.
  These two sequences can and do drift — session 5 hit exactly this collision (two different
  "Round 4"s) and had to disambiguate after the fact with "Round 4 (blind)". When adding a new
  `SESSION_MASTER.md` section for a blind round, name it unambiguously up front (e.g. "Round N
  (blind) — <what it tested>") rather than relying on position in the file.

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

## Local model capability (measured, evergreen reference — not round narrative)

Method/raw evidence: `wiki/rule-archive.md` "Round 34". Numbers below are the standing reference;
update in place as new measurements land, don't append a running log here.

- Complexity ladder, level-independent (own scale, not aider's): 1 file 5/5 · 3 files 4/5 ·
  +refactor 2/4 · +tests 1/2 · multi-sub-task chain 0/1 — self-contained edits hold up; success
  drops once a task requires the model to invent its own state/design/multi-step chaining.
- Aider polyglot benchmark, Python subset only (`Qwen3.6-35B-A3B-UD-Q4_K_M`,
  `--edit-format whole`, aider 0.86.2, 2-attempt protocol, seed 1234, n=23/25 attempted, 2 unrun
  on deadline): **9/23 = 39.1%**. NOT comparable to the published polyglot leaderboard figure
  (that aggregates 6 languages; this is Python-only, and n=23 gives roughly a ±20pp CI).
- Failure pattern, same run: passes cluster on stateless transformations (`list-ops`,
  `pig-latin`, `proverb`, `grep`, `bottle-song`, `zebra-puzzle`); failures cluster on
  self-designed state — interpreters (`forth`), IO wrappers (`paasio`), iteration protocols
  (`simple-linked-list`), state machines (`bowling`, `hangman`), tree restructuring (`pov`).
  **Operational rule this implies: hand the model the data structure + function signatures,
  never ask it to design state.**
- 3 of 9 passes landed only on a 2nd attempt (real failing-test output fed back, retried once) —
  roughly a third of all successes came from that loop, not the first attempt.
- This is why `scripts/subtask-report.sh` exists: deterministic tooling (exit codes, scanners,
  linters, schema checks) handles the bulk at zero cost; the local model gets only genuinely
  open-ended judgment calls; a human sees a filtered short list. Self-report from the model is
  never a verification source.
- Round 36 gave the model one narrow, structurally-safe judgment call: reading a fixed diff and
  emitting a bounded `{file, line, issue}` list. That's a stateless transformation (the shape the
  passes above cluster on), not self-designed state (the shape the failures above cluster on) —
  `scripts/subtask-review-llm.sh` exists on the strength of that distinction, report-only, never a
  blocker.
- Round 37 measured that judgment call's detection rate at n=16 (was n=2): **11/16 (68.75%)**
  hit on single-line semantic/logic defects (flipped comparisons, misapplied operations, wrong
  field/function used) — 11/14 (78.6%) excluding 2 cases confounded by the prompt's own
  "don't invent unseen context" guardrail. Reliably misses defects needing implicit unit/domain
  knowledge (e.g. an unconverted minutes→seconds value) or unseen cross-file schema. Raw evidence:
  `wiki/rule-archive.md` "Round 37".

## What's NOT here

Current state, active sub-task, and this session's priorities — see
`wiki/handoffs/SESSION_PRIMER.md` instead. Learned/Fixed Rules and the File map — see
`AGENTS.md` instead (moved back there to match the original soulmate's proven design: a rule
only referenced from the auto-loaded file, not stated in it, doesn't reliably reach ad-hoc work
— see `wiki/rule-archive.md` L02, soulmate-3's own finding, re-applied here).

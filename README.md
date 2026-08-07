# Soulmate 4 — a memory harness for Kilo Code + local-model hard-context-ceiling tools

> Seeded from [soulmate-3](https://github.com/lvninety9/soulmate-3) on 2026-08-08. Same
> underlying idea (a self-improving session-handoff structure for coding agents, sized for a
> local model behind a hard context ceiling), diverging on delivery mechanism: soulmate-3
> targets Cursor's Continue extension; this repo targets Kilo Code against the same class of
> local model (reference case: Qwen3.6-35B-A3B, RTX 3080 10GB VRAM / 40GB RAM). If you're on
> Continue, use soulmate-3 directly — this repo exists specifically for Kilo's different (and,
> in one important way, *better*) extensibility surface.

## Why this is a separate repo, not a fork/branch of soulmate-3

soulmate-3's own README documents an explicit "Known gap": Continue has no equivalent of
opencode's `tool.execute.before` plugin hook, so nothing can mechanically block a write/edit call
mid-session — only a commit-time git hook, one step later. Live testing kept finding new forms
of the same failure (a local model chaining sub-tasks unprompted, or skipping a doc-handoff step)
no matter how the prose was reworded. This repo exists to test whether a harness with a *real*
mechanical brake does better — and, after checking the actual installed Kilo Code binary rather
than assuming from public docs (which turned out to be stale/contradictory, see
`wiki/rule-archive.md` L01), it turns out Kilo genuinely does inherit opencode's hook system.

## What's actually different from soulmate-3

| | soulmate-3 (Continue) | soulmate-4 (Kilo Code) |
|---|---|---|
| Always-loaded piece | `.continue/rules/00-kernel.md` (`alwaysApply: true`) — `AGENTS.md` there is reference-only | `AGENTS.md` itself (Kilo auto-loads it, hierarchy-aware, confirmed via the CLI binary — L03). No separate kernel file exists |
| Protocol commands | `.continue/prompts/*.md`, real slash commands (`invokable: true`, confirmed via docs.continue.dev) | **Not real slash commands** — verified live with a canary file that the CLI never injects; the model self-serves `wiki/protocols/*.md` on recognizing the word (L02) |
| Mechanical write/edit block | **none** — Continue's own "Known gap" | **Real**: `.kilo/plugins/subtask-gate.ts` via `tool.execute.before`/`after` (L05), verified live against a real project |
| Mechanical commit-time backstop | `pre-commit-check-caps`, the *only* mechanical layer | same script, now a *second* layer behind the plugin |
| Local-model reasoning | not applicable (soulmate-3 never hit this) | Qwen3-family "thinking" can burn an entire turn's output budget with zero result (L04) — fixed at the inference server (`llama-server --reasoning off`), not per-request |
| Learned/Fixed Rules location | inside `AGENTS.md` (never auto-loaded there anyway) | moved to `wiki/PROJECT_BACKGROUND.md` — `AGENTS.md` is now auto-loaded, so it has to stay small on purpose |
| Work sizing | sub-task, pre-split at design time | unchanged |
| Verification | cold-read via a brand-new Continue chat tab | cold-read via a brand-new Kilo session (`kilo run`, fresh) — same caveat about shared kernel loading, not a true subagent |
| wiki/ harness | yes | yes, unchanged in spirit |

## Known gap — read this before trusting anything else here as "enforced"

Custom project slash commands (`.kilo/commands/*.md`) do not actually work yet, as of Kilo Code
v7.4.20 — confirmed live with a canary test (`wiki/rule-archive.md` L02), not assumed from the
"workflows subtab is a stub" line in Kilo's own bundled docs (that line only describes the
*management UI*, and turned out to also be true of the underlying mechanism). This repo's
protocol steps are self-served prose (the model reads `wiki/protocols/*.md` on recognizing a
word like "discuss") — the same shape of gap soulmate-3 has, for a different underlying reason.

Separately, and unlike soulmate-3: `.kilo/plugins/subtask-gate.ts`'s block is **one-shot, not a
permanent lock** — once a sub-task-closing commit lands, the very next mutating tool call fails,
but the gate disarms immediately after. A model that ignores the error text and retries the
exact same call verbatim would get through. `AGENTS.md`'s own "no 3rd verbatim retry" rule is the
only thing discouraging that, and it hasn't been separately stress-tested (see
`wiki/handoffs/FEEDBACK_PENDING.md` #3).

## File tree

```
AGENTS.md                          # the ONLY file Kilo auto-loads every message — kept tight
.kilo/
  plugins/
    subtask-gate.ts                # real mechanical enforcement via tool.execute.before/after
wiki/
  PROJECT_BACKGROUND.md            # entity map, glossary, pipeline, Learned/Fixed Rules
  session-log.md                   # one line per session
  rule-archive.md                  # full evidence behind each Learned Rule
  protocols/
    discuss.md                     # self-served on recognizing the word — no real command
    design.md
    build.md
    verify.md
    self-harness.md
  handoffs/
    SESSION_PRIMER.md              # current state + current sub-task, rewritten every session
    FEEDBACK_PENDING.md            # open issues/gaps
    SESSION_MASTER.md              # full narrative history, read only on request
templates/                        # copy-paste skeletons for adopting this into a new project
scripts/
  bootstrap.sh                     # turnkey new-project setup
  check-caps.sh                    # mechanical cap enforcement (line/row counts)
  pre-commit-check-caps            # second-layer enforcement — see "Known gap"
```

## Bootstrapping a new project with this

Run this as a single copy-paste block — don't clone this repo yourself first and go looking for
the script afterward (the same "clone, then find step 2" failure mode soulmate-2/3 both
documented):

```bash
git clone --quiet https://github.com/lvninety9/soulmate-4 /tmp/soulmate-4-seed \
  && bash /tmp/soulmate-4-seed/scripts/bootstrap.sh <target-directory> \
  && rm -rf /tmp/soulmate-4-seed
```

This gives `<target-directory>` its own fresh git history, `.kilo/plugins/subtask-gate.ts`, the
wiki/ templates copied in, the cap-check pre-commit hook installed, and one commit already made.
Then, by hand:

1. Fill in `<target-directory>/AGENTS.md`'s `[project name]` and real File map rows.
2. Start `wiki/PROJECT_BACKGROUND.md` / `wiki/handoffs/SESSION_PRIMER.md` /
   `wiki/handoffs/FEEDBACK_PENDING.md` for this actual project.
3. Confirm `~/.config/kilo/kilo.jsonc`'s provider config points at the local model you're
   actually running.
4. Confirm that model's inference server has reasoning disabled at the server level if it's a
   reasoning-capable model (e.g. `llama-server --reasoning off` for Qwen3-family models) — see
   `wiki/rule-archive.md` L04 for why this can't be fixed per-request.
5. Run `(cd <target-directory> && scripts/check-caps.sh --bootstrap-check)`.
6. Open `<target-directory>` with Kilo and run `templates/harness-integration-test.md`'s steps —
   **especially Step 5** (the sub-task gate actually blocking a live tool call), which is this
   repo's whole reason for existing over soulmate-3. This hasn't yet been independently verified
   against a project produced by this repo's own `bootstrap.sh` (see
   `wiki/handoffs/FEEDBACK_PENDING.md` #1) — don't assume it works from the docs alone the first
   time you use this.
7. First real session: `design` your first real piece of work before touching any code.

## Preconditions

- Must be a git repository — "commit every sub-task" underpins the whole protocol.
- Needs Kilo Code installed, pointed at a local model server (`~/.config/kilo/kilo.jsonc`'s
  `provider` field, an `@ai-sdk/openai-compatible` entry pointing at something like
  `llama-server`).
- `.kilo/plugins/*.ts` auto-discovery is a Kilo CLI feature (confirmed via the CLI's own in-app
  help text) — it should apply identically whether Kilo is driven via the VS Code/Cursor
  extension or the raw `kilo` CLI, since both spawn the same CLI backend for tool execution.
- Assumes single-writer, same as soulmate/soulmate-2/3 — no locking on the handoff files.
- Does assume a real mid-session write-blocking hook exists (unlike soulmate-3) — but see "Known
  gap" for its actual limits (one-shot, not a permanent lock).

## Relationship to soulmate-3

This repo does not track soulmate-3 as an upstream — seeded once, diverges freely from here.
Improvements genuinely tool-agnostic (a caps rationale, a Learned Rule not Continue/Kilo-
specific) are worth porting back manually in either direction; the delivery mechanism itself is
not, and shouldn't be forced onto either baseline.

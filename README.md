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
| Learned/Fixed Rules location | inside `AGENTS.md` (never auto-loaded there anyway) | inline in `AGENTS.md` too (moved out to `wiki/PROJECT_BACKGROUND.md` briefly, then merged back — since `AGENTS.md` is auto-loaded here, keeping rules elsewhere risked a rule being referenced but never actually loaded; session-4 architecture realignment, see `wiki/rule-archive.md`) |
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

Separately, and unlike soulmate-3: `.kilo/plugins/subtask-gate.ts` really does mechanically block
a write/edit call mid-session. An earlier version of this gate had a real retry-bypass bug — an
immediate verbatim retry of the exact same blocked call slipped through unconditionally, because
the gate disarmed itself the instant the *first* block fired, not when the user actually responded
to it. That's fixed (round 8): the gate now only clears on a genuinely new user message, matching
what the block's own error text asks for. Independently re-verified live 3 separate times since
(rounds 8, 9, 10) — see the closed entry in `wiki/handoffs/FEEDBACK_PENDING.md`'s completed
history for the evidence trail. What's still genuinely open: `discuss.md` self-serve failures
(#4), the model's own self-report after a block can't be trusted without checking real file/git
state (#6), and `discuss.md` has no mechanical backstop at all since it produces zero tool calls
(#12) — see `wiki/handoffs/FEEDBACK_PENDING.md` for current status on all of these.

## File tree

```
AGENTS.md                          # the ONLY file Kilo auto-loads every message — Learned/Fixed
                                    #   Rules + File map live here too, kept tight
.kilo/
  plugins/
    subtask-gate.ts                # real mechanical enforcement, tool.execute.before/after/chat.message
wiki/
  PROJECT_BACKGROUND.md            # entity map, glossary, pipeline, numbering legend
  session-log.md                   # one line per session
  rule-archive.md                  # full evidence behind each Learned Rule
  rule-archive-archive.md          # oldest rule-archive.md entries, moved out once WATCHed
  protocols/
    discuss.md                     # self-served on recognizing the word — no real command
    design.md
    build.md
    verify.md
    refactor.md                    # shrinking/reorganizing existing code — composes with build
    self-harness.md
  handoffs/
    SESSION_PRIMER.md              # current state + current sub-task, rewritten every session
    FEEDBACK_PENDING.md            # open issues/gaps
    SESSION_MASTER.md              # full narrative history ("why"), read only on request
    SESSION_MASTER-archive.md      # oldest SESSION_MASTER.md sections, moved out once WATCHed
templates/                        # copy-paste skeletons for adopting this into a new project
tests/
  subtask-gate.test.mjs            # unit tests for the sub-task gate, run before trusting a fix
  stale-language.fuzz.test.mjs     # regression net for check-caps.sh's stale-language sweep (below)
  subtask-report.test.mjs          # regression net for the sub-task report generator (below)
  subtask-review-llm.test.mjs      # regression net for the layer-2 local-model diff review (below)
scripts/
  bootstrap.sh                     # turnkey new-project setup
  check-caps.sh                    # mechanical cap enforcement (line/row counts + a stale-language
                                    #   sweep — flags mechanism-state claims like "known gap"/"not
                                    #   yet verified" outside historical-narrative files, so a doc
                                    #   can't silently go stale about what's actually fixed)
  pre-commit-check-caps            # second-layer enforcement — see "Known gap"
  subtask-report.sh                # layer 1, evidence-only: git diff/log, whichever test/lint/
                                    #   secret scanner the target project actually has, never the
                                    #   model's own recollection — stack-agnostic, runnable by hand
  subtask-review-llm.sh            # layer 2, local-model diff review: a fresh, context-free call
                                    #   to the local model reads the same range's actual diff and
                                    #   flags concrete defects (cited file+line) tools can't catch —
                                    #   report-only, tagged distinctly from layer 1, never blocking
  lib/subtask-range.sh             # sub-task boundary/range resolution shared by both layers —
                                    #   not a second, invented definition
  post-commit-subtask-report       # optional hook: fires both layers on a commit that touches
                                    #   wiki/handoffs/SESSION_PRIMER.md — the same sub-task
                                    #   boundary subtask-gate.ts's computeBoundary() already uses
```

## The A–D self-diagnosis pattern (for any recurring subsystem)

If the project has subsystems that need to "measure performance and improve themselves" (content
generation, a recommendation engine, a pricing pipeline — anything), make them all follow the same
4-stage shape instead of redesigning a feedback loop each time:

- **A (collect)**: snapshot performance data periodically (e.g. weekly)
- **B (detect)**: auto-flag trend anomalies (quality drop, a specific check repeatedly failing,
  underperformance)
- **C (analyze)**: compare high vs. low performers → summarize → write actionable guidance to
  `wiki/subsystems/<name>-learnings.md` — use
  [`templates/SUBSYSTEM-learnings.md.template`](templates/SUBSYSTEM-learnings.md.template) to
  start one, it's the one concrete artifact this pattern produces. If data is insufficient, don't
  force a conclusion — keep the previous guidance (implement as a state cache)
- **D (apply)**: the next generation/run automatically reads C's output — a closed
  explore→learn→apply loop that needs no human reconfiguration. If the choice space is small and
  discrete, epsilon-greedy is a reasonable default (~85-90% current best guidance, ~10-15% next-
  best, so the system keeps generating comparison data) — but a simple "always apply latest
  guidance" D is fine if you don't need the exploration.

**Worked example, outside the content domain** (a used-bookstore inventory system's buy-price
pricing engine): A — weekly snapshot of buy price vs. actual resale price/days-in-inventory per
category. B — auto-flag a category (e.g. textbooks) whose loss rate crosses a threshold. C —
compare fast- vs. slow-turnover categories → write to `wiki/subsystems/pricing-learnings.md`:
`Category "textbooks": lower buy price 12% — resale ratio below break-even for 3 snapshots.` D —
the next pricing run automatically applies that adjustment factor.

"Weekly" and the flagging threshold in B are **per-subsystem tunables, not fixed constants** —
record cadence/threshold at the top of that subsystem's own `-learnings.md` file (not in
`AGENTS.md`'s Fixed Rules, which is for project-wide invariants), so each subsystem's tuning is
self-contained and can drift independently. This is a generic "measure → detect → analyze →
auto-apply" skeleton — low domain-specificity, fits anywhere there's repeated execution with a
measurable outcome.

## Bootstrapping a new project with this

Run this as a single copy-paste block — don't clone this repo yourself first and go looking for
the script afterward (the same "clone, then find step 2" failure mode soulmate-2/3 both
documented):

```bash
git clone --quiet https://github.com/lvninety9/soulmate-4 /tmp/soulmate-4-seed \
  && bash /tmp/soulmate-4-seed/scripts/bootstrap.sh <target-directory>
rm -rf /tmp/soulmate-4-seed
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
   repo's whole reason for existing over soulmate-3. This has been independently verified against
   a real project produced by this repo's own `bootstrap.sh` (rounds 9 and 10 each did a real
   fresh bootstrap + live `kilo run` gate test) — but the sequence is worth running yourself once
   rather than assuming it works from the docs alone the first time you use this.
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

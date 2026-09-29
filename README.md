# Soulmate 4 — a Kilo Code harness for local models

Soulmate 4 turns a broad project request into small, testable sub-tasks. `AGENTS.md` supplies
the workflow to Kilo automatically; `.kilo/plugins/subtask-gate.ts` enforces the handoff after
each sub-task. The reference setup is Qwen3.6-35B-A3B with a 65,536-token context.

## How the workflow is enforced

Custom project slash commands are not required; Kilo reads `AGENTS.md`, and the agent reads the
matching `wiki/protocols/*.md` file for the current step. The sub-task gate blocks mutation
after a handoff commit. The full live evidence and remaining limitations are in
`wiki/rule-archive.md` and `wiki/handoffs/FEEDBACK_PENDING.md`.

### Waiving a checkpoint you are already looking at

Closing a sub-task arms a checkpoint, and the next turn's mutating calls are refused. That is the
point of the gate, but it used to cost a whole round trip even when you knew exactly what you were
asking for: 11 of one real project's 95 user turns began with a checkpoint standing and ended with
nothing done, and the *next* message — any next message — let the identical work through.

Include the exact text `[gate-ok]` anywhere in a message and it waives the one checkpoint that was
already standing when you sent it. Nothing else: it cannot pre-approve a checkpoint the model
creates later in that same turn, it does not carry to the next one, and the model cannot type it for
itself. Leave it out and the gate behaves exactly as it always has. The plugin tells you about it in
the standing-checkpoint notice, so you do not have to remember it — but every use is a deliberate
decision to skip a stop you asked for, so use it when you mean it, not by reflex.

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
    discuss.md                     # read when a required decision is missing
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
  pre-commit-check-caps            # second-layer enforcement for file and doc limits
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

Bootstrap a new project with one command:

```bash
curl -fsSL https://raw.githubusercontent.com/lvninety9/soulmate-4/master/scripts/bootstrap.sh \
  | bash -s -- <target-directory>
```

This gives `<target-directory>` its own fresh git history, `.kilo/plugins/subtask-gate.ts`, the
wiki/ templates copied in, the cap-check pre-commit hook installed, and one commit already made.
The bootstrap names `AGENTS.md` from the target directory. Open that directory in Cursor,
reload the Cursor window once so Kilo loads the new project plugin, then describe the project in
one ordinary message; Kilo should plan before writing code.
Confirm `~/.config/kilo/kilo.jsonc` points at the running model and its inference server has
reasoning disabled. Run `(cd <target-directory> && scripts/check-caps.sh --bootstrap-check)`.
For a full live check, follow `templates/harness-integration-test.md`.

**Context budget for the 65,536-token local setup:** size each planned sub-task for at most
45,000 tokens including a 10,000-token contingency and no more than two implementation files.
The plugin reads Kilo's `message.updated` usage events, warns at 45,000 and blocks new
`write`/`edit` calls outside the primer at 50,000. It still permits a handoff and git commit.
This path has unit tests; live Kilo behavior remains to be checked. Shell commands can still
modify files, and neither the plugin nor the context indicator can prevent compaction itself.
A new sub-task starts in a fresh session from the primer and git facts.

At design time the agent records one observable acceptance check per sub-task. The user can
describe the project in ordinary language; acceptance criteria belong in the saved plan, so
later build turns do not have to reconstruct them from memory or a diff.

## Preconditions

- Must be a git repository — "commit every sub-task" underpins the whole protocol.
- Needs Kilo Code installed, pointed at a local model server (`~/.config/kilo/kilo.jsonc`'s
  `provider` field, an `@ai-sdk/openai-compatible` entry pointing at something like
  `llama-server`).
- `.kilo/plugins/*.ts` auto-discovery is a Kilo CLI feature (confirmed via the CLI's own in-app
  help text) — it should apply identically whether Kilo is driven via the VS Code/Cursor
  extension or the raw `kilo` CLI, since both spawn the same CLI backend for tool execution.
- Assumes a single writer — no locking on the handoff files.
- Assumes a real mid-session write-blocking hook exists; the gate is a checkpoint and its
  behavior and limits are described above.

// subtask-gate.ts — mechanical sub-task checkpoint (soulmate-4's flagship capability)
//
// Prose alone ("checkpoint after each sub-task, ask before continuing") doesn't reliably hold
// under real load — soulmate-2/3 both document this repeating in new forms no matter how the
// prompt is worded. Kilo's CLI inherits opencode's tool.execute.* hook (confirmed by reading the
// compiled binary — soulmate-3's "Known gap" about Continue lacking this does NOT apply to
// Kilo), so this uses it as a real, non-prose brake instead of one more reworded reminder.
//
// Rule: a bash call that commits wiki/handoffs/SESSION_PRIMER.md marks a sub-task boundary. The
// very next mutating tool call after that lands is rejected once, forcing the turn to stop with
// an explicit failure instead of silently starting the next sub-task. One block per commit — it
// is not a permanent lock, and a determined immediate retry can still slip through (AGENTS.md's
// own "no verbatim 3rd retry" rule discourages that anyway).
//
// Auto-loaded by Kilo from .kilo/plugins/*.ts — no config.jsonc registration needed.

const armed = new Set<string>()
const recentlyStagedPrimer = new Set<string>()

const TOUCHES_PRIMER = /wiki\/handoffs\/SESSION_PRIMER\.md/
const IS_GIT_ADD = /git\s+add\b/
const IS_GIT_COMMIT = /git\s+commit\b/
const MUTATING_TOOLS = new Set(["write", "edit", "bash", "patch", "multiedit", "task"])

const BLOCK_MESSAGE =
  "[subtask-gate] wiki/handoffs/SESSION_PRIMER.md was just committed — that closes out a " +
  "sub-task. Per AGENTS.md, STOP now: do not start the next sub-task or run any further tool " +
  "call. Summarize what was just done and ask the user whether to continue."

export const SubtaskGate = async () => ({
  "tool.execute.before": async (input: any, output: any) => {
    const tool = input?.tool
    const sessionID = input?.sessionID
    if (!sessionID) return

    if (armed.has(sessionID) && MUTATING_TOOLS.has(tool)) {
      armed.delete(sessionID)
      throw new Error(BLOCK_MESSAGE)
    }

    if (tool !== "bash") return
    const cmd = String(output?.args?.command ?? "")

    if (IS_GIT_ADD.test(cmd) && TOUCHES_PRIMER.test(cmd)) {
      recentlyStagedPrimer.add(sessionID)
    }

    if (IS_GIT_COMMIT.test(cmd)) {
      if (TOUCHES_PRIMER.test(cmd) || recentlyStagedPrimer.has(sessionID)) {
        armed.add(sessionID)
        recentlyStagedPrimer.delete(sessionID)
      }
    }
  },
})

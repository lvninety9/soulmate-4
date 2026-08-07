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
// State is persisted to disk (.subtask-gate-state.json, next to this file), not held in memory
// — an independent blind test proved a plain in-memory Set does not survive across separate
// `kilo run`/`--continue` invocations, which is this repo's own documented usage pattern
// ("the next build — ideally in a fresh session"). Round 1 validation, see
// wiki/rule-archive.md L06. Bun/Node's sync fs calls are fine here: state is a few bytes, one
// user, no meaningful concurrency to race against.
//
// Auto-loaded by Kilo from .kilo/plugins/*.ts — no config.jsonc registration needed.

import { existsSync, readFileSync, writeFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const PLUGIN_DIR = (() => {
  try {
    // Bun/ESM: import.meta.url is always available for the executing module.
    return dirname(fileURLToPath(import.meta.url))
  } catch {
    return join(process.cwd(), ".kilo", "plugins")
  }
})()
const STATE_FILE = join(PLUGIN_DIR, ".subtask-gate-state.json")

type State = { armed: Record<string, true>; stagedPrimer: Record<string, true> }

function loadState(): State {
  try {
    if (existsSync(STATE_FILE)) {
      const parsed = JSON.parse(readFileSync(STATE_FILE, "utf8"))
      return { armed: parsed.armed ?? {}, stagedPrimer: parsed.stagedPrimer ?? {} }
    }
  } catch {
    // Corrupt/unreadable state file: fail open (treat as unarmed) rather than crash the hook.
  }
  return { armed: {}, stagedPrimer: {} }
}

function saveState(state: State) {
  try {
    writeFileSync(STATE_FILE, JSON.stringify(state))
  } catch {
    // Best-effort persistence — a write failure here should not break the tool call itself.
  }
}

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

    const state = loadState()

    if (state.armed[sessionID] && MUTATING_TOOLS.has(tool)) {
      delete state.armed[sessionID]
      saveState(state)
      throw new Error(BLOCK_MESSAGE)
    }

    if (tool !== "bash") return
    const cmd = String(output?.args?.command ?? "")
    let changed = false

    if (IS_GIT_ADD.test(cmd) && TOUCHES_PRIMER.test(cmd)) {
      state.stagedPrimer[sessionID] = true
      changed = true
    }

    if (IS_GIT_COMMIT.test(cmd) && (TOUCHES_PRIMER.test(cmd) || state.stagedPrimer[sessionID])) {
      state.armed[sessionID] = true
      delete state.stagedPrimer[sessionID]
      changed = true
    }

    if (changed) saveState(state)
  },
})

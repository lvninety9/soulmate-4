// subtask-gate.ts — mechanical sub-task checkpoint (soulmate-4's flagship capability)
//
// Prose alone ("checkpoint after each sub-task, ask before continuing") doesn't reliably hold
// under real load — soulmate-2/3 both document this repeating in new forms no matter how the
// prompt is worded. Kilo's CLI inherits opencode's tool.execute.* hook (confirmed by reading the
// compiled binary — soulmate-3's "Known gap" about Continue lacking this does NOT apply to
// Kilo), so this uses it as a real, non-prose brake instead of one more reworded reminder.
//
// Two independent blind-validation rounds shaped this file's current design — both fixes are
// load-bearing, not decorative:
//
// Round 1: a plain in-memory Set does not survive across separate `kilo run`/`--continue`
// invocations, which is this repo's own documented usage pattern ("the next build — ideally in
// a fresh session"). Fixed by persisting state to disk. wiki/rule-archive.md L06.
//
// Round 2: the gate's trigger was 100% elective — it only ever armed if a commit happened to
// touch wiki/handoffs/SESSION_PRIMER.md, and nothing forced that. A validation agent reproduced
// a full silent multi-sub-task chain (two files, two commits, zero stops) with the gate never
// arming at all — the exact failure this plugin exists to prevent. Fixed by also counting real
// commits (via `git diff-tree`, not string-matching the bash command) since the last commit
// that touched SESSION_PRIMER.md; crossing a threshold arms the gate even with no primer touch
// at all. wiki/rule-archive.md L07.
//
// State is persisted to .subtask-gate-state.json, next to this file. Bun/Node's sync fs/exec
// calls are fine here: state is a few bytes, one user, no meaningful concurrency to race
// against.
//
// Auto-loaded by Kilo from .kilo/plugins/*.ts — no config.jsonc registration needed.

import { existsSync, readFileSync, writeFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { execSync } from "child_process"

const PLUGIN_DIR = (() => {
  try {
    return dirname(fileURLToPath(import.meta.url))
  } catch {
    return join(process.cwd(), ".kilo", "plugins")
  }
})()
const STATE_FILE = join(PLUGIN_DIR, ".subtask-gate-state.json")
const PROJECT_ROOT = dirname(dirname(PLUGIN_DIR)) // .kilo/plugins -> .kilo -> project root

// A single sub-task legitimately spans several per-file commits before its last file's commit
// also updates SESSION_PRIMER.md (build.md step 3) — this is not a universal constant, tune to
// how large your project's real sub-tasks tend to run.
const COMMITS_WITHOUT_PRIMER_THRESHOLD = 4

type ArmReason = "primer" | "elective"
type State = {
  armed: Record<string, ArmReason>
  commitsSincePrimer: Record<string, number>
}

function loadState(): State {
  try {
    if (existsSync(STATE_FILE)) {
      const parsed = JSON.parse(readFileSync(STATE_FILE, "utf8"))
      return { armed: parsed.armed ?? {}, commitsSincePrimer: parsed.commitsSincePrimer ?? {} }
    }
  } catch {
    // Corrupt/unreadable state file: fail open (unarmed) rather than crash the hook.
  }
  return { armed: {}, commitsSincePrimer: {} }
}

function saveState(state: State) {
  try {
    writeFileSync(STATE_FILE, JSON.stringify(state))
  } catch {
    // Best-effort persistence — a write failure here should not break the tool call itself.
  }
}

function filesInLastCommit(): string[] {
  try {
    const out = execSync("git diff-tree --no-commit-id --name-only -r HEAD", {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
    return out.split("\n").filter(Boolean)
  } catch {
    return []
  }
}

const IS_GIT_COMMIT = /git\s+commit\b/
const MUTATING_TOOLS = new Set(["write", "edit", "bash", "patch", "multiedit", "task"])

const BLOCK_MESSAGE_COMMIT =
  "[subtask-gate] wiki/handoffs/SESSION_PRIMER.md was just committed — that closes out a " +
  "sub-task. Per AGENTS.md, STOP now: do not start the next sub-task or run any further tool " +
  "call. Summarize what was just done and ask the user whether to continue."

const BLOCK_MESSAGE_ELECTIVE = (n: number) =>
  `[subtask-gate] ${n} commits have landed without any of them touching ` +
  "wiki/handoffs/SESSION_PRIMER.md — a sub-task boundary was never marked, but this many " +
  "commits in a row almost certainly means one was crossed anyway. Per AGENTS.md, STOP now: " +
  "update wiki/handoffs/SESSION_PRIMER.md's Current sub-task block, commit it, then ask the " +
  "user whether to continue."

export const SubtaskGate = async () => ({
  "tool.execute.before": async (input: any, output: any) => {
    const tool = input?.tool
    const sessionID = input?.sessionID
    if (!sessionID) return

    const state = loadState()

    const reason = state.armed[sessionID]
    if (reason && MUTATING_TOOLS.has(tool)) {
      delete state.armed[sessionID]
      const n = state.commitsSincePrimer[sessionID] ?? 0
      state.commitsSincePrimer[sessionID] = 0
      saveState(state)
      throw new Error(reason === "primer" ? BLOCK_MESSAGE_COMMIT : BLOCK_MESSAGE_ELECTIVE(n))
    }
    // Arming happens in tool.execute.after below, once a commit has actually landed.
  },

  "tool.execute.after": async (input: any) => {
    const tool = input?.tool
    const sessionID = input?.sessionID
    const cmd = String(input?.args?.command ?? "")
    if (!sessionID || tool !== "bash" || !IS_GIT_COMMIT.test(cmd)) return

    const files = filesInLastCommit()
    if (files.length === 0) return // not actually a git repo, or the commit failed — don't guess

    const state = loadState()
    const touchedPrimer = files.some((f) => f === "wiki/handoffs/SESSION_PRIMER.md")

    if (touchedPrimer) {
      state.armed[sessionID] = "primer"
      state.commitsSincePrimer[sessionID] = 0
    } else {
      const n = (state.commitsSincePrimer[sessionID] ?? 0) + 1
      state.commitsSincePrimer[sessionID] = n
      if (n >= COMMITS_WITHOUT_PRIMER_THRESHOLD) {
        state.armed[sessionID] = "elective"
      }
    }
    saveState(state)
  },
})

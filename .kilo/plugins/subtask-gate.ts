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
// Round 4: refactor.md's self-serve premise (the model reads wiki/protocols/*.md on recognizing
// a task's shape) never fired at all, in 3/3 independent blind trials — and because a real
// refactor task reliably lands in 0-1 commits, the two gates above never got a chance to arm
// either (both only ever fire *after* a commit lands). Fixed by adding a third, earlier check:
// a session's first mutating tool call is blocked unless at least one wiki/protocols/*.md file
// has been read this session. Same one-shot-not-a-lock trade-off as the other two checks
// (AGENTS.md's "Edit discipline" explicitly allows an ad-hoc fix before any protocol step, so
// this can't be a hard, unretriable lock either) — it forces a pause and a nudge, not a
// guarantee. wiki/rule-archive.md L09.
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
  lastSeenHead: Record<string, string>
  protocolDocRead: Record<string, boolean>
  firstMutationChecked: Record<string, boolean>
}

function loadState(): State {
  try {
    if (existsSync(STATE_FILE)) {
      const parsed = JSON.parse(readFileSync(STATE_FILE, "utf8"))
      return {
        armed: parsed.armed ?? {},
        commitsSincePrimer: parsed.commitsSincePrimer ?? {},
        lastSeenHead: parsed.lastSeenHead ?? {},
        protocolDocRead: parsed.protocolDocRead ?? {},
        firstMutationChecked: parsed.firstMutationChecked ?? {},
      }
    }
  } catch {
    // Corrupt/unreadable state file: fail open (unarmed) rather than crash the hook.
  }
  return { armed: {}, commitsSincePrimer: {}, lastSeenHead: {}, protocolDocRead: {}, firstMutationChecked: {} }
}

function saveState(state: State) {
  try {
    writeFileSync(STATE_FILE, JSON.stringify(state))
  } catch {
    // Best-effort persistence — a write failure here should not break the tool call itself.
  }
}

function currentHead(): string | null {
  try {
    return execSync("git rev-parse HEAD", {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
  } catch {
    return null // not a git repo (yet) — don't guess
  }
}

function filesInCommit(sha: string): string[] {
  try {
    const out = execSync(`git diff-tree --no-commit-id --name-only -r ${sha}`, {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
    return out.split("\n").filter(Boolean)
  } catch {
    return []
  }
}

const MUTATING_TOOLS = new Set(["write", "edit", "bash", "patch", "multiedit", "task"])

// Matches an absolute or relative path ending in wiki/protocols/<name>.md — deliberately not
// anchored to session cwd, since the "read" tool's args.filePath is absolute in practice (round
// 4's exported transcripts confirm this). Only checks the "read" tool's args, same as round 4's
// own detection method (kilo export's tool-call list) — a "cat"/"less" on the same path via
// "bash" wouldn't be caught here, a known, accepted gap rather than reintroducing L08's
// regex-on-bash-text mistake to close it.
const PROTOCOL_DOC_PATTERN = /wiki\/protocols\/[^/]+\.md$/

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

const BLOCK_MESSAGE_NO_PROTOCOL_READ =
  "[subtask-gate] This is this session's first mutating tool call, and no wiki/protocols/*.md " +
  "file has been read yet this session. Per AGENTS.md's Protocol table, read the doc matching " +
  "this task's shape first (discuss/design/build/verify/refactor/self-harness) — then retry."

export const SubtaskGate = async () => ({
  "tool.execute.before": async (input: any, output: any) => {
    const tool = input?.tool
    const sessionID = input?.sessionID
    if (!sessionID) return

    const state = loadState()
    let dirty = false

    if (tool === "read") {
      const filePath: string | undefined = output?.args?.filePath
      if (filePath && PROTOCOL_DOC_PATTERN.test(filePath.replace(/\\/g, "/"))) {
        if (!state.protocolDocRead[sessionID]) {
          state.protocolDocRead[sessionID] = true
          dirty = true
        }
      }
    }

    const reason = state.armed[sessionID]
    if (reason && MUTATING_TOOLS.has(tool)) {
      delete state.armed[sessionID]
      const n = state.commitsSincePrimer[sessionID] ?? 0
      state.commitsSincePrimer[sessionID] = 0
      saveState(state)
      throw new Error(reason === "primer" ? BLOCK_MESSAGE_COMMIT : BLOCK_MESSAGE_ELECTIVE(n))
    }

    // L09: the two post-commit checks above never get a chance to fire for a refactor that
    // lands in 0-1 commits, and the self-serve premise never fired either — so check this one
    // step earlier, before the session's first mutation, instead of after its first commit.
    if (MUTATING_TOOLS.has(tool) && !state.firstMutationChecked[sessionID]) {
      state.firstMutationChecked[sessionID] = true
      const readProtocol = state.protocolDocRead[sessionID] === true
      saveState(state)
      if (!readProtocol) {
        throw new Error(BLOCK_MESSAGE_NO_PROTOCOL_READ)
      }
      return
    }

    if (dirty) saveState(state)
    // Arming (the two checks above) happens in tool.execute.after below, once a commit has
    // actually landed.
  },

  // Runs after every tool call, not just ones that look like a commit — round 3's blind
  // validation found the old regex (matching the literal string "git commit" in the bash
  // command) both a false positive (an `echo` merely mentioning "git commit" was misread as a
  // real commit) and a false negative (a commit made via an alias/wrapper, not that literal
  // text, was invisible to the counter). Comparing the actual git HEAD before/after is the same
  // amount of code and immune to both — it doesn't care what command produced the commit.
  "tool.execute.after": async (input: any) => {
    const sessionID = input?.sessionID
    if (!sessionID) return

    const head = currentHead()
    if (!head) return // not a git repo (yet) — nothing to compare

    const state = loadState()
    const previousHead = state.lastSeenHead[sessionID]
    state.lastSeenHead[sessionID] = head

    if (!previousHead || previousHead === head) {
      saveState(state) // first observation this session, or no new commit — just record HEAD
      return
    }

    const files = filesInCommit(head)
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

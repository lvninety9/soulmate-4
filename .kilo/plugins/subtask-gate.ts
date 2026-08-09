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
// Round 8 (FEEDBACK #3): the primer/elective gate (the one armed by tool.execute.after below,
// not L09's protocol-read gate) cleared itself the instant its first post-arm mutating call was
// blocked — so an immediate retry, verbatim or not, of a mutating call sailed through completely
// unchecked right after. Fixed by moving the clear out of tool.execute.before entirely and into
// chat.message, keyed on a genuinely new user message arriving (the only mechanical proxy
// available for "the user was actually asked and responded" to the block message's own "ask the
// user whether to continue" instruction). wiki/rule-archive.md L11 (see there for the live
// kilo run re-verification this needed, same as every prior round's fixes).
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
      }
    }
  } catch {
    // Corrupt/unreadable state file: fail open (unarmed) rather than crash the hook.
  }
  return { armed: {}, commitsSincePrimer: {}, lastSeenHead: {}, protocolDocRead: {} }
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

function gitPorcelainStatus(): string[] {
  try {
    const out = execSync("git status --porcelain", {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
    return out.split("\n").filter(Boolean)
  } catch {
    return []
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

// Round 8 (audit, FEEDBACK #3): the primer/elective gate just below used to clear
// `state.armed[sessionID]` the moment the *first* post-arm mutating call was blocked — so an
// immediate retry (verbatim or not) of that same blocked call sailed through completely
// unchecked, because by the time it arrived `reason` was already gone. This is a different bug
// from L09's (round 5) "different mutation after block" gap, which is already closed — this one
// is "any mutating call at all, right after the one that got blocked." The block message itself
// says to stop and ask the user whether to continue — the only mechanical proxy available for
// "the user was actually asked and responded" is a genuinely new user message arriving, which is
// exactly what `chat.message` fires on (see that hook below). So the arm now only clears there,
// never inside `tool.execute.before` — every mutating call stays blocked for the rest of this
// turn (and any further turns) until a new message starts. Honest limitation, same class as the
// carryover-warning hook's own stated one: a new message is evidence a turn ended and control
// returned to a human, not literal proof the human read the stop-and-ask text — round 8's own
// audit didn't independently re-test FEEDBACK #3 live (code-read only), so this needs a live
// `kilo run` re-verification, same as every other round's fixes have required.
//
// Round 7(audit, FEEDBACK #4/#12): live-tested that L09's gate guarantees *some*
// wiki/protocols/*.md gets read before any mutation, but has zero mechanism routing an
// ambiguous ask specifically to discuss.md — a real live trial ("this feels slow when I use it
// a lot, can you help?") went straight to refactor.md and committed with zero clarifying
// questions. discuss.md is the one protocol step with no tool calls at all (pure Q&A), so no
// tool.execute hook can ever reach it — chat.message is the only available surface. This is a
// coarse heuristic, not a real ambiguity classifier: nudge only, never blocks (chat.message
// can't block), and is expected to both under- and over-fire — stated honestly, not claimed as
// solved. "Concrete anchor" = backtick-quoted code, a file-extension-like token, or a quoted
// string; a message with none of those and more than a greeting's worth of text gets nudged.
const AMBIGUITY_ANCHOR_PATTERN = /`[^`]+`|\.\w{1,5}\b|"[^"]+"|'[^']+'/
function looksAmbiguous(text: string): boolean {
  // live-verified bug (round 7): `kilo run "<message>"` stores the message with a literal
  // wrapping quote pair as part of the text content itself (confirmed via a debug log on the
  // real chat.message payload, not assumed) — that pair matched the "quoted string" anchor on
  // every single CLI-driven message, so the nudge could never fire in the CLI's own normal
  // invocation shape. Strip one real wrapping pair before checking for actual anchors.
  let trimmed = text.trim()
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    trimmed = trimmed.slice(1, -1).trim()
  }
  if (trimmed.length < 15) return false // greeting-length messages: not enough signal either way
  return !AMBIGUITY_ANCHOR_PATTERN.test(trimmed)
}

// Round 8 (FEEDBACK #4/#12): the round-7 wording gave the model an explicit escape hatch
// ("ignore if the task is genuinely clearly-scoped") — live-reproduced 3/3 across rounds 7-8
// that the model just decides for itself the task is clear and proceeds straight to action,
// including once directly editing this very plugin file based on a self-generated
// interpretation of an ambiguous "this feels slow" prompt, without asking anything. Reworded to
// a direct imperative with no self-granted opt-out, still honestly a nudge (chat.message cannot
// force real Q&A or block a "build"-shaped response) — needs its own live re-trial, this is not
// assumed to fix the underlying ceiling.
const NUDGE_MESSAGE_POSSIBLY_AMBIGUOUS =
  "[subtask-gate] STOP before doing anything else. This message names no specific file, " +
  "function, or concrete target. Do not assume an interpretation and proceed — ask the user " +
  "1-2 clarifying questions to pin down scope, or explicitly self-serve " +
  "wiki/protocols/discuss.md, before any build/refactor/edit action."

const BLOCK_MESSAGE_UNCOMMITTED_CARRYOVER = (files: string[]) =>
  "[subtask-gate] Uncommitted changes are already sitting in the working tree from before this " +
  `message started (${files.length} path(s): ${files.slice(0, 5).join(", ")}` +
  `${files.length > 5 ? ", ..." : ""}). Per AGENTS.md's "commit per file, always" rule, commit ` +
  "or explicitly decide what to do with these before starting any new work this turn."

const BLOCK_MESSAGE_NO_PROTOCOL_READ =
  "[subtask-gate] No wiki/protocols/*.md file has been read yet this session, and mutating " +
  "tool calls stay blocked until one is. Per AGENTS.md's Protocol table, read the doc matching " +
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

    // FEEDBACK #3 (round 8): deliberately does NOT clear state.armed[sessionID] here anymore —
    // see the comment above the "chat.message" hook's clearing logic for why. Every mutating
    // call while armed gets blocked, retry or not, same call or different, until a new user
    // message actually arrives.
    const reason = state.armed[sessionID]
    if (reason && MUTATING_TOOLS.has(tool)) {
      if (dirty) saveState(state)
      const n = state.commitsSincePrimer[sessionID] ?? 0
      throw new Error(reason === "primer" ? BLOCK_MESSAGE_COMMIT : BLOCK_MESSAGE_ELECTIVE(n))
    }

    // L09 (round 4), strengthened (round 5, after an independent objective audit reproduced a
    // real gap live): the two post-commit checks above never get a chance to fire for a
    // refactor that lands in 0-1 commits, and the self-serve premise never fired either — so
    // check this one step earlier, before any mutation, instead of after a commit. The
    // original version only checked the session's *first* mutating call and then never again —
    // the audit reproduced a live session where the model's first write was blocked, it never
    // actually read a protocols doc, and its very next write (a different file, not a retry of
    // the same call) sailed through unchecked for the rest of the session. Now blocks *every*
    // mutating call, not just the first, until a real `wiki/protocols/*.md` read is observed —
    // then never blocks for this reason again this session. Unlike the primer/elective gate
    // above, this one never had a retry-bypass gap: there's no one-shot clearing here to exploit
    // in the first place, since the lock only ever lifts on actual compliance (a real read), not
    // on the mere passage of one blocked attempt — round 8's audit confirmed FEEDBACK #3's
    // "verbatim retry slips through" gap was specifically in the primer/elective gate, not here.
    if (MUTATING_TOOLS.has(tool) && !state.protocolDocRead[sessionID]) {
      saveState(state)
      throw new Error(BLOCK_MESSAGE_NO_PROTOCOL_READ)
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

  // Round 5, after an independent objective audit's highest-priority finding: a live session
  // wrote and manually tested a real file, then simply stopped — no further tool call, no
  // commit, and nothing above could catch it, because every check so far only fires inside
  // `tool.execute.before`/`after`, and neither runs again if the model just ends its turn.
  // opencode's plugin API (confirmed by reading @kilocode/plugin's own type definitions — the
  // package Kilo 7.4.20 actually loads, a separate published fork of the opencode plugin API,
  // not @opencode-ai/plugin itself; same L01-style "check the actual binary/types, not assumed
  // docs" discipline) has no
  // end-of-turn/end-of-session hook at all — `chat.message` (fires when a *new* message starts)
  // is the closest available thing. This can't catch a session that's abandoned outright and
  // never resumed (a real, honest limitation, not silently claimed as fixed) — but it does
  // mechanically catch the documented common case this repo's own `build.md` recommends
  // ("the next build — ideally in a fresh session"): the moment that next message arrives,
  // prepend a synthetic warning naming the exact leftover files, before the model does
  // anything else.
  "chat.message": async (input: any, output: any) => {
    const sessionID = input?.sessionID
    if (!sessionID || !Array.isArray(output?.parts)) return

    // FEEDBACK #3 (round 8): this is where the primer/elective gate actually clears now — see
    // the comment above tool.execute.before's armed check. A new message starting is the only
    // available proxy for "the user got a chance to respond to the stop-and-ask block message."
    const state = loadState()
    if (state.armed[sessionID]) {
      delete state.armed[sessionID]
      state.commitsSincePrimer[sessionID] = 0
      saveState(state)
    }

    const dirty = gitPorcelainStatus()
    if (dirty.length > 0) {
      output.parts.unshift({
        // opencode validates part IDs strictly (must start with "prt" — confirmed live: a
        // non-conforming ID crashed the whole request with a hard server error, not a soft
        // ignore). Match the real ID shape observed in `kilo export` output (`prt_<random>`).
        id: `prt_gatecarry${Date.now()}${Math.random().toString(36).slice(2, 8)}`,
        sessionID,
        messageID: output?.message?.id ?? input?.messageID ?? "",
        type: "text",
        synthetic: true,
        text: BLOCK_MESSAGE_UNCOMMITTED_CARRYOVER(dirty),
      })
    }

    // Round 7 (FEEDBACK #4/#12): a second, independent check in the same hook (chat.message is
    // the only surface available before the model responds — see the block above's own comment
    // on why no other hook can reach discuss.md). Reads the real user text already in
    // output.parts for this message.
    const userText = output.parts
      .filter((p: any) => p?.type === "text" && !p?.synthetic)
      .map((p: any) => p?.text ?? "")
      .join(" ")
    if (userText && looksAmbiguous(userText)) {
      output.parts.push({
        id: `prt_gateambig${Date.now()}${Math.random().toString(36).slice(2, 8)}`,
        sessionID,
        messageID: output?.message?.id ?? input?.messageID ?? "",
        type: "text",
        synthetic: true,
        text: NUDGE_MESSAGE_POSSIBLY_AMBIGUOUS,
      })
    }
  },
})

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
// Round 8 (FEEDBACK #3): the primer/elective gate (armed on a real commit landing, see round 2)
// cleared itself the instant its first post-arm mutating call was blocked — so an immediate
// retry, verbatim or not, of a mutating call sailed through completely unchecked right after.
// Fixed by moving the clear out of tool.execute.before entirely and into chat.message, keyed on
// a genuinely new user message arriving. wiki/rule-archive.md L11.
//
// Round 28 (FEEDBACK #41): round 8's fix cleared the arm on ANY next chat.message, without
// checking a block had ever actually fired for it — so following design.md's own "commit, then
// stop, make no further tool call" instruction produced a session that ends its turn with the
// gate armed but never triggered; the next message ("continue") cleared it for free, and the
// very next mutating call sailed through. The more faithfully the model followed the protocol,
// the more reliably the gate was bypassed. Root cause: a single `armed[sessionID]` boolean was
// overloading two facts with different lifetimes — "a sub-task boundary was crossed" (a
// repository fact, should persist until the *next* boundary) and "the user was asked and
// responded" (a conversation fact, should clear on the next real message) — so any new message
// cleared both, whether or not the first fact had ever actually been surfaced as a block.
//
// Fixed by deriving the boundary instead of storing it: `computeBoundary()` below recomputes
// straight from `git log`/`git rev-list` on every mutating call, so there is no `armed` flag to
// go stale or get cleared by the wrong event in the first place. What persists is a record of
// which boundary SHAs have actually been dealt with (`acknowledged`) — added only when (a) a
// block genuinely fired for that exact SHA this session and a real new message arrived after
// it, the same "new message = proxy for a human seeing the block" reasoning round 8 used, just
// anchored to the SHA that earned it instead of firing unconditionally. A second exemption,
// `boundaryAtSessionStart`, pre-clears whatever boundary already exists the moment a session's
// first message arrives — without it, this fix would block the very fresh-session workflow
// build.md recommends, trading one false-negative class for a false-positive one. Escape hatch
// for a boundary neither (a) nor (b) ever resolves: same one this file has always had for a
// corrupt/unreadable state — delete `.subtask-gate-state.json`, the load falls back to fully
// unarmed (see loadState()'s catch below).
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

// Round 28: bound on how many acknowledged boundary SHAs to keep — this is a history of
// resolved checkpoints, not live state, so it only needs to cover "was this SHA already dealt
// with recently," never the full project lifetime.
const ACKNOWLEDGED_HISTORY_LIMIT = 20

type ArmReason = "primer" | "elective"
type State = {
  acknowledged: string[]
  lastBlockedSha: Record<string, string>
  boundaryAtSessionStart: Record<string, string>
  protocolDocRead: Record<string, boolean>
  idleNudgeSignature: Record<string, string>
}

function loadState(): State {
  try {
    if (existsSync(STATE_FILE)) {
      const parsed = JSON.parse(readFileSync(STATE_FILE, "utf8"))
      return {
        acknowledged: parsed.acknowledged ?? [],
        lastBlockedSha: parsed.lastBlockedSha ?? {},
        boundaryAtSessionStart: parsed.boundaryAtSessionStart ?? {},
        protocolDocRead: parsed.protocolDocRead ?? {},
        idleNudgeSignature: parsed.idleNudgeSignature ?? {},
      }
    }
  } catch {
    // Corrupt/unreadable state file: fail open (unarmed) rather than crash the hook. This also
    // doubles as this file's manual escape hatch (round 28) — deleting the state file resets
    // every session's acknowledgment/pre-approval history to empty.
  }
  return {
    acknowledged: [],
    lastBlockedSha: {},
    boundaryAtSessionStart: {},
    protocolDocRead: {},
    idleNudgeSignature: {},
  }
}

function saveState(state: State) {
  try {
    writeFileSync(STATE_FILE, JSON.stringify(state))
  } catch {
    // Best-effort persistence — a write failure here should not break the tool call itself.
  }
}

// Round 29 (FEEDBACK #46, fail-open gate): "genuinely not a git repo" and "is a repo but this
// git command failed" used to collapse into the same catch -> null/0, which is indistinguishable
// from "no boundary" — a repo with a broken/timed-out git, a permissions error, or mid-rebase
// state silently disarmed the entire gate with no log. These now fail in opposite directions on
// purpose: not-a-repo is the one legitimate case where there's nothing to enforce (pass
// silently); a repo where a git command errors fails *closed* (block, with the reason named) —
// see GitCommandError/computeBoundary below.
class GitCommandError extends Error {
  command: string
  constructor(command: string) {
    super(`git ${command} failed`)
    this.command = command
  }
}

// Every git call below runs through here so "the repo exists but this command broke" always
// throws the same tagged error instead of each helper inventing its own silent fallback value.
function gitExec(args: string): string {
  try {
    return execSync(`git ${args}`, {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
  } catch {
    throw new GitCommandError(args)
  }
}

// The one place allowed to swallow a git failure into "false" — this is the actual "not a repo
// (yet)" check (round 28's old comment on currentHead() claimed this but never verified it；
// a repo with a broken HEAD looks identical to no-repo-at-all through that catch). If this
// itself fails, we can't tell repo from no-repo, so treat it as no-repo: there is no boundary to
// protect if we can't even confirm one exists, and computeBoundary's real fail-closed path only
// engages once we're sure a repo is there.
function isInsideWorkTree(): boolean {
  try {
    return gitExec("rev-parse --is-inside-work-tree") === "true"
  } catch {
    return false
  }
}

function currentHead(): string {
  return gitExec("rev-parse HEAD") // caller already confirmed a repo exists; a failure here is real breakage, not "no repo"
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

// Round 28: SHA of the most recent commit that touched SESSION_PRIMER.md, straight from git —
// replaces the old incremental "did the last-seen commit touch it" bookkeeping (round 2/8's
// `tool.execute.after`) with a value that's always correct on demand, never stale, and needs no
// clearing logic of its own.
function lastPrimerTouchSha(): string | null {
  const out = gitExec("log -1 --format=%H -- wiki/handoffs/SESSION_PRIMER.md")
  return out || null // empty output is a legitimate answer (primer never touched) — distinct from gitExec throwing on real failure
}

// Round 28: count of commits reachable from `head` but not from `fromSha` — i.e. how many
// commits have landed since (and not including) the last primer touch. `fromSha` null means
// "primer has never been touched in this repo's history," so every commit up to `head` counts.
function commitCountSince(fromSha: string | null, head: string): number {
  const range = fromSha ? `${fromSha}..${head}` : head
  const out = gitExec(`rev-list --count ${range}`)
  const n = parseInt(out, 10)
  if (Number.isNaN(n)) throw new GitCommandError(`rev-list --count ${range} (unparseable output ${JSON.stringify(out)})`)
  return n
}

type Boundary = { sha: string; reason: ArmReason; commitsSincePrimer: number }
// Round 29: computeBoundary's third outcome — a repo is confirmed present but a git command
// inside it failed. Kept distinct from `null` ("confirmed no boundary") so both call sites can
// fail closed instead of treating this the same as "nothing to enforce."
type GitFailure = { gitError: string }

// Round 28 (#41 redesign): the single source of truth for "is a sub-task boundary currently
// open," derived fresh from git on every call instead of read from a persisted flag. HEAD
// itself touching SESSION_PRIMER.md is a "primer" boundary; failing that, COMMITS_WITHOUT_
// PRIMER_THRESHOLD-or-more commits since the last primer touch (round 2/L07's elective gate) is
// an "elective" one. Either way the boundary's identity IS the current HEAD SHA — as more
// commits land past a threshold, HEAD moves and so does the boundary, so worsening debt keeps
// requiring fresh acknowledgment rather than resting on a stale approval.
//
// Round 29 (FEEDBACK #46): `null` now means only "confirmed no boundary" (not a repo, or a repo
// with nothing pending) — a git command failing partway through returns `GitFailure` instead of
// falling through to `null`, so a broken repo can't impersonate "all clear."
function computeBoundary(): Boundary | GitFailure | null {
  if (!isInsideWorkTree()) return null // genuinely not a git repo (yet) — nothing to enforce

  try {
    const head = currentHead()
    const primerSha = lastPrimerTouchSha()
    if (primerSha === head) return { sha: head, reason: "primer", commitsSincePrimer: 0 }

    const n = commitCountSince(primerSha, head)
    if (n >= COMMITS_WITHOUT_PRIMER_THRESHOLD) return { sha: head, reason: "elective", commitsSincePrimer: n }

    return null
  } catch (e) {
    const command = e instanceof GitCommandError ? e.command : String(e)
    return { gitError: command }
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

// Round 29 (FEEDBACK #46): fires when a repo is confirmed present but computeBoundary couldn't
// safely determine whether a boundary is open (git command failure — corrupt repo, mid-rebase,
// permissions, timeout, etc). Fails closed on purpose: a broken git is not evidence of "no
// sub-task boundary," and the old code treated it as exactly that with no message at all.
const BLOCK_MESSAGE_GIT_ERROR = (command: string) =>
  `[subtask-gate] Could not determine whether a sub-task boundary is open — \`git ${command}\` ` +
  "failed in what is otherwise a real git repository. Failing closed rather than assuming no " +
  "boundary is pending: investigate the repo state (rebase/bisect in progress? permissions? " +
  "git missing?) before any further mutating tool call, or delete .subtask-gate-state.json " +
  "next to this plugin as a last-resort reset if the repo itself is fine."

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

// Round 27: FEEDBACK candidate — every mechanism above only ever fires from inside
// tool.execute.before/after or chat.message, so none of them can catch a session that just
// stops after an edit with no commit and no further tool call or message (the same gap
// row #15/L11's own honest limitation names: "can't catch a session abandoned outright").
// This was previously recorded as structurally impossible — the code comment above the
// chat.message hook (round 5) states "opencode's plugin API... has no end-of-turn/end-of-
// session hook at all," citing @kilocode/plugin's own type defs. Re-checked against the
// actually-installed package (v7.4.20, same one loaded by the real `kilo` binary — not
// assumed): `Hooks.event?: (input: { event: Event }) => Promise<void>` exists, and `Event`
// includes `EventSessionIdle` (`{ type: "session.idle", properties: { sessionID } }`),
// confirmed firing exactly once per turn via a raw HTTP SSE capture against a real `kilo
// serve` instance. `KiloClient.session.prompt()`'s body also genuinely accepts `noReply:
// boolean` (confirmed in the same installed SDK's `SessionPromptData` type) — live-verified
// via raw HTTP: a `noReply: true` call returns in ~20ms (vs ~3.5s for a real generated
// reply), creates a real `role: "user"` message visible in session history, and did NOT
// trigger a further `session.idle` event in the same live capture (no observed idle-nudge-
// idle loop) — though that's an empirical observation of current server behavior, not a
// documented contract, so the signature-based dedup below stays as a real backstop, not
// just defensive style.
const IDLE_NUDGE_MESSAGE = (files: string[]) =>
  "[subtask-gate] This session just went idle with uncommitted changes still in the working " +
  `tree (${files.length} path(s): ${files.slice(0, 5).join(", ")}` +
  `${files.length > 5 ? ", ..." : ""}). Per AGENTS.md's "commit per file, always" rule, this ` +
  "should have been committed before the turn ended — commit these now, or explicitly decide " +
  "what to do with them, before starting anything else."

// Round 29 (FEEDBACK #46): test-only escape hatch into the three git helpers. commitCountSince's
// own fail-closed path can't be reached in isolation through the public hooks with a realistic
// repo — git rev-list's object requirements are a strict subset of git log's (log needs trees to
// diff paths, rev-list only needs commit objects), so any object corruption that breaks rev-list
// breaks lastPrimerTouchSha()'s `git log` first, every time. Exporting these lets the test suite
// verify commitCountSince fails closed directly (a syntactically-valid but nonexistent `fromSha`
// reproduces a real `git rev-list` error with no corruption needed) instead of leaving that one
// helper's fail-closed path unverified.
export const __internal = { currentHead, lastPrimerTouchSha, commitCountSince, isInsideWorkTree, computeBoundary, GitCommandError }

export const SubtaskGate = async ({ client }: any = {}) => ({
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

    // Round 28 (#41 redesign): boundary is derived fresh from git, not read off a persisted
    // `armed` flag — see computeBoundary()'s own comment for why. A boundary blocks unless its
    // exact SHA has already been dealt with: either genuinely acknowledged this session (a
    // block fired for it and a real new message followed — set in chat.message below), or it's
    // the boundary that already existed when this session's first message arrived (the
    // fresh-session courtesy, also set in chat.message below).
    if (MUTATING_TOOLS.has(tool)) {
      const boundary = computeBoundary()
      // Round 29 (FEEDBACK #46): a GitFailure always blocks — it has no SHA to check against
      // acknowledged/pre-approved state, and unlike a real boundary it can't be cleared by any
      // amount of chat.message traffic (there's nothing to acknowledge). It clears only once
      // computeBoundary succeeds again on a later call.
      if (boundary && "gitError" in boundary) {
        saveState(state)
        throw new Error(BLOCK_MESSAGE_GIT_ERROR(boundary.gitError))
      }
      if (boundary) {
        const preapprovedSha = state.boundaryAtSessionStart[sessionID]
        const cleared = state.acknowledged.includes(boundary.sha) || preapprovedSha === boundary.sha
        if (!cleared) {
          state.lastBlockedSha[sessionID] = boundary.sha
          saveState(state)
          throw new Error(
            boundary.reason === "primer"
              ? BLOCK_MESSAGE_COMMIT
              : BLOCK_MESSAGE_ELECTIVE(boundary.commitsSincePrimer)
          )
        }
      }
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
  },

  // Round 5, after an independent objective audit's highest-priority finding: a live session
  // wrote and manually tested a real file, then simply stopped — no further tool call, no
  // commit, and nothing above could catch it, because every check so far only fires inside
  // `tool.execute.before`/`after`, and neither runs again if the model just ends its turn.
  // opencode's plugin API (confirmed by reading @kilocode/plugin's own type definitions — the
  // package Kilo 7.4.20 actually loads, a separate published fork of the opencode plugin API,
  // not @opencode-ai/plugin itself; same L01-style "check the actual binary/types, not assumed
  // docs" discipline) was believed at the time to have no end-of-turn/end-of-session hook at
  // all — `chat.message` (fires when a *new* message starts) was the closest available thing,
  // catching the documented common case this repo's own `build.md` recommends ("the next
  // build — ideally in a fresh session"). Round 27 found this claim was never actually
  // re-verified against the real package after round 9 fixed the wrong-package-name citation
  // (`@opencode-ai/plugin` -> `@kilocode/plugin`) — it does expose a real `event` hook with a
  // `session.idle` type, closing the "abandoned outright" gap this comment used to describe as
  // structurally impossible. See that hook below; this one is left in place for the "next
  // message in the same session" case, which the idle hook alone doesn't cover (a session that
  // goes idle and is then resumed still benefits from both).
  "chat.message": async (input: any, output: any) => {
    const sessionID = input?.sessionID
    if (!sessionID || !Array.isArray(output?.parts)) return

    // Round 27: don't treat this plugin's own synthetic idle-nudge append (see the `event`
    // hook below) as a genuine new user turn — it would otherwise wrongly acknowledge/pre-
    // approve a boundary as if the user had actually responded to a block. Empirically a
    // `noReply: true` append did not fire this hook at all in a live raw-HTTP test (see the
    // `event` hook's comment) — this guard is kept anyway since that's observed server
    // behavior, not a documented contract.
    if (typeof input?.messageID === "string" && input.messageID.startsWith("msg_idlenudge")) {
      return
    }

    const state = loadState()

    // Round 28 (#41 redesign, rule b): a session's very first genuine message pre-approves
    // whatever boundary already exists at that moment, for this session only — without this,
    // the fix below (rule a) would block the exact fresh-session workflow build.md recommends
    // ("the next build — ideally in a fresh session"), trading FEEDBACK #41's bypass for a new
    // false-positive class on every ordinary session start. A session counts as new here iff it
    // has no entry yet in boundaryAtSessionStart specifically (not any of the other per-session
    // maps below) — checked once, permanently recorded, never overwritten after.
    if (!(sessionID in state.boundaryAtSessionStart)) {
      const boundary = computeBoundary()
      // Round 29 (FEEDBACK #46): a GitFailure has no `.sha` to pre-approve — recording "" here
      // (same as "no boundary at start") is deliberately conservative, not a fallback to the old
      // silent behavior: it does not pre-approve anything, so tool.execute.before's fail-closed
      // GitFailure block (which re-runs computeBoundary independently on the next mutating call)
      // is what actually surfaces the problem, not this bookkeeping step.
      state.boundaryAtSessionStart[sessionID] = boundary && "sha" in boundary ? boundary.sha : ""
    }

    // Round 28 (#41 redesign, rule a): this replaces FEEDBACK #3's (round 8) unconditional
    // clear-on-any-message with one anchored to a fact: a block only gets acknowledged if it
    // actually fired (recorded in tool.execute.before, at the exact `throw` site) for this
    // exact boundary SHA, and only once a genuinely new message follows it — the same "new
    // message = proxy for the user having been asked and responded" reasoning round 8 used,
    // just no longer applied to boundaries that were never surfaced as a block in the first
    // place (that gap is what let "continue" disarm an unfired arm and slip the very next
    // mutating call through).
    const blockedSha = state.lastBlockedSha[sessionID]
    if (blockedSha) {
      if (!state.acknowledged.includes(blockedSha)) {
        state.acknowledged.unshift(blockedSha)
        state.acknowledged = state.acknowledged.slice(0, ACKNOWLEDGED_HISTORY_LIMIT)
      }
      delete state.lastBlockedSha[sessionID]
    }

    saveState(state)

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

  // Round 27: the real end-of-turn signal the `chat.message` comment above used to say didn't
  // exist — `session.idle` fires once per completed turn (live-verified via raw SSE capture
  // against a real `kilo serve`: exactly 1 event, right after the assistant's step-finish).
  // Catches the same gap `chat.message`'s carryover check can't: a turn that ends with
  // uncommitted work and no next message in this session at all (build.md's "ideally a fresh
  // session" case still relies on chat.message; this covers "session never continues").
  // `client` comes from `PluginInput` (round 1-26 never destructured it — this is the first
  // hook in this file that needs an outbound API call, not just tool-args/session-state
  // inspection).
  event: async (input: any) => {
    const event = input?.event
    if (event?.type !== "session.idle") return
    const sessionID = event?.properties?.sessionID
    if (!sessionID || !client?.session?.prompt) return

    const dirty = gitPorcelainStatus()
    const state = loadState()

    if (dirty.length === 0) {
      if (state.idleNudgeSignature[sessionID]) {
        delete state.idleNudgeSignature[sessionID]
        saveState(state)
      }
      return
    }

    // Dedup on the exact dirty-file-set signature, not just "already nudged this session" —
    // an unresolved nudge should still be able to re-fire if the dirty set actually changes
    // (e.g. a different file goes uncommitted), but a repeat `session.idle` for the identical
    // unresolved state (observed not to happen for a noReply append itself, per the comment
    // above `chat.message`, but this is a real backstop against any other cause of repeat
    // idle events) should not spam an identical nudge every time.
    const signature = [...dirty].sort().join("\n")
    if (state.idleNudgeSignature[sessionID] === signature) return

    state.idleNudgeSignature[sessionID] = signature
    saveState(state)

    try {
      await client.session.prompt({
        path: { id: sessionID },
        body: {
          messageID: `msg_idlenudge${Date.now()}${Math.random().toString(36).slice(2, 8)}`,
          noReply: true,
          parts: [{ type: "text", synthetic: true, text: IDLE_NUDGE_MESSAGE(dirty) }],
        },
      })
    } catch {
      // Best-effort — a failed nudge append should never crash the event hook (same
      // convention as saveState()'s own try/catch above).
    }
  },
})

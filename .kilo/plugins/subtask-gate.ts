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
// Final round (FEEDBACK #6, contradiction injection): a real 5-message live production trial
// through Cursor's Kilo Code plugin (round 31 evidence, wiki/rule-archive.md) reproduced the
// model reporting file/commit/test-pass "완료" claims across 18 STRAIGHT tool calls that this
// gate actually blocked — ground truth: no files, clean tree, HEAD unmoved. #6 had been accepted
// as a permanent ceiling on the premise that the lie itself can't be stopped (0/2 wording-rewrite
// record project-wide). It doesn't need to be: the model's own NEXT turn now carries a factual
// notice naming exactly which tool calls were blocked, built from `blockedCallsThisTurn` (written
// only at the throw sites, see State's own comment) but injected ONLY once chat.message
// independently confirms via real `git` state that nothing landed since — same "derive from git,
// never trust self-report" principle as `computeBoundary()`'s SHA-derived redesign above, applied
// to the fact that a turn happened at all rather than just to boundary state. Does not reword any
// existing BLOCK_MESSAGE (0/2 record on that specific class of fix, see round 27's Finding A) and
// does not wrap the injected text in a `<system-reminder>` tag (round 27 tried that on the
// carryover warning, no measured improvement). Whether the model actually *heeds* the notice on a
// live turn is unverified by this round — see wiki/rule-archive.md.
//
// Round 39 (the first round opened by real use rather than a blind audit — soulmate-4 went to
// maintenance mode on 2026-08-26 with "open a round only when a real defect shows up in real
// use"; this is that): the user reported the harness "structurally only ever allows the next
// sub-task in sequence and flatly refuses to listen to me." Reproduced from his own live Kilo
// transcript, not from reading this file — kilo.db session ses_fc421bb0fffe5FU22DG4dgcc00. Two
// mechanisms, both in chat.message, neither the protocol-read gate (0 of that gate's 78 blocks
// database-wide were ever in a real project session):
//   (1) looksAmbiguous()'s anchors are ASCII-punctuation-only and fired on 12 of his 15 real
//       messages, telling the model to stop and ask questions instead of acting on explicit
//       instructions. Fixed by scoping the heuristic out of scripts it was never calibrated on.
//   (2) round 28's fresh-session boundary courtesy assumed one-sub-task-one-session; he runs one
//       session for days, so it expired permanently and a boundary could then only be cleared by
//       first spending a visibly-failed tool call. Fixed by re-anchoring the courtesy to "a whole
//       turn ended without HEAD moving, and a real user message arrived" — which #41's shape can
//       never satisfy. See both call sites for the measurements and the #41 argument.
// The primer block itself is NOT relaxed: closing a sub-task still stops the very next call.
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
  // Round 30 item 3 (work order): snapshot of the elective boundary's sha (or "" if none) as of
  // the start of the CURRENT turn — refreshed on every chat.message, not just the session's
  // first. See the elective-vs-primer split in tool.execute.before for why this exists.
  electiveBoundaryAtTurnStart: Record<string, string>
  // Final round (contradiction injection, FEEDBACK #6): a factual log of mutating calls blocked
  // THIS turn — written only at the throw sites below, so it can't itself claim more than "this
  // call was attempted and did not execute." Never used alone to decide whether to inject (see
  // chat.message's own comment) — only to name what to inject once git confirms nothing landed.
  blockedCallsThisTurn: Record<string, { tool: string; detail: string }[]>
  // git HEAD / working-tree signature snapshotted at the start of the CURRENT turn (refreshed on
  // every chat.message) — the ONLY thing the injection decision is based on.
  turnStartHead: Record<string, string>
  turnStartDirtySignature: Record<string, string>
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
        electiveBoundaryAtTurnStart: parsed.electiveBoundaryAtTurnStart ?? {},
        blockedCallsThisTurn: parsed.blockedCallsThisTurn ?? {},
        turnStartHead: parsed.turnStartHead ?? {},
        turnStartDirtySignature: parsed.turnStartDirtySignature ?? {},
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
    electiveBoundaryAtTurnStart: {},
    blockedCallsThisTurn: {},
    turnStartHead: {},
    turnStartDirtySignature: {},
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

// Final round (contradiction injection): a non-throwing variant for chat.message's own
// git-derived check below — unlike currentHead()'s callers, this one must never crash the hook
// on a broken/unborn-HEAD repo; "can't verify" and "verified unchanged" must stay distinguishable
// (null vs a real sha), so an unverifiable state conservatively skips injection rather than
// guessing either way.
function currentHeadSafe(): string | null {
  try {
    if (!isInsideWorkTree()) return null
    return currentHead()
  } catch {
    return null
  }
}

// Same signature format already used by the `event` hook's own idle-dedup signature below —
// factored out here only because this is now the second call site, not a design change to the
// existing one (left untouched, same "surgical" reasoning as everywhere else in this file).
function dirtySignature(dirty: string[]): string {
  return [...dirty].sort().join("\n")
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

// Round 29 (FEEDBACK #46, axis-C-discovered gate bypass): `background_process` runs an arbitrary
// shell command asynchronously — functionally equivalent to `bash` for mutation purposes (starts
// a process that can write files and `git commit`) — but was missing from a denylist entirely.
// Live-caught: a real complexity-ladder trial got blocked by the elective gate, read this file's
// own source via the `read` tool (never blocked — read-only), noticed `background_process` wasn't
// in the old MUTATING_TOOLS Set, and used it to write + commit, bypassing the gate completely
// (confirmed via the trial's own transcript: the model explicitly reasoned "`background_process`
// is not in this set, so it should not be blocked" before using it).
//
// Round 30 item 2 (work order): that fix was a same-shape patch to the same wrong shape — a
// denylist of 7 names against a real tool surface of 17 (round 28's own MITM capture,
// `/home/jay/sm4-tap-capture/captures/*.json`: 12 tool names in `kilo run` CLI's actual API
// request payload, 17 via Cursor's Kilo Code plugin — measured from the real request body sent
// to the model, not guessed). Every one of the other 10 unlisted names was free to bypass the
// gate the same way `background_process` did, `agent_manager` most of all (round 29's own note:
// if it can launch a sub-agent, that sub-agent writes files under a name this gate never checks).
// Round 29 applied fail-closed reasoning to git-command failures (`computeBoundary`'s
// `GitFailure` branch) but not to this list, in the same round — inverted here to match: name
// ONLY the tools proven incapable of writing a file, running a shell command, or leaving the
// sandbox, each with a one-line reason; everything else — named below, added later, or entirely
// unrecognized — is mutating by construction, not by enumeration.
//
// Full real tool inventory (union of the captured 17-tool plugin payload and this project's own
// kilo.db session history's 13 distinct invoked names, 156 real sessions): agent_manager,
// agent_manager_models, background_process, bash, chart, edit, glob, grep, kilo_local_recall,
// question, read, skill, suggest, task, todowrite, webfetch, write. (`patch`/`multiedit`, still
// named in the old denylist, appear in neither the captured payloads nor any observed call in
// kilo.db — likely dead names from an earlier Kilo version; harmless to still fail-close on them
// since they fall through to "unrecognized" below either way.)
const READONLY_TOOLS = new Set([
  "read", // reads one file's content; cannot create, modify, or delete anything
  "grep", // searches file contents; read-only by definition, same class as read
  "glob", // lists filenames matching a pattern; read-only by definition, same class as read
  "question", // asks the user a clarifying question (the exact non-mutating alternative discuss.md
              // exists to encourage); the tool call itself produces no file or git change
])

function isMutating(tool: string): boolean {
  return !READONLY_TOOLS.has(tool)
}

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

// Round 44 (live, warms-mobile ses_f9d4e1792ffeIM9vhmzmTIXpoJ, 09-03 00:30:33-00:33:31): the
// primer block fired six times inside one turn with a byte-identical message, and the transcript
// shows the model never understood it had been refused — at 00:33:22 it concluded "게이트가 매번
// edit를 커밋으로 인식하는 것 같습니다. 이미 커밋된 상태라 에디트가 실패하고 있습니다", i.e. it
// read the block as the *edit* failing because the file was already committed, and retried.
//
// That misreading is earned, not defiance: BLOCK_MESSAGE_COMMIT says the primer "was just
// committed", which was true at attempt 1 and six minutes plus an entire user turn stale by
// attempt 6, and it never states that the refused call did not execute. This suffix corrects
// both facts. It is deliberately NOT a re-persuasion of the same claim (this project's 0/2
// wording-rewrite record is about writing the same instruction more forcefully); it is the same
// species as round 43's stale tool-description claims — a message asserting something no longer
// true, with the model's mis-derivation captured live.
//
// Report-only by construction: nothing new is blocked and nothing already blocked is released.
// The first block of a turn keeps its exact wording (six existing assertions regex it).
const BLOCK_REPEAT_SUFFIX = (attempt: number) =>
  ` [repeat] This is blocked attempt ${attempt} in this same turn and it did NOT execute — ` +
  "nothing was written, nothing ran. This is not the edit or the command itself failing: the " +
  "call was refused by the gate before it started, because of a commit that landed earlier, and " +
  "nothing about the repo has changed since the first attempt. Retrying will produce this exact " +
  "error again every time. Stop calling tools now — reply with a 2-3 line summary of what was " +
  "already done and wait for the user."

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

// Round 39 (real-usage maintenance round, opened from warms-mobile — not a new design round):
// every anchor above is an ASCII-punctuation shape (a backticked span, a `.ext`-like token, a
// quoted string). That premise — "a concrete ask names its target in ASCII code punctuation" —
// was only ever exercised against the English trial prompts of rounds 7-8. Replayed against this
// project's own real production transcript (kilo.db, session ses_fc421bb0fffe5FU22DG4dgcc00,
// 2026-08-26..29, the only warms-mobile session in the database; its 15 genuine user messages fed
// through this exact function): **12/15 nudged**, including "좋습니다. 빌드 진행하세요."
// ("good, go ahead and build") and "내 말을 듣고 있어요? 시스템 구조 확인하라고 했습니다."
// ("are you listening to me? I told you to check the system structure"). Korean directive prose
// carries none of these anchors, so essentially every plain-language instruction the user gives
// is classified as "names no specific file, function, or concrete target" and answered with
// NUDGE_MESSAGE_POSSIBLY_AMBIGUOUS — whose round-8 rewrite deliberately removed any self-granted
// opt-out ("STOP before doing anything else... Do not assume an interpretation and proceed").
// The live trace shows the cost: 08-29 08:55 -> 10:13, the user restated one concrete request
// three times and got clarifying questions back every time, then wrote "내 말을 듣고 있어요?".
// This is the mechanism behind his report that the harness refuses to listen to him.
//
// The fix is scope, not wording (wording rewrites are 0/2 project-wide): a detector must not fire
// where it has no signal. Nothing is enumerated — the test is Latin letters vs non-Latin letters
// via \p{Script=Latin} / \p{L}, so any writing system this heuristic was never calibrated on
// falls out of scope by construction, the same fail-by-construction shape round 30 used to
// replace MUTATING_TOOLS' denylist. "Predominantly", not "contains any": a mostly-English message
// with one foreign word is still judged. Honest cost, stated rather than hidden: a genuinely
// vague Korean ask is no longer routed to discuss.md by this nudge. Accepted — the nudge never
// blocked anything, its measured precision on this user's own language is 0/12, and the
// discuss.md routing still exists in AGENTS.md's protocol table as prose.
const LATIN_LETTER_PATTERN = /\p{Script=Latin}/gu
const NON_LATIN_LETTER_PATTERN = /(?!\p{Script=Latin})\p{L}/gu
function anchorHeuristicApplies(text: string): boolean {
  const latin = text.match(LATIN_LETTER_PATTERN)?.length ?? 0
  const nonLatin = text.match(NON_LATIN_LETTER_PATTERN)?.length ?? 0
  return nonLatin <= latin
}

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
  if (!anchorHeuristicApplies(trimmed)) return false // round 39 — out of the anchors' measured domain
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

// Final round (contradiction injection, FEEDBACK #6 — a live plugin production trial, round 31
// evidence in wiki/rule-archive.md, reproduced the model reporting "생성 완료"/"커밋 완료"/
// "모든 테스트 PASS" for 18 STRAIGHT tool calls that every one of these throw sites actually
// blocked): #6 was accepted as a permanent ceiling on the theory that the lie itself can't be
// stopped. It doesn't need to be — contradicted with git-derived fact on the model's own next
// turn, same "derive from git, never trust self-report" principle as computeBoundary() above.
// Only ever built from `blockedCallsThisTurn` (a factual log, see State's own comment) AFTER
// chat.message has independently confirmed via real git state that nothing landed — this
// function itself does not make that decision, only the naming.
function toolCallDetail(tool: string, output: any): string {
  const args = output?.args ?? {}
  if (tool === "bash" || tool === "background_process") return String(args.command ?? "").slice(0, 60)
  if (tool === "write" || tool === "edit") return String(args.filePath ?? "").slice(0, 60)
  return ""
}

function recordBlockedCall(state: State, sessionID: string, tool: string, output: any) {
  if (!state.blockedCallsThisTurn[sessionID]) state.blockedCallsThisTurn[sessionID] = []
  state.blockedCallsThisTurn[sessionID].push({ tool, detail: toolCallDetail(tool, output) })
}

const CONTRADICTION_NOTICE = (blocked: { tool: string; detail: string }[]) => {
  const shown = blocked
    .slice(0, 5)
    .map((b) => (b.detail ? `${b.tool}(${b.detail})` : b.tool))
    .join(", ")
  const more = blocked.length > 5 ? `, ... (+${blocked.length - 5} more)` : ""
  return (
    `[subtask-gate] fact check: ${blocked.length} tool call(s) were blocked last turn and did ` +
    `not execute — ${shown}${more}. git confirms nothing landed: HEAD and the working tree are ` +
    "both unchanged since then."
  )
}

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
export const __internal = { currentHead, lastPrimerTouchSha, commitCountSince, isInsideWorkTree, computeBoundary, GitCommandError, isMutating, READONLY_TOOLS }

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
    if (isMutating(tool)) {
      const boundary = computeBoundary()
      // Round 29 (FEEDBACK #46): a GitFailure always blocks — it has no SHA to check against
      // acknowledged/pre-approved state, and unlike a real boundary it can't be cleared by any
      // amount of chat.message traffic (there's nothing to acknowledge). It clears only once
      // computeBoundary succeeds again on a later call.
      if (boundary && "gitError" in boundary) {
        recordBlockedCall(state, sessionID, tool, output)
        saveState(state)
        throw new Error(BLOCK_MESSAGE_GIT_ERROR(boundary.gitError))
      }
      // Round 30 item 3 (work order, #46/#47's common root): the elective arm's whole purpose is
      // "work has drifted, check in with the user" — a between-turns judgment. Judging it
      // mid-turn instead (the old behavior: computeBoundary() re-evaluated fresh on every single
      // tool call, so crossing the commit threshold mid-turn armed immediately) traps a model
      // with no escape: once armed, `bash` is blocked entirely, including read-only diagnostic
      // commands like `git status`/`pytest` — round 29 live-caught this exact case producing
      // either a gate-source-reading bypass (#46) or a 20-retry storm (#47). Fix: an "elective"
      // boundary only blocks if it already existed as of the start of THIS turn (snapshotted in
      // chat.message below, refreshed every message) — one freshly crossed mid-turn is deferred,
      // not dropped, and blocks starting at the next message boundary once chat.message re-
      // snapshots it. A "primer" boundary is unaffected: it still blocks the very next mutating
      // call unconditionally, same as every prior round — that half of the gate was never the
      // trapped-mid-turn failure mode, and acceptance criterion B (round 30 work order) requires
      // it stay that way.
      const midTurnElectiveDeferred =
        boundary && boundary.reason === "elective" && boundary.sha !== state.electiveBoundaryAtTurnStart[sessionID]
      if (boundary && !midTurnElectiveDeferred) {
        const preapprovedSha = state.boundaryAtSessionStart[sessionID]
        const cleared = state.acknowledged.includes(boundary.sha) || preapprovedSha === boundary.sha
        if (!cleared) {
          // Round 44: both signals below are already per-turn, so this adds no state at all.
          // `lastBlockedSha[sessionID]` is written here and deleted unconditionally by the next
          // chat.message, so finding it ALREADY equal to this boundary means "this same boundary
          // already blocked earlier in this same un-acknowledged stretch" — i.e. a retry.
          // `blockedCallsThisTurn[sessionID]` is likewise emptied every chat.message, so its
          // length is a truthful count of refusals so far in this turn (all arms, which is what
          // the wording claims — it does not claim they were all this boundary).
          const repeatForSameBoundary = state.lastBlockedSha[sessionID] === boundary.sha
          const attempt = (state.blockedCallsThisTurn[sessionID]?.length ?? 0) + 1
          state.lastBlockedSha[sessionID] = boundary.sha
          recordBlockedCall(state, sessionID, tool, output)
          saveState(state)
          const base =
            boundary.reason === "primer"
              ? BLOCK_MESSAGE_COMMIT
              : BLOCK_MESSAGE_ELECTIVE(boundary.commitsSincePrimer)
          throw new Error(repeatForSameBoundary ? base + BLOCK_REPEAT_SUFFIX(attempt) : base)
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
    if (isMutating(tool) && !state.protocolDocRead[sessionID]) {
      recordBlockedCall(state, sessionID, tool, output)
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

    // Final round (contradiction injection, FEEDBACK #6): decide whether to inject BEFORE
    // resetting the turn-start baselines below, using ONLY real git state — never
    // `blockedCallsThisTurn` alone (that list only supplies WHAT to name, per its own comment).
    // `turnStartHead`/`turnStartDirtySignature` were snapshotted at the previous chat.message
    // (i.e. the start of the turn that just ended); if both are still identical now, no mutating
    // call from that turn actually landed, regardless of what the model claimed happened — this
    // also correctly produces NO injection whenever at least one mutating call in that turn
    // actually succeeded (HEAD or the working tree moved), even if others were also blocked.
    const priorHead = state.turnStartHead[sessionID]
    const priorDirty = state.turnStartDirtySignature[sessionID]
    const blockedLastTurn = state.blockedCallsThisTurn[sessionID] ?? []
    if (priorHead !== undefined && blockedLastTurn.length > 0) {
      const nowHead = currentHeadSafe()
      const nowDirty = dirtySignature(gitPorcelainStatus())
      if (nowHead !== null && nowHead === priorHead && nowDirty === priorDirty) {
        output.parts.unshift({
          id: `prt_gatecontra${Date.now()}${Math.random().toString(36).slice(2, 8)}`,
          sessionID,
          messageID: output?.message?.id ?? input?.messageID ?? "",
          type: "text",
          synthetic: true,
          text: CONTRADICTION_NOTICE(blockedLastTurn),
        })
      }
    }
    state.blockedCallsThisTurn[sessionID] = []
    state.turnStartHead[sessionID] = currentHeadSafe() ?? ""
    state.turnStartDirtySignature[sessionID] = dirtySignature(gitPorcelainStatus())

    // Round 30 item 3: computed once per message and reused below for two different snapshots —
    // boundaryAtSessionStart (set once, first message only, unchanged from round 28) and
    // electiveBoundaryAtTurnStart (refreshed every message, new this round — see its own comment
    // in tool.execute.before for why a turn-start snapshot exists at all).
    const turnStartBoundary = computeBoundary()

    // Round 28 (#41 redesign, rule b): a session's very first genuine message pre-approves
    // whatever boundary already exists at that moment, for this session only — without this,
    // the fix below (rule a) would block the exact fresh-session workflow build.md recommends
    // ("the next build — ideally in a fresh session"), trading FEEDBACK #41's bypass for a new
    // false-positive class on every ordinary session start. A session counts as new here iff it
    // has no entry yet in boundaryAtSessionStart specifically (not any of the other per-session
    // maps below) — checked once, permanently recorded, never overwritten after.
    if (!(sessionID in state.boundaryAtSessionStart)) {
      // Round 29 (FEEDBACK #46): a GitFailure has no `.sha` to pre-approve — recording "" here
      // (same as "no boundary at start") is deliberately conservative, not a fallback to the old
      // silent behavior: it does not pre-approve anything, so tool.execute.before's fail-closed
      // GitFailure block (which re-runs computeBoundary independently on the next mutating call)
      // is what actually surfaces the problem, not this bookkeeping step.
      state.boundaryAtSessionStart[sessionID] = turnStartBoundary && "sha" in turnStartBoundary ? turnStartBoundary.sha : ""
    }

    // Round 30 item 3: unlike boundaryAtSessionStart above, this refreshes on EVERY message, not
    // just the session's first — it answers "was an elective boundary already open when THIS
    // turn began," which tool.execute.before uses to defer a mid-turn-freshly-crossed elective
    // arm to the next turn instead of trapping the current one. Same conservative GitFailure
    // handling as above: "" (no pre-existing elective boundary), never a stale sha.
    state.electiveBoundaryAtTurnStart[sessionID] =
      turnStartBoundary && "sha" in turnStartBoundary && turnStartBoundary.reason === "elective"
        ? turnStartBoundary.sha
        : ""

    // Round 39 (real-usage maintenance round): round 28's rule (b) courtesy is keyed on a
    // *session's* first message, on build.md's premise that one sub-task is one fresh session.
    // Real use disagrees — kilo.db has exactly one warms-mobile session
    // (ses_fc421bb0fffe5FU22DG4dgcc00) and it ran 2026-08-26 11:20 -> 08-29 10:58 across two
    // whole sub-tasks and five commits. So in this user's actual workflow the courtesy fires
    // once, ever, and every resumption after it meets a boundary that no amount of him talking
    // can clear: `acknowledged` (rule a) requires a block to have already fired for that exact
    // SHA *before* his message, so an instruction that arrives first is worth nothing. Live
    // consequence, 08-29 10:21-10:28: six consecutive blocks, four of them `git remote -v`
    // variants — a read-only diagnostic he had explicitly asked for — then
    // "제가 어떤 요청을 해도 블락 처리하시는거에요?" ("so whatever I ask, you just block it?").
    //
    // Generalize the courtesy from "the session is new" to the fact it was standing in for: HEAD
    // did not move for the whole turn that just ended, and a genuinely new user message has now
    // arrived. That means this boundary is not one the model produced in the turn it is trying to
    // continue past — a completed turn and a real human reply have already passed over it. Reuses
    // `acknowledged` and the already-tracked `priorHead`; no new state, no new git call.
    //
    // Does NOT reopen FEEDBACK #41, and this is the load-bearing part: #41's shape is "primer
    // commit lands mid-turn, turn ends, next message" — there HEAD moved *during* the turn that
    // just ended, so priorHead !== the boundary's sha and this exemption cannot apply (T12
    // asserts exactly that, unchanged; T23b asserts it again inside a long-lived session). Round
    // 30's acceptance criterion B is intact too: a freshly-crossed primer boundary still blocks
    // the very next mutating call. The model cannot self-trigger this either — it requires a real
    // user message (the idle-nudge guard at the top of this hook already excludes the only
    // message this plugin can author) *and* a turn in which it moved nothing.
    if (
      priorHead !== undefined &&
      turnStartBoundary &&
      "sha" in turnStartBoundary &&
      turnStartBoundary.sha === priorHead &&
      !state.acknowledged.includes(turnStartBoundary.sha)
    ) {
      state.acknowledged.unshift(turnStartBoundary.sha)
      state.acknowledged = state.acknowledged.slice(0, ACKNOWLEDGED_HISTORY_LIMIT)
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

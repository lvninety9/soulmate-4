// Isolated unit test for subtask-gate.ts (L06-L10) — no Kilo involved, same discipline every
// round has used: Node --experimental-strip-types against the plugin's exported hooks directly,
// always paired with at least one live `kilo run` re-verification (see wiki/rule-archive.md) —
// this file only covers what a deterministic, Kilo-free run can cover.
//
// Run: node --experimental-strip-types tests/subtask-gate.test.mjs
//
// round 6 (objective audit) found this test file existed only as prose claims in
// wiki/rule-archive.md ("10/10 unit tests") with no actual committed artifact — every round had
// to re-derive and re-run it from scratch, live, against the model. Committing it fixes that.
import { execSync } from "child_process"
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync } from "fs"
import { tmpdir } from "os"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const SRC_PLUGIN = join(dirname(fileURLToPath(import.meta.url)), "..", ".kilo", "plugins", "subtask-gate.ts")

function freshRepo() {
  const dir = mkdtempSync(join(tmpdir(), "sgate-l09-"))
  mkdirSync(join(dir, ".kilo", "plugins"), { recursive: true })
  mkdirSync(join(dir, "wiki", "protocols"), { recursive: true })
  mkdirSync(join(dir, "wiki", "handoffs"), { recursive: true })
  cpSync(SRC_PLUGIN, join(dir, ".kilo", "plugins", "subtask-gate.ts"))
  writeFileSync(join(dir, "wiki", "protocols", "refactor.md"), "# refactor\n")
  writeFileSync(join(dir, "wiki", "handoffs", "SESSION_PRIMER.md"), "# primer\n")
  // Final round: mirror bootstrap.sh's own real .gitignore line for this exact file — without
  // it, a `git add -A` anywhere in a test (several already do this) tracks the gate's own
  // runtime state file, and its git-derived fields (turnStartHead/turnStartDirtySignature,
  // final round) then legitimately change on every save, making a committed copy look "dirty"
  // forever after — a test-fixture gap the contradiction-injection work exposed, not a
  // production bug (a real bootstrap has always gitignored this file).
  writeFileSync(join(dir, ".gitignore"), ".kilo/plugins/.subtask-gate-state.json\n")
  execSync("git init -q", { cwd: dir })
  execSync('git -c user.email=t@t -c user.name=t commit --allow-empty -q -m init', { cwd: dir })
  return dir
}

let failures = 0
async function assertThrows(label, fn) {
  try {
    await fn()
    console.log(`FAIL: ${label} — expected throw, none happened`)
    failures++
  } catch (e) {
    console.log(`ok: ${label} — blocked: ${String(e.message || e).slice(0, 60)}...`)
  }
}
async function assertNoThrow(label, fn) {
  try {
    await fn()
    console.log(`ok: ${label} — not blocked`)
  } catch (e) {
    console.log(`FAIL: ${label} — unexpectedly blocked: ${e.message}`)
    failures++
  }
}

async function loadGate(dir) {
  const mod = await import(`${join(dir, ".kilo", "plugins", "subtask-gate.ts")}?t=${Date.now()}`)
  const hooks = await mod.SubtaskGate()
  return hooks
}

// Round 27: for the `event`/session.idle hook, which needs a `client.session.prompt` call —
// a fake spy recording calls instead of a real Kilo server (same isolation-from-Kilo
// discipline as the rest of this file; the real call is covered by the live `kilo run`
// re-verification, not this unit test).
async function loadGateWithClient(dir) {
  const calls = []
  const client = {
    session: {
      prompt: async (opts) => {
        calls.push(opts)
        return { info: { role: "user" }, parts: [] }
      },
    },
  }
  const mod = await import(`${join(dir, ".kilo", "plugins", "subtask-gate.ts")}?t=${Date.now()}`)
  const hooks = await mod.SubtaskGate({ client })
  return { hooks, calls }
}

async function main() {
  // Test 1: first mutating call, no protocol doc read yet -> BLOCKED
  {
    const dir = freshRepo()
    const hooks = await loadGate(dir)
    process.chdir(dir)
    await assertThrows(
      "T1 first mutation, no protocol read",
      async () => {
        await hooks["tool.execute.before"](
          { tool: "write", sessionID: "s1" },
          { args: { filePath: join(dir, "foo.py") } }
        )
      }
    )
    rmSync(dir, { recursive: true, force: true })
  }

  // Test 2: read a protocol doc first, then mutate -> NOT blocked
  {
    const dir = freshRepo()
    const hooks = await loadGate(dir)
    process.chdir(dir)
    await hooks["tool.execute.before"](
      { tool: "read", sessionID: "s2" },
      { args: { filePath: join(dir, "wiki", "protocols", "refactor.md") } }
    )
    await assertNoThrow(
      "T2 protocol doc read, then first mutation",
      async () => {
        await hooks["tool.execute.before"](
          { tool: "write", sessionID: "s2" },
          { args: { filePath: join(dir, "foo.py") } }
        )
      }
    )
    rmSync(dir, { recursive: true, force: true })
  }

  // Test 3: reading an unrelated file does NOT satisfy the check
  {
    const dir = freshRepo()
    const hooks = await loadGate(dir)
    process.chdir(dir)
    await hooks["tool.execute.before"](
      { tool: "read", sessionID: "s3" },
      { args: { filePath: join(dir, "foo.py") } }
    )
    await assertThrows(
      "T3 unrelated file read doesn't satisfy the check",
      async () => {
        await hooks["tool.execute.before"](
          { tool: "write", sessionID: "s3" },
          { args: { filePath: join(dir, "foo.py") } }
        )
      }
    )
    rmSync(dir, { recursive: true, force: true })
  }

  // Test 4 (round 5, rewritten after the objective audit's live reproduction): the check now
  // blocks EVERY mutating call, not just the first, until a real protocol-doc read happens —
  // no more "one blocked attempt disarms it for the rest of the session." A DIFFERENT
  // mutating call (not a verbatim retry) must still be blocked if no read happened in between.
  {
    const dir = freshRepo()
    const hooks = await loadGate(dir)
    process.chdir(dir)
    await assertThrows(
      "T4a first mutation blocked",
      async () => {
        await hooks["tool.execute.before"](
          { tool: "write", sessionID: "s4" },
          { args: { filePath: join(dir, "foo.py") } }
        )
      }
    )
    await assertThrows(
      "T4b a DIFFERENT mutation, still no protocol read, still blocked (audit's live finding)",
      async () => {
        await hooks["tool.execute.before"](
          { tool: "bash", sessionID: "s4" },
          { args: { command: "echo hi > bar.py" } }
        )
      }
    )
    await hooks["tool.execute.before"](
      { tool: "read", sessionID: "s4" },
      { args: { filePath: join(dir, "wiki", "protocols", "refactor.md") } }
    )
    await assertNoThrow(
      "T4c after actually reading a protocol doc, mutation goes through",
      async () => {
        await hooks["tool.execute.before"](
          { tool: "write", sessionID: "s4" },
          { args: { filePath: join(dir, "foo.py") } }
        )
      }
    )
    rmSync(dir, { recursive: true, force: true })
  }

  // Test 5: non-mutating tools (e.g. "glob") never trigger the check, protocol read or not
  {
    const dir = freshRepo()
    const hooks = await loadGate(dir)
    process.chdir(dir)
    await assertNoThrow(
      "T5 non-mutating tool call is never blocked",
      async () => {
        await hooks["tool.execute.before"](
          { tool: "glob", sessionID: "s5" },
          { args: { pattern: "**/*.py" } }
        )
      }
    )
    rmSync(dir, { recursive: true, force: true })
  }

  // Test 6: pre-existing L06/L07 post-commit gate still works unchanged (regression check)
  {
    const dir = freshRepo()
    const hooks = await loadGate(dir)
    process.chdir(dir)
    // satisfy L09 check first so it doesn't interfere with this test's own assertion
    await hooks["tool.execute.before"](
      { tool: "read", sessionID: "s6" },
      { args: { filePath: join(dir, "wiki", "protocols", "refactor.md") } }
    )
    // commit touching SESSION_PRIMER.md — round 28: the boundary is derived straight from git
    // on demand (computeBoundary()), so no "after" hook call is needed to record a baseline
    // HEAD first; the next tool.execute.before call below sees this commit directly.
    writeFileSync(join(dir, "wiki", "handoffs", "SESSION_PRIMER.md"), "# primer updated\n")
    execSync("git add -A && git -c user.email=t@t -c user.name=t commit -q -m primer", { cwd: dir })
    await assertThrows(
      "T6 post-commit primer gate still fires (regression check)",
      async () => {
        await hooks["tool.execute.before"](
          { tool: "write", sessionID: "s6" },
          { args: { filePath: join(dir, "foo.py") } }
        )
      }
    )
    rmSync(dir, { recursive: true, force: true })
  }

  // Test 7 (round 5): chat.message injects a warning when uncommitted work carries over from
  // before this message started — the audit's #1 priority finding, live-reproduced (a write +
  // manual test + silent stop, no commit). Simulates the "next message in the session" moment.
  {
    const dir = freshRepo()
    const hooks = await loadGate(dir)
    process.chdir(dir)
    writeFileSync(join(dir, "leftover.py"), "print('uncommitted')\n")
    const output = { message: { id: "msg_test" }, parts: [{ type: "text", text: "continue" }] }
    await hooks["chat.message"]({ sessionID: "s7" }, output)
    const injected = output.parts[0]
    if (injected?.synthetic === true && /leftover\.py/.test(injected.text) && /Uncommitted/.test(injected.text)) {
      console.log("ok: T7 chat.message injects carryover warning naming the dirty file")
    } else {
      console.log("FAIL: T7 chat.message — expected a synthetic warning part naming leftover.py, got:", JSON.stringify(output.parts[0]))
      failures++
    }
    // clean tree -> no injection
    const output2 = { message: { id: "msg_test2" }, parts: [{ type: "text", text: "hi" }] }
    execSync("git add -A && git -c user.email=t@t -c user.name=t commit -q -m wip", { cwd: dir })
    await hooks["chat.message"]({ sessionID: "s7" }, output2)
    if (output2.parts.length === 1) {
      console.log("ok: T7b clean tree -> no injection")
    } else {
      console.log("FAIL: T7b clean tree still got an injection:", JSON.stringify(output2.parts))
      failures++
    }
    rmSync(dir, { recursive: true, force: true })
  }

  // Test 8 (round 7, FEEDBACK #4/#12): chat.message nudges toward discuss.md when the message
  // text has no concrete anchor (no backtick/file-extension/quoted string) and is long enough
  // to carry real signal — a coarse heuristic, expected to both under- and over-fire, nudge
  // only, never a block.
  {
    const dir = freshRepo()
    const hooks = await loadGate(dir)
    process.chdir(dir)
    const ambiguous = { message: { id: "m1" }, parts: [{ type: "text", text: "this feels slow when I use it a lot, can you help?" }] }
    await hooks["chat.message"]({ sessionID: "s8a" }, ambiguous)
    if (ambiguous.parts.some((p) => p.synthetic && /discuss\.md/.test(p.text))) {
      console.log("ok: T8a ambiguous message (no concrete anchor) gets nudged toward discuss.md")
    } else {
      console.log("FAIL: T8a expected a discuss.md nudge, got:", JSON.stringify(ambiguous.parts))
      failures++
    }

    // note: freshRepo() never commits .kilo/wiki, so git status is always dirty here — the
    // carryover warning (unrelated to this test) always fires too; only check for the
    // discuss.md nudge specifically, not "any synthetic part."
    const concrete = { message: { id: "m2" }, parts: [{ type: "text", text: "fix the bug in `data_utils.py` where validate_email rejects valid input" }] }
    await hooks["chat.message"]({ sessionID: "s8b" }, concrete)
    if (!concrete.parts.some((p) => p.synthetic && /discuss\.md/.test(p.text))) {
      console.log("ok: T8b concrete message (backtick-quoted file) not nudged toward discuss.md")
    } else {
      console.log("FAIL: T8b unexpectedly nudged a concrete message toward discuss.md:", JSON.stringify(concrete.parts))
      failures++
    }

    const short = { message: { id: "m3" }, parts: [{ type: "text", text: "hello" }] }
    await hooks["chat.message"]({ sessionID: "s8c" }, short)
    if (!short.parts.some((p) => p.synthetic && /discuss\.md/.test(p.text))) {
      console.log("ok: T8c greeting-length message not nudged toward discuss.md")
    } else {
      console.log("FAIL: T8c unexpectedly nudged a greeting toward discuss.md:", JSON.stringify(short.parts))
      failures++
    }
    rmSync(dir, { recursive: true, force: true })
  }

  // Test 9 (round 8, FEEDBACK #3): the primer/elective gate used to clear itself the instant its
  // first post-arm mutating call was blocked, so an immediate retry sailed through unchecked
  // right after. Now it should stay blocked across repeated mutating calls (verbatim retry AND a
  // different mutating call) until a genuinely new chat.message (new user turn) arrives.
  {
    const dir = freshRepo()
    const hooks = await loadGate(dir)
    process.chdir(dir)
    // satisfy L09 first so only the primer/elective gate is under test
    await hooks["tool.execute.before"](
      { tool: "read", sessionID: "s9" },
      { args: { filePath: join(dir, "wiki", "protocols", "refactor.md") } }
    )
    // commit touching SESSION_PRIMER.md -> boundary now derived straight from git (round 28),
    // no "after" hook call needed to record it
    writeFileSync(join(dir, "wiki", "handoffs", "SESSION_PRIMER.md"), "# primer updated\n")
    execSync("git add -A && git -c user.email=t@t -c user.name=t commit -q -m primer", { cwd: dir })

    await assertThrows(
      "T9a first mutation after arming — blocked",
      async () => {
        await hooks["tool.execute.before"](
          { tool: "write", sessionID: "s9" },
          { args: { filePath: join(dir, "foo.py") } }
        )
      }
    )
    await assertThrows(
      "T9b immediate VERBATIM retry of the same blocked call — still blocked (the actual bug)",
      async () => {
        await hooks["tool.execute.before"](
          { tool: "write", sessionID: "s9" },
          { args: { filePath: join(dir, "foo.py") } }
        )
      }
    )
    await assertThrows(
      "T9c a DIFFERENT mutating call, same session, no new message yet — still blocked",
      async () => {
        await hooks["tool.execute.before"](
          { tool: "bash", sessionID: "s9" },
          { args: { command: "echo hi > bar.py" } }
        )
      }
    )
    // a new user message arrives -> the only mechanical proxy for "user was asked and responded"
    await hooks["chat.message"]({ sessionID: "s9" }, { message: { id: "m9" }, parts: [{ type: "text", text: "continue" }] })
    await assertNoThrow(
      "T9d after a new chat.message, mutation goes through",
      async () => {
        await hooks["tool.execute.before"](
          { tool: "write", sessionID: "s9" },
          { args: { filePath: join(dir, "foo.py") } }
        )
      }
    )
    rmSync(dir, { recursive: true, force: true })
  }

  // Test 10 (round 27): the `event` hook's session.idle handler — the new mechanism closing
  // the "session ends idle with uncommitted work, no next message, nothing catches it" gap.
  {
    const dir = freshRepo()
    const { hooks, calls } = await loadGateWithClient(dir)
    writeFileSync(join(dir, "leftover.py"), "print('uncommitted')\n")

    await hooks["event"]({ event: { type: "some.other.event", properties: {} } })
    if (calls.length === 0) {
      console.log("ok: T10a non-idle event ignored")
    } else {
      console.log("FAIL: T10a non-idle event triggered a nudge:", JSON.stringify(calls))
      failures++
    }

    await hooks["event"]({ event: { type: "session.idle", properties: { sessionID: "s10" } } })
    if (calls.length === 1 && calls[0]?.body?.noReply === true && /leftover\.py/.test(calls[0]?.body?.parts?.[0]?.text ?? "") && /^msg_/.test(calls[0]?.body?.messageID ?? "")) {
      console.log("ok: T10b session.idle with dirty tree sends one noReply nudge naming the file")
    } else {
      console.log("FAIL: T10b expected one noReply nudge naming leftover.py, got:", JSON.stringify(calls))
      failures++
    }

    // repeat idle, same unresolved dirty set -> dedup, no second call
    await hooks["event"]({ event: { type: "session.idle", properties: { sessionID: "s10" } } })
    if (calls.length === 1) {
      console.log("ok: T10c repeat session.idle, same dirty signature — deduped, no 2nd call")
    } else {
      console.log("FAIL: T10c dedup failed, calls:", JSON.stringify(calls))
      failures++
    }

    // dirty set changes -> nudges again
    writeFileSync(join(dir, "another.py"), "print('also uncommitted')\n")
    await hooks["event"]({ event: { type: "session.idle", properties: { sessionID: "s10" } } })
    if (calls.length === 2) {
      console.log("ok: T10d dirty set changed — nudges again")
    } else {
      console.log("FAIL: T10d expected a 2nd nudge on a changed dirty set, calls:", JSON.stringify(calls))
      failures++
    }

    // tree goes clean -> no nudge, and the stored signature clears
    execSync("git add -A && git -c user.email=t@t -c user.name=t commit -q -m wip", { cwd: dir })
    await hooks["event"]({ event: { type: "session.idle", properties: { sessionID: "s10" } } })
    if (calls.length === 2) {
      console.log("ok: T10e clean tree — no nudge")
    } else {
      console.log("FAIL: T10e clean tree unexpectedly nudged, calls:", JSON.stringify(calls))
      failures++
    }
    rmSync(dir, { recursive: true, force: true })
  }

  // Test 11 (round 27): chat.message must not treat this plugin's own synthetic idle-nudge
  // append as a genuine new user turn (would wrongly clear FEEDBACK #3's arm, or fire the
  // ambiguity nudge on our own nudge text).
  {
    const dir = freshRepo()
    const hooks = await loadGate(dir)
    process.chdir(dir)
    // commit touching SESSION_PRIMER.md -> boundary now derived straight from git (round 28),
    // no "after" hook call needed to arm it
    writeFileSync(join(dir, "wiki", "handoffs", "SESSION_PRIMER.md"), "# primer updated\n")
    execSync("git add -A && git -c user.email=t@t -c user.name=t commit -q -m primer", { cwd: dir })

    const idleNudgeOutput = { message: { id: "msg_idlenudgeTEST" }, parts: [{ type: "text", text: "[subtask-gate] this feels slow when I use it a lot" }] }
    await hooks["chat.message"]({ sessionID: "s11", messageID: "msg_idlenudgeTEST" }, idleNudgeOutput)
    if (idleNudgeOutput.parts.length === 1) {
      console.log("ok: T11a idle-nudge messageID skipped — no ambiguity nudge added to our own text")
    } else {
      console.log("FAIL: T11a idle-nudge message got extra parts:", JSON.stringify(idleNudgeOutput.parts))
      failures++
    }
    // Read a protocol doc first so the OTHER, unrelated gate (L09's protocol-read check,
    // which fires independently of `armed`) can't mask what this specific assertion needs to
    // isolate: that the arm itself is still set (a bug here would surface as the block
    // message changing from BLOCK_MESSAGE_COMMIT to "not blocked", not as "no throw at all").
    await hooks["tool.execute.before"](
      { tool: "read", sessionID: "s11" },
      { args: { filePath: join(dir, "wiki", "protocols", "refactor.md") } }
    )
    try {
      await hooks["tool.execute.before"](
        { tool: "write", sessionID: "s11" },
        { args: { filePath: join(dir, "foo.py") } }
      )
      console.log("FAIL: T11b expected the primer arm to still be set (our synthetic message must not have cleared it), but the mutation went through unblocked")
      failures++
    } catch (e) {
      if (/SESSION_PRIMER\.md was just committed/.test(String(e.message || e))) {
        console.log("ok: T11b arm specifically not cleared by our own synthetic idle-nudge message")
      } else {
        console.log("FAIL: T11b blocked, but for the wrong reason (arm state unclear):", e.message)
        failures++
      }
    }
    rmSync(dir, { recursive: true, force: true })
  }

  // Test 12 (round 28, FEEDBACK #41 regression): reproduces the exact live bypass, not just
  // "did it throw" — round 8's clearing logic deleted the arm on ANY next message, with no
  // check that a block had ever actually fired for it. The live trial that found this had the
  // model correctly follow design.md's "commit, then stop — no further tool call" instruction:
  // a primer commit lands, but the model never makes another tool call this turn, so no block
  // ever fires. The next message ("continue") used to disarm the gate for free, and the
  // following mutating call sailed through unblocked. Against the pre-round-28 design this
  // scenario FAILS (that unblocked call is the actual bug); against the SHA-derived redesign it
  // must stay blocked, since neither exemption applies: the boundary was never acknowledged (no
  // block fired to earn it) and it isn't the session's pre-existing boundary either (the
  // session was already in progress, via the "start" message below, before the primer commit
  // landed — so rule (b)'s fresh-session courtesy doesn't apply here).
  {
    const dir = freshRepo()
    const hooks = await loadGate(dir)
    process.chdir(dir)
    await hooks["tool.execute.before"](
      { tool: "read", sessionID: "s12" },
      { args: { filePath: join(dir, "wiki", "protocols", "refactor.md") } }
    )
    // this session is already in progress BEFORE the primer commit lands — its first message
    // pre-approves whatever boundary exists at that point (none yet), not the one that shows
    // up later
    await hooks["chat.message"]({ sessionID: "s12" }, { message: { id: "m0" }, parts: [{ type: "text", text: "start the sub-task" }] })
    // design.md step: commit SESSION_PRIMER.md, closing out the sub-task
    writeFileSync(join(dir, "wiki", "handoffs", "SESSION_PRIMER.md"), "# primer updated\n")
    execSync("git add -A && git -c user.email=t@t -c user.name=t commit -q -m primer", { cwd: dir })
    // ...and then, per design.md, make NO further tool call this turn — the model just replies
    // with text. No block ever fires here, unlike T9's setup.
    await hooks["chat.message"]({ sessionID: "s12" }, { message: { id: "m1" }, parts: [{ type: "text", text: "continue" }] })
    // AGENTS.md L14: assert the specific effect, not just "did it throw" — an unrelated
    // gate (e.g. L09's protocol-read check) throwing first would pass a bare assertThrows too
    // and mask a real regression here.
    try {
      await hooks["tool.execute.before"](
        { tool: "write", sessionID: "s12" },
        { args: { filePath: join(dir, "foo.py") } }
      )
      console.log("FAIL: T12 FEEDBACK #41 exact bypass — expected the primer boundary to still block, but the mutation went through unblocked")
      failures++
    } catch (e) {
      if (/SESSION_PRIMER\.md was just committed/.test(String(e.message || e))) {
        console.log("ok: T12 FEEDBACK #41 exact bypass: primer commit armed, no block ever fired, new message arrives — next mutation still blocked, specifically by the primer gate")
      } else {
        console.log("FAIL: T12 blocked, but for the wrong reason:", e.message)
        failures++
      }
    }
    rmSync(dir, { recursive: true, force: true })
  }

  // Test 13 (round 28, FEEDBACK #41 fix's own fresh-session exemption, rule b): without this
  // exemption, the SHA-derived redesign above would block the exact fresh-session workflow
  // build.md recommends ("the next build — ideally in a fresh session") on a boundary that
  // brand-new session never had a chance to see or respond to — trading #41's false negative
  // for a new false positive. A session's first message must pre-approve whatever boundary
  // already exists at that moment.
  {
    const dir = freshRepo()
    const hooks = await loadGate(dir)
    process.chdir(dir)
    // a primer commit already landed before this session ever started (e.g. the previous,
    // now-ended session closed out its sub-task correctly)
    writeFileSync(join(dir, "wiki", "handoffs", "SESSION_PRIMER.md"), "# primer updated\n")
    execSync("git add -A && git -c user.email=t@t -c user.name=t commit -q -m primer", { cwd: dir })
    // brand-new session's first message
    await hooks["chat.message"]({ sessionID: "s13" }, { message: { id: "m1" }, parts: [{ type: "text", text: "start the next sub-task" }] })
    // satisfy L09 so only the boundary exemption is under test
    await hooks["tool.execute.before"](
      { tool: "read", sessionID: "s13" },
      { args: { filePath: join(dir, "wiki", "protocols", "refactor.md") } }
    )
    await assertNoThrow(
      "T13 fresh-session courtesy: a brand-new session's first mutation is not blocked by a pre-existing boundary",
      async () => {
        await hooks["tool.execute.before"](
          { tool: "write", sessionID: "s13" },
          { args: { filePath: join(dir, "foo.py") } }
        )
      }
    )
    rmSync(dir, { recursive: true, force: true })
  }

  // Test 14 (round 29, FEEDBACK #46): genuinely not a git repo — the one case that must stay
  // silent (nothing to enforce). Same file layout as freshRepo() but skip `git init` entirely,
  // so isInsideWorkTree() sees a real "not a repo" and computeBoundary returns null, not a
  // GitFailure.
  {
    const dir = mkdtempSync(join(tmpdir(), "sgate-l09-"))
    mkdirSync(join(dir, ".kilo", "plugins"), { recursive: true })
    mkdirSync(join(dir, "wiki", "protocols"), { recursive: true })
    mkdirSync(join(dir, "wiki", "handoffs"), { recursive: true })
    cpSync(SRC_PLUGIN, join(dir, ".kilo", "plugins", "subtask-gate.ts"))
    writeFileSync(join(dir, "wiki", "protocols", "refactor.md"), "# refactor\n")
    writeFileSync(join(dir, "wiki", "handoffs", "SESSION_PRIMER.md"), "# primer\n")
    // deliberately no `git init` here
    const hooks = await loadGate(dir)
    await hooks["tool.execute.before"](
      { tool: "read", sessionID: "s14" },
      { args: { filePath: join(dir, "wiki", "protocols", "refactor.md") } }
    )
    await assertNoThrow(
      "T14 not a git repo at all — not blocked",
      async () => {
        await hooks["tool.execute.before"](
          { tool: "write", sessionID: "s14" },
          { args: { filePath: join(dir, "foo.py") } }
        )
      }
    )
    rmSync(dir, { recursive: true, force: true })
  }

  // Test 15 (round 29, FEEDBACK #46): a real repo where `git rev-parse HEAD` itself fails — an
  // unborn-HEAD repo (`git init`, zero commits) reproduces this without any mocking:
  // `--is-inside-work-tree` succeeds (it's a real repo) but `rev-parse HEAD` has nothing to
  // resolve. Before this fix, currentHead()'s catch returned null here, computeBoundary treated
  // that identically to "not a repo," and the gate silently passed with no message at all — the
  // exact fail-open this item exists to close. Must now fail CLOSED, and must name the actual
  // failing command, not just throw something.
  {
    const dir = mkdtempSync(join(tmpdir(), "sgate-l09-"))
    mkdirSync(join(dir, ".kilo", "plugins"), { recursive: true })
    mkdirSync(join(dir, "wiki", "protocols"), { recursive: true })
    mkdirSync(join(dir, "wiki", "handoffs"), { recursive: true })
    cpSync(SRC_PLUGIN, join(dir, ".kilo", "plugins", "subtask-gate.ts"))
    writeFileSync(join(dir, "wiki", "protocols", "refactor.md"), "# refactor\n")
    writeFileSync(join(dir, "wiki", "handoffs", "SESSION_PRIMER.md"), "# primer\n")
    execSync("git init -q", { cwd: dir }) // repo exists, but no commit -> HEAD is unborn
    const hooks = await loadGate(dir)
    await hooks["tool.execute.before"](
      { tool: "read", sessionID: "s15" },
      { args: { filePath: join(dir, "wiki", "protocols", "refactor.md") } }
    )
    try {
      await hooks["tool.execute.before"](
        { tool: "write", sessionID: "s15" },
        { args: { filePath: join(dir, "foo.py") } }
      )
      console.log("FAIL: T15 expected fail-closed block on an unborn-HEAD repo, but the mutation went through unblocked")
      failures++
    } catch (e) {
      const msg = String(e.message || e)
      if (/rev-parse HEAD/.test(msg) && /Failing closed/.test(msg)) {
        console.log("ok: T15 real repo, `git rev-parse HEAD` fails (unborn HEAD) — blocked, specific command named")
      } else {
        console.log("FAIL: T15 blocked, but message doesn't name the failing command:", msg)
        failures++
      }
    }
    rmSync(dir, { recursive: true, force: true })
  }

  // Test 16 (round 29, FEEDBACK #46): commitCountSince's own fail-closed path, isolated. Cannot
  // be reproduced end-to-end through the public hooks with a realistic corrupted repo — verified
  // live (see T16's sibling investigation, not repeated here): git rev-list's object needs are a
  // strict subset of git log's (log needs tree objects to diff paths per-commit; rev-list only
  // needs commit objects for parent-walking), so any corruption that breaks `git rev-list` also
  // breaks lastPrimerTouchSha()'s `git log` call first — that helper runs first inside
  // computeBoundary(), every time, before commitCountSince ever gets a chance to fail on its own.
  // Instead: a real repo, real HEAD, and a syntactically-valid-but-nonexistent `fromSha` (a real
  // git error, "Invalid revision range", not a mock) exercises commitCountSince directly via the
  // __internal test export. computeBoundary()'s own fail-closed wiring (the shared try/catch
  // around all three helpers) is already proven by T15 using currentHead's natural failure —
  // since all three throw the same GitCommandError into the same catch, T15 + this test together
  // cover "commitCountSince fails -> blocked" without needing an artificial full-stack mock.
  {
    const dir = freshRepo()
    const mod = await import(`${join(dir, ".kilo", "plugins", "subtask-gate.ts")}?t=${Date.now()}`)
    const { commitCountSince, GitCommandError } = mod.__internal
    const head = execSync("git rev-parse HEAD", { cwd: dir, encoding: "utf8" }).trim()
    const bogusFromSha = "0000000000000000000000000000000000000000" // well-formed, but no such object
    try {
      commitCountSince(bogusFromSha, head)
      console.log("FAIL: T16 expected commitCountSince to throw on an invalid revision range, it returned normally")
      failures++
    } catch (e) {
      if (e instanceof GitCommandError && /rev-list/.test(e.command)) {
        console.log(`ok: T16 commitCountSince fails closed on a bad rev-list range — GitCommandError(${e.command})`)
      } else {
        console.log("FAIL: T16 threw, but not the expected GitCommandError naming rev-list:", e)
        failures++
      }
    }
    rmSync(dir, { recursive: true, force: true })
  }

  // Test 17 (round 29, FEEDBACK #46, axis-C-discovered gate bypass): `background_process` used
  // to be entirely absent from MUTATING_TOOLS — a real complexity-ladder trial found this live,
  // read subtask-gate.ts's own source (via the never-blocked `read` tool), and used
  // `background_process` to write files and `git commit`, bypassing an armed gate completely.
  // Regression check: it must now be blocked exactly like `write`/`bash`/etc once a boundary is
  // open, with the same specific block message (not just "did it throw").
  {
    const dir = freshRepo()
    const hooks = await loadGate(dir)
    process.chdir(dir)
    await hooks["tool.execute.before"](
      { tool: "read", sessionID: "s17" },
      { args: { filePath: join(dir, "wiki", "protocols", "refactor.md") } }
    )
    writeFileSync(join(dir, "wiki", "handoffs", "SESSION_PRIMER.md"), "# primer updated\n")
    execSync("git add -A && git -c user.email=t@t -c user.name=t commit -q -m primer", { cwd: dir })
    try {
      await hooks["tool.execute.before"](
        { tool: "background_process", sessionID: "s17" },
        { args: { command: "echo pwned > foo.txt && git add -A && git commit -m pwned" } }
      )
      console.log("FAIL: T17 expected background_process to be blocked by the armed primer gate, but it went through unblocked")
      failures++
    } catch (e) {
      if (/SESSION_PRIMER\.md was just committed/.test(String(e.message || e))) {
        console.log("ok: T17 background_process is now a MUTATING_TOOL — blocked by the armed gate, same as write/bash")
      } else {
        console.log("FAIL: T17 blocked, but for the wrong reason:", e.message)
        failures++
      }
    }
    rmSync(dir, { recursive: true, force: true })
  }

  // Test 18 (round 30 item 2, work order): MUTATING_TOOLS was a denylist of 7 known names against
  // a real tool surface of 17 (round 28's own MITM capture) — round 29's T17 fix only patched the
  // one name (`background_process`) a live trial happened to find; the other 10 unlisted names
  // were still free to bypass the gate the same way. Round 30 inverted this to a small allowlist
  // of proven-read-only names (read/grep/glob/question) with everything else fail-closed by
  // construction. This is the acceptance test for that inversion: a tool name that does not exist
  // yet — not in the old denylist, not in the new allowlist, not in any captured tool schema —
  // must still be blocked by an armed gate. If this passes, a *future* Kilo tool this project has
  // never seen is safe by default; the old denylist could never have made that guarantee.
  {
    const dir = freshRepo()
    const hooks = await loadGate(dir)
    process.chdir(dir)
    await hooks["tool.execute.before"](
      { tool: "read", sessionID: "s18" },
      { args: { filePath: join(dir, "wiki", "protocols", "refactor.md") } }
    )
    writeFileSync(join(dir, "wiki", "handoffs", "SESSION_PRIMER.md"), "# primer updated\n")
    execSync("git add -A && git -c user.email=t@t -c user.name=t commit -q -m primer", { cwd: dir })
    try {
      await hooks["tool.execute.before"](
        { tool: "some_future_tool_kilo_has_not_shipped_yet", sessionID: "s18" },
        { args: {} }
      )
      console.log("FAIL: T18 expected an unrecognized tool name to be blocked by the armed primer gate (fail-closed), but it went through unblocked")
      failures++
    } catch (e) {
      if (/SESSION_PRIMER\.md was just committed/.test(String(e.message || e))) {
        console.log("ok: T18 an unrecognized/future tool name is fail-closed by default — blocked by the armed gate, same as write/bash")
      } else {
        console.log("FAIL: T18 blocked, but for the wrong reason:", e.message)
        failures++
      }
    }
    rmSync(dir, { recursive: true, force: true })
  }

  // Test 19 (round 30 item 3, work order, #46/#47's common root): the elective arm judging
  // mid-turn (re-evaluated fresh on every single tool call, old behavior) trapped a model with
  // no escape the instant a 4th non-primer commit landed inside one turn — `bash` blocked
  // entirely, including read-only diagnostic commands, producing either a gate-source-reading
  // bypass (#46) or a 20-retry storm (#47). Fix: the elective arm now only blocks if it already
  // existed as of the start of the CURRENT turn; one freshly crossed mid-turn is deferred to the
  // next turn boundary, not dropped.
  {
    const dir = freshRepo()
    const hooks = await loadGate(dir)
    process.chdir(dir)
    // Turn 1 starts: a chat.message before any tool call, matching real production ordering
    // (chat.message always precedes that turn's tool calls) — this is what gives
    // boundaryAtSessionStart something real to record (no boundary yet at session start), same
    // as every other test in this file that exercises the fresh-session path.
    await hooks["chat.message"]({ sessionID: "s19" }, { message: { id: "m19a" }, parts: [{ type: "text", text: "start" }] })
    // satisfy L09 first so only the elective gate is under test
    await hooks["tool.execute.before"](
      { tool: "read", sessionID: "s19" },
      { args: { filePath: join(dir, "wiki", "protocols", "refactor.md") } }
    )
    // Land COMMITS_WITHOUT_PRIMER_THRESHOLD (4) total commits reachable from HEAD, none touching
    // SESSION_PRIMER.md, all within this same turn (freshRepo()'s own initial commit is 1 of the
    // 4; three more here cross the threshold) — no chat.message in between, i.e. mid-turn.
    // `git add <file>` (not `-A`): freshRepo() leaves SESSION_PRIMER.md sitting untracked on
    // disk, so a blanket `-A` here would accidentally sweep it into the first of these commits,
    // making it a primer touch and invalidating this test's whole elective-only premise.
    for (const f of ["a.txt", "b.txt", "c.txt"]) {
      writeFileSync(join(dir, f), "x")
      execSync(`git add ${f} && git -c user.email=t@t -c user.name=t commit -q -m ${f}`, { cwd: dir })
    }
    await assertNoThrow(
      "T19a elective threshold crossed mid-turn (no new chat.message since) — not blocked yet",
      async () => {
        await hooks["tool.execute.before"](
          { tool: "write", sessionID: "s19" },
          { args: { filePath: join(dir, "foo.py") } }
        )
      }
    )
    // Turn 2 starts -> chat.message refreshes electiveBoundaryAtTurnStart to the now-open
    // elective boundary (boundaryAtSessionStart itself is untouched — already set at turn 1, so
    // this is NOT the fresh-session courtesy path clearing it a second time).
    await hooks["chat.message"]({ sessionID: "s19" }, { message: { id: "m19b" }, parts: [{ type: "text", text: "continue" }] })
    await assertThrows(
      "T19b same elective boundary, now snapshotted at a turn boundary — blocked",
      async () => {
        await hooks["tool.execute.before"](
          { tool: "write", sessionID: "s19" },
          { args: { filePath: join(dir, "foo.py") } }
        )
      }
    )
    rmSync(dir, { recursive: true, force: true })
  }

  // Test 20 (final round, contradiction injection — FEEDBACK #6): a turn that produced N>=1
  // gate blocks and zero successful mutating calls must have its NEXT chat.message inject a
  // factual notice naming the specific blocked calls — reproducing round 31's live evidence
  // (18 straight primer-gate blocks, model claimed "완료"/"PASS" the whole time; ground truth:
  // no files, clean tree, HEAD unmoved). AGENTS.md L14: assert the specific injected text, not
  // just "did something get added."
  {
    const dir = freshRepo()
    const hooks = await loadGate(dir)
    process.chdir(dir)
    await hooks["chat.message"]({ sessionID: "s20" }, { message: { id: "m1" }, parts: [{ type: "text", text: "start" }] })
    await hooks["tool.execute.before"](
      { tool: "read", sessionID: "s20" },
      { args: { filePath: join(dir, "wiki", "protocols", "refactor.md") } }
    )
    // A primer commit lands (simulating a legitimate boundary from earlier this session/a prior
    // one) — a real commit, not a blocked attempt.
    writeFileSync(join(dir, "wiki", "handoffs", "SESSION_PRIMER.md"), "# primer updated\n")
    execSync("git add -A && git -c user.email=t@t -c user.name=t commit -q -m primer", { cwd: dir })
    // New turn begins: this snapshots the post-primer-commit HEAD/dirty-tree as this turn's
    // baseline.
    await hooks["chat.message"]({ sessionID: "s20" }, { message: { id: "m2" }, parts: [{ type: "text", text: "continue" }] })
    // Two DISTINCT mutating calls, both blocked by the now-armed (unacknowledged) primer
    // boundary — neither one performs any real file/git operation (this test only exercises the
    // hook, not a real tool executor), so git state stays exactly at the baseline just set.
    await assertThrows("T20 setup: bash blocked", async () => {
      await hooks["tool.execute.before"](
        { tool: "bash", sessionID: "s20" },
        { args: { command: "mkdir -p tools", description: "Create tools directory" } }
      )
    })
    await assertThrows("T20 setup: write blocked", async () => {
      await hooks["tool.execute.before"](
        { tool: "write", sessionID: "s20" },
        { args: { filePath: "tools/wordcount_core.py" } }
      )
    })
    // Next turn: git confirms nothing landed since the baseline -> inject.
    const output = { message: { id: "m3" }, parts: [{ type: "text", text: "continue" }] }
    await hooks["chat.message"]({ sessionID: "s20" }, output)
    const notice = output.parts.find((p) => p?.synthetic && /fact check/.test(p.text))
    if (
      notice &&
      /2 tool call\(s\)/.test(notice.text) &&
      /bash\(mkdir -p tools\)/.test(notice.text) &&
      /write\(tools\/wordcount_core\.py\)/.test(notice.text) &&
      /HEAD and the working tree are both unchanged/.test(notice.text)
    ) {
      console.log("ok: T20 contradiction injection names both blocked calls, exact text")
    } else {
      console.log("FAIL: T20 expected a contradiction notice naming both blocked calls, got:", JSON.stringify(output.parts))
      failures++
    }
    rmSync(dir, { recursive: true, force: true })
  }

  // Test 21 (final round, contradiction injection — negative case): a turn with at least one
  // successful mutating call must NOT get a contradiction notice next turn, even if a DIFFERENT
  // call was also blocked earlier the same turn (design cautions: derive "nothing happened" from
  // real git state, not from the blocked-call bookkeeping alone).
  {
    const dir = freshRepo()
    const hooks = await loadGate(dir)
    process.chdir(dir)
    await hooks["chat.message"]({ sessionID: "s21" }, { message: { id: "m1" }, parts: [{ type: "text", text: "start" }] })
    // First mutating call this session, before any protocols/*.md read -> blocked (L09 gate).
    await assertThrows("T21 setup: first mutation blocked (no protocol read yet)", async () => {
      await hooks["tool.execute.before"](
        { tool: "write", sessionID: "s21" },
        { args: { filePath: join(dir, "foo.py") } }
      )
    })
    await hooks["tool.execute.before"](
      { tool: "read", sessionID: "s21" },
      { args: { filePath: join(dir, "wiki", "protocols", "refactor.md") } }
    )
    // Second mutating call this same turn now succeeds (L09 satisfied, no primer/elective
    // boundary armed yet) — and this time the test performs the real write + commit a
    // successful tool execution would have produced, so git state genuinely moves.
    await assertNoThrow("T21 setup: second mutation succeeds", async () => {
      await hooks["tool.execute.before"](
        { tool: "write", sessionID: "s21" },
        { args: { filePath: join(dir, "foo.py") } }
      )
    })
    writeFileSync(join(dir, "foo.py"), "print(1)\n")
    execSync("git add foo.py && git -c user.email=t@t -c user.name=t commit -q -m foo", { cwd: dir })
    const output = { message: { id: "m2" }, parts: [{ type: "text", text: "continue" }] }
    await hooks["chat.message"]({ sessionID: "s21" }, output)
    if (!output.parts.some((p) => p?.synthetic && /fact check/.test(p.text))) {
      console.log("ok: T21 a turn with a successful mutation gets no contradiction notice, even though an earlier call that turn was blocked")
    } else {
      console.log("FAIL: T21 unexpected contradiction notice after a successful mutation:", JSON.stringify(output.parts))
      failures++
    }
    rmSync(dir, { recursive: true, force: true })
  }

  console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`)
  process.exit(failures === 0 ? 0 : 1)
}

main()

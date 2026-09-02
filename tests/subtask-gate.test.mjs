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
    // Round 45: narrowed from "no parts were added at all" to this test's actual subject, the
    // carryover notice. The commit above is what makes the tree clean and it touches
    // SESSION_PRIMER.md, so from round 45 on this same message legitimately carries a
    // pending-checkpoint notice — asserting a raw part count here would make T7b fail on a
    // different notice's existence rather than on the carryover behavior it was written for.
    if (!output2.parts.some((p) => /Uncommitted changes/.test(p?.text ?? ""))) {
      console.log("ok: T7b clean tree -> no carryover injection")
    } else {
      console.log("FAIL: T7b clean tree still got a carryover injection:", JSON.stringify(output2.parts))
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

  // Test 22 (round 39, real-usage maintenance round): the ambiguity nudge's anchors are all
  // ASCII-punctuation shapes, so Korean directive prose — which is what this project's user
  // actually types — carries none of them and gets told to stop and ask questions instead of
  // acting. Measured on his real transcript (kilo.db ses_fc421bb0fffe5FU22DG4dgcc00, 15 genuine
  // user messages): 12/15 nudged. Both strings below are verbatim from that session. The pair of
  // negative cases underneath is the point of the test — the fix must scope the heuristic out of
  // an uncalibrated script, NOT quietly disable it, so the round-7 English trial prompt must
  // still nudge exactly as before.
  {
    const dir = freshRepo()
    const hooks = await loadGate(dir)
    process.chdir(dir)
    const nudged = (o) => o.parts.some((p) => p.synthetic && /discuss\.md/.test(p.text))

    // verbatim, 2026-08-26 11:26:59 — "Good. Go ahead and build." Maximally directive.
    const directive = { message: { id: "m22a" }, parts: [{ type: "text", text: "좋습니다. 빌드 진행하세요. 지금 바로 시작해주세요." }] }
    await hooks["chat.message"]({ sessionID: "s22a" }, directive)
    if (!nudged(directive)) {
      console.log("ok: T22a a concrete Korean directive is not nudged toward discuss.md")
    } else {
      console.log("FAIL: T22a a Korean directive was nudged as ambiguous:", JSON.stringify(directive.parts))
      failures++
    }

    // verbatim, 2026-08-29 10:13:37 — "Are you listening to me? I told you to check the system
    // structure. Don't do development." The message that immediately preceded his complaint.
    const restated = { message: { id: "m22b" }, parts: [{ type: "text", text: "내 말을 듣고 있어요? 시스템 구조 확인하라고 했습니다. 개발 진행 하지마시구요.." }] }
    await hooks["chat.message"]({ sessionID: "s22b" }, restated)
    if (!nudged(restated)) {
      console.log("ok: T22b the live-transcript message that preceded the user's complaint is not nudged")
    } else {
      console.log("FAIL: T22b live-transcript restatement was nudged as ambiguous:", JSON.stringify(restated.parts))
      failures++
    }

    // negative case 1: round 7's own English trial prompt must still nudge — proves the fix
    // narrowed the heuristic's domain rather than turning it off.
    const englishVague = { message: { id: "m22c" }, parts: [{ type: "text", text: "this feels slow when I use it a lot, can you help?" }] }
    await hooks["chat.message"]({ sessionID: "s22c" }, englishVague)
    if (nudged(englishVague)) {
      console.log("ok: T22c round 7's English trial prompt still nudged — heuristic narrowed, not disabled")
    } else {
      console.log("FAIL: T22c the English ambiguous prompt stopped being nudged — the fix disabled the heuristic instead of scoping it:", JSON.stringify(englishVague.parts))
      failures++
    }

    // negative case 2: "predominantly non-Latin", not "contains any non-Latin" — a mostly-English
    // vague message with one Korean word must still be judged by the anchors.
    const mostlyEnglish = { message: { id: "m22d" }, parts: [{ type: "text", text: "this whole thing feels 느림 when I run it a lot, can you take a look and help out" }] }
    await hooks["chat.message"]({ sessionID: "s22d" }, mostlyEnglish)
    if (nudged(mostlyEnglish)) {
      console.log("ok: T22d a mostly-English vague message with one foreign word is still judged (predominance, not presence)")
    } else {
      console.log("FAIL: T22d a mostly-English vague message escaped the nudge — the script guard is triggering on mere presence:", JSON.stringify(mostlyEnglish.parts))
      failures++
    }
    rmSync(dir, { recursive: true, force: true })
  }

  // Test 23 (round 39): round 28's boundary courtesy is keyed on a session's FIRST message, on
  // build.md's one-sub-task-one-session premise. Real use (kilo.db: one warms-mobile session,
  // 2026-08-26 -> 08-29, two sub-tasks, five commits) keeps a single session open for days, so
  // after that first message a boundary can only ever be cleared by first spending a
  // visibly-failed tool call — an instruction the user gives BEFORE any block is worth nothing.
  // The fix re-anchors the courtesy to "HEAD did not move for the whole turn that just ended and
  // a real new user message arrived." T23b is the load-bearing negative case: FEEDBACK #41's own
  // shape must still block, inside this same long-lived-session setup.
  {
    const dir = freshRepo()
    const hooks = await loadGate(dir)
    process.chdir(dir)
    await hooks["tool.execute.before"](
      { tool: "read", sessionID: "s23" },
      { args: { filePath: join(dir, "wiki", "protocols", "refactor.md") } }
    )
    // Turn 1 of a long-lived session — no boundary yet, so the fresh-session courtesy records
    // nothing and cannot be what clears anything later.
    await hooks["chat.message"]({ sessionID: "s23" }, { message: { id: "m23a" }, parts: [{ type: "text", text: "start the sub-task" }] })
    // The sub-task closes out: SESSION_PRIMER.md is committed, opening a primer boundary.
    writeFileSync(join(dir, "wiki", "handoffs", "SESSION_PRIMER.md"), "# primer updated\n")
    execSync("git add -A && git -c user.email=t@t -c user.name=t commit -q -m primer", { cwd: dir })
    // Turn 2's message arrives. HEAD MOVED during turn 1 (the primer commit), so this is exactly
    // FEEDBACK #41's shape and must still block — the round 39 exemption must not reach it.
    await hooks["chat.message"]({ sessionID: "s23" }, { message: { id: "m23b" }, parts: [{ type: "text", text: "continue" }] })
    try {
      await hooks["tool.execute.before"](
        { tool: "write", sessionID: "s23" },
        { args: { filePath: join(dir, "foo.py") } }
      )
      console.log("FAIL: T23b round 39's exemption reopened FEEDBACK #41 — a boundary created during the turn that just ended went unblocked")
      failures++
    } catch (e) {
      if (/SESSION_PRIMER\.md was just committed/.test(String(e.message || e))) {
        console.log("ok: T23b FEEDBACK #41 preserved in a long-lived session — boundary created during the previous turn still blocks")
      } else {
        console.log("FAIL: T23b blocked, but for the wrong reason:", e.message)
        failures++
      }
    }
    rmSync(dir, { recursive: true, force: true })
  }
  {
    const dir = freshRepo()
    const hooks = await loadGate(dir)
    process.chdir(dir)
    await hooks["tool.execute.before"](
      { tool: "read", sessionID: "s23p" },
      { args: { filePath: join(dir, "wiki", "protocols", "refactor.md") } }
    )
    await hooks["chat.message"]({ sessionID: "s23p" }, { message: { id: "m1" }, parts: [{ type: "text", text: "start the sub-task" }] })
    writeFileSync(join(dir, "wiki", "handoffs", "SESSION_PRIMER.md"), "# primer updated\n")
    execSync("git add -A && git -c user.email=t@t -c user.name=t commit -q -m primer", { cwd: dir })
    // Turn 2: the model does what build.md step 6 tells it to — reports and ends its turn,
    // making NO tool call. So no block ever fires and `acknowledged` can never be earned.
    await hooks["chat.message"]({ sessionID: "s23p" }, { message: { id: "m2" }, parts: [{ type: "text", text: "continue" }] })
    // Turn 3: the user speaks again. A whole turn has now ended with HEAD unmoved and the human
    // has replied twice since the boundary landed — this is the checkpoint the block exists to
    // force, and it has demonstrably happened. His next instruction must be actionable.
    await hooks["chat.message"]({ sessionID: "s23p" }, { message: { id: "m3" }, parts: [{ type: "text", text: "no, check the git remote first instead" }] })
    await assertNoThrow(
      "T23a long-lived session: boundary survived a full completed turn plus a real user message — the user's next instruction is actionable",
      async () => {
        await hooks["tool.execute.before"](
          { tool: "bash", sessionID: "s23p" },
          { args: { command: "git remote -v" } }
        )
      }
    )
    // ...and the model still cannot walk itself past a NEW boundary it creates afterwards.
    writeFileSync(join(dir, "wiki", "handoffs", "SESSION_PRIMER.md"), "# primer updated again\n")
    execSync("git add -A && git -c user.email=t@t -c user.name=t commit -q -m primer2", { cwd: dir })
    try {
      await hooks["tool.execute.before"](
        { tool: "write", sessionID: "s23p" },
        { args: { filePath: join(dir, "foo.py") } }
      )
      console.log("FAIL: T23c a NEW primer boundary crossed mid-turn went unblocked after the round 39 exemption cleared the previous one")
      failures++
    } catch (e) {
      if (/SESSION_PRIMER\.md was just committed/.test(String(e.message || e))) {
        console.log("ok: T23c the exemption is per-SHA — a newly crossed primer boundary blocks immediately, mid-turn, same as always")
      } else {
        console.log("FAIL: T23c blocked, but for the wrong reason:", e.message)
        failures++
      }
    }
    rmSync(dir, { recursive: true, force: true })
  }

  // Test 24 (round 44, live: warms-mobile session ses_f9d4e1792ffeIM9vhmzmTIXpoJ, 09-03
  // 00:30:33-00:33:31). The primer block fired SIX times inside one turn with a byte-identical
  // message and the model never understood it had been refused: at 00:33:22 it wrote
  // "게이트가 매번 edit를 커밋으로 인식하는 것 같습니다. 이미 커밋된 상태라 에디트가 실패하고
  // 있습니다" — i.e. it read the block as the *edit* failing because the file was already
  // committed, and kept retrying. T9b already proves a same-turn retry stays BLOCKED; nothing
  // proved anything about what the retry is TOLD, and the identical text is what earned the
  // misreading ("was just committed" was true at attempt 1 and six minutes plus a whole user
  // turn stale by attempt 6, and the message never says the call did not execute).
  {
    const dir = freshRepo()
    const hooks = await loadGate(dir)
    process.chdir(dir)
    async function assertBlockMessage(label, want, unwanted, fn) {
      try {
        await fn()
        console.log(`FAIL: ${label} — expected throw, none happened`)
        failures++
      } catch (e) {
        const msg = String(e.message || e)
        if (!want.test(msg)) {
          console.log(`FAIL: ${label} — message missing ${want}: ${msg}`)
          failures++
        } else if (unwanted && unwanted.test(msg)) {
          console.log(`FAIL: ${label} — message unexpectedly matched ${unwanted}: ${msg}`)
          failures++
        } else {
          console.log(`ok: ${label}`)
        }
      }
    }
    // Same shape as T9: satisfy L09 first, never call chat.message, so the fresh-session
    // courtesy (boundaryAtSessionStart) is undefined and only the primer arm is under test.
    await hooks["tool.execute.before"](
      { tool: "read", sessionID: "s24" },
      { args: { filePath: join(dir, "wiki", "protocols", "refactor.md") } }
    )
    writeFileSync(join(dir, "wiki", "handoffs", "SESSION_PRIMER.md"), "# primer updated\n")
    execSync("git add -A && git -c user.email=t@t -c user.name=t commit -q -m primer", { cwd: dir })

    await assertBlockMessage(
      "T24a first block of the turn — unchanged wording, no repeat notice",
      /SESSION_PRIMER\.md was just committed/,
      /\[repeat\]/,
      async () => {
        await hooks["tool.execute.before"](
          { tool: "edit", sessionID: "s24" },
          { args: { filePath: join(dir, "wiki", "handoffs", "SESSION_PRIMER.md") } }
        )
      }
    )
    await assertBlockMessage(
      "T24b verbatim retry, same turn — told it is attempt 2 and that the call did NOT execute",
      /\[repeat\] This is blocked attempt 2 in this same turn and it did NOT execute/,
      null,
      async () => {
        await hooks["tool.execute.before"](
          { tool: "edit", sessionID: "s24" },
          { args: { filePath: join(dir, "wiki", "handoffs", "SESSION_PRIMER.md") } }
        )
      }
    )
    // The live misreading was specifically "the edit is failing because the file is already
    // committed" — the repeat notice has to deny that reading explicitly, not just scold louder.
    await assertBlockMessage(
      "T24c a DIFFERENT mutating call, same turn — attempt 3, and the notice denies the 'the call itself failed' reading",
      /blocked attempt 3 in this same turn[\s\S]*refused by the gate before it started/,
      null,
      async () => {
        await hooks["tool.execute.before"](
          { tool: "bash", sessionID: "s24" },
          { args: { command: "git status" } }
        )
      }
    )
    // A real new user message ends the turn: it acknowledges this boundary AND resets the
    // per-turn counter. The next boundary must start over at the plain first-block wording —
    // otherwise the notice would leak across turns and start lying about the attempt number.
    await hooks["chat.message"](
      { sessionID: "s24" },
      { message: { id: "m1" }, parts: [{ type: "text", text: "프롬프트 제공하세요. 새 세션에서 이어서 진행하게." }] }
    )
    writeFileSync(join(dir, "wiki", "handoffs", "SESSION_PRIMER.md"), "# primer updated twice\n")
    execSync("git add -A && git -c user.email=t@t -c user.name=t commit -q -m primer2", { cwd: dir })
    await assertBlockMessage(
      "T24d new turn, new boundary — counter reset, plain first-block wording again",
      /SESSION_PRIMER\.md was just committed/,
      /\[repeat\]/,
      async () => {
        await hooks["tool.execute.before"](
          { tool: "write", sessionID: "s24" },
          { args: { filePath: join(dir, "foo.py") } }
        )
      }
    )
    await assertBlockMessage(
      "T24e ...and the repeat notice re-arms for the new boundary",
      /\[repeat\] This is blocked attempt 2 in this same turn/,
      null,
      async () => {
        await hooks["tool.execute.before"](
          { tool: "write", sessionID: "s24" },
          { args: { filePath: join(dir, "foo.py") } }
        )
      }
    )
    rmSync(dir, { recursive: true, force: true })
  }

  // Test 25 (round 45, live: warms-mobile session ses_f9d0dfa4bffeTLzGAKjOA3a0st, 09-03
  // 01:27:03-01:30:46). Replays that turn's exact shape. The user asked "sub-task 2 가 완료된건가요?
  // 아니면 브리핑만 하신건가요?" at 01:29:28 with an elective boundary already standing; the gate
  // knew that at chat.message time and said nothing, so the model discovered it by having
  // `git log --oneline -3` refused at 01:29:55, published a wrong theory, and burned a second
  // refused call at 01:30:05 — an `edit` of SESSION_PRIMER.md, which is exactly what the elective
  // block message told it to do.
  //
  // Two separate claims under test: (1) chat.message announces a standing boundary before the
  // turn's first tool call, and stays silent once that boundary is cleared; (2) the elective block
  // no longer prescribes a remedy the same arm forbids. Nothing about what blocks may move.
  {
    const dir = freshRepo()
    const hooks = await loadGate(dir)
    process.chdir(dir)
    const hasPending = (parts) => parts.some((p) => /A sub-task checkpoint is already open/.test(p?.text ?? ""))

    const t1 = { message: { id: "m25a" }, parts: [{ type: "text", text: "현재 상태: 서브태스크 1 완료. build.md 프로토콜 따릅니다." }] }
    await hooks["chat.message"]({ sessionID: "s25" }, t1)
    if (!hasPending(t1.parts)) {
      console.log("ok: T25a no boundary open at session start — no pending-checkpoint notice")
    } else {
      console.log("FAIL: T25a announced a checkpoint that does not exist:", JSON.stringify(t1.parts))
      failures++
    }
    await hooks["tool.execute.before"](
      { tool: "read", sessionID: "s25" },
      { args: { filePath: join(dir, "wiki", "protocols", "refactor.md") } }
    )
    // Same construction as T19: cross COMMITS_WITHOUT_PRIMER_THRESHOLD mid-turn, `git add <file>`
    // so freshRepo()'s untracked SESSION_PRIMER.md is not swept in and turned into a primer touch.
    for (const f of ["a.txt", "b.txt", "c.txt"]) {
      writeFileSync(join(dir, f), "x")
      execSync(`git add ${f} && git -c user.email=t@t -c user.name=t commit -q -m ${f}`, { cwd: dir })
    }
    const head = execSync("git rev-parse HEAD", { cwd: dir }).toString().trim()

    // 01:29:28 — his real message, verbatim from the transcript.
    const t2 = { message: { id: "m25b" }, parts: [{ type: "text", text: "sub-task 2 가 완료된건가요? 아니면 브리핑만 하신건가요? 지금 5183 포트 접속해서 확인해서 볼게 있나요?" }] }
    await hooks["chat.message"]({ sessionID: "s25" }, t2)
    const notice = t2.parts.find((p) => /A sub-task checkpoint is already open/.test(p?.text ?? ""))
    if (notice?.synthetic === true && notice.text.includes(head.slice(0, 7)) && /will be refused before it runs/.test(notice.text)) {
      console.log("ok: T25b a boundary standing at turn start is announced on the message itself, naming the SHA")
    } else {
      console.log("FAIL: T25b expected a pending-checkpoint notice naming " + head.slice(0, 7) + ", got:", JSON.stringify(t2.parts))
      failures++
    }
    // Report-only: the notice must not release anything. 01:29:55's own refused call.
    await assertThrows(
      "T25c the announced boundary still blocks the turn's first mutating call — nothing was released",
      async () => {
        await hooks["tool.execute.before"]({ tool: "bash", sessionID: "s25" }, { args: { command: "git log --oneline -3" } })
      }
    )
    // 01:30:05: the model obeyed "update SESSION_PRIMER.md's Current sub-task block, commit it"
    // and was refused for it. The message must no longer prescribe that.
    try {
      await hooks["tool.execute.before"](
        { tool: "edit", sessionID: "s25" },
        { args: { filePath: join(dir, "wiki", "handoffs", "SESSION_PRIMER.md") } }
      )
      console.log("FAIL: T25d expected the elective arm to refuse an edit of SESSION_PRIMER.md")
      failures++
    } catch (e) {
      const msg = String(e.message || e)
      const saysRefused = /every mutating call, including editing wiki\/handoffs\/SESSION_PRIMER\.md itself, stays refused/.test(msg)
      const stillPrescribes = /commit it, then ask the user/.test(msg)
      if (saysRefused && !stillPrescribes) {
        console.log("ok: T25d the elective block says the primer edit is refused too, instead of ordering it")
      } else {
        console.log(`FAIL: T25d elective wording wrong (saysRefused=${saysRefused} stillPrescribes=${stillPrescribes}): ${msg}`)
        failures++
      }
    }
    // Round 39's quiet-turn rule already clears a boundary with no block required, one turn later:
    // HEAD did not move across the turn that just ended and a real message arrived. The notice
    // must go quiet for exactly the same boundary it announced a moment ago.
    const t3 = { message: { id: "m25c" }, parts: [{ type: "text", text: "네, 그럼 문서부터 업데이트하고 이어서 진행하세요." }] }
    await hooks["chat.message"]({ sessionID: "s25" }, t3)
    if (!hasPending(t3.parts)) {
      console.log("ok: T25e once the boundary is acknowledged, the notice stops — it tracks the real predicate, not 'a boundary exists'")
    } else {
      console.log("FAIL: T25e kept announcing an already-cleared checkpoint:", JSON.stringify(t3.parts))
      failures++
    }
    await assertNoThrow(
      "T25f ...and that acknowledged boundary lets the next mutating call through, same as before round 45",
      async () => {
        await hooks["tool.execute.before"]({ tool: "write", sessionID: "s25" }, { args: { filePath: join(dir, "foo.py") } })
      }
    )
    rmSync(dir, { recursive: true, force: true })
  }

  console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`)
  process.exit(failures === 0 ? 0 : 1)
}

main()

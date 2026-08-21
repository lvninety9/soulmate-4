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
    // establish baseline HEAD (the real hook fires after every tool call, so a baseline always
    // exists by the time a commit happens — this "read" above already triggers it too, but be
    // explicit here since that's incidental to what this test is checking)
    await hooks["tool.execute.after"]({ tool: "read", sessionID: "s6" })
    // commit touching SESSION_PRIMER.md
    writeFileSync(join(dir, "wiki", "handoffs", "SESSION_PRIMER.md"), "# primer updated\n")
    execSync("git add -A && git -c user.email=t@t -c user.name=t commit -q -m primer", { cwd: dir })
    await hooks["tool.execute.after"]({ tool: "bash", sessionID: "s6" })
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
    await hooks["tool.execute.after"]({ tool: "read", sessionID: "s9" })
    // commit touching SESSION_PRIMER.md -> arms the gate
    writeFileSync(join(dir, "wiki", "handoffs", "SESSION_PRIMER.md"), "# primer updated\n")
    execSync("git add -A && git -c user.email=t@t -c user.name=t commit -q -m primer", { cwd: dir })
    await hooks["tool.execute.after"]({ tool: "bash", sessionID: "s9" })

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
    // arm the primer/elective gate first — tool.execute.after needs a baseline HEAD
    // observation before the commit to actually detect the change (same 2-call pattern T6/T9
    // already use; a single call here would silently just record HEAD and never arm, giving a
    // false pass below regardless of whether the real guard works).
    await hooks["tool.execute.after"]({ tool: "read", sessionID: "s11" })
    writeFileSync(join(dir, "wiki", "handoffs", "SESSION_PRIMER.md"), "# primer updated\n")
    execSync("git add -A && git -c user.email=t@t -c user.name=t commit -q -m primer", { cwd: dir })
    await hooks["tool.execute.after"]({ tool: "bash", sessionID: "s11" })

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

  console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`)
  process.exit(failures === 0 ? 0 : 1)
}

main()

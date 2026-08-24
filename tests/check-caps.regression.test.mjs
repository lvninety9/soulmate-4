// Regression net for check-caps.sh behavior changes. Started round 29 item 5 (check-caps.sh
// consolidation, work order): proves the 3 narrow-check merges below still catch everything
// their pre-merge originals caught, with the same messages -- "merge, don't delete coverage" per
// the work order's own acceptance condition.
//
// 1. check_lines() deleted -- its 3 call sites (README.md, PROJECT_BACKGROUND.md,
//    SESSION_PRIMER.md) now call check_lines_warn(file, cap, cap, label) instead. Proven: with
//    warn==cap, the WARN branch can never fire, so behavior collapses to check_lines's old
//    two-outcome (ok / OVER CAP) shape, same messages.
// 2. check_section()'s inline OVER CAP/ok if-else replaced with a call to report_count() (the
//    two were already byte-identical duplicated logic). Proven: same messages, same exit status.
// 3. check_bootstrap_wiki_is_adapted() + check_bootstrap_placeholders_filled() merged into one
//    generic check_bootstrap_forbidden_string(file, needle, fail_msg, ok_msg). Proven: both
//    original scenarios (SESSION_PRIMER.md untouched, AGENTS.md placeholder left in) still FAIL
//    with their original exact message text; both clean scenarios still print their original ok
//    message.
//
// Round 33 (Opus work order) appended 3 more sections below, each guarding one of that round's
// 3 tasks: rule-archive.md/SESSION_MASTER.md's WATCH->hard-cap conversion (item 1), session-log.md's
// per-row char cap (item 2, same mechanism as FEEDBACK_ROW_CHAR_CAP), and quiet-by-default routine
// output with --verbose restoring full detail (item 3).
//
// Run: node --experimental-strip-types tests/check-caps.regression.test.mjs
import { execFileSync } from "child_process"
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync, readdirSync, readFileSync } from "fs"
import { tmpdir } from "os"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")

function freshFixture() {
  // Same pattern as tests/stale-language.fuzz.test.mjs: a clean copy of the real repo, so every
  // OTHER check-caps.sh check already passes and a nonzero exit is attributable to the one edit
  // this test makes, not incidental unrelated noise.
  const dir = mkdtempSync(join(tmpdir(), "checkcaps-regress-"))
  for (const entry of readdirSync(REPO_ROOT)) {
    if (entry === ".git" || entry === "tests") continue
    cpSync(join(REPO_ROOT, entry), join(dir, entry), { recursive: true })
  }
  execFileSync("git", ["init", "-q"], { cwd: dir })
  execFileSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", "add", "-A"], { cwd: dir })
  execFileSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "-m", "fixture"], { cwd: dir })
  return dir
}

function run(dir, args = []) {
  try {
    const out = execFileSync("bash", ["scripts/check-caps.sh", ...args], { cwd: dir, encoding: "utf8" })
    return { status: 0, output: out }
  } catch (e) {
    return { status: e.status ?? 1, output: String(e.stdout || "") + String(e.stderr || "") }
  }
}

let failures = 0
function expectContains(label, output, needle) {
  if (output.includes(needle)) {
    console.log(`ok: ${label}`)
  } else {
    console.log(`FAIL: ${label} -- expected output to contain:\n  ${needle}\ngot:\n${output}`)
    failures++
  }
}
function expectNotContains(label, output, needle) {
  if (!output.includes(needle)) {
    console.log(`ok: ${label}`)
  } else {
    console.log(`FAIL: ${label} -- expected output NOT to contain:\n  ${needle}\ngot:\n${output}`)
    failures++
  }
}
function expectStatus(label, actual, want) {
  if (actual === want) {
    console.log(`ok: ${label} (exit ${actual})`)
  } else {
    console.log(`FAIL: ${label} -- expected exit ${want}, got ${actual}`)
    failures++
  }
}

async function main() {
  // --- Merge 1: check_lines_warn absorbing check_lines (hard-cap-only files) ---
  // README_CAP is 450 -- write a README.md just under and just over, with no WARN tier possible
  // since these 3 call sites now pass warn==cap.
  {
    const dir = freshFixture()
    const under = Array.from({ length: 449 }, (_, i) => `line ${i}`).join("\n") + "\n"
    writeFileSync(join(dir, "README.md"), under)
    const { output } = run(dir)
    expectContains("T1a README.md under cap -> ok line, exact old check_lines wording", output,
      "ok: README.md (README.md) 449/450 lines")
    expectNotContains("T1b no spurious WARN for a hard-cap-only file under cap", output, "WARN: README.md")
    rmSync(dir, { recursive: true, force: true })
  }
  {
    const dir = freshFixture()
    const over = Array.from({ length: 500 }, (_, i) => `line ${i}`).join("\n") + "\n"
    writeFileSync(join(dir, "README.md"), over)
    const { output, status } = run(dir)
    expectContains("T2a README.md over cap -> OVER CAP, exact old check_lines wording", output,
      "OVER CAP: README.md (README.md) is 500 lines, cap 450 — prune before committing")
    expectNotContains("T2b over-cap file never shows a WARN line for itself (no soft tier possible)", output,
      "WARN: README.md")
    expectStatus("T2c over cap -> nonzero exit", status, 1)
    rmSync(dir, { recursive: true, force: true })
  }
  // AGENTS.md's own call site (check_lines_warn with a real warn<cap gap, 70/85) must still show
  // its WARN tier -- proves the merge didn't accidentally collapse warn!=cap call sites too.
  {
    // Round 33 item 3 made routine (non---verbose) output quiet by default -- WARN/WATCH lines
    // no longer print unconditionally, so this now asserts through --verbose (still proves the
    // WARN branch itself fires; T13/T14 below cover the new quiet-by-default behavior).
    const dir = freshFixture()
    const { output } = run(dir, ["--verbose"])
    expectContains("T3 AGENTS.md real warn<cap gap still produces a WARN (untouched call site, via --verbose)", output,
      "WARN: AGENTS.md total (AGENTS.md) is")
    rmSync(dir, { recursive: true, force: true })
  }

  // --- Merge 2: check_section() calling report_count() instead of duplicating its if/else ---
  {
    const dir = freshFixture()
    const agents = readFileSync(join(dir, "AGENTS.md"), "utf8")
    const extraRules = Array.from({ length: 10 }, (_, i) => `- [X${i}] filler rule ${i} \`permanent\``).join("\n")
    const withExtra = agents.replace(/(## Learned Rules\n)/, `$1${extraRules}\n`)
    writeFileSync(join(dir, "AGENTS.md"), withExtra)
    const { output, status } = run(dir)
    expectContains("T4a Learned Rules over cap -> OVER CAP via report_count, exact old check_section wording", output,
      "OVER CAP: Learned Rules in AGENTS.md has 15 entries, cap 10")
    expectContains("T4b default hint text preserved through the report_count call", output,
      "cap 10 — prune before committing")
    expectStatus("T4c over cap -> nonzero exit", status, 1)
    rmSync(dir, { recursive: true, force: true })
  }

  // --- Merge 3: check_bootstrap_forbidden_string covering both original scenarios ---
  {
    const dir = mkdtempSync(join(tmpdir(), "checkcaps-regress-boot-"))
    execFileSync("bash", [join(REPO_ROOT, "scripts", "bootstrap.sh"), dir], { cwd: REPO_ROOT })

    // Scenario A (was check_bootstrap_wiki_is_adapted): a bootstrapped project whose
    // SESSION_PRIMER.md still carries this seed repo's own self-description untouched.
    const primerPath = join(dir, "wiki", "handoffs", "SESSION_PRIMER.md")
    const primer = readFileSync(primerPath, "utf8")
    writeFileSync(primerPath, primer + "\nsession-handoff harness template for coding agents\n")
    let { output } = run(dir, ["--bootstrap-check"])
    expectContains("T5a un-adapted wiki still FAILs, exact original message", output,
      'BOOTSTRAP FAIL: wiki/handoffs/SESSION_PRIMER.md still has this seed repo\'s own self-description ("session-handoff harness template for coding agents")')
    writeFileSync(primerPath, primer) // revert
    ;({ output } = run(dir, ["--bootstrap-check"]))
    expectContains("T5b adapted wiki -> ok, exact original message", output,
      "ok: bootstrap — wiki/handoffs/SESSION_PRIMER.md doesn't look like this seed repo's own untouched wiki")

    // Scenario B (was check_bootstrap_placeholders_filled): a fresh bootstrap.sh output already
    // has AGENTS.md carrying the literal "[project name]" placeholder unfilled (that's the whole
    // point of this check) -- so the "FAIL" case is the untouched baseline, and "ok" requires
    // actually filling it in.
    const agentsPath = join(dir, "AGENTS.md")
    const agents = readFileSync(agentsPath, "utf8")
    ;({ output } = run(dir, ["--bootstrap-check"]))
    expectContains("T6a unfilled placeholder (fresh bootstrap baseline) still FAILs, exact original message", output,
      'BOOTSTRAP FAIL: AGENTS.md still has the literal placeholder "[project name]" -- fill in the real project name')
    writeFileSync(agentsPath, agents.replace("[project name]", "Regression Test Project"))
    ;({ output } = run(dir, ["--bootstrap-check"]))
    expectContains("T6b filled placeholder -> ok, exact original message", output,
      "ok: bootstrap — AGENTS.md placeholders filled in")

    rmSync(dir, { recursive: true, force: true })
  }

  // --- Round 33 item 1: rule-archive.md / SESSION_MASTER.md WATCH -> hard cap ---
  // The finding that motivated this: soft WATCH was obeyed 0% of the time (rule-archive.md grew
  // 408->1153 lines across 4 rounds with a WATCH firing on every single commit). Proves the new
  // check_lines_warn call sites actually block, not just warn, once a real file crosses the cap
  // -- and that a file safely under cap still reads "ok", not a spurious OVER CAP/WARN.
  {
    const dir = freshFixture()
    const filler = Array.from({ length: 500 }, (_, i) => `filler line ${i}`).join("\n") + "\n"
    writeFileSync(join(dir, "wiki", "rule-archive.md"), filler)
    const { output, status } = run(dir)
    expectContains("T7a rule-archive.md over its new hard cap -> OVER CAP, blocks the commit", output,
      "OVER CAP: wiki/rule-archive.md (wiki/rule-archive.md) is 500 lines, cap 450")
    expectStatus("T7b rule-archive.md over cap -> nonzero exit (real block, not just a WATCH hint)", status, 1)
    rmSync(dir, { recursive: true, force: true })
  }
  {
    const dir = freshFixture()
    const filler = Array.from({ length: 250 }, (_, i) => `filler line ${i}`).join("\n") + "\n"
    writeFileSync(join(dir, "wiki", "handoffs", "SESSION_MASTER.md"), filler)
    const { output, status } = run(dir)
    expectContains("T8a SESSION_MASTER.md over its new hard cap -> OVER CAP, blocks the commit", output,
      "OVER CAP: wiki/handoffs/SESSION_MASTER.md (wiki/handoffs/SESSION_MASTER.md) is 250 lines, cap 200")
    expectStatus("T8b SESSION_MASTER.md over cap -> nonzero exit", status, 1)
    rmSync(dir, { recursive: true, force: true })
  }
  {
    // Real post-prune sizes (296 / 117 lines as of this round) must read clean -- proves the
    // prune this round actually landed both files under their own new cap, not just close to it.
    const dir = freshFixture()
    const { output, status } = run(dir)
    expectContains("T9a real rule-archive.md (post-prune) is ok under its new cap, not WARN/OVER CAP", output,
      "ok: wiki/rule-archive.md (wiki/rule-archive.md)")
    expectContains("T9b real SESSION_MASTER.md (post-prune) is ok under its new cap, not WARN/OVER CAP", output,
      "ok: wiki/handoffs/SESSION_MASTER.md (wiki/handoffs/SESSION_MASTER.md)")
    expectNotContains("T9c no stray WATCH line for rule-archive.md any more (migrated off check_watch_size)", output,
      "WATCH: wiki/rule-archive.md")
    expectNotContains("T9d no stray WATCH line for SESSION_MASTER.md any more (migrated off check_watch_size)", output,
      "WATCH: wiki/handoffs/SESSION_MASTER.md")
    expectStatus("T9e real repo state -> exit 0", status, 0)
    rmSync(dir, { recursive: true, force: true })
  }

  // --- Round 33 item 2: session-log.md per-row char cap (check_row_char_cap, shared with
  // FEEDBACK_PENDING.md's existing row cap rather than a second copy of the same loop) ---
  {
    const dir = freshFixture()
    const sessionLog = readFileSync(join(dir, "wiki", "session-log.md"), "utf8")
    const bigRow = `| 99 | 2026-08-24 | ${"x".repeat(3050)} |\n`
    writeFileSync(join(dir, "wiki", "session-log.md"), sessionLog + bigRow)
    const { output, status } = run(dir)
    expectContains("T10a session-log.md row over its new char cap -> OVER CAP, exact row number", output,
      "OVER CAP: wiki/session-log.md row #99 is")
    expectContains("T10b session-log.md row cap message names the real cap value", output,
      `cap ${3000} —`)
    expectStatus("T10c session-log.md row over cap -> nonzero exit", status, 1)
    rmSync(dir, { recursive: true, force: true })
  }
  {
    // The real, unmodified session-log.md (25 rows, up to 2,679 chars/row as of this round) must
    // stay clean -- proves the cap was sized from this file's own real history, not copied
    // verbatim from FEEDBACK_ROW_CHAR_CAP (300 chars, which would OVER CAP every existing row).
    const dir = freshFixture()
    const { output, status } = run(dir)
    expectNotContains("T11 real session-log.md has no row anywhere near its own new cap", output,
      "OVER CAP: wiki/session-log.md row")
    expectStatus("T11b real repo state still exits 0 with the new session-log.md check active", status, 0)
    rmSync(dir, { recursive: true, force: true })
  }
  {
    // FEEDBACK_PENDING.md's own row cap (pre-existing, round 28 item 4) must still fire with its
    // original message, unchanged, now that its inline while-loop was extracted into
    // check_row_char_cap() and shared with session-log.md's call site above.
    const dir = freshFixture()
    const fp = readFileSync(join(dir, "wiki", "handoffs", "FEEDBACK_PENDING.md"), "utf8")
    const bigRow = `| 99 | ${"x".repeat(320)} | p2 | open | test | seed |\n`
    const withRow = fp.replace(
      "| # | Feedback / issue | Priority | Status | How it's handled | Session logged |\n|---|---|---|---|---|---|\n",
      `| # | Feedback / issue | Priority | Status | How it's handled | Session logged |\n|---|---|---|---|---|---|\n${bigRow}`
    )
    writeFileSync(join(dir, "wiki", "handoffs", "FEEDBACK_PENDING.md"), withRow)
    const { output, status } = run(dir)
    expectContains("T12a FEEDBACK_PENDING.md row cap still fires post-refactor, exact original message", output,
      'OVER CAP: wiki/handoffs/FEEDBACK_PENDING.md row #99 is')
    expectContains("T12b FEEDBACK_PENDING.md row cap still points to the same destination/flow-rule wording", output,
      'move its full narrative to wiki/rule-archive.md ("Round N" section) and leave a pointer, per the flow rule (item 4)')
    expectStatus("T12c FEEDBACK_PENDING.md row over cap -> nonzero exit", status, 1)
    rmSync(dir, { recursive: true, force: true })
  }

  // --- Round 33 item 3: quiet-by-default routine output ---
  // The finding this fixes: a clean repo printed 1 WARN + 4 WATCH on EVERY commit, all
  // non-actionable -- indistinguishable from a real problem by the time anyone's used to
  // ignoring them. Detection power itself must be unchanged (OVER CAP always fires); only
  // whether the non-blocking WARN/WATCH/reminder lines print by default should differ.
  {
    // Real repo, clean run, no flag: the non-blocking notices (AGENTS.md WARN, subtask-gate.ts/
    // check-caps.sh WATCH, primer-handoff reminder) must NOT print by default any more, but a
    // one-line summary must, so the suppression itself is visible, not silent.
    const dir = freshFixture()
    const { output, status } = run(dir)
    expectNotContains("T13a default run: no WARN line for AGENTS.md", output, "WARN: AGENTS.md")
    expectNotContains("T13b default run: no WATCH line for subtask-gate.ts", output,
      "WATCH: .kilo/plugins/subtask-gate.ts")
    expectNotContains("T13c default run: no reminder line", output, "reminder: this commit doesn't touch")
    expectContains("T13d default run: one summary line stands in for the suppressed notices", output,
      "non-blocking notice(s) suppressed — rerun with --verbose to see them")
    expectStatus("T13e default run still exits 0 on a clean repo", status, 0)
    rmSync(dir, { recursive: true, force: true })
  }
  {
    // --verbose restores every one of the exact same messages T13 just proved are hidden by
    // default -- detection power is unchanged, only the default print behavior is.
    const dir = freshFixture()
    const { output } = run(dir, ["--verbose"])
    expectContains("T14a --verbose restores the AGENTS.md WARN, exact original wording", output,
      "WARN: AGENTS.md total (AGENTS.md) is 81/85 lines (soft target 70) — consider a pruning pass soon")
    expectContains("T14b --verbose restores the subtask-gate.ts WATCH, exact original wording", output,
      "WATCH: .kilo/plugins/subtask-gate.ts is")
    expectContains("T14c --verbose restores the check-caps.sh WATCH, exact original wording", output,
      "WATCH: scripts/check-caps.sh is")
    expectContains("T14d --verbose restores the primer-handoff reminder, exact original wording", output,
      "reminder: this commit doesn't touch wiki/handoffs/SESSION_PRIMER.md")
    expectNotContains("T14e --verbose run has no leftover suppression-summary line (nothing was suppressed)",
      output, "non-blocking notice(s) suppressed")
    rmSync(dir, { recursive: true, force: true })
  }
  {
    // A real OVER CAP must still print in full WITHOUT --verbose -- the whole point is that a
    // real block is never quieted, only routine non-actionable noise is.
    const dir = freshFixture()
    const filler = Array.from({ length: 500 }, (_, i) => `filler line ${i}`).join("\n") + "\n"
    writeFileSync(join(dir, "wiki", "rule-archive.md"), filler)
    const { output, status } = run(dir)
    expectContains("T15a OVER CAP still prints in full without --verbose (never suppressed)", output,
      "OVER CAP: wiki/rule-archive.md (wiki/rule-archive.md) is 500 lines, cap 450")
    expectStatus("T15b real block still exits nonzero without --verbose", status, 1)
    // A commit that's already blocking is exactly the moment a human is reading this output for
    // a real reason -- once status != 0, every other non-blocking notice comes along too (full
    // context), same as passing --verbose would, with no flag needed.
    expectContains("T15c once something's blocking, the other non-blocking notices ride along too (full context, no flag needed)",
      output, "WARN: AGENTS.md total (AGENTS.md) is")
    rmSync(dir, { recursive: true, force: true })
  }

  console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`)
  process.exit(failures === 0 ? 0 : 1)
}

main()

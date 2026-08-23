// Regression net for round 29 item 5 (check-caps.sh consolidation, work order): proves the 3
// narrow-check merges below still catch everything their pre-merge originals caught, with the
// same messages -- "merge, don't delete coverage" per the work order's own acceptance condition.
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
    const dir = freshFixture()
    const { output } = run(dir)
    expectContains("T3 AGENTS.md real warn<cap gap still produces a WARN (untouched call site)", output,
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

  console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`)
  process.exit(failures === 0 ? 0 : 1)
}

main()

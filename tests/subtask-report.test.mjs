// Regression net for scripts/subtask-report.sh (round 34, Deliverable 1: universal sub-task
// report generator). Uses synthetic throwaway git repos (not a copy of this repo) on purpose —
// the whole point of the script is "detect, never assume" across arbitrary stacks, so the tests
// build minimal fixtures rather than relying on soulmate-4's own project shape. Only node itself
// is assumed available (this test suite already requires it to run at all) — no assertion here
// depends on an externally-installed tool like pytest/eslint being present on the machine.
//
// Run: node --experimental-strip-types tests/subtask-report.test.mjs
import { execFileSync } from "child_process"
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, copyFileSync } from "fs"
import { tmpdir } from "os"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const SCRIPT = join(REPO_ROOT, "scripts", "subtask-report.sh")
const HOOK = join(REPO_ROOT, "scripts", "post-commit-subtask-report")

function git(dir, args) {
  return execFileSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", ...args], { cwd: dir, encoding: "utf8" })
}

function freshRepo() {
  const dir = mkdtempSync(join(tmpdir(), "subtask-report-"))
  git(dir, ["init", "-q"])
  mkdirSync(join(dir, "scripts"), { recursive: true })
  return dir
}

function commitAll(dir, msg) {
  git(dir, ["add", "-A"])
  git(dir, ["commit", "-q", "-m", msg])
}

function runReport(dir, args = []) {
  try {
    const out = execFileSync("bash", [SCRIPT, ...args], { cwd: dir, encoding: "utf8" })
    return { status: 0, output: out }
  } catch (e) {
    return { status: e.status ?? 1, output: String(e.stdout || "") + String(e.stderr || "") }
  }
}

function runHook(dir) {
  try {
    const out = execFileSync("bash", [HOOK], { cwd: dir, encoding: "utf8" })
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
    console.log(`FAIL: ${label} -- expected output to contain:\n  ${JSON.stringify(needle)}\ngot:\n${output}`)
    failures++
  }
}
function expectNotContains(label, output, needle) {
  if (!output.includes(needle)) {
    console.log(`ok: ${label}`)
  } else {
    console.log(`FAIL: ${label} -- expected output NOT to contain:\n  ${JSON.stringify(needle)}\ngot:\n${output}`)
    failures++
  }
}
function expectEqual(label, got, want) {
  if (got === want) {
    console.log(`ok: ${label}`)
  } else {
    console.log(`FAIL: ${label} -- expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`)
    failures++
  }
}

// T1: no test runner of any kind present -> honest "no test command detected", not a false PASS.
{
  const dir = freshRepo()
  writeFileSync(join(dir, "README.md"), "hello\n")
  commitAll(dir, "initial")
  const { status, output } = runReport(dir)
  expectEqual("T1 exit code is always 0 (never blocks caller)", status, 0)
  expectContains("T1 no test runner -> explicit 'no test command detected'", output, "no test command detected")
  expectContains("T1 absence surfaced under 확인이 필요한 것, not silently clean", output, "no test runner detected")
  rmSync(dir, { recursive: true, force: true })
}

// T2: bare node test file (this repo's own no-package.json pattern) that genuinely passes.
{
  const dir = freshRepo()
  mkdirSync(join(dir, "tests"), { recursive: true })
  writeFileSync(join(dir, "tests", "math.test.mjs"), `
console.log("ok: 1+1==2")
console.log("ALL PASS")
`)
  commitAll(dir, "initial")
  const { output } = runReport(dir)
  expectContains("T2 bare node test file detected", output, "bare node test files")
  expectContains("T2 real pass reported with assertion count", output, "PASS (1 assertion(s))")
  expectNotContains("T2 a real pass does not appear under 확인이 필요한 것", output.split("확인이 필요한 것")[1], "test file")
  rmSync(dir, { recursive: true, force: true })
}

// T3: bare node test file that genuinely fails (no ALL PASS marker) -> reported as FAIL, not PASS.
{
  const dir = freshRepo()
  mkdirSync(join(dir, "tests"), { recursive: true })
  writeFileSync(join(dir, "tests", "broken.test.mjs"), `
console.log("ok: something")
console.log("NOT ALL PASS -- one assertion failed")
process.exitCode = 1
`)
  commitAll(dir, "initial")
  const { output } = runReport(dir)
  expectContains("T3 real failure reported as FAIL", output, "FAIL (exit 1")
  expectContains("T3 failure surfaced under 확인이 필요한 것", output, "did not report ALL PASS")
  rmSync(dir, { recursive: true, force: true })
}

// T4: TODO/FIXME added in this range is counted and flagged for human triage.
{
  const dir = freshRepo()
  writeFileSync(join(dir, "a.txt"), "line one\n")
  commitAll(dir, "c1")
  writeFileSync(join(dir, "a.txt"), "line one\n// TODO: handle edge case\n")
  commitAll(dir, "c2")
  const { output } = runReport(dir, ["--since", "HEAD~1"])
  expectContains("T4 TODO count is exact, not just nonzero", output, "TODO/FIXME/XXX added: 1")
  expectContains("T4 TODO flagged for human triage", output, "new TODO/FIXME/XXX marker(s) added")
  rmSync(dir, { recursive: true, force: true })
}

// T5: boundary resolution matches subtask-gate.ts's own definition -- the report for HEAD, run
// with no args, must cover everything back to (not including) the last commit that touched
// wiki/handoffs/SESSION_PRIMER.md, and nothing further back than that once a second primer
// commit lands.
{
  const dir = freshRepo()
  mkdirSync(join(dir, "wiki", "handoffs"), { recursive: true })
  writeFileSync(join(dir, "wiki", "handoffs", "SESSION_PRIMER.md"), "round 1\n")
  commitAll(dir, "round 1 primer") // C1 (primer touch)
  writeFileSync(join(dir, "x.txt"), "work\n")
  commitAll(dir, "unrelated work") // C2
  writeFileSync(join(dir, "wiki", "handoffs", "SESSION_PRIMER.md"), "round 2\n")
  commitAll(dir, "round 2 primer") // C3 (primer touch, the trigger commit)
  const { output } = runReport(dir) // default target HEAD == C3
  // Range is (last primer commit BEFORE HEAD, HEAD] -- excludes C1 (round 1 primer) itself but
  // includes everything after it (C2 "unrelated work" + C3 "round 2 primer" = 2 commits), not
  // repo start.
  expectContains("T5 default range covers everything since the PREVIOUS primer commit (excl.), not repo start", output, "2 commit(s)")
  expectContains("T5 range includes the trigger commit itself", output, "round 2 primer")
  expectContains("T5 range includes intervening non-primer commits", output, "unrelated work")
  expectNotContains("T5 range does not include the older primer commit itself", output, "round 1 primer")
  rmSync(dir, { recursive: true, force: true })
}

// T6: --since override is honored verbatim, overriding the derived boundary.
{
  const dir = freshRepo()
  writeFileSync(join(dir, "a.txt"), "1\n")
  commitAll(dir, "c1")
  const c1 = git(dir, ["rev-parse", "HEAD"]).trim()
  writeFileSync(join(dir, "a.txt"), "2\n")
  commitAll(dir, "c2")
  writeFileSync(join(dir, "a.txt"), "3\n")
  commitAll(dir, "c3")
  const { output } = runReport(dir, ["--since", c1])
  expectContains("T6 --since override changes the range's commit count", output, "2 commit(s)")
  rmSync(dir, { recursive: true, force: true })
}

// T7: post-commit hook is silent on a commit that does NOT touch SESSION_PRIMER.md (routine
// per-file commit) -- must not fire the report on every commit, only on sub-task boundaries.
{
  const dir = freshRepo()
  copyFileSync(SCRIPT, join(dir, "scripts", "subtask-report.sh"))
  execFileSync("chmod", ["+x", join(dir, "scripts", "subtask-report.sh")])
  writeFileSync(join(dir, "a.txt"), "hello\n")
  commitAll(dir, "routine commit, no primer touch")
  const { output } = runHook(dir)
  expectEqual("T7 hook produces no output on a non-boundary commit", output.trim(), "")
  rmSync(dir, { recursive: true, force: true })
}

// T8: post-commit hook DOES fire, with the report banner, on a commit that touches
// wiki/handoffs/SESSION_PRIMER.md -- and still exits 0 (never blocks/crashes the caller).
{
  const dir = freshRepo()
  copyFileSync(SCRIPT, join(dir, "scripts", "subtask-report.sh"))
  execFileSync("chmod", ["+x", join(dir, "scripts", "subtask-report.sh")])
  mkdirSync(join(dir, "wiki", "handoffs"), { recursive: true })
  writeFileSync(join(dir, "wiki", "handoffs", "SESSION_PRIMER.md"), "state\n")
  commitAll(dir, "sub-task boundary commit")
  const { status, output } = runHook(dir)
  expectEqual("T8 hook exits 0 even when it fires", status, 0)
  expectContains("T8 hook fires the report banner on a boundary commit", output, "subtask-report (auto")
  rmSync(dir, { recursive: true, force: true })
}

// T9-T11: round 34 gap fixes (coordinator's independent test on a throwaway Node project).
// gitleaks is not installed on this machine (and can't be built here) — good, that IS the
// scenario the fallback exists for; these tests exercise the fallback path directly rather than
// skipping because the "real" scanner is absent.

// T9: the coordinator's own planted secret must be caught by the built-in fallback, not silently
// pass through just because gitleaks isn't installed.
{
  const dir = freshRepo()
  writeFileSync(join(dir, "a.txt"), "x\n")
  commitAll(dir, "c1")
  writeFileSync(join(dir, "config.js"), 'const API_KEY = "sk-live-abc123def456";\n')
  commitAll(dir, "c2 add secret")
  const { output } = runReport(dir, ["--since", "HEAD~1"])
  expectContains("T9 fallback explicitly labeled weaker, not mistaken for a real scanner", output,
    "gitleaks not installed — using built-in pattern fallback (weaker)")
  expectContains("T9 the planted secret is actually caught", output, "possible secret(s) added")
  expectContains("T9 caught secrets are surfaced under 확인이 필요한 것", output.split("확인이 필요한 것")[1], "possible secret(s) matched by the built-in fallback")
  rmSync(dir, { recursive: true, force: true })
}

// T10: negative case — ordinary clean code must NOT trip the fallback (false-positive check).
{
  const dir = freshRepo()
  writeFileSync(join(dir, "a.txt"), "x\n")
  commitAll(dir, "c1")
  writeFileSync(join(dir, "clean.js"), "function add(a, b) { return a + b; }\nconsole.log('hello world');\n")
  commitAll(dir, "c2 clean code only")
  const { output } = runReport(dir, ["--since", "HEAD~1"])
  expectContains("T10 clean code: fallback still ran (labeled, not silently skipped)", output,
    "gitleaks not installed — using built-in pattern fallback (weaker): no high-confidence secret patterns found")
  expectNotContains("T10 clean code: no false-positive secret finding", output, "possible secret(s) added")
  rmSync(dir, { recursive: true, force: true })
}

// T11: zero assertions in a bare node test file must be flagged distinctly, not reported as PASS
// (same shape as the coordinator's `node --test` w/ no test files finding, applied to this
// repo's own bare-test-file detection path so it's testable without npm/a real test file glob).
{
  const dir = freshRepo()
  mkdirSync(join(dir, "tests"), { recursive: true })
  writeFileSync(join(dir, "tests", "empty.test.mjs"), 'console.log("ALL PASS")\n') // 0 "ok:" lines
  commitAll(dir, "initial")
  const { output } = runReport(dir)
  expectContains("T11 zero assertions reported distinctly, not as PASS", output,
    "0 assertions ran (exit 0) — NOT the same as passing")
  expectNotContains("T11 zero-assertion file is not counted as a PASS", output, "PASS (0 assertion(s))")
  expectContains("T11 zero-assertion case surfaced under 확인이 필요한 것", output.split("확인이 필요한 것")[1], "ran 0 assertions")
  rmSync(dir, { recursive: true, force: true })
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`)
process.exit(failures === 0 ? 0 : 1)

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

function runReport(dir, args = [], env = undefined) {
  try {
    const out = execFileSync("bash", [SCRIPT, ...args], { cwd: dir, encoding: "utf8", env: env ? { ...process.env, ...env } : process.env })
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

// T12-T19: round 34's own adversarial battery (coordinator-directed: "keep hunting until the
// tool holds up"). Each targets one category and, where a real gap was found, the specific fix.

// T12: Gap 3 -- unquoted .env-style secret assignment (`KEY=value`, no quotes) must be caught,
// not just the quoted-string form. Negative: DEBUG=true/PORT=3000 (no sensitive key name) must
// not trip it regardless of being unquoted.
{
  const dir = freshRepo()
  writeFileSync(join(dir, "a.txt"), "x\n")
  commitAll(dir, "c1")
  writeFileSync(join(dir, ".env"), "DATABASE_PASSWORD=SuperSecret123456789\nDEBUG=true\nPORT=3000\n")
  commitAll(dir, "c2 add .env")
  const { output } = runReport(dir, ["--since", "HEAD~1"])
  expectContains("T12 unquoted .env-style secret assignment is caught", output, "generic api_key/secret/password/token assignment")
  expectNotContains("T12 DEBUG=true does not trip the fallback (no sensitive key name)", output, "DEBUG")
  rmSync(dir, { recursive: true, force: true })
}

// T13: Gap 4 -- a committed .env is flagged by filename alone (content-independent floor), and a
// legitimately-present .env.example is NOT treated the same as a real .env (negative case).
{
  const dir = freshRepo()
  writeFileSync(join(dir, "a.txt"), "x\n")
  commitAll(dir, "c1")
  writeFileSync(join(dir, ".env"), "X=1\n")
  writeFileSync(join(dir, ".env.example"), "X=changeme\n")
  commitAll(dir, "c2 add env files")
  const { output } = runReport(dir, ["--since", "HEAD~1"])
  expectContains("T13 real .env flagged by filename check", output, ".env: env file committed")
  expectNotContains("T13 .env.example is exempted, not flagged", output, ".env.example: env file committed")
  rmSync(dir, { recursive: true, force: true })
}

// T14: hanging test command is killed by the timeout, not left to hang the caller.
{
  const dir = freshRepo()
  writeFileSync(join(dir, "Makefile"), "test:\n\tsleep 300\n")
  commitAll(dir, "initial")
  const start = Date.now()
  const { output } = runReport(dir, [], { SUBTASK_REPORT_TIMEOUT_S: "2" })
  const elapsed = Date.now() - start
  expectContains("T14 hanging test command reported as TIMED OUT, not left hanging", output, "TIMED OUT after 2s")
  if (elapsed < 30000) console.log(`ok: T14 report actually returned quickly (${elapsed}ms), did not hang`)
  else { console.log(`FAIL: T14 report took ${elapsed}ms -- timeout did not actually bound it`); failures++ }
  rmSync(dir, { recursive: true, force: true })
}

// T15: a go.mod project without the go binary installed is reported honestly as "detected but
// not installed", not silently folded into "no test command detected" (same fix applied to
// pytest/cargo/make -- go.mod is the one exercised here since it's guaranteed absent in CI-like
// environments without assuming any particular toolchain is or isn't present).
{
  const dir = freshRepo()
  writeFileSync(join(dir, "go.mod"), "module example.com/foo\n")
  commitAll(dir, "initial")
  const { output } = runReport(dir)
  const hasGo = (() => { try { execFileSync("go", ["version"]); return true } catch { return false } })()
  if (!hasGo) {
    expectContains("T15 go.mod detected but go not installed -> honest skip, not blended into 'no test command'", output, "detected: go.mod, but 'go' is not installed — skipped")
  } else {
    console.log("ok: T15 skipped (go IS installed on this runner -- honesty-when-absent path not exercised here)")
  }
  rmSync(dir, { recursive: true, force: true })
}

// T16: a non-ASCII filename (git's default core.quotepath C-quotes it in --name-only output) must
// still be reachable by the per-file mock/dummy/fixture scan, not silently dropped.
{
  const dir = freshRepo()
  writeFileSync(join(dir, "a.txt"), "x\n")
  commitAll(dir, "c1")
  writeFileSync(join(dir, "\uD55C\uAE00\uD30C\uC77C.txt"), "mock_data = true\n")
  commitAll(dir, "c2 add unicode-named file")
  const { output } = runReport(dir, ["--since", "HEAD~1"])
  expectContains("T16 mock keyword in a non-ASCII-named file is still detected", output, "mock/dummy/fixture keywords added outside test-ish paths: 1")
  rmSync(dir, { recursive: true, force: true })
}

// T17: an invalid --since ref must not crash or print a garbled range description -- git's own
// quirk (echoing an unresolvable ref back to stdout instead of printing nothing) used to defeat
// the emptiness check and produce "could not compute range ..<sha>". Falls back gracefully.
{
  const dir = freshRepo()
  writeFileSync(join(dir, "a.txt"), "x\n")
  commitAll(dir, "c1")
  const { status, output } = runReport(dir, ["--since", "HEAD~99"])
  expectEqual("T17 invalid --since ref still exits 0", status, 0)
  expectNotContains("T17 no garbled 'could not compute range' from the git echo-back quirk", output, "could not compute range")
  expectContains("T17 falls back to real content instead", output, "1 commit(s)")
  rmSync(dir, { recursive: true, force: true })
}

// T18: root commit (no parent) end-to-end -- not just the post-commit hook's own --root fix
// (T8), the full subtask-report.sh path run directly against a repo's very first commit.
{
  const dir = freshRepo()
  writeFileSync(join(dir, "a.txt"), "hello\n")
  commitAll(dir, "the only commit")
  const { status, output } = runReport(dir)
  expectEqual("T18 root-commit report exits 0", status, 0)
  expectContains("T18 root-commit report covers repo start, not a crash/empty range", output, "(repo start)..")
  expectContains("T18 root-commit report reaches the real content", output, "1 commit(s)")
  rmSync(dir, { recursive: true, force: true })
}

// T19: a 100+-file commit stays readable -- diffstat is capped with an explicit omission count,
// and the real aggregate summary line ("N files changed, ...") is never dropped.
{
  const dir = freshRepo()
  writeFileSync(join(dir, "a.txt"), "x\n")
  commitAll(dir, "c1")
  mkdirSync(join(dir, "src"), { recursive: true })
  for (let i = 0; i < 120; i++) writeFileSync(join(dir, "src", `f${i}.txt`), "x\n")
  commitAll(dir, "c2 add 120 files")
  const { output } = runReport(dir, ["--since", "HEAD~1"])
  const changedSection = output.split("## Changed")[1].split("## Tests")[0]
  const lineCount = changedSection.split("\n").length
  if (lineCount < 60) console.log(`ok: T19 large-diff Changed section stays capped (${lineCount} lines, not 120+)`)
  else { console.log(`FAIL: T19 Changed section is ${lineCount} lines, not capped`); failures++ }
  expectContains("T19 omission is stated explicitly, not silently truncated", changedSection, "more file(s) omitted")
  expectContains("T19 the real aggregate summary line is preserved", changedSection, "120 files changed")
  rmSync(dir, { recursive: true, force: true })
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`)
process.exit(failures === 0 ? 0 : 1)

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
  // "bash HOOK 2>&1" (not the encoding-only form) so a passing run's stderr -- e.g. round 35
  // item 4's "보고서 생성 실패" signal, deliberately on stderr so it survives even when a caller
  // only checks "did the commit go through" -- is captured too, not just a failing run's.
  try {
    const out = execFileSync("bash", ["-c", `bash ${JSON.stringify(HOOK)} 2>&1`], { cwd: dir, encoding: "utf8" })
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
  expectNotContains("T8 a normal successful run prints no failure signal", output, "보고서 생성 실패")
  rmSync(dir, { recursive: true, force: true })
}

// T8b/T8c (round 35 item 4): this hook always exits 0 by design (a post-commit hook physically
// cannot undo the commit) -- but before this item, scripts/subtask-report.sh being missing OR
// crashing outright both went completely silent: report generation just quietly stopped
// happening, forever, with nothing on record. Both must now leave a one-line stderr signal
// ("보고서 생성 실패") while still never blocking/crashing the caller (status stays 0).

// T8b: scripts/subtask-report.sh missing/not executable.
{
  const dir = freshRepo()
  mkdirSync(join(dir, "wiki", "handoffs"), { recursive: true })
  writeFileSync(join(dir, "wiki", "handoffs", "SESSION_PRIMER.md"), "state\n")
  commitAll(dir, "sub-task boundary commit, no subtask-report.sh present")
  const { status, output } = runHook(dir)
  expectEqual("T8b hook still exits 0 when the generator is missing", status, 0)
  expectContains("T8b missing generator leaves a stderr signal, not silence", output, "보고서 생성 실패")
  expectContains("T8b signal names the specific cause", output, "scripts/subtask-report.sh missing or not executable")
  rmSync(dir, { recursive: true, force: true })
}

// T8c: scripts/subtask-report.sh present but crashes (nonzero exit) when run.
{
  const dir = freshRepo()
  writeFileSync(join(dir, "scripts", "subtask-report.sh"), "#!/usr/bin/env bash\necho 'boom'\nexit 3\n")
  execFileSync("chmod", ["+x", join(dir, "scripts", "subtask-report.sh")])
  mkdirSync(join(dir, "wiki", "handoffs"), { recursive: true })
  writeFileSync(join(dir, "wiki", "handoffs", "SESSION_PRIMER.md"), "state\n")
  commitAll(dir, "sub-task boundary commit, subtask-report.sh crashes")
  const { status, output } = runHook(dir)
  expectEqual("T8c hook still exits 0 when the generator crashes", status, 0)
  expectContains("T8c crashing generator leaves a stderr signal, not silence", output, "보고서 생성 실패")
  expectContains("T8c signal names the real exit code", output, "scripts/subtask-report.sh exited 3")
  rmSync(dir, { recursive: true, force: true })
}

// T9-T11: round 34 gap fixes (coordinator's independent test on a throwaway Node project).
//
// T9/T10 (round 35 item 1 update): the secret scan itself moved to scripts/check-secrets.sh as
// a pre-commit BLOCKER (real coverage: tests/check-secrets.test.mjs T1-T6) -- a post-commit
// report is structurally too late for a secret. What's left to prove HERE is that this report no
// longer re-implements the scan (no fallback pattern list, no per-match output) and instead
// points at the mechanism that does, on both a secret-containing range and a clean one alike --
// the report's own text must not depend on staged content it no longer looks at.
{
  const dir = freshRepo()
  writeFileSync(join(dir, "a.txt"), "x\n")
  commitAll(dir, "c1")
  writeFileSync(join(dir, "config.js"), 'const API_KEY = "sk-live-abc123def456";\n')
  commitAll(dir, "c2 add secret")
  const { output } = runReport(dir, ["--since", "HEAD~1"])
  expectContains("T9 report points to the pre-commit secret check, not a re-scan", output,
    "secrets: enforced by the pre-commit hook (scripts/check-secrets.sh), not re-scanned here")
  expectNotContains("T9 report no longer runs the old built-in fallback scan itself", output, "built-in pattern fallback")
  expectNotContains("T9 report no longer emits per-pattern match counts", output, "possible secret(s) added")
  rmSync(dir, { recursive: true, force: true })
}

// T10: negative case — same pointer text on an ordinary clean range, not conditional on content.
{
  const dir = freshRepo()
  writeFileSync(join(dir, "a.txt"), "x\n")
  commitAll(dir, "c1")
  writeFileSync(join(dir, "clean.js"), "function add(a, b) { return a + b; }\nconsole.log('hello world');\n")
  commitAll(dir, "c2 clean code only")
  const { output } = runReport(dir, ["--since", "HEAD~1"])
  expectContains("T10 clean range: same pointer text regardless of content", output,
    "secrets: enforced by the pre-commit hook (scripts/check-secrets.sh), not re-scanned here")
  expectNotContains("T10 clean range: no stale fallback wording either", output, "gitleaks")
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

// T12/T13 (round 35 item 1 update): the unquoted .env-style pattern match and the filename-floor
// check (Gap 3/Gap 4, round 34) both moved into scripts/check-secrets.sh -- re-proven there as
// T1/T2/T3 (tests/check-secrets.test.mjs) against the real pre-commit-blocking script, not a
// second copy of the fixture here. This report no longer emits filename-floor findings either.
{
  const dir = freshRepo()
  writeFileSync(join(dir, "a.txt"), "x\n")
  commitAll(dir, "c1")
  writeFileSync(join(dir, ".env"), "DATABASE_PASSWORD=SuperSecret123456789\nDEBUG=true\nPORT=3000\n")
  commitAll(dir, "c2 add .env")
  const { output } = runReport(dir, ["--since", "HEAD~1"])
  expectNotContains("T12 report no longer runs the filename-floor check itself", output, "filename check (content-independent floor)")
  expectNotContains("T12 report no longer emits an env-file finding directly", output, ".env: env file committed")
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

// T20 (round 46): a `progress:` commit message that NAMES a file the commit does not contain.
// This is the report's founding premise -- never trust what the model says it did -- applied to
// the last place it was still taking the model's word. Live origin: warms-mobile b462450, subject
// "progress: [sub-task 2] — TurnManager.ts, SESSION_PRIMER.md", diffstat TurnManager.ts only. The
// unstaged primer is what manufactured round 46's entire incident (no primer touch -> no sub-task
// boundary -> commits pile up -> elective arm fires -> the remedy has to be a standalone
// primer-only commit, which arms a fresh primer boundary mid-turn).
//
// T20c/T20d/T20e are the load-bearing NEGATIVES: measured on 321 real commits, an unscoped
// version of this check flags 12.6% of the template's history, every one of them a subject naming
// a topic rather than a manifest. The check must apply ONLY to build.md step 3's own mandated
// `progress: [sub-task] — [file]` format.
{
  // T20a: the exact live shape.
  const dir = freshRepo()
  mkdirSync(join(dir, "src"), { recursive: true })
  mkdirSync(join(dir, "wiki", "handoffs"), { recursive: true })
  writeFileSync(join(dir, "wiki", "handoffs", "SESSION_PRIMER.md"), "before\n")
  commitAll(dir, "seed")
  writeFileSync(join(dir, "src", "TurnManager.ts"), "export const x = 1\n")
  writeFileSync(join(dir, "wiki", "handoffs", "SESSION_PRIMER.md"), "after — but never staged\n")
  git(dir, ["add", "src/TurnManager.ts"])          // the primer is edited but NOT staged
  git(dir, ["commit", "-q", "-m", "progress: [sub-task 2] — TurnManager.ts, SESSION_PRIMER.md"])
  const { output } = runReport(dir, ["--since", "HEAD~1"])
  expectContains("T20a a named-but-unstaged file is reported", output, "SESSION_PRIMER.md but that file is not in the commit")
  expectContains("T20a the finding lands in the human-attention section", output, "## 확인이 필요한 것")
  expectNotContains("T20a the file that WAS committed is not reported missing", output, "TurnManager.ts but that file is not in the commit")
  rmSync(dir, { recursive: true, force: true })
}
{
  // T20b (negative): same subject, both files actually staged -- the correct build.md shape.
  const dir = freshRepo()
  mkdirSync(join(dir, "src"), { recursive: true })
  mkdirSync(join(dir, "wiki", "handoffs"), { recursive: true })
  writeFileSync(join(dir, "wiki", "handoffs", "SESSION_PRIMER.md"), "before\n")
  commitAll(dir, "seed")
  writeFileSync(join(dir, "src", "TurnManager.ts"), "export const x = 1\n")
  writeFileSync(join(dir, "wiki", "handoffs", "SESSION_PRIMER.md"), "after\n")
  commitAll(dir, "progress: [sub-task 2] — TurnManager.ts, SESSION_PRIMER.md")
  const { output } = runReport(dir, ["--since", "HEAD~1"])
  expectNotContains("T20b a correctly-staged progress commit is not reported", output, "but that file is not in the commit")
  rmSync(dir, { recursive: true, force: true })
}
{
  // T20c (negative, SCOPE): a non-`progress:` subject naming a topic file it does not touch --
  // the 12.6% false-positive class measured on the template's own history.
  const dir = freshRepo()
  writeFileSync(join(dir, "a.txt"), "1\n")
  commitAll(dir, "seed")
  writeFileSync(join(dir, "a.txt"), "2\n")
  commitAll(dir, "test: regression net for subtask-report.sh — covers scripts/check-caps.sh too")
  const { output } = runReport(dir, ["--since", "HEAD~1"])
  expectNotContains("T20c a topic-naming non-progress subject is out of scope", output, "but that file is not in the commit")
  rmSync(dir, { recursive: true, force: true })
}
{
  // T20d (negative, SCOPE): a `progress:` subject with no em/en dash has no file-list slot.
  const dir = freshRepo()
  writeFileSync(join(dir, "a.txt"), "1\n")
  commitAll(dir, "seed")
  writeFileSync(join(dir, "a.txt"), "2\n")
  commitAll(dir, "progress: wire up Physics.ts and SESSION_PRIMER.md handling")
  const { output } = runReport(dir, ["--since", "HEAD~1"])
  expectNotContains("T20d a progress subject with no dash separator is out of scope", output, "but that file is not in the commit")
  rmSync(dir, { recursive: true, force: true })
}
{
  // T20e (negative): a full path in the slot must match the committed path, not be flagged just
  // because the slot spells it with directories while git reports the same file.
  const dir = freshRepo()
  mkdirSync(join(dir, "src", "systems"), { recursive: true })
  writeFileSync(join(dir, "a.txt"), "1\n")
  commitAll(dir, "seed")
  writeFileSync(join(dir, "src", "systems", "Physics.ts"), "export const g = 9.8\n")
  commitAll(dir, "progress: [sub-task 3] — src/systems/Physics.ts")
  const { output } = runReport(dir, ["--since", "HEAD~1"])
  expectNotContains("T20e a full path that was committed is not reported missing", output, "but that file is not in the commit")
  rmSync(dir, { recursive: true, force: true })
}

// T21 (round 48): the sub-task NUMBER in a `progress: [sub-task N]` subject vs. the path the
// primer's own plan puts on line N. A different axis from T20: T20 asks "does the commit contain
// what its subject names," T21 asks "is N the N the plan means." Live origin, warms-mobile
// 2026-09-04: told only "continue," the model committed "[subtask 7] — GameScene.ts" and
// "[subtask 8] — main.ts" while the plan put 7 at src/systems/AI.ts and 8 at src/ui/. It had
// asked to re-order once before and been refused (404fd8a); this time it re-ordered silently.
// T20 stayed quiet (the named files WERE in the commits) and so did the gate (no primer touch,
// so no boundary ever armed) -- a human found it by hand.
//
// T21c/d/f/g/h are the load-bearing NEGATIVES. Measured on both repos' full history (345
// commits) the check as scoped below flags exactly 2, both true positives; each negative below
// pins one of the guards that keeps it there.
const PLAN = [
  "## 서브태스크 목록",
  "6. 무기 시스템 — src/entities/Projectile.ts (폭탄 발사, 궤적, 폭발) (small)",
  "7. AI — src/systems/AI.ts (조준 계산, 바람 보정) (medium)",
  "8. UI — src/ui/ (HP바, 바람 표시) (medium)",
  "9. 씬 연결 — GameScene.ts (Boot → Game → Result) (medium)",
  "10. 모바일 최적화 — 터치 조작, 반응형 스케일링 (small)",
  "",
].join("\n")
const MISMATCH = "but touched none of the paths the primer's own plan lists for item"
function planRepo(primerBody = PLAN) {
  const dir = freshRepo()
  mkdirSync(join(dir, "wiki", "handoffs"), { recursive: true })
  writeFileSync(join(dir, "wiki", "handoffs", "SESSION_PRIMER.md"), primerBody)
  writeFileSync(join(dir, "a.txt"), "1\n")
  commitAll(dir, "seed")
  return dir
}
function addFile(dir, rel, msg) {
  mkdirSync(join(dir, dirname(rel)), { recursive: true })
  writeFileSync(join(dir, rel), "export const x = 1\n")
  commitAll(dir, msg)
}
{
  // T21a: the exact live shape -- [subtask 7] while plan item 7 is src/systems/AI.ts.
  const dir = planRepo()
  addFile(dir, "src/scenes/GameScene.ts", "progress: [subtask 7] — GameScene.ts, Projectile.ts draw 수정")
  const { output } = runReport(dir, ["--since", "HEAD~1"])
  expectContains("T21a a re-pointed sub-task number is reported", output, `says [sub-task 7] ${MISMATCH} 7 (src/systems/AI.ts )`)
  expectContains("T21a the finding lands in the human-attention section", output, "## 확인이 필요한 것")
  rmSync(dir, { recursive: true, force: true })
}
{
  // T21b (negative): the number and the plan agree -- the normal, correct case.
  const dir = planRepo()
  addFile(dir, "src/entities/Projectile.ts", "progress: [subtask 6] — Projectile.ts")
  const { output } = runReport(dir, ["--since", "HEAD~1"])
  expectNotContains("T21b a number matching its plan path is not reported", output, MISMATCH)
  rmSync(dir, { recursive: true, force: true })
}
{
  // T21c (negative, SCOPE): a plan line whose path is a DIRECTORY (`src/ui/`) must match any file
  // under it -- without prefix matching every legitimate `src/ui/` commit would be flagged.
  const dir = planRepo()
  addFile(dir, "src/ui/HpBar.ts", "progress: [subtask 8] — HpBar.ts")
  const { output } = runReport(dir, ["--since", "HEAD~1"])
  expectNotContains("T21c a file under a planned directory is not reported", output, MISMATCH)
  rmSync(dir, { recursive: true, force: true })
}
{
  // T21d (negative, SCOPE): a `progress:` subject with no bracketed [sub-task N] claims no
  // number, so there is nothing to check it against. Live shape: warms-mobile 404fd8a.
  const dir = planRepo()
  addFile(dir, "src/scenes/GameScene.ts", "progress: revert to original order, sub-task 7 — GameScene.ts")
  const { output } = runReport(dir, ["--since", "HEAD~1"])
  expectNotContains("T21d a subject with no bracketed number is out of scope", output, MISMATCH)
  rmSync(dir, { recursive: true, force: true })
}
{
  // T21e (negative, SCOPE): a plan line may spell a bare filename (`GameScene.ts`) where git
  // reports the full path -- build.md's own message format does exactly that. Matching on the
  // basename too is what keeps that from reading as a mismatch.
  const dir = planRepo()
  addFile(dir, "src/scenes/GameScene.ts", "progress: [subtask 9] — GameScene.ts")
  const { output } = runReport(dir, ["--since", "HEAD~1"])
  expectNotContains("T21e a bare filename in the plan matches the committed full path", output, MISMATCH)
  rmSync(dir, { recursive: true, force: true })
}
{
  // T21f (negative): a sub-task legitimately touches files beyond the one the plan names. Only
  // "nothing the commit touched is on the plan line" is the signal -- "some planned path missing"
  // is normal work and must stay silent.
  const dir = planRepo()
  mkdirSync(join(dir, "src", "entities"), { recursive: true })
  mkdirSync(join(dir, "src", "util"), { recursive: true })
  writeFileSync(join(dir, "src", "entities", "Projectile.ts"), "export const x = 1\n")
  writeFileSync(join(dir, "src", "util", "vec.ts"), "export const y = 2\n")
  commitAll(dir, "progress: [subtask 6] — Projectile.ts, vec.ts")
  const { output } = runReport(dir, ["--since", "HEAD~1"])
  expectNotContains("T21f an extra unplanned file alongside the planned one is not reported", output, MISMATCH)
  rmSync(dir, { recursive: true, force: true })
}
{
  // T21g (negative, SCOPE): plan line 10 names no path at all -- nothing machine-checkable, so
  // the check must stay silent AND say out loud that it did not run (this script's own rule:
  // silence must never read as checked-and-clean).
  const dir = planRepo()
  addFile(dir, "src/main.ts", "progress: [subtask 10] — main.ts")
  const { output } = runReport(dir, ["--since", "HEAD~1"])
  expectNotContains("T21g a plan line naming no path is not reported as a mismatch", output, MISMATCH)
  expectContains("T21g an unverifiable number is declared skipped, not silently passed", output, "sub-task number vs. plan check:")
  rmSync(dir, { recursive: true, force: true })
}
{
  // T21h (negative): a commit that touches only SESSION_PRIMER.md has no work file to compare,
  // and every sub-task's closing handoff passes through that shape.
  const dir = planRepo()
  writeFileSync(join(dir, "wiki", "handoffs", "SESSION_PRIMER.md"), PLAN + "\n서브태스크 6 완료\n")
  commitAll(dir, "progress: [subtask 6] — SESSION_PRIMER.md")
  const { output } = runReport(dir, ["--since", "HEAD~1"])
  expectNotContains("T21h a primer-only commit is not reported", output, MISMATCH)
  rmSync(dir, { recursive: true, force: true })
}
{
  // T21i: the plan is read from the primer AS OF THAT COMMIT, not the working tree -- a report
  // run weeks later must judge the commit against the plan it was actually written against.
  const dir = planRepo()
  addFile(dir, "src/scenes/GameScene.ts", "progress: [subtask 7] — GameScene.ts")
  writeFileSync(join(dir, "wiki", "handoffs", "SESSION_PRIMER.md"), PLAN.replace("7. AI — src/systems/AI.ts", "7. 씬 — src/scenes/GameScene.ts"))
  commitAll(dir, "docs: rewrite the plan after the fact")
  const { output } = runReport(dir, ["--since", "HEAD~2"])
  expectContains("T21i the plan as of that commit is what the number is judged against", output, `says [sub-task 7] ${MISMATCH} 7 (src/systems/AI.ts )`)
  rmSync(dir, { recursive: true, force: true })
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`)
process.exit(failures === 0 ? 0 : 1)

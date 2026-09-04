// Regression net for scripts/subtask-review-llm.sh (layer 2: local-model diff review).
// Same fixture philosophy as tests/subtask-report.test.mjs — synthetic throwaway git repos, only
// node/git assumed present. Most assertions here use SUBTASK_REVIEW_MOCK_CONTENT to test the
// parser deterministically without a live model call (an LLM call is slow/nondeterministic-
// availability, unlike npm/pytest — a legitimate reason to seam it, not a "don't fake it"
// violation: the seam only replaces the network call, never the parsing/reporting logic under
// test). One block at the end makes a REAL call against the local model, matching this project's
// own "plant a defect, verify it's caught" methodology (round 34/35) — it skips gracefully
// (informational only, not a FAILURE) if no server answers within a quick probe, the same
// standard round 33 already accepted ("No LLM calls made... foreign benchmark held the slot").
//
// Run: node --experimental-strip-types tests/subtask-review-llm.test.mjs
import { execFileSync } from "child_process"
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "fs"
import { tmpdir } from "os"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const SCRIPT = join(REPO_ROOT, "scripts", "subtask-review-llm.sh")

function git(dir, args) {
  return execFileSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", ...args], { cwd: dir, encoding: "utf8" })
}

function freshRepo() {
  const dir = mkdtempSync(join(tmpdir(), "subtask-review-llm-"))
  git(dir, ["init", "-q"])
  return dir
}

function commitAll(dir, msg) {
  git(dir, ["add", "-A"])
  git(dir, ["commit", "-q", "-m", msg])
}

function run(dir, args = [], env = {}) {
  try {
    const out = execFileSync("bash", [SCRIPT, ...args], { cwd: dir, encoding: "utf8", env: { ...process.env, ...env } })
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

// T1: SUBTASK_REVIEW_LLM_DISABLE skips without attempting any network call, exit 0.
{
  const dir = freshRepo()
  writeFileSync(join(dir, "a.txt"), "one\n")
  commitAll(dir, "c1")
  writeFileSync(join(dir, "a.txt"), "two\n")
  commitAll(dir, "c2")
  const { status, output } = run(dir, ["--since", "HEAD~1"], { SUBTASK_REVIEW_LLM_DISABLE: "1" })
  expectEqual("T1 exit code is always 0 (never blocks caller)", status, 0)
  expectContains("T1 disable flag skips explicitly", output, "SUBTASK_REVIEW_LLM_DISABLE set")
  expectContains("T1 no findings raised when disabled", output, "(none raised)")
  rmSync(dir, { recursive: true, force: true })
}

// T2: empty diff for the range (HEAD..HEAD, no real change) is stated explicitly, not silently
// folded into "0 issues found" -- and never attempts a network call for a genuinely empty range.
{
  const dir = freshRepo()
  writeFileSync(join(dir, "a.txt"), "same\n")
  commitAll(dir, "c1")
  const { output } = run(dir, ["--since", "HEAD"])
  expectContains("T2 empty-diff range is stated explicitly", output, "skipped: empty diff")
  rmSync(dir, { recursive: true, force: true })
}

// T3: unreachable server -- fast, real network attempt to a closed port, short timeout so the
// test itself stays fast. Distinguishes "unreachable" from "not a pass" (never silently clean).
{
  const dir = freshRepo()
  writeFileSync(join(dir, "a.txt"), "one\n")
  commitAll(dir, "c1")
  writeFileSync(join(dir, "a.txt"), "two\n")
  commitAll(dir, "c2")
  const { status, output } = run(dir, ["--since", "HEAD~1"], {
    SUBTASK_REVIEW_API_BASE: "http://127.0.0.1:1", // reserved/unlikely-bound port, fails fast
    SUBTASK_REVIEW_TIMEOUT_S: "3",
  })
  expectEqual("T3 exit code is always 0 even when server is unreachable", status, 0)
  expectContains("T3 unreachable server is stated as skipped, not a clean pass", output, "could not reach local model server")
  expectNotContains("T3 unreachable server never reports '0 issue(s) found'", output, "0 issue(s) found")
  rmSync(dir, { recursive: true, force: true })
}

// T4: diff over the char cap is skipped honestly (not silently truncated-and-reviewed), and
// surfaces under 확인이 필요한 것 so a human knows automation didn't cover it.
{
  const dir = freshRepo()
  writeFileSync(join(dir, "a.txt"), "x\n")
  commitAll(dir, "c1")
  writeFileSync(join(dir, "big.txt"), "line\n".repeat(2000))
  commitAll(dir, "c2 big file")
  const { output } = run(dir, ["--since", "HEAD~1"], { SUBTASK_REVIEW_DIFF_CHAR_CAP: "500" })
  expectContains("T4 oversized diff states its own char count vs the cap", output, "over the 500-char cap")
  expectContains("T4 oversized diff is never silently truncated-and-reviewed", output, "worse than an honest skip")
  expectContains("T4 oversized diff surfaces under 확인이 필요한 것", output, "too large for automated layer-2 review")
  rmSync(dir, { recursive: true, force: true })
}

// T5: mock -- valid JSON array with one finding is parsed, shown, and tagged distinctly from
// layer-1 tool findings (round 34/35's own lesson: label uncertain LLM output, don't blend it
// with deterministic tool output).
{
  const dir = freshRepo()
  writeFileSync(join(dir, "a.txt"), "x\n")
  commitAll(dir, "c1")
  writeFileSync(join(dir, "a.txt"), "y\n")
  commitAll(dir, "c2")
  const mock = JSON.stringify([{ file: "clamp.py", line: 5, issue: "flipped comparison" }])
  const { output } = run(dir, ["--since", "HEAD~1"], { SUBTASK_REVIEW_MOCK_CONTENT: mock })
  expectContains("T5 parsed finding is shown with file:line", output, "clamp.py:5 — flipped comparison")
  expectContains("T5 finding is tagged as unverified/layer2, not blended with tool findings", output, "[layer2/local-llm, unverified] clamp.py:5")
  rmSync(dir, { recursive: true, force: true })
}

// T6: mock -- markdown-fenced JSON (```json ... ```) still parses, defensively, even though the
// prompt asks for no fence.
{
  const dir = freshRepo()
  writeFileSync(join(dir, "a.txt"), "x\n")
  commitAll(dir, "c1")
  writeFileSync(join(dir, "a.txt"), "y\n")
  commitAll(dir, "c2")
  const mock = "```json\n" + JSON.stringify([{ file: "foo.py", line: 3, issue: "test issue" }]) + "\n```"
  const { output } = run(dir, ["--since", "HEAD~1"], { SUBTASK_REVIEW_MOCK_CONTENT: mock })
  expectContains("T6 markdown-fenced JSON is still parsed", output, "foo.py:3 — test issue")
  rmSync(dir, { recursive: true, force: true })
}

// T7: mock -- empty array is a real "reviewed, found nothing", distinct from a parse failure.
{
  const dir = freshRepo()
  writeFileSync(join(dir, "a.txt"), "x\n")
  commitAll(dir, "c1")
  writeFileSync(join(dir, "a.txt"), "y\n")
  commitAll(dir, "c2")
  const { output } = run(dir, ["--since", "HEAD~1"], { SUBTASK_REVIEW_MOCK_CONTENT: "[]" })
  expectContains("T7 empty array reports 0 issues, not a skip/failure", output, "0 issue(s) found (model reviewed the diff, output parsed cleanly)")
  expectContains("T7 no findings raised", output, "(none raised)")
  rmSync(dir, { recursive: true, force: true })
}

// T8: mock -- unparseable content is a distinct failure mode, NOT folded into "0 issues found"
// (the single most dangerous silent-failure shape this script guards against).
{
  const dir = freshRepo()
  writeFileSync(join(dir, "a.txt"), "x\n")
  commitAll(dir, "c1")
  writeFileSync(join(dir, "a.txt"), "y\n")
  commitAll(dir, "c2")
  const { output } = run(dir, ["--since", "HEAD~1"], { SUBTASK_REVIEW_MOCK_CONTENT: "not json at all, sorry" })
  expectContains("T8 unparseable output is its own explicit finding", output, "was not parseable as a JSON array")
  expectContains("T8 unparseable output states it is NOT the same as 0 issues", output, "NOT the same as \"0 issues")
  expectContains("T8 raw content is preserved for a human to read", output, "not json at all, sorry")
  expectContains("T8 surfaces under 확인이 필요한 것", output, "was not machine-parseable")
  expectNotContains("T8 never silently reports 0 issues on parse failure", output, "0 issue(s) found")
  rmSync(dir, { recursive: true, force: true })
}

// T9: mock -- more items than the cap (10) are truncated in the DISPLAY, but the true count is
// still stated (round-34-style "cap the list, keep the real aggregate" pattern).
{
  const dir = freshRepo()
  writeFileSync(join(dir, "a.txt"), "x\n")
  commitAll(dir, "c1")
  writeFileSync(join(dir, "a.txt"), "y\n")
  commitAll(dir, "c2")
  const items = Array.from({ length: 13 }, (_, i) => ({ file: "f.py", line: i, issue: "x" }))
  const { output } = run(dir, ["--since", "HEAD~1"], { SUBTASK_REVIEW_MOCK_CONTENT: JSON.stringify(items) })
  expectContains("T9 true count (13) is stated, not silently capped", output, "13 issue(s) found, showing first 10")
  const shownLines = output.split("\n").filter((l) => l.trim().startsWith("- f.py:")).length
  expectEqual("T9 display itself is capped at 10 lines", shownLines, 10)
  rmSync(dir, { recursive: true, force: true })
}

// T10: same boundary/range resolution as subtask-report.sh (shared lib/subtask-range.sh) -- a
// root commit still produces "(repo start).." not a crash.
{
  const dir = freshRepo()
  writeFileSync(join(dir, "a.txt"), "hello\n")
  commitAll(dir, "the only commit")
  const { status, output } = run(dir, [], { SUBTASK_REVIEW_MOCK_CONTENT: "[]" })
  expectEqual("T10 root-commit review exits 0", status, 0)
  expectContains("T10 root-commit review covers repo start, not a crash", output, "(repo start)..")
  rmSync(dir, { recursive: true, force: true })
}

// T11 (live, best-effort): plant a real, unambiguous logic bug and confirm the actual local model
// catches it from the diff alone -- this project's own round 34/35 "plant a defect, verify it's
// caught" methodology, applied to layer 2. Skips (not a FAIL) if no server answers a quick probe,
// same standard round 33 already accepted for "no LLM calls made, server busy."
{
  const dir = freshRepo()
  writeFileSync(join(dir, "clamp.py"),
    'def clamp(value, lo, hi):\n    """Clamp value to the inclusive range [lo, hi]."""\n    if value < lo:\n        return lo\n    if value < hi:\n        return hi\n    return value\n')
  commitAll(dir, "add clamp with a flipped comparison")

  let reachable = false
  try {
    execFileSync("curl", ["-sf", "--max-time", "3", "http://127.0.0.1:8080/health"], { encoding: "utf8" })
    reachable = true
  } catch { /* server down or busy -- skip below, not a failure */ }

  if (!reachable) {
    console.log("ok: T11 skipped (informational only) -- local model server at 127.0.0.1:8080 did not answer a quick health probe")
  } else {
    const { status, output } = run(dir, [], { SUBTASK_REVIEW_TIMEOUT_S: "90" })
    expectEqual("T11 live call exits 0", status, 0)
    expectContains("T11 live model catches the planted flipped-comparison bug with a line citation", output, "clamp.py:5")
  }
  rmSync(dir, { recursive: true, force: true })
}

// T12 (round 49): the model has a training cutoff, this project runs current toolchains, and so
// it reports newer-than-itself dependency versions as typos. Measured on the only two
// warms-mobile reports that carried layer-2 findings at all: 14 findings, 0 true positives, and 5
// of them were exactly this -- typescript ^7.0.2, vite ^8.2.2, @types/node ^26.4.1 and Phaser 4
// declared not to exist, while node_modules held all four at precisely those versions. All five
// strings below are verbatim from those reports.
//
// Three conditions must all hold before a finding is dropped, and the negatives below are each
// one of them missing: an installed package (T12c), a declaration in package.json (T12d), a
// version in the claim (T12e). T12f is the outcome that matters most -- a real defect is not
// touched by any of this.
{
  const dir = freshRepo()
  mkdirSync(join(dir, "node_modules", "typescript"), { recursive: true })
  mkdirSync(join(dir, "node_modules", "phaser"), { recursive: true })
  mkdirSync(join(dir, "node_modules", "vite"), { recursive: true })
  // installed as a transitive, deliberately NOT in package.json -- its name is an ordinary
  // English word, the exact collision the "declared" half of the condition exists to prevent
  mkdirSync(join(dir, "node_modules", "debug"), { recursive: true })
  writeFileSync(join(dir, "node_modules", "typescript", "package.json"), JSON.stringify({ name: "typescript", version: "7.0.2" }))
  writeFileSync(join(dir, "node_modules", "phaser", "package.json"), JSON.stringify({ name: "phaser", version: "4.2.1" }))
  writeFileSync(join(dir, "node_modules", "vite", "package.json"), JSON.stringify({ name: "vite", version: "8.2.2" }))
  writeFileSync(join(dir, "node_modules", "debug", "package.json"), JSON.stringify({ name: "debug", version: "4.3.4" }))
  writeFileSync(join(dir, "package.json"), JSON.stringify({
    dependencies: { phaser: "^4.2.1", vite: "^8.2.2" },
    devDependencies: { typescript: "^7.0.2", lodash: "^99.0.0" },
  }, null, 2))
  writeFileSync(join(dir, "app.ts"), "export const x = 1\n")
  commitAll(dir, "base")
  writeFileSync(join(dir, "app.ts"), "export const x = 2\n")
  commitAll(dir, "change")

  const findings = [
    { file: "package.json", line: 15, issue: "The dependency version for 'typescript' is '^7.0.2', which does not exist as a stable release (current latest is 5.x), indicating a likely typo or invalid version constraint." },
    { file: "wiki/PROJECT_BACKGROUND.md", line: 14, issue: "The diff claims the framework is Phaser 4, but Phaser 4 does not exist (current stable is Phaser 3), indicating a likely factual error or typo." },
    { file: "package.json", line: 20, issue: "The dependency version for 'lodash' is '^99.0.0', which does not exist as a stable release." },
    { file: "package.json", line: 21, issue: "vite is a build tool and does not exist as a backend runtime, which is a category error." },
    { file: "app.ts", line: 1, issue: "The comparison uses <= where the comment above says it must be strictly less than, an off-by-one." },
    { file: "package.json", line: 16, issue: "vite 8.2.2 is pinned with a caret, which allows minor upgrades that can break the build without warning." },
    { file: "app.ts", line: 4, issue: "The debug option does not exist in version 2.0 of this config schema, so the field is ignored." },
  ]
  const { output } = run(dir, [], { SUBTASK_REVIEW_MOCK_CONTENT: JSON.stringify(findings) })

  expectContains("T12a a version the repo has installed is dropped, naming the installed version", output, "[dropped: this repo has typescript@7.0.2 installed")
  expectNotContains("T12b and it does not reach the human-attention channel", output, "[layer2/local-llm, unverified] package.json:15")
  expectContains("T12c a bare major ('Phaser 4') is caught too -- the corpus shape with no dots", output, "[dropped: this repo has phaser@4.2.1 installed")
  expectContains("T12d a version the repo does NOT have installed still reaches the human", output, "[layer2/local-llm, unverified] package.json:20")
  expectContains("T12e a nonexistence claim with no version in it is a category argument, not this filter's business", output, "[layer2/local-llm, unverified] package.json:21")
  expectContains("T12f an ordinary defect finding is untouched", output, "[layer2/local-llm, unverified] app.ts:1")
  expectContains("T12g the count of dropped findings is stated out loud, never silent", output, "were dropped against node_modules")
  expectContains("T12h a finding that names an installed package and its version but claims nothing about existence survives", output, "[layer2/local-llm, unverified] package.json:16")
  expectContains("T12i an installed-but-undeclared transitive whose name is an English word does not sweep findings up", output, "[layer2/local-llm, unverified] app.ts:4")
  rmSync(dir, { recursive: true, force: true })
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`)
process.exit(failures === 0 ? 0 : 1)

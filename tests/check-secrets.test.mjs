// Regression net for scripts/check-secrets.sh (round 35 item 1+2: secret/sensitive-filename
// scan, moved from subtask-report.sh's post-commit report into a pre-commit BLOCKER, plus a
// hybrid external-tool-preferred/built-in-fallback path). Synthetic throwaway git repos, same
// pattern as tests/subtask-report.test.mjs -- only node+git are assumed present.
//
// Round 35 work order's own emphasis: "every defect found this session had passing tests at the
// time... plant the failure, watch it get caught." Every test below plants either a real secret
// (must be caught) or an ordinary-looking negative case (must NOT be caught) -- false positives
// are explicitly called out as worse than misses (acceptance criterion B).
//
// Run: node --experimental-strip-types tests/check-secrets.test.mjs
import { execFileSync } from "child_process"
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, rmSync } from "fs"
import { tmpdir } from "os"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const SCRIPT = join(REPO_ROOT, "scripts", "check-secrets.sh")

function git(dir, args) {
  return execFileSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", ...args], { cwd: dir, encoding: "utf8" })
}

function freshRepo() {
  const dir = mkdtempSync(join(tmpdir(), "check-secrets-"))
  git(dir, ["init", "-q"])
  writeFileSync(join(dir, "a.txt"), "x\n")
  git(dir, ["add", "-A"])
  git(dir, ["commit", "-q", "-m", "c1"])
  return dir
}

function run(dir, env = undefined) {
  // "bash SCRIPT 2>&1" (not the encoding-only form) so a passing run's stderr -- e.g. the
  // SKIP_SECRET_CHECK bypass notice, which is deliberately printed to stderr so it survives even
  // when a caller only looks at "did the commit go through" -- is captured too, not just a
  // failing run's.
  try {
    const out = execFileSync("bash", ["-c", `bash ${JSON.stringify(SCRIPT)} 2>&1`], { cwd: dir, encoding: "utf8", env: env ? { ...process.env, ...env } : process.env })
    return { status: 0, output: out }
  } catch (e) {
    return { status: e.status ?? 1, output: String(e.stdout || "") + String(e.stderr || "") }
  }
}

let failures = 0
function expectContains(label, output, needle) {
  if (output.includes(needle)) console.log(`ok: ${label}`)
  else { console.log(`FAIL: ${label} -- expected output to contain:\n  ${JSON.stringify(needle)}\ngot:\n${output}`); failures++ }
}
function expectNotContains(label, output, needle) {
  if (!output.includes(needle)) console.log(`ok: ${label}`)
  else { console.log(`FAIL: ${label} -- expected output NOT to contain:\n  ${JSON.stringify(needle)}\ngot:\n${output}`); failures++ }
}
function expectStatus(label, actual, want) {
  if (actual === want) console.log(`ok: ${label} (exit ${actual})`)
  else { console.log(`FAIL: ${label} -- expected exit ${want}, got ${actual}`); failures++ }
}

// T1: a real Stripe/OpenAI-style secret staged must block (exit 1), with the specific match line.
{
  const dir = freshRepo()
  writeFileSync(join(dir, "config.js"), 'const API_KEY = "sk-live-abc123def456ghijklmno";\n')
  git(dir, ["add", "-A"])
  const { status, output } = run(dir)
  expectStatus("T1 real secret blocks the check", status, 1)
  expectContains("T1 fallback labeled (gitleaks absent on this machine)", output, "gitleaks not installed -- using built-in pattern fallback")
  expectContains("T1 specific pattern match reported", output, "Stripe/OpenAI-style key (sk-.../sk_live_...): 1 match(es)")
  expectContains("T1 BLOCKED message with bypass instructions", output, "check-secrets: BLOCKED")
  expectContains("T1 bypass instructions name the exact env var", output, "SKIP_SECRET_CHECK=1")
  rmSync(dir, { recursive: true, force: true })
}

// T2: negative cases -- .env.example, DEBUG=true, PORT=3000, ordinary short config must NOT block.
// This is the acceptance-criterion-B case: false positives are worse than misses here.
{
  const dir = freshRepo()
  writeFileSync(join(dir, ".env.example"), "DEBUG=true\nPORT=3000\nAPI_URL=https://example.com/api\n")
  git(dir, ["add", "-A"])
  const { status, output } = run(dir)
  expectStatus("T2 .env.example + DEBUG=true + PORT=3000 do not block", status, 0)
  expectContains("T2 explicitly reported clean, not silently skipped", output, "check-secrets: clean")
  expectNotContains("T2 no false-positive match reported", output, "match(es)")
  rmSync(dir, { recursive: true, force: true })
}

// T3: filename floor -- a real .env blocks by filename alone even with an innocuous value, but
// .env.example alongside it is exempt (negative case in the same commit).
{
  const dir = freshRepo()
  writeFileSync(join(dir, ".env"), "X=1\n")
  writeFileSync(join(dir, ".env.example"), "X=changeme\n")
  git(dir, ["add", "-A"])
  const { status, output } = run(dir)
  expectStatus("T3 real .env blocks by filename floor", status, 1)
  expectContains("T3 .env flagged by name", output, ".env: env file staged")
  expectNotContains("T3 .env.example NOT flagged by name", output, ".env.example: env file staged")
  rmSync(dir, { recursive: true, force: true })
}

// T4: SKIP_SECRET_CHECK=1 bypasses a real secret, but the bypass is visibly logged, not silent.
{
  const dir = freshRepo()
  writeFileSync(join(dir, "config.js"), 'const API_KEY = "sk-live-abc123def456ghijklmno";\n')
  git(dir, ["add", "-A"])
  const { status, output } = run(dir, { SKIP_SECRET_CHECK: "1" })
  expectStatus("T4 bypass allows the check to pass", status, 0)
  expectContains("T4 bypass is visibly logged, not silent", output, "SKIP_SECRET_CHECK=1 -- secret scan bypassed for this commit")
  rmSync(dir, { recursive: true, force: true })
}

// T5-T6: hybrid external-tool path (work order item 2). No real gitleaks is installed on this
// machine on purpose (item 2-B) -- these two tests exercise the "external tool present" branch
// with a throwaway PATH-only fake binary (not a real install: it never leaves this test's tmp
// dir, and it's removed with the fixture), proving the labeling and pass/fail wiring both work
// without ever installing anything on the host.
function fakeGitleaks(dir, rc) {
  const binDir = join(dir, ".fakebin")
  mkdirSync(binDir, { recursive: true })
  const path = join(binDir, "gitleaks")
  writeFileSync(path, `#!/usr/bin/env bash\necho "fake-gitleaks: pretending to scan"\nexit ${rc}\n`)
  chmodSync(path, 0o755)
  return binDir
}

// T5: fake gitleaks reports clean (rc=0) -- output must say gitleaks was used, not the fallback.
{
  const dir = freshRepo()
  writeFileSync(join(dir, "clean.js"), "function add(a, b) { return a + b; }\n")
  git(dir, ["add", "-A"])
  const binDir = fakeGitleaks(dir, 0)
  const { status, output } = run(dir, { PATH: `${binDir}:${process.env.PATH}` })
  expectStatus("T5 gitleaks-present + clean does not block", status, 0)
  expectContains("T5 output states gitleaks was used, not the fallback", output, "gitleaks available -- using it")
  expectNotContains("T5 fallback path not taken when gitleaks is present", output, "built-in pattern fallback")
  rmSync(dir, { recursive: true, force: true })
}

// T6: fake gitleaks reports findings (rc=1) -- must block using gitleaks's own verdict, not the
// (silent, since gitleaks ran instead) built-in fallback.
{
  const dir = freshRepo()
  writeFileSync(join(dir, "clean.js"), "function add(a, b) { return a + b; }\n")
  git(dir, ["add", "-A"])
  const binDir = fakeGitleaks(dir, 1)
  const { status, output } = run(dir, { PATH: `${binDir}:${process.env.PATH}` })
  expectStatus("T6 gitleaks-present + findings blocks", status, 1)
  expectContains("T6 gitleaks's own output surfaced", output, "fake-gitleaks: pretending to scan")
  expectContains("T6 attributed to gitleaks, not the fallback", output, "check-secrets: gitleaks reported findings in staged changes")
  rmSync(dir, { recursive: true, force: true })
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`)
process.exit(failures === 0 ? 0 : 1)

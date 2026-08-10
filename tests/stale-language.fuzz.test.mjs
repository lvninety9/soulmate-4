// Property-based regression net for check_stale_language() (scripts/check-caps.sh) — round 16.
//
// Rounds 12 and 14 each found a distinct real gap in this check (advisory-only when it should
// block; a line-wrap split evading the per-line grep; a missing archive-file exemption sibling) —
// one new edge case per audit round, found by whichever adversarial idea that round's agent
// happened to try. This generates many synthetic presentations of the same 6 stale-claim phrases
// (wrap position, line count, casing, whitespace, punctuation, paragraph boundaries, and
// exemption-pattern edge cases) in one pass, instead of waiting for round N+1 to think of one more
// case. Run: node --experimental-strip-types tests/stale-language.fuzz.test.mjs
import { execFileSync } from "child_process"
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync, readdirSync } from "fs"
import { tmpdir } from "os"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")

function freshFixture() {
  // Copy the real repo (minus .git/tests) as a clean baseline — every OTHER check-caps.sh check
  // (cap sizes, template drift, etc.) already passes on it, so a nonzero exit after one targeted
  // edit is attributable to that edit, not incidental unrelated noise.
  const dir = mkdtempSync(join(tmpdir(), "stale-fuzz-"))
  for (const entry of readdirSync(REPO_ROOT)) {
    if (entry === ".git" || entry === "tests") continue
    cpSync(join(REPO_ROOT, entry), join(dir, entry), { recursive: true })
  }
  execFileSync("git", ["init", "-q"], { cwd: dir })
  execFileSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", "add", "-A"], { cwd: dir })
  execFileSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "-m", "fixture"], { cwd: dir })
  return dir
}

function runCheck(dir) {
  try {
    const out = execFileSync("bash", ["scripts/check-caps.sh"], { cwd: dir, encoding: "utf8" })
    return { blocked: false, output: out }
  } catch (e) {
    return { blocked: true, output: String(e.stdout || "") + String(e.stderr || "") }
  }
}

let failures = 0
let total = 0
function expect(label, dir, wantBlocked) {
  total++
  const { blocked, output } = runCheck(dir)
  const staleHit = output.includes("OVER CAP: possibly-stale mechanism-state claim")
  const ok = wantBlocked ? staleHit : !staleHit
  if (ok) {
    console.log(`ok: ${label}`)
  } else {
    console.log(`FAIL: ${label} — wanted stale-hit=${wantBlocked}, got blocked=${blocked} staleHit=${staleHit}`)
    console.log(output.split("\n").filter(l => l.includes("stale") || l.includes("OVER CAP")).join("\n"))
    failures++
  }
  rmSync(dir, { recursive: true, force: true })
}

const TARGET = "wiki/protocols/build.md" // real, non-exempt, non-historical file

function withAppend(text) {
  const dir = freshFixture()
  execFileSync("bash", ["-c", `printf '%s' "$1" >> "$2"`, "_", text, TARGET], { cwd: dir })
  execFileSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", "add", "-A"], { cwd: dir })
  execFileSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "-m", "inject"], { cwd: dir })
  return dir
}

function withNewFile(path, text) {
  const dir = freshFixture()
  const full = join(dir, path)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, text)
  execFileSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", "add", "-A"], { cwd: dir })
  execFileSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "-m", "inject"], { cwd: dir })
  return dir
}

// --- baseline: unmodified repo must be clean ---
expect("baseline unmodified repo is clean", freshFixture(), false)

// --- line-wrap position dimension ---
expect("2-line split, phrase early on line 1",
  withAppend("\nThis safeguard hasn't yet\nbeen verified end-to-end in a live session.\n"), true)
expect("2-line split, phrase late on line 1",
  withAppend("\nA long lead-in sentence establishing context here has not yet\nbeen fully reviewed by anyone on the team.\n"), true)
expect("3-line split",
  withAppend("\nThis mechanism has\nnot yet\nbeen verified in production.\n"), true)
expect("4-line split",
  withAppend("\nThe\nintegration\nhas not yet\nbeen verified for this project.\n"), true)

// --- casing dimension ---
expect("uppercase phrase",
  withAppend("\nThis feature IS UNPATCHED as of this writing.\n"), true)
expect("mixed case phrase",
  withAppend("\nThis feature Has Not Yet Been reviewed by a human.\n"), true)

// --- whitespace dimension ---
expect("irregular internal whitespace (multi-space)",
  withAppend("\nThis  safeguard   has  not  yet   been  verified.\n"), true)
expect("tab-separated words",
  withAppend("\nThis\tsafeguard\thas\tnot\tyet\tbeen\tverified.\n"), true)

// --- punctuation dimension ---
expect("trailing punctuation variants",
  withAppend("\nStatus: still unpatched!! (tracked separately)\n"), true)
expect("phrase inside parens",
  withAppend("\n(Note: this hasn't been independently verified.)\n"), true)

// --- paragraph-boundary true negative: must NOT be falsely joined across a real section break ---
expect("phrase split across a blank-line paragraph break must NOT match",
  withAppend("\nThis work has not yet\n\nbeen reviewed by the compliance team, an unrelated later paragraph.\n"), false)
expect("two unrelated half-phrases separated by a real heading must NOT match",
  withAppend("\nEverything below this line has not yet\n\n## Unrelated section\n\nbeen touched by that sentence at all.\n"), false)

// --- exemption-pattern dimension (round 16's actual redesign) ---
expect("legitimately historical *-archive.md file stays exempt",
  withNewFile("wiki/rule-archive-archive.md", "# archive\nThis was noted as unpatched in an earlier round.\n"), false)
// round 17: the generic "*-archive.md" wildcard this test used to validate ("any future archive
// file is auto-exempt with no code change") is exactly what round 16's own audit found a real
// false-exemption bug in — an unrelated file that happens to end "-archive.md" for a different
// reason (a real deployment manifest, still-current content) was silently, wrongly exempted.
// Narrowed to the 3 known PRUNE-convention stems; an archive-named file outside those 3 is now
// correctly swept, not exempt.
expect("archive-suffixed file for an unrelated file (not one of the 3 known historical stems) stays swept",
  withNewFile("wiki/new-subsystem-archive.md", "# archive\nThis was hasn't yet been verified, as of that past round.\n"), true)
expect("wiki/deploy-archive.md naming collision — present-tense content stays swept, not silently exempt",
  withNewFile("wiki/deploy-archive.md",
    "# Deployment archive\n\nThis is an open, present-tense gap in the CURRENT deploy pipeline, not a historical note: the rollback step has not yet been verified.\n"),
  true)
expect("similarly-named but NOT a real archive file stays swept",
  withNewFile("wiki/archive-notes.md", "This has not yet been verified and needs a look.\n"), true)
expect("filename containing 'archive' mid-word but not the suffix stays swept",
  withNewFile("wiki/rule-archive-notes.md", "This has not yet been verified either.\n"), true)

// --- fenced code / inline code dimension (round 17) ---
expect("stale phrase inside a fenced code block must NOT match (example/quoted text, not a live claim)",
  withAppend("\n```\nThis has not yet been verified — example error text, not a real claim.\n```\n"), false)
expect("stale phrase inside an inline `code span` must NOT match",
  withAppend("\nSee the `has not yet been verified` flag in the config for details.\n"), false)
expect("stale phrase as real prose right after a closed code fence still matches",
  withAppend("\n```\nsome_example_code();\n```\nThis integration has not yet been verified for real.\n"), true)

// --- fenced/inline-code, harder forms (round 18) — round 17's fix stripped inline `...` spans
// per ORIGINAL line, before wrapped lines join into a paragraph, so a span split at the wrap
// point never formed a matched pair; and 4-space/tab indented code blocks (CommonMark's other
// code-block form) weren't recognized at all. round 18 reordered: exclude fence+indented lines
// first, join what's left, THEN strip inline spans from the joined text.
expect("inline `code span` split across this repo's own hard-wrap must NOT match",
  withAppend("\nExample: `this hasn't\nyet been` released, just illustrating wrapped inline code.\n"), false)
expect("stale phrase inside a 4-space indented code block must NOT match",
  withAppend("\nExample:\n\n    this hasn't yet been tested in production\n\nMore text.\n"), false)

// --- FEEDBACK_PENDING split-exemption regression (round 13) ---
expect("FEEDBACK_PENDING.md open table (before Completed history) stays swept",
  withNewFile("wiki/handoffs/FEEDBACK_PENDING.md",
    "# Feedback\n\n| # | issue |\n|---|---|\n| P1 | this has not yet been fixed |\n\n## Completed history\n\n| # | issue |\n|---|---|\n"),
  true)
expect("FEEDBACK_PENDING.md Completed history section stays exempt",
  withNewFile("wiki/handoffs/FEEDBACK_PENDING.md",
    "# Feedback\n\n| # | issue |\n|---|---|\n\n## Completed history\n\n| # | issue |\n|---|---|\n| P1 | this has not yet been fixed, per that old round |\n"),
  false)

console.log(failures === 0 ? `\nALL PASS (${total}/${total})` : `\n${failures}/${total} FAILURE(S)`)
process.exit(failures === 0 ? 0 : 1)

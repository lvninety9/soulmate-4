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
  // round 22: an unclosed HTML comment blocks via a different, non-"possibly-stale" message
  // (it's a parity failure, not a phrase match — see check_stale_language()'s own comment) but
  // is exactly as much "a real reason to block" as a phrase hit for this test's purposes.
  const staleHit = output.includes("OVER CAP: possibly-stale mechanism-state claim")
    || output.includes("never closes anywhere in the file")
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

// --- HTML comment / YAML frontmatter dimension (round 19) — round 18's audit found the
// reordered pipeline still had no concept of HTML comments or YAML frontmatter, two more
// non-prose constructs neither round 16 nor 17 tried. round 19 generalized fence/frontmatter
// exclusion into a (open-marker, close-marker) table and gave HTML comments their own small
// same-line-strip-else-block-skip handling (asymmetric markers, usually self-contained on one
// line with real prose alongside — a different shape than the symmetric table entries).
expect("stale phrase inside a single-line HTML comment must NOT match",
  withAppend("\n<!-- todo: this hasn't yet been verified end to end -->\n"), false)
expect("stale phrase inside a multi-line HTML comment must NOT match",
  withAppend("\n<!--\nthis has not yet been verified\n-->\n"), false)

// --- HTML-comment closing-line silent miss (round 20) — round 19's audit found the closing
// line of a multi-line comment was unconditionally discarded whole, silently dropping any real
// prose trailing the "-->" on that same line (the one genuine silent-miss found across 20
// rounds on this mechanism; every other finding here was a safe-direction false positive).
// round 20 mirrors the same-line-open handling: strip up through "-->", then keep scanning
// whatever remains on that line instead of unconditionally skipping it.
expect("real prose trailing '-->' on a multi-line comment's OWN closing line still matches",
  withAppend("\n<!--\ncommented\nstill commented --> This feature is still unpatched as of today.\n"), true)
expect("multi-line comment with nothing after '-->' on the closing line still stays clean",
  withAppend("\n<!--\nthis has not yet been verified\n-->\n"), false)
expect("real prose on the same line as a closed HTML comment still matches",
  withAppend("\nThis feature <!-- old note --> still unpatched as of today.\n"), true)

// --- HTML-comment greedy-regex silent miss (round 21) — round 20's own fix (sub(/^.*-->/))
// was still regex-based and GREEDY: a closing line carrying a second, trailing same-line
// comment after the true close made ".*" consume through the LAST "-->" instead of the first,
// silently swallowing the real prose in between. round 21 replaced the whole mechanism with
// index()-based nearest-open/nearest-close pairing, which cannot match the wrong occurrence
// by construction (index() always finds the first occurrence, there is no "how greedy" to
// misconfigure). These 2 cases are the exact composition that broke the round-20 regex fix.
expect("round 20's exact bug: trailing decoy comment after the true close must not hide real prose",
  withAppend("\n<!--\ncommented\nstill commented --> This feature has not yet been verified. <!-- todo: cleanup -->\n"), true)
expect("prose before an open AND after the true close, with a decoy second comment, both real claims caught",
  withAppend("\nEarlier claim: this has not yet been verified. <!-- old --> Later claim: still unpatched. <!-- todo -->\n"), true)

expect("stale phrase inside YAML frontmatter must NOT match",
  withNewFile("wiki/protocols/withfm.md",
    "---\nstatus: has not yet been reviewed\n---\n\n# Doc\n\nReal content.\n"), false)
expect("bare '---' mid-document (a markdown rule, not frontmatter) does not suppress prose after it",
  withAppend("\nSome text.\n\n---\n\nThis integration has not yet been verified for real.\n"), true)
expect("stale phrase inside a footnote definition still matches (renders as visible prose, correctly not exempt)",
  withAppend("\nSee the note.[^1]\n\n[^1]: This claim has not yet been independently verified.\n"), true)

// --- unclosed-comment parity (round 22) — round 21's audit found a <!-- that never finds a
// --> anywhere in the file leaves the awk pass's incmt state stuck at 1 for the rest of the
// scan: every real claim after the mistake goes unswept, unbounded, unwarned (the exact
// dangerous silent-miss shape this mechanism's whole design goal rules out). Mirrors
// check_fence_parity's odd-fence-count hard-FAIL, reusing strip_comments()'s own incmt state
// (not a separate raw-text <!--/--> count) so it can't misfire on real content like this repo's
// own docs, which legitimately quote "-->" inside backtick spans documenting this exact bug's
// regex with zero real <!-- anywhere in the file.
expect("a <!-- that never closes anywhere in the file is caught, even with real claims after it",
  withAppend("\n<!-- todo: never gets closed\n\nThis feature has not yet been verified.\nAnother claim: this is still unpatched.\n"), true)
expect("a <!-- that never closes, but has NO real claims after it, is still caught (parity, not phrase-driven)",
  withAppend("\n<!-- todo: never gets closed, and nothing stale follows either\n"), true)
expect("properly closed comment (no parity issue) stays clean, unaffected by the new check",
  withAppend("\n<!-- fine, this closes normally -->\nReal text is fine.\n"), false)
expect("standalone '-->' inside inline code with zero real <!-- anywhere must NOT be treated as unclosed",
  withAppend("\nSee the `sub(/^.*-->/)` pattern discussed in the docs — no real comment here at all.\n"), false)

console.log(failures === 0 ? `\nALL PASS (${total}/${total})` : `\n${failures}/${total} FAILURE(S)`)
process.exit(failures === 0 ? 0 : 1)

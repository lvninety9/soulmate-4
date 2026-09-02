// Test for .kilo/plugins/lib/vision-read-core.ts (round 40). Imports the core logic directly —
// zero dependency on @kilocode/plugin, so this runs without Kilo's own node_modules resolvable,
// same discipline as tests/subtask-gate.test.mjs. Negative cases (missing file, bad extension,
// unreachable server) are deterministic and always run; the live-answer case needs the real
// vision server (SOULMATE4_VISION_URL, default 127.0.0.1:8081) and is skipped with a stated
// reason (not a silent pass) if that server isn't reachable — same "ok vs skipped, never
// conflated" principle as check-caps.sh's own bootstrap checks.
import { writeFileSync, mkdtempSync, rmSync } from "fs"
import { tmpdir } from "os"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { visionReadCore, residentModelID, VISION_BASE_URL } from "../.kilo/plugins/lib/vision-read-core.ts"

let failures = 0
function expectEquals(label, actual, want) {
  if (actual === want) {
    console.log(`ok: ${label}`)
  } else {
    console.log(`FAIL: ${label} -- want ${JSON.stringify(want)}, got ${JSON.stringify(actual)}`)
    failures++
  }
}
function expectContains(label, actual, needle) {
  if (String(actual).includes(needle)) {
    console.log(`ok: ${label}`)
  } else {
    console.log(`FAIL: ${label} -- expected to contain ${JSON.stringify(needle)}, got ${JSON.stringify(actual)}`)
    failures++
  }
}

async function main() {
  const dir = mkdtempSync(join(tmpdir(), "vread-"))

  // --- T1: missing file ---
  {
    const out = await visionReadCore(dir, "nope.png", "what is this")
    expectContains("T1 missing file names the resolved path", out, join(dir, "nope.png"))
    expectContains("T1 missing file is reported as Error, not a crash", out, "Error:")
  }

  // --- T2: unsupported extension ---
  {
    const p = join(dir, "notes.txt")
    writeFileSync(p, "hello")
    const out = await visionReadCore(dir, "notes.txt", "what is this")
    expectContains("T2 unsupported extension rejected", out, "unsupported image extension")
    expectContains("T2 unsupported extension names the extension", out, "'.txt'")
  }

  // --- T3: unreachable server (real network call, no server there) ---
  {
    const p = join(dir, "fake.png")
    // A syntactically valid 1x1 PNG isn't needed here -- the request never reaches encoding
    // failure, residentModelID() fails first against a port nothing listens on.
    writeFileSync(p, Buffer.from([0x89, 0x50, 0x4e, 0x47]))
    const out = await visionReadCore(dir, "fake.png", "what is this", "http://127.0.0.1:1")
    expectContains("T3 unreachable server reported clearly, not a stack trace", out, "could not reach the vision server")
    expectContains("T3 unreachable server names the URL that failed", out, "http://127.0.0.1:1")
  }

  // --- T4 (live, conditionally skipped): real answer from the resident vision server ---
  {
    let reachable = true
    try {
      await residentModelID(VISION_BASE_URL)
    } catch {
      reachable = false
    }
    if (!reachable) {
      console.log(`skip: T4 live vision answer -- no server reachable at ${VISION_BASE_URL} (this is a skip, not a pass)`)
    } else {
      // 200x200 solid red square, generated once and embedded as base64 so this test has no
      // image-library dependency. NOT arbitrarily sized: a 4x4/8x8/16x16/32x32/64x64 version of
      // this exact same solid-color image was measured to consistently misread as "흰색" (white)
      // on the resident 4B model+vision-encoder (patch_size 16, expects ~1024 image tokens per
      // its own load-time hint) -- too small to carry a real signal through the patch embedding,
      // not a decoding issue. 200x200 was the smallest size checked that answered correctly, both
      // as this solid color and as vision-read-core.ts's own real-screenshot smoke test. Treat any
      // image under roughly 200px as unreliable input to this tool, not just a test-sizing detail.
      const REDSQUARE_PNG_B64 =
        "iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAIAAAAiOjnJAAACEUlEQVR4nO3SQQkAIADAQLV/Zy3hEOQuwR6be8B963UAfzIWCWORMBYJY5EwFgljkTAWCWORMBYJY5EwFgljkTAWCWORMBYJY5EwFgljkTAWCWORMBYJY5EwFgljkTAWCWORMBYJY5EwFgljkTAWCWORMBYJY5EwFgljkTAWCWORMBYJY5EwFgljkTAWCWORMBYJY5EwFgljkTAWCWORMBYJY5EwFgljkTAWCWORMBYJY5EwFgljkTAWCWORMBYJY5EwFgljkTAWCWORMBYJY5EwFgljkTAWCWORMBYJY5EwFgljkTAWCWORMBYJY5EwFgljkTAWCWORMBYJY5EwFgljkTAWCWORMBYJY5EwFgljkTAWCWORMBYJY5EwFgljkTAWCWORMBYJY5EwFgljkTAWCWORMBYJY5EwFgljkTAWCWORMBYJY5EwFgljkTAWCWORMBYJY5EwFgljkTAWCWORMBYJY5EwFgljkTAWCWORMBYJY5EwFgljkTAWCWORMBYJY5EwFgljkTAWCWORMBYJY5EwFgljkTAWCWORMBYJY5EwFgljkTAWCWORMBYJY5EwFgljkTAWCWORMBYJY5EwFgljkTAWCWORMBYJY5EwFgljkTAWCWORMBYJY5EwFgljkTAWCWORMBYJY5EwFgljkTAWCWORMBYJY5EwFgljkTAWCWORMBYJY5EwFgljkTiKPQKPgJNL4wAAAABJRU5ErkJggg=="
      const p = join(dir, "red.png")
      writeFileSync(p, Buffer.from(REDSQUARE_PNG_B64, "base64"))
      const out = await visionReadCore(dir, "red.png", "이 이미지의 배경색이 뭐야? 색깔 이름 하나로만 답해줘.")
      console.log(`(live) T4 answer: ${out}`)
      const okAnswer = ["red", "빨강", "빨간", "scarlet", "crimson"].some((w) => out.toLowerCase().includes(w))
      if (okAnswer) {
        console.log("ok: T4 live server names the actual color (red/빨강/빨간)")
      } else {
        console.log(`FAIL: T4 live server did not name red -- got ${JSON.stringify(out)}`)
        failures++
      }
    }
  }

  rmSync(dir, { recursive: true, force: true })
  console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`)
  process.exit(failures === 0 ? 0 : 1)
}

main()

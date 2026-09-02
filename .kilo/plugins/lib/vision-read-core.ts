// vision-read-core.ts — the actual HTTP/file logic behind the vision_read tool, kept in its own
// module with zero dependency on @kilocode/plugin so tests/vision-read.test.mjs can import it
// directly (same shape as this project's own scripts/lib/subtask-range.sh precedent) without
// needing Kilo's own node_modules resolvable. See .kilo/plugins/vision-read.ts for why this tool
// exists and the thin tool() wrapper that exposes it to Kilo.

import { readFileSync, existsSync } from "fs"
import { resolve, extname } from "path"

export const VISION_BASE_URL = process.env.SOULMATE4_VISION_URL ?? "http://127.0.0.1:8081"

export const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
}

export async function residentModelID(baseURL: string = VISION_BASE_URL): Promise<string> {
  const res = await fetch(`${baseURL}/v1/models`)
  if (!res.ok) throw new Error(`vision server at ${baseURL} returned HTTP ${res.status}`)
  const data: any = await res.json()
  const id = data?.data?.[0]?.id ?? data?.models?.[0]?.model
  if (!id) throw new Error(`vision server at ${baseURL} reported no resident model`)
  return id
}

export async function visionReadCore(
  directory: string,
  argPath: string,
  question: string,
  baseURL: string = VISION_BASE_URL
): Promise<string> {
  const path = resolve(directory, argPath)
  if (!existsSync(path)) return `Error: no file at ${path}`
  const ext = extname(path).toLowerCase()
  const mime = MIME_BY_EXT[ext]
  if (!mime) {
    return `Error: unsupported image extension '${ext}' (supported: ${Object.keys(MIME_BY_EXT).join(", ")})`
  }

  const b64 = readFileSync(path).toString("base64")
  let modelID: string
  try {
    modelID = await residentModelID(baseURL)
  } catch (e) {
    return `Error: could not reach the vision server (${baseURL}) — is it running? (${e instanceof Error ? e.message : String(e)})`
  }

  const res = await fetch(`${baseURL}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: modelID,
      // temperature 0 (pure greedy) with no repeat_penalty was measured to loop into repeated
      // paragraphs on a real screenshot (not the synthetic swatches used in this repo's own
      // tests) -- repeat_penalty alone (still temperature 0, so still deterministic) stopped the
      // loop in the same live test; raising temperature was tried first and only added answer
      // variance without being needed to fix the loop, so it stays at 0. Still measured to
      // hallucinate specific content (a fabricated game title) on that same screenshot -- this is
      // the resident 4B checkpoint's real scene-understanding ceiling, not a decoding artifact
      // this tool can fix. Treat vision_read's answers as a starting read, not ground truth, for
      // content this small a model wasn't confident about.
      temperature: 0,
      repeat_penalty: 1.15,
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: question },
            { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
          ],
        },
      ],
    }),
  })
  if (!res.ok) {
    return `Error: vision server returned HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`
  }
  const data: any = await res.json()
  const answer = data?.choices?.[0]?.message?.content
  if (!answer) return `Error: vision server returned no answer (raw: ${JSON.stringify(data).slice(0, 300)})`
  return answer
}

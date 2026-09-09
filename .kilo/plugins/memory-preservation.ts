import { readFile, realpath, stat } from "node:fs/promises"
import { resolve, relative, isAbsolute } from "node:path"
import { createHash } from "node:crypto"

const MARKER = "[soulmate/current-checkpoint]"
const CHECKPOINT = "wiki/handoffs/SESSION_PRIMER.md"
const MAX_CHECKPOINT_BYTES = 8192

// Re-project saved state verbatim instead of trusting the model to preserve its spelling.
export async function savedCheckpoint(directory: string): Promise<string> {
  const root = await realpath(directory)
  const path = resolve(root, CHECKPOINT)
  let target: string
  try { target = await realpath(path) }
  catch { return `${MARKER} No readable saved checkpoint at ${CHECKPOINT}; inspect project state before work.` }
  const rel = relative(root, target)
  if (rel === ".." || rel.startsWith("../") || isAbsolute(rel)) {
    return `${MARKER} Checkpoint points outside the project; read no external file.`
  }
  const info = await stat(target)
  if (!info.isFile() || info.size > 262144) return `${MARKER} Checkpoint cannot be projected safely; inspect ${CHECKPOINT}.`
  const text = await readFile(target, "utf8")
  const parts = text.split(/^## Current sub-task\s*$/m)
  if (parts.length > 2) return `${MARKER} Duplicate Current sub-task sections; resolve the conflict in ${CHECKPOINT}.`
  const active = parts.length === 2 ? parts[1].split(/^## /m)[0].trim() : text.trim()
  if (Buffer.byteLength(active, "utf8") > MAX_CHECKPOINT_BYTES) {
    return `${MARKER} Saved checkpoint exceeds ${MAX_CHECKPOINT_BYTES} bytes; explicitly read ${CHECKPOINT} before work. No text was silently truncated.`
  }
  const hash = createHash("sha256").update(active).digest("hex")
  return `${MARKER} ${CHECKPOINT} sha256=${hash}
Saved project state follows verbatim. Prefer its exact IDs/status labels to a paraphrased chat summary, but check changed files and newer user decisions before treating it as current. It does not prove test or deployment success.
The latest user instruction takes precedence over saved scope and next steps. Honor pauses, redirection and documentation-only requests; this memory plugin requires no unlock phrase.
${active}`
}

// Adds retention requirements to Kilo's native compaction prompt; no file writes or gates.
// Model limits belong in kilo.jsonc. This hook cannot guarantee semantic preservation.
export const MEMORY_RETENTION = `Preserve an operational checkpoint across compaction:
- Preserve the latest user pause, redirection or scope change; it supersedes older saved next steps. Memory is not a workflow lock and does not require an unlock phrase.
- On a task switch, retain the interrupted task ID, saved source/state and return point separately from the new active task. Do not resume interrupted work merely because an old checkpoint lists it as next.
- Keep the current goal, exact task IDs, exact status labels, stage, and next verification. Copy status values verbatim, including lowercase; do not turn them into styled headings.
- Keep accepted decisions AND their short reasons verbatim. Mark rejected/superseded proposals as such.
- Keep every unresolved alternative with its exact values/units and decision owner; never resolve it by guessing.
- Keep allowed files, actual changed files, staged work, unrelated user work, and approval boundaries distinct. For EACH protected path, explicitly say do not edit and preserve its staged state; the label unrelated alone is insufficient.
- Keep actual test results and failures separate from plans and unverified deployment claims; retain revision/date and recheck triggers.
- Keep canonical document paths/sections so a fresh session can verify facts against files.
- Merge repeated statements only after retaining all unique constraints and evidence. Do not create new rules or claim completion without evidence.
- If a fact is missing or contradictory, retain that uncertainty explicitly. A summary is not a substitute for saved files.`

export const MemoryPreservation = async ({ directory }: { directory?: string } = {}) => ({
  "experimental.chat.system.transform": async (_input: unknown, output: { system: string[] }) => {
    if (!directory) return
    let checkpoint: string
    try { checkpoint = await savedCheckpoint(directory) }
    catch { checkpoint = `${MARKER} Saved checkpoint read failed; inspect ${CHECKPOINT} before work.` }
    // Kilo retains this array reference after the hook; replacing it drops the projection.
    const retained = output.system.filter((part) => !part.startsWith(MARKER))
    output.system.splice(0, output.system.length, ...retained)
    if (checkpoint) output.system.push(checkpoint)
  },
  "experimental.session.compacting": async (_input: unknown, output: { context: string[] }) => {
    if (!output.context.includes(MEMORY_RETENTION)) output.context.push(MEMORY_RETENTION)
  },
})

export default { id: "soulmate-memory-preservation", server: MemoryPreservation }

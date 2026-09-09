// Adds retention requirements to Kilo's native compaction prompt; no file writes or gates.
// Model limits belong in kilo.jsonc. This hook cannot guarantee semantic preservation.
export const MEMORY_RETENTION = `Preserve an operational checkpoint across compaction:
- Keep the current goal, exact task IDs, exact status labels, stage, and next verification.
- Keep accepted decisions AND their reasons. Mark rejected/superseded proposals as such.
- Keep every unresolved alternative with its exact values/units and decision owner; never resolve it by guessing.
- Keep allowed files, actual changed files, staged work, unrelated user work, and approval boundaries distinct.
- Keep actual test results and failures separate from plans and unverified deployment claims; retain revision/date and recheck triggers.
- Keep canonical document paths/sections so a fresh session can verify facts against files.
- Merge repeated statements only after retaining all unique constraints and evidence. Do not create new rules or claim completion without evidence.
- If a fact is missing or contradictory, retain that uncertainty explicitly. A summary is not a substitute for saved files.`

export const MemoryPreservation = async () => ({
  "experimental.session.compacting": async (_input: unknown, output: { context: string[] }) => {
    if (!output.context.includes(MEMORY_RETENTION)) output.context.push(MEMORY_RETENTION)
  },
})

export default { id: "soulmate-memory-preservation", server: MemoryPreservation }

import assert from "node:assert/strict"
import { test } from "node:test"
import plugin, { MemoryPreservation, MEMORY_RETENTION } from "../.kilo/plugins/memory-preservation.ts"

test("compaction retains other context and the runtime prompt; repeat hook calls do not grow it", async () => {
  const hooks = await MemoryPreservation()
  const output = { context: ["Existing runtime context"], prompt: "Existing custom prompt" }
  await hooks["experimental.session.compacting"]({}, output)
  await hooks["experimental.session.compacting"]({}, output)
  assert.deepEqual(output.context, ["Existing runtime context", MEMORY_RETENTION])
  assert.equal(output.prompt, "Existing custom prompt")
})

test("plugin exposes only the compaction hook, without mutation gates or tool overrides", async () => {
  assert.equal(plugin.server, MemoryPreservation)
  assert.deepEqual(Object.keys(await plugin.server()), ["experimental.session.compacting"])
})

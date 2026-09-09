import assert from "node:assert/strict"
import { test } from "node:test"
import plugin, { MemoryPreservation, MEMORY_RETENTION, savedCheckpoint } from "../.kilo/plugins/memory-preservation.ts"

test("compaction retains other context and the runtime prompt; repeat hook calls do not grow it", async () => {
  const hooks = await MemoryPreservation()
  const output = { context: ["Existing runtime context"], prompt: "Existing custom prompt" }
  await hooks["experimental.session.compacting"]({}, output)
  await hooks["experimental.session.compacting"]({}, output)
  assert.deepEqual(output.context, ["Existing runtime context", MEMORY_RETENTION])
  assert.equal(output.prompt, "Existing custom prompt")
})

test("plugin exposes memory hooks without mutation gates or tool overrides", async () => {
  assert.equal(plugin.server, MemoryPreservation)
  assert.deepEqual(Object.keys(await plugin.server()), ["experimental.chat.system.transform", "experimental.session.compacting"])
})

import { mkdtemp, mkdir, writeFile, rm, symlink } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

test("saved status survives lossy summaries and updates without duplicate projection", async () => {
  const dir = await mkdtemp(join(tmpdir(), "memory-retention-"))
  try {
    await mkdir(join(dir, "wiki/handoffs"), { recursive: true })
    const path = join(dir, "wiki/handoffs/SESSION_PRIMER.md")
    await writeFile(path, "# State\n\n## Current sub-task\nR7: active; BACKOFF: blocked; 50/100 ms.\n\n## History\nOld text")
    const hooks = await MemoryPreservation({ directory: dir })
    const output = { system: ["Existing instructions"] }
    await hooks["experimental.chat.system.transform"]({}, output)
    assert.match(output.system[1], /R7: active; BACKOFF: blocked; 50\/100 ms/)
    assert.doesNotMatch(output.system[1], /Old text/)
    await writeFile(path, "## Current sub-task\nR7: verify; BACKOFF: blocked.\n")
    await hooks["experimental.chat.system.transform"]({}, output)
    assert.equal(output.system.length, 2)
    assert.equal(output.system[0], "Existing instructions")
    assert.match(output.system[1], /R7: verify/)
  } finally { await rm(dir, { recursive: true, force: true }) }
})

test("oversized and external checkpoints are explicit failures, never truncated facts", async () => {
  const dir = await mkdtemp(join(tmpdir(), "memory-boundary-"))
  try {
    await mkdir(join(dir, "wiki/handoffs"), { recursive: true })
    const path = join(dir, "wiki/handoffs/SESSION_PRIMER.md")
    await writeFile(path, "## Current sub-task\n" + "x".repeat(8193))
    assert.match(await savedCheckpoint(dir), /exceeds 8192 bytes/)
    await rm(path)
    await symlink("/etc/hostname", path)
    assert.match(await savedCheckpoint(dir), /outside the project/)
  } finally { await rm(dir, { recursive: true, force: true }) }
})

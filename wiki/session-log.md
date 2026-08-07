# Session log — one line per session

| Session | Date | Summary |
|---|---|---|
| 1 | 2026-08-08 | Seeded from soulmate-3's decision to test Kilo Code; found the real installed Kilo build is an opencode rebuild (not Cline-fork docs describe); confirmed AGENTS.md/CLAUDE.md/CONTEXT.md auto-load and `tool.execute.before`/`after` hooks via the CLI binary; found custom slash commands don't work (canary test); fixed a local-model reasoning-token-exhaustion incident at the inference server; built and live-verified `.kilo/plugins/subtask-gate.ts` (L01-L05); wrote this repo. `scripts/bootstrap.sh` itself not yet run for real — see FEEDBACK #1 |
| 2 | 2026-08-08 | Round 1 independent blind validation (fresh agent, README-only): bootstrap.sh failed on its first real run (cap/cleanup/missing-templates bugs, all fixed + re-verified) and the subtask-gate's in-memory state didn't survive across separate `kilo run` invocations — the tool's own default and this repo's documented usage pattern — fixed via disk persistence, re-verified with two genuinely separate processes (L06). Added a 6th protocol, `refactor.md` (backup-first, small-verified-units). Pushed all fixes |

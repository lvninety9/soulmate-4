# Local game-code benchmark — 2026-09-30 KST

The complete raw prompts, graders, responses, and diagnostic copies are in [the evidence archive](game-code-benchmark-2026-09-30.tar.gz) (SHA-256: `27354ef6dc82f9417da854d8769357b392a4edb0002bf44ee5217419c3aa739a`). Extract it before running the commands below.

## Scope

Direct OpenAI-compatible API, one response per task, temperature 0. This is a code-generation baseline, not a Kilo Code agent run or a visual gameplay review. The host is an RTX 3080 with 10 GiB VRAM. All three full-task requests used the same 597-token prompt, a 65,536-token server context, and `max_tokens=40000`. The prompt and graders were fixed before responses were inspected. The reference passed 14/14 and 10/10.

| Configuration | Full task: raw /14 | Tokens | Wall time | Decode rate | Stop reason | Focused task: raw /10 | Focused tokens/time |
|---|---:|---:|---:|---:|---|---:|---:|
| Qwen3.6 35B-A3B Q4_K_M, existing service | 0 | 40,000 | 1167.6 s | 34.37 t/s | length | 5 | 1,109 / 31.6 s |
| Qwen3.8 27B IQ2_XXS | 7 | 1,479 | 196.3 s | 7.59 t/s | stop | 0 | 977 / 123.1 s |
| Qwen3.8 27B Q4_K_M + MTP (draft max 2) | 0 | 2,593 | 555.9 s | 4.67 t/s | stop | 10 | 1,272 / 266.5 s |

The IQ2 focused response was run with a 2,500-token ceiling before the user's ceiling correction. It stopped by itself at 977 tokens, so that ceiling did not truncate it. The full IQ2 response was rerun at 40,000 and was byte-identical to its earlier self-terminated response.

## Quality findings

- **Qwen3.6 full:** Ran to the 40,000-token limit without an `export function step`. Its code fence remained open; the phrase “But wait, if we explode a bomb” occurs 129 times. This is a completion and repetition failure, not a claim that it cannot solve any smaller part.
- **Qwen3.6 focused:** Delivered a valid named export, but omits the bomb's own blast cell, includes permanent walls in the blast, and checks for bombs only when the board cell is neither floor nor obstacle. Bombs on floor therefore fail to chain-trigger. Raw 5/10.
- **Qwen3.8 IQ2 full:** Delivered a complete module but ticks a newly planted bomb immediately, omits the bomb's own cell from the blast, tries to assign to a character of an immutable row string when destroying a crate, and mishandles chain-triggered bombs. Raw 7/14.
- **Qwen3.8 IQ2 focused:** Exported `default { resolveExplosions }` instead of the required named function, so the raw interface score is 0/10. A separate diagnostic adapter gave 8/10; its remaining errors are in crate handling. This diagnostic is not the deliverable score.
- **Qwen3.8 Q4+MTP full:** Delivered a complete response but left two discarded draft blocks in the same scope, causing duplicate `changed` and `plantedThisTurn` declarations. Raw module fails to load, 0/14. A separate diagnostic copy removed those two draft blocks and passed 14/14. This shows latent logic quality, but the repaired copy is not credited as the original output.
- **Qwen3.8 Q4+MTP focused:** Delivered a valid named export and passed 10/10. Its bounded queue, original-board ray checks, unique blast cells, and copied inputs are visible in the raw code.

## Interpretation

For the Soulmate 4 subtask workflow, Q4+MTP is the best quality candidate in this single run, provided every file is syntax-checked and behavior-tested before handoff. IQ2 is faster than Q4+MTP but made more game-rule errors. Qwen3.6 is much faster per token, yet its full-task output was trapped in repetition. These are observed configurations and one prompt per task, not a statistically reliable ranking of the underlying models. Q4 weights (16.5 GB) exceed the 10 GiB GPU, so CPU spill materially affects latency.

## Reproduction and evidence

- Full prompt: `prompt.txt`, SHA-256 `a1c4dc8fef8c8f73307b7e35bf59f04158959458551d824a625b1c3643573357`.
- Full grader: `grade.mjs`, SHA-256 `ed23fe452d5cc05f31d70849d968d5dcf3f432009d0ae9845e533373889c895f`.
- Focused prompt: `focused-prompt.txt`, SHA-256 `e708af98b2b9fbf89f738bba997a5b24a56ac7f75a1b6020123742ad9e3d2d70`.
- Focused grader: `grade_focused.mjs`, SHA-256 `f35e40c86cc2f73ad0ab41c6086e42824db7d8e2c0a0326ab47d228f0a401499`.
- Each `*.json` contains raw response, elapsed time, usage, finish reason, and timings. Each matching `*.mjs` is the extracted code. Run `node grade.mjs FILE.mjs` or `node grade_focused.mjs FILE.mjs` with a 30-second shell timeout for safety.
- The Qwen3.8 Q4+MTP server was temporary on port 8092. The existing Qwen3.6 service was restored on port 8080 and `/health` returned `{"status":"ok"}`; no temporary port-8092 server remains.

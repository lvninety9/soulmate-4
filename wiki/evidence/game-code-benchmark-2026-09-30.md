# Local game-code benchmark — 2026-09-30 KST

## Scope

Direct OpenAI-compatible API evaluation on an RTX 3080 10 GiB host. A fixed Bomberman-style
engine prompt and fixed behavior grader were used. Full tasks had a 40,000-token ceiling and a
65,536-token server context. The reference passed 14/14; the focused explosion task reference
passed 10/10. Raw test programs and downloaded trial models were removed after review.

## Results

| Configuration | Sampling | Full raw score | Tokens / wall time | Focused raw score |
|---|---|---:|---:|---:|
| Qwen3.6 35B-A3B Q4, seed 20260930 | greedy | 0/14 | 40,000 / 1167.6 s | 5/10 |
| Qwen3.6 35B-A3B Q4, seed 20260930 | official non-thinking | 8/14 | 3,342 / 98.0 s | 0/10 |
| Qwen3.6 35B-A3B Q4, seed 20261001 | official non-thinking | 10/14 | 2,593 / 78.8 s | 0/10 |
| Qwen3.6 35B-A3B Q4 | official precise-coding thinking | cancelled after 8,589 tokens | about 234 s | not run |
| Qwen3.8 27B IQ2 | greedy | 7/14 | 1,479 / 196.3 s | 0/10 |
| Qwen3.8 27B Q4 + MTP | greedy | 0/14 | 2,593 / 555.9 s | 10/10 |
| Qwen3-Coder 30B-A3B Q4 | official instruct | grader timeout | 1,389 / 55.7 s | grader timeout |
| GPT-OSS 20B MXFP4 | official | **14/14** | 8,074 / 197.2 s | 8/10 |

Qwen3.6 official non-thinking sampling was `temperature=0.7`, `top_p=0.8`, `top_k=20`,
`min_p=0`, `presence_penalty=1.5`, and `repetition_penalty=1.0`. Its two full runs decoded
at 35.22 and 34.32 tokens/s and stopped normally. GPT-OSS used `temperature=1.0`,
`top_p=1.0`, decoded at 41.27 tokens/s, and stopped normally.

## Findings

- The original Qwen3.6 0/14 and 40,000-token repetition were caused mainly by the server's
  `temperature=0` configuration. Official sampling completed twice at 8/14 and 10/14.
- Qwen3.6 still made logic and delivery errors. Its focused official-sampling responses scored
  0/10 due to duplicate declarations or a broken named export.
- Qwen3.8 Q4+MTP showed latent quality: its focused output passed 10/10 and a diagnostic repair of
  its full output passed 14/14. The raw full module remained 0/14 due to duplicate declarations,
  and 4.67 tokens/s is unsuitable for long agent sessions on this host.
- Qwen3-Coder was slower than Qwen3.6 and both outputs entered an unbounded chain-reaction loop
  under the grader.
- GPT-OSS produced the only raw full solution that passed 14/14. Its focused result passed 8/10;
  both failures attempted to mutate a character in an immutable board-row string.
- GPT-OSS also completed a live Kilo 7.8.1 `Glob → Read → Edit → Read` flow. Its 65K server used
  about 7.2 GiB VRAM and ran beside the CPU-hosted vision service. ComfyUI should remain stopped
  while coding to avoid VRAM pressure.
- Stopping ComfyUI and vision freed about 1.4 GiB. That was still insufficient to make the
  16.5 GB Qwen3.8 Q4 weights fit a 10 GiB GPU, so CPU spill remained.

## Decision

Use GPT-OSS 20B MXFP4 as the next live Kilo trial model. It gave the best raw correctness, highest
decode speed, and working Kilo tool calls in this evaluation. Keep Qwen3.6 as the fast rollback
model with its official non-thinking sampling profile. Soulmate 4's sub-task, syntax-check,
behavior-test, and repair gates remain necessary: GPT-OSS used 8,074 completion tokens on the full
task, 5,329 on the smaller task, and still made two focused-task errors.

This is a small direct-API benchmark plus one Kilo tool-flow check, not a statistically complete
model ranking or the user's live new-project acceptance test.

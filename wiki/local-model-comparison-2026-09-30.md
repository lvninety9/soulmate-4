# Local Qwen comparison — 2026-09-30

## Setup

One RTX 3080 10 GB, 39 GiB RAM. ComfyUI and the vision server remained running and used about
1.4 GiB VRAM together. The normal Qwen3.6 server was measured first, temporarily stopped for
Qwen3.8, then restarted. All tested servers allocated a 65,536-token context, disabled reasoning,
and used one slot. Requests used temperature 0 and a 500-token output limit. The prompts, full
responses, and server timings are in `wiki/evidence/local-model-benchmark-2026-09-30.json`.

| Configuration | GGUF size | llama.cpp | KV type | Decode, code / plan / cache (tok/s) |
|---|---:|---|---|---:|
| Qwen3.6-35B-A3B UD-Q4_K_M | 22.1 GB | b8414 | q8_0 | 38.21 / 37.98 / 39.25 |
| Qwen3.8-27B UD-IQ2_XXS | 7.27 GB | c85b92c | q4_0 | 8.12 / 8.65 / 8.61 |
| Qwen3.8-27B UD-Q4_K_M + MTP | 16.46 GB | c85b92c | q4_0 | 4.71 / 4.65 / 5.55 |
| Qwen3.8-27B UD-Q4_K_M, MTP off | 16.46 GB | c85b92c | q4_0 | — / 2.98 / — |

Qwen3.8's 65,536-token server **loaded**, but the prompts were short (72–111 input tokens); this
does not measure a 45,000-token Kilo session. The Qwen3.6 baseline used its existing server
configuration and an older llama.cpp build, so cross-model throughput includes those differences.
The Qwen3.8 Q4 weights spilled to CPU memory because the desktop and other services also use VRAM.

## MTP check

The current Unsloth UD-IQ2_XXS file did not contain MTP layers; `--spec-type draft-mtp` failed
at model load with that exact diagnostic. UD-Q4_K_M did contain the layers and loaded with
`--spec-type draft-mtp --spec-draft-n-max 2 --parallel 1`. On the same plan prompt, MTP raised
decode throughput from 2.98 to 4.65 tok/s (+56%). The two runs generated different lengths, so
this is one paired prompt, not a stable median or a quality claim. The community recipe and
quant source are https://github.com/sudoingX/qwen38-mtp and
https://huggingface.co/unsloth/Qwen3.8-27B-GGUF.

## Output review and decision

- The Qwen3.6 and Qwen3.8 Q4 plans stayed within the requested three tasks and gave observable
  checks. IQ2 introduced an unrequested top-three word-frequency feature.
- IQ2 explicitly gave the correct cache sequence: 12:14 hit, 12:15 miss, 12:29 hit, 12:30 miss.
  Qwen3.6 and Q4 were cut off at 500 tokens before finishing their sequence; both gave the
  correct expiration rule up to the cutoff, but neither completed this answer.
- The coding prompt ended at the 500-token limit for all three. Qwen3.6 and Q4 began code but
  did not finish it; IQ2 spent the limit on analysis and produced no code. This capped test cannot
  rank their ability to complete a normal coding task.

For this shared desktop and Soulmate 4's 65,536-token setting, keep Qwen3.6 as the working Kilo
model. Its median decode rate was about 4.4 times IQ2 and 8.1 times Q4+MTP in these three short
prompts. Qwen3.8 Q4 may warrant another look on a host with enough free VRAM to hold the full
model and MTP context. The user's real new-project Kilo trial remains the acceptance test for the
Soulmate 4 workflow; this direct API comparison does not replace it.

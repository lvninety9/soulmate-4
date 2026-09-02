// vision-read.ts — bridges a text-only coding session to the resident local vision model, as a
// tool call instead of an in-chat model swap.
//
// Round 40 (real-usage maintenance round): the coding provider (qwen-3-6, port 8080) has no
// mmproj loaded and is not multimodal. Attaching an image directly in a Kilo chat turn against
// that provider hits one of two failures — either the provider can't interpret the payload, or
// (live-reproduced, kilo.db session ses_f9dfcf02effejuBuu1LemX6hei) opencode's own size-limit
// guard silently strips the media and compacts the conversation, and the model has no idea an
// image was ever sent. A machine-level vision-capable provider being *configured* in
// ~/.config/kilo/kilo.jsonc does not make an active text-only session multimodal — Kilo binds
// one model per session, it does not route a message to a different provider based on content
// type. Manually switching Kilo's active model per image works but depends on the human
// remembering to do it every time; a prose reminder in AGENTS.md does not reliably survive a
// fresh session (this whole project's founding premise). This tool instead lets the *coding*
// model call vision as an ordinary tool call: it reads the image itself, calls the resident
// vision server directly over HTTP, and returns only the text answer into the coding session's
// context — the image bytes never enter the coding model's own context window or provider
// payload, so the size-limit failure mode above cannot occur through this path.
//
// The resident checkpoint is a machine-level choice (see Hermes's models.json-style local model
// slots), not this project's business to hardcode — see lib/vision-read-core.ts's
// residentModelID(), which queries the vision server's own /v1/models at call time. If nothing
// is resident on the configured port, the tool fails with a clear message naming the port, not a
// silent wrong answer.
//
// Logic lives in lib/vision-read-core.ts (zero dependency on @kilocode/plugin) so
// tests/vision-read.test.mjs can import it directly without Kilo's own node_modules resolvable —
// same shape as scripts/lib/subtask-range.sh's precedent. This file is only the thin tool()
// registration Kilo actually loads, plus (round 42) a `tool.execute.before` hook -- the same
// mechanism subtask-gate.ts already uses for its own blocks, applied here to a different problem:
// see lib/vision-read-core.ts's imageReadBlockMessage() for why a documentation row alone (round
// 40's AGENTS.md File map entry) wasn't enough to stop the model reaching for `read` on an image
// first.

import { tool } from "@kilocode/plugin"
import { visionReadCore, imageReadBlockMessage } from "./lib/vision-read-core.ts"

export const VisionRead = async (_ctx: any = {}) => ({
  "tool.execute.before": async (input: any, output: any) => {
    if (input?.tool !== "read") return
    const msg = imageReadBlockMessage(output?.args?.filePath)
    if (msg) throw new Error(msg)
  },
  tool: {
    vision_read: tool({
      description:
        "Read an image file using the resident local vision model and answer a question about " +
        "it (screenshot, diagram, asset, UI mock, error dialog). Use this whenever you need to " +
        "see an image — never ask the user to paste it into chat, and never attempt to read " +
        "image bytes with the `read` tool. Returns a text answer only. Reliable for what's " +
        "actually legible in the image (text, numbers, UI labels) — NOT reliable for " +
        "open-ended \"what is this\" identification when nothing in frame names it (measured, " +
        "round 43: an obscure game correctly named when a title string was visible in-frame, " +
        "hallucinated when it wasn't). A small-image size floor was measured on an earlier " +
        "resident checkpoint and no longer holds on the current one — don't assume either way, " +
        "trust the answer's legible-content claims over its identification guesses.",
      args: {
        path: tool.schema
          .string()
          .describe("Path to the image file, absolute or relative to the project directory"),
        question: tool.schema
          .string()
          .describe(
            "What to ask about the image, e.g. 'what does this error dialog say' or 'describe this UI layout'"
          ),
      },
      async execute(args, context) {
        return visionReadCore(context.directory, args.path, args.question)
      },
    }),
  },
})

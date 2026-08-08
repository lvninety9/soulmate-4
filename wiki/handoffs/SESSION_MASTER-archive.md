# Session Master — archive (older sections moved out of SESSION_MASTER.md's PRUNE step)

> Not auto-loaded, same as `SESSION_MASTER.md` itself — read on explicit request only. Moved
> here 127차-equivalent (soulmate-4 session 5) when `SESSION_MASTER.md` first crossed its
> `check-caps.sh` WATCH threshold (150 lines), per `wiki/protocols/self-harness.md`'s PRUNE step.

## Origin

soulmate-3 (Cursor + Continue) documented an explicit "Known gap": Continue has no
`tool.execute.before`-style hook, so nothing can mechanically stop a local model from skipping
`design`, batching commits, or chaining multiple sub-tasks unprompted — only a commit-time git
hook, one step later and blind to anything never staged. Round 2 of soulmate-3's own live
testing (same local Qwen3.6-35B-A3B-UD-Q3_K_M, same throwaway test project, a Toss MiniApp
Mario Kart game) kept finding new forms of that same failure shape (L03/L04 there: auto-chaining
sub-tasks, silently skipping the SESSION_PRIMER handoff) no matter how the kernel prose was
reworded. Jay decided to test whether a different harness — one with its own real mechanical
brake, not prose the model has to read and comply with — does better against the exact same
model. Chose Kilo Code (Cline/Roo-Code lineage per its reputation) over Cline itself, by
preference.

## Round 1 (2026-08-08 — investigation, live verification, and this repo)

**Purpose**: soulmate-3's own port-planning doc (written at the end of its Round 2, before any
Kilo testing) assumed Kilo was a straightforward Cline-fork with the classic `apply_diff`/
`write_to_file` tool names and a documented "consecutive mistake" auto-stop feature. Round 1's
first job was checking those assumptions against the actual installed product rather than
building on top of them untested.

**What turned out to be wrong or unconfirmed in the original assumptions**:
- The installed Kilo Code (v7.4.20) is not the classic Cline-fork at all — it's a ground-up
  rebuild on opencode's own CLI runtime (L01). Real tool names are opencode's
  (`bash`/`read`/`edit`/`glob`/`grep`/`webfetch`/`task`/`todowrite`/`websearch`/`lsp`/`skill`),
  confirmed via the binary itself after two public doc pages gave contradictory answers.
- No evidence of a "consecutive mistake auto-stop" feature was found anywhere (docs, binary
  strings, settings) — the GitHub issue that motivated this belief turned out to be about Cline,
  a different (related) project, not Kilo.
- Custom project slash commands don't work (L02) — verified with a canary file, not assumed from
  the "workflows subtab is a stub" doc line, which only described the *management UI*, not
  necessarily the underlying mechanism.

**What turned out to be true, and better than expected**:
- `AGENTS.md` (and, redundantly, `CLAUDE.md`/`CONTEXT.md`) genuinely auto-load, hierarchy-aware,
  confirmed via the CLI's own instruction-loader code and a live canary test with zero Claude/
  Anthropic credentials in the environment (L03) — this works via the raw CLI regardless of the
  `claudeCodeCompat` toggle's extension-only default.
- Kilo's CLI genuinely inherits opencode's `tool.execute.before`/`tool.execute.after` hooks
  (L05) — the exact capability soulmate-3 documented as impossible under Continue. Built
  `.kilo/plugins/subtask-gate.ts` on this and verified it live, end to end, against a real test
  project: a commit touching `SESSION_PRIMER.md` reliably caused the model's very next tool call
  to hard-fail with the plugin's own message, and the model stopped and asked instead of
  retrying — the actual behavior Jay asked for from the start of this investigation
  ("sub task 하나 작업할때 마다 문서 업데이트 후 작업은 중단하고 저에게 계속 진행하겠냐고
  물어봐야 합니다").

**A separate, unrelated-seeming incident that turned out to matter a lot**: while testing the
gate's prerequisite (getting the model to actually run its build/typecheck command instead of
just writing code and calling it done — itself found missing during an earlier audit of a real
S1/S2 session, see below), a single turn burned its entire 32,000-token output budget on
invisible "thinking" and produced nothing — no edit, no commit (L04). Root-caused to
`llama-server`'s default `--reasoning auto` behavior on this Qwen3.6 build; fixed at the
inference-server level (`/etc/systemd/system/llama.service`, `--reasoning off`), which applies
to every consumer of that server, not just Kilo. Verified before/after with a direct API probe.

**A real audit, before any of the above fixes existed, found a genuine correctness bug that had
never been caught**: a live session on the throwaway test project had declared two sub-tasks
"✅ 완료" (a track/lighting/camera-follow/procedural-kart/HUD scene) purely from writing
plausible-looking TypeScript, never once running `npx tsc --noEmit` despite `strict: true` in
that project's `tsconfig.json`. The actual bug: a zustand store nested all its fields under a
`state` key, while the consuming component destructured them as if top-level — meaning the
camera-follow feature the docs claimed was done did not actually run at all. This is the origin
of `build.md`'s "actually run the build/typecheck command, don't just import the right things"
rule and (at the time) `wiki/PROJECT_BACKGROUND.md`'s matching Fixed Rule — that Fixed Rule now
lives in `AGENTS.md`, moved there at the architecture realignment (see `SESSION_MASTER.md`'s
"Round 4 — architecture realignment" section).

**Decision, same session**: given the mechanical gate now exists and is real (unlike anything
soulmate-3 could offer), and given the doc-methodology, caps, and wiki/ harness pattern from
soulmate-2/3 already proved out over two prior repos, build this as its own repo — soulmate-4 —
rather than a patch on top of soulmate-3, the same reasoning soulmate-3 itself used against
soulmate-2 (different delivery mechanism, not worth forcing onto a shared codebase).

**Not yet done as of this commit** (see `wiki/handoffs/FEEDBACK_PENDING.md` #1): this repo's own
`scripts/bootstrap.sh` has never been run for real. Everything verified above (the gate, the
reasoning-off fix, the auto-load confirmation) was tested against a project that was set up by
hand, incrementally, over the course of this investigation — not by cloning this seed repo and
running its bootstrap script fresh. That's session 1's actual first task.

## Validation methodology, rounds 1-3 (2026-08-08, same day as Round 1)

Jay's explicit instruction, mirroring how the original `soulmate` repo reached 98.75/100 over 13
rounds: score this repo the same way, independently — not Claude's own self-assessment. Each
round is a **fresh, context-isolated `general-purpose` agent** (not a `fork` — a fork inherits
this session's own priors/knowledge of what "should" work, which would bias the test), given
only the public repo URL and environment facts, told to blindly bootstrap, pick its own small
abstract task, drive it through the real protocol with the real local model, and score two
axes — turnkey bootstrap readiness, and bounded-growth/structural integrity — with cited
evidence, never a claim without a transcript/file/command-output to back it. Sequential, not
parallel (Jay's explicit choice, given the shared GPU/local-model resource — checked `ps aux`
for Hermes production jobs before every round, per L11-style discipline).

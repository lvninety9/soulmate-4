# Feedback / Issue Tracking

Valid `status` values: `open` (not started) | `in-progress` | `blocked` (waiting on something
external — note what) | `done`.

Valid `priority` values: `p0` (blocking/urgent) | `p1` (normal) | `p2` (someday) — lets a
20+-row table stay triageable at a glance instead of every row reading as equally urgent.

| # | Feedback / issue | Priority | Status | How it's handled | Session logged |
|---|---|---|---|---|---|
| 2 | Custom project slash commands (`.kilo/commands/*.md`) don't work in Kilo's CLI as of v7.4.20 — may change in a future Kilo release, which would make `wiki/protocols/*.md`'s self-serve framing obsolete in a good way | p2 | open | Documented in AGENTS.md "Known gap" and L02; watch Kilo's changelog periodically | seed |
| 3 | `subtask-gate.ts`'s one-shot disarm means an immediate verbatim retry of a blocked call *would* slip through — round 2 confirmed this is real, not hypothetical (retried a blocked write in a new process, succeeded unconditionally), exactly as documented | p1 | open | Matches the documented "Known gap" precisely; AGENTS.md's "no verbatim 3rd retry" rule is the only thing discouraging this, no mechanical layer exists | round 2 |
| 4 | "discuss" trigger word failed to cause a read of `wiki/protocols/discuss.md` in BOTH round 1 and round 2 (design/build/verify read their docs correctly both times) — model produces discuss-shaped output from the word alone, never opens the file | p1 (raised from p2 — confirmed twice now) | open | Inherent to prose self-serving, no code fix exists; re-check if a future Kilo release makes real slash commands work (#2) | round 2 |
| 6 | After a real gate block, the model's self-report was observed fabricating a "done, file written" claim once (round 2) and once more in this session's own regression test — the tool result showed `status: "error"` both times, contradicting the model's own summary | p1 | open | Inherent LLM self-report unreliability, same shape as soulmate-3's own L06 — no plugin-level fix possible; always verify actual file/git state, never the model's summary, after any gate block | round 2 |
| 9 | `wiki/protocols/refactor.md` (added this session) has never been exercised by any blind validation round — all 3 rounds so far only drove discuss/design/build/verify | p1 | open | Needs a round 4 with a task shaped like "shrink/reorganize existing code," specifically checking the backup-first step and per-unit-verify loop actually get followed | round 3 (architecture realignment) |

---

## Completed history

<!-- rows move here the moment they're done -->

| # | Feedback / issue | How it was handled | Session resolved |
|---|---|---|---|
| 1 | `scripts/bootstrap.sh` had never been run end-to-end; Round 1 blind validation found it fails on a completely fresh checkout (AGENTS.md.template 1 line over its own cap after comment-stripping), leaks its `/tmp` scratch clone on that failure, and never copies `templates/harness-integration-test.md`/`cold-read-test-prompt.md` into the target | Trimmed the template under cap, decoupled the README one-liner's cleanup from bootstrap.sh's exit code, made bootstrap.sh copy the two verification templates and strip comments from all 4 templates consistently; re-ran the real one-liner end-to-end and confirmed `--bootstrap-check` passes | round 1 |
| 7 | Gate's trigger was 100% elective (L07) — round 2 reproduced a full silent multi-sub-task chain with the gate never arming | `tool.execute.after` now checks real committed files via `git diff-tree`; N non-primer commits in a row arms anyway; verified via unit test + real 2-process Kilo run | round 2 |
| 8 | Fresh bootstrap's AGENTS.md sat at 58/60 before any customization, 59/60 after the README's own instructed step (add a File Map row) — one line from a hard fail | Raised cap 60→65 (content already near-minimal); re-verified via a real bootstrap + realistic row add, now 59/65 with real headroom left | round 2 |
| 5 | `COMMITS_WITHOUT_PRIMER_THRESHOLD=4` untested against real multi-file work | Round 3: confirmed no false positive on 3 legitimate commits, correct primer-vs-elective distinction; separately found+fixed the detection itself (regex→real git HEAD diff, L08) | round 3 |
| — | AGENTS.md's Learned/Fixed Rules split into PROJECT_BACKGROUND.md re-created soulmate-3's own L02 risk (rule referenced but not stated in the auto-loaded file); check-caps.sh's Learned/Fixed checks were also silently still targeting AGENTS.md the whole time | Verified against the real original soulmate repo (not assumed): merged Rules back into AGENTS.md, cap 65→85 matching the original exactly; re-bootstrapped and caught+fixed one more off-by-one before push | session 4 (architecture realignment) |

# Session Master — full narrative

> Loaded only on explicit request — never auto-read. See `wiki/handoffs/SESSION_PRIMER.md` for
> current state, `wiki/session-log.md` for the one-line index. **Role: why, not what** — status
> with no reasoning belongs in SESSION_PRIMER, raw evidence in `wiki/rule-archive.md`.

## Origin, Round 1 investigation, and validation methodology — moved to archive

Moved to `wiki/handoffs/SESSION_MASTER-archive.md` (session 5's self-harness PRUNE step, first
time this file crossed `check-caps.sh`'s WATCH threshold — see `wiki/protocols/self-harness.md`).
Covers: why this repo exists instead of patching soulmate-3, Round 1's investigation of Kilo's
real capabilities (L01-L05's discovery narrative), the reasoning-token-exhaustion incident (L04),
the zustand/tsc audit finding that motivated `build.md`'s verification rule, and the rounds 1-3
validation methodology (fresh-agent-not-fork, blind bootstrap, two-axis scoring). None of this
changed or was re-verified this session — it's moved, not summarized differently.
Also moved (same PRUNE pass, session 5 continued — `rule-archive.md` and this file both crossed
WATCH the same session): rounds 1-3's blind-validation narratives (word-frequency CLI/LRU cache/
config parser — full detail already in `wiki/handoffs/SESSION_PRIMER.md`'s table) and the
"Round 4 — architecture realignment" section (original-vs-soulmate-4 cap comparison, the
Rules-merge decision). Nothing here changed or was re-verified — moved, not summarized.

## Round 4 (blind) — refactor.md self-serve validation (2026-08-08, next session)

> Naming note: this is the 4th *blind-validation* round (matching FEEDBACK #9/#10's numbering
> and SESSION_PRIMER's "Current sub-task" language), distinct from the "Round 4 — architecture
> realignment" section directly above, which was a same-day Jay-directed doc/config fix with no
> blind agent involved. Kept as two separate sections rather than renumbering the one above, to
> avoid rewriting an already-cross-checked section.

Jay decided to proceed with Round 4 after the architecture realignment (FEEDBACK #9: `refactor.md`
had never been exercised by any of rounds 1-3, which only drove discuss/design/build/verify). A
fresh, context-isolated agent (not a fork — same isolation discipline as rounds 1-3) was given
only the harness's public repo URL and told to bootstrap a target project, seed it with real
pre-existing, working, duplicated-logic code (a `data_utils.py` with 3 near-duplicate function
pairs and 9 passing tests, committed as an ordinary baseline commit with zero mention of the
harness anywhere in it — refactor.md only makes sense against code that already works), then
drive the real local model via `kilo run` through an abstract "clean this up, it's grown messy"
task and check refactor.md's specific claims with hard evidence, never trusting the model's own
self-report (matching FEEDBACK #6's prior finding of fabricated self-reports).

**Result: the self-serve premise this entire harness is built on — "the model reads the matching
`wiki/protocols/*.md` file on recognizing the task's shape" — did not fire once, across 3
independent trials** (abstract framing; the same framing with the literal word "refactor" added,
to rule out a wording problem; and a cross-process continuation matching the harness's own
documented usage pattern). This is a materially bigger finding than FEEDBACK #9 anticipated (it
expected the backup-step or per-unit-verify-loop to be the weak point, assuming the doc would at
least get read) — full evidence, root cause, and a designed-but-not-yet-built fix are in
`wiki/rule-archive.md` L09. As a direct consequence of the doc never being read: no recovery
branch/tag was ever created, the whole refactor landed in a single bundled commit (or zero
commits) instead of small verified units, and — independently interesting — one trial's
"verification" command was a real no-op (`python3 test_data_utils.py` against a test file with no
`if __name__ == "__main__"` block) that the model trusted anyway, and a genuine silent regression
slipped through undetected in the other trial.

**Root cause** (read from the actual code, not guessed): `AGENTS.md` only asks for protocol-doc
self-serving in prose; `.kilo/plugins/subtask-gate.ts` structurally can't compensate because it
only fires *after* a commit lands, and this test shows a refactor reliably lands in 0-1 commits —
never crossing the gate's own arming threshold. Same underlying shape as L02 (self-serve doesn't
mechanically fire) and L07 (a brake is only as strong as its trigger), now confirmed for a 6th
protocol the same way the first five were confirmed working.

**Fix, built and live-verified the same session**: extended `subtask-gate.ts` with a
`tool.execute.before` check on a session's *first* mutating call — require at least one `read` on
a `wiki/protocols/*.md` path to have already happened, block naming the missing doc if not (same
disk-persisted-state shape as L06's fix). Jay chose to proceed with the fix immediately rather
than defer it. 6 isolated unit tests (Node, no Kilo) passed first. The live re-verification
needed a real GPU wait: Hermes's Seam longform cron was mid-run on the same shared RTX 3080 when
the fix landed (VRAM ~9.2/10.2GB, L11) — waited ~8h for it to clear rather than contend with a
production job, then re-ran round 4 trial 1's exact prompt against a fresh bootstrap seeded with
the identical baseline module. Result: the first `write` call was blocked (`status: "error"` in
the exported transcript); the model's very next actions were reading `refactor.md`, checking
`git status --porcelain`, creating a named recovery branch, stating the rollback command in its
own text *before* touching the file, running a real `pytest` (self-correcting from `python` to
`python3` when the first invocation failed), and committing per file — every claim that failed
3/3 in round 4 passed this time. Independently re-ran pytest and diffed the logic: no regression,
unlike trial 1's silent bug. Full evidence in `wiki/rule-archive.md` L09; FEEDBACK #9 and #10
both closed.

## Round 5 — objective blind audit + hardening (2026-08-08, session 5 continued)

Jay's instruction, mirroring the original `soulmate` repo exactly: soulmate-4 must earn the same
kind of score the original did (87 turnkey / 98.75 structural) via an independent, objective
background agent — not this session's own self-assessment — and keep iterating (score → fix →
re-score) until it does. Also asked, separately, for the 4 structural doc-improvement ideas
raised earlier in this session (archive-destination pattern, numbering legend, Learned Rules
compression priority, 4-tier doc role separation) to actually be finished, not just discussed —
all 4 done and pushed before the audit agent was launched (`b54f19b`..`116f79c`, plus FEEDBACK
#11 for the verification-command-naming gap).

**The audit**: a fresh, non-fork agent cloned both `soulmate` (the original) and `soulmate-4`,
reconstructed the original's actual two-axis rubric from its own real history (it never combined
the axes into one number — "98.75" is the structural-integrity axis alone, turnkey topped at 87),
then scored soulmate-4 the same way: real bootstrap, real `kilo run` against the real local
model, independent spot-checks of every cap claim. Result: **turnkey 74/100, structural 73/100**
— for concrete, evidenced reasons, not a vague haircut. Full report in the task notification this
session received; key findings and fixes below, each re-verified live before being trusted (this
project's own L06-style discipline applied to an audit of itself, not just to the audit's
subject).

**Fix 1 — `AGENTS.md` template drift (re-verified real)**: literal README step 1 (fill in
`[project name]` + a File map row) pushed a fresh bootstrap from 85→86 lines, failing the
pre-commit hook the bootstrap script itself installs. Root cause: `templates/AGENTS.md.template`
had never been updated when the live `AGENTS.md` later merged L06-L08 into one entry — the
template still carried the pre-merge, longer version. Fixed the template the same way, live
`AGENTS.md` tightened too (was back at 85/85 after L09/L10 additions) — both now carry real
headroom, matching the original's own actual 83/85.

**Fix 2 — L09 was a true one-shot for the entire session, not per-event (the audit's highest-
priority mechanism finding)**: the original L09 code set `firstMutationChecked[sessionID]=true`
the moment the *first* mutating call was attempted — blocked or not — and never checked again.
A deliberately adversarial live repro (bare "hello", no real task) proved it: after the first
block, three *different* `bash` mutation attempts (checking/removing/listing files) all sailed
through with zero further check. Hardened: the gate now re-evaluates on every mutating call and
only stops firing once a real `wiki/protocols/*.md` read is observed. 10/10 unit tests, then a
live re-run of the same adversarial prompt — all three attempts now correctly blocked, forcing
the model to actually `glob`+`read` a protocol doc before it got an unblocked turn.

**Fix 3 (found only via re-verifying fix 4 below, not by the audit) — L10, a real crash**:
building the `chat.message` hook below with an ad-hoc synthetic Part ID crashed the entire
request server-side: `Expected a string starting with "prt"`. opencode validates synthetic part
IDs strictly; fixed by matching the real `prt_<random>` shape observed in `kilo export` output.

**Fix 4 — new capability, addressing the audit's #1-ranked highest-leverage fix**: a live session
wrote and manually tested a real file, then simply stopped — no commit, nothing caught it,
because opencode's plugin API has no true end-of-turn/session hook at all (confirmed from
`@opencode-ai/plugin`'s own shipped types, not assumed). Added a `chat.message` hook — fires on
the *next* message — that injects a mechanical warning naming exactly which paths are
uncommitted, before the model does anything else. **Stated plainly as a partial fix, not full
coverage**: a session abandoned outright, never resumed, still can't be caught by any hook at
all — this closes the gap for this repo's own documented common usage (`build.md`: "the next
build — ideally in a fresh session"), not the theoretical 100% case. Verified live: left a real
uncommitted file from fix 2's repro, sent a follow-up message in the same session, confirmed via
`kilo export` that the synthetic warning landed on that next user message with a valid ID.

**Also fixed**: `bootstrap.sh`'s own header comment pointed at `main` (404 — real default branch
is `master`, confirmed via direct `curl`); README's file-tree diagram was missing both new
`-archive.md` companion files and still described Learned/Fixed Rules as living in
`PROJECT_BACKGROUND.md` post-realignment. `rule-archive.md` itself crossed its own new WATCH
threshold from this session's own additions — archived L01-L05 to `rule-archive-archive.md`,
the first real second use of the archive pattern.

**Not yet addressed** (FEEDBACK #12): the audit's other structural finding, `discuss.md` has no
mechanical backstop at all — it's the one protocol step producing zero tool calls by design, so
none of `subtask-gate.ts`'s hooks (all keyed to tool calls or new messages) can reach it. No
design proposed yet. Next objective re-audit, once run, will show whether today's fixes actually
moved the score — that's the loop Jay asked for, not a one-time pass.

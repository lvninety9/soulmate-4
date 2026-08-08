# Session Master — full narrative

> Loaded only on explicit request — never auto-read. See `wiki/handoffs/SESSION_PRIMER.md` for
> current state and `wiki/session-log.md` for the one-line-per-session index.

## Origin, Round 1 investigation, and validation methodology — moved to archive

Moved to `wiki/handoffs/SESSION_MASTER-archive.md` (session 5's self-harness PRUNE step, first
time this file crossed `check-caps.sh`'s WATCH threshold — see `wiki/protocols/self-harness.md`).
Covers: why this repo exists instead of patching soulmate-3, Round 1's investigation of Kilo's
real capabilities (L01-L05's discovery narrative), the reasoning-token-exhaustion incident (L04),
the zustand/tsc audit finding that motivated `build.md`'s verification rule, and the rounds 1-3
validation methodology (fresh-agent-not-fork, blind bootstrap, two-axis scoring). None of this
changed or was re-verified this session — it's moved, not summarized differently.

## Round 1 (fresh agent, task: word-frequency CLI)

Found bootstrap literally could not complete on a clean checkout: `templates/AGENTS.md.template`
shipped 6 lines over its own then-60-line cap even after comment-stripping, so the pre-commit
hook rejected bootstrap.sh's own first commit, `set -e` aborted before cleanup ran, and the
README's own one-liner leaked its `/tmp` scratch clone. Separately, `templates/
harness-integration-test.md`/`cold-read-test-prompt.md` were never copied into a bootstrapped
target at all — the one file the README tells a user to run there. Fixed all of it (trimmed the
template, decoupled the README one-liner's cleanup from bootstrap.sh's exit code, made
bootstrap.sh copy both verification templates and strip all 4 templates' comments consistently),
re-ran the real one-liner end-to-end, confirmed clean. Separately found the flagship
`subtask-gate.ts` (built same-day, before Round 1) never actually survives across separate `kilo
run` invocations — only tested, before this round, within one process handling both steps.
Fixed via disk-persisted state (L06). Scored (pre-fix): turnkey 38/100, structural 46/100.

## Round 2 (different fresh agent, task: generic LRU cache library + pytest)

Confirmed L06's disk-persistence fix holds across two independent process boundaries with cited
raw transcripts. But found something worse: the gate's trigger was **100% elective** — it only
armed if a commit happened to touch `SESSION_PRIMER.md`, and nothing forced that. The agent
reproduced, unprompted, a silent two-commit chain with the gate never arming — the exact
runaway this plugin exists to prevent. Fixed via a real `git diff-tree` check + a
commits-without-primer-touch threshold (L07), plus fixed `AGENTS.md`'s near-zero cap headroom
(a fresh bootstrap already sat 58/60, one File Map row from a hard fail). Also independently
re-confirmed the "discuss" self-serve gap (model didn't read `discuss.md` on trigger, same as
round 1) and observed the model fabricate a "done" claim immediately after a real gate block —
both filed as inherent-to-the-model gaps, not code-fixable. Scored: turnkey 74/100, structural
68/100.

## Round 3 (different fresh agent again, task: config-file parser + test)

First attempt asked a confused, unrelated clarifying question ("compare to some 'original'"?)
that matched nothing in its actual brief — resumed with a corrective prompt rather than trusting
a garbled response, and it completed cleanly. Main mandate — stress-test whether the round 2
threshold (4 commits) false-positive-blocks ordinary legitimate work — came back clean: 3
non-primer commits never blocked, a 4th that touches the primer arms with the correct "primer"
reason (not "elective") even at the threshold count, and 4 non-primer commits in a row correctly
trips the elective arm. This closed `FEEDBACK_PENDING.md` #5. But it stress-tested one level
deeper and found the trigger's own detection was regex-on-bash-command-text — a false positive
(an `echo` merely mentioning "git commit") and a false negative (a commit via alias). Fixed by
comparing real `git rev-parse HEAD` before/after every tool call instead of pattern-matching
(L08) — verified via a fast direct-unit-test harness (Node, `--experimental-strip-types`,
importing the plugin's real exported hooks against real git commits, no Kilo/model needed for
the plugin-logic half) plus one real two-process Kilo regression check.

## Round 4 — architecture realignment (same day, after Round 3)

Jay asked directly whether the doc caps had been set lower than the *original* `soulmate`
template (not soulmate-2/3, which this repo had been comparing itself against) — a question
that exposed an actual gap in this session's own diligence: every prior comparison in this repo
had checked against soulmate-3's numbers, never against the actual original repo. Cloned
`github.com/lvninety9/soulmate` fresh to check, rather than answering from memory a second time.
Found: the original's single auto-loaded `CLAUDE.md` is capped at 85 lines (not 60/65) and
holds Learned Rules, Fixed Rules, and the File map all inline — no separate reference file.
soulmate-4 had split Learned/Fixed Rules into `PROJECT_BACKGROUND.md` specifically to keep
`AGENTS.md` under 65 lines, a design choice made without checking this precedent, and one that
directly re-creates the exact risk soulmate-3's own **L02** already named: a rule only
referenced from the auto-loaded file, not stated in it, doesn't reliably reach ad-hoc work.
Given Jay's explicit "당신의 판단을 믿겠다" (trust your judgment) and the fact that 85 lines is
~1-2% of a 65,536-token budget — never a real tightness constraint — merged Learned/Fixed Rules
back into `AGENTS.md`, raised the cap to 85 to match the proven original exactly, and re-ran a
real bootstrap to verify. That re-test immediately caught a fresh off-by-one (the template's own
leading blank line pushed the post-strip result to 86/85) — fixed before push, the same class of
bug Round 1 exists to catch, this time caught by the author's own re-verification discipline
instead of costing a 4th validation round. Also fixed, as a side effect of the merge:
`check-caps.sh`'s Learned/Fixed Rules checks had been silently targeting `AGENTS.md` the entire
time even while the real content lived in `PROJECT_BACKGROUND.md` — a latent bug that never
surfaced only because rule counts never exceeded 10 either way.

**Cross-check against this session's own reporting, done at Jay's explicit request** (worried
about forced summarization mid-session silently drifting the record from reality): compared the
full `git log --oneline` (27 commits, `d9fb565`..`fec44a1`) against every claim made to Jay
during this session, commit by commit. All matched — no commit exists that wasn't reported, no
reported fix is missing its commit, no round's findings were invented or omitted. No
compaction/summarization notice ever fired during this session (verified: none of the
conversation's own system-level signals indicated one), so this cross-check is a belt-and-
suspenders confirmation, not a recovery from a known gap.

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

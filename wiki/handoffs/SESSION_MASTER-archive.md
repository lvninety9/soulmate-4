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


## Round 4 (blind) — refactor.md self-serve validation

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

## Round 6 — re-score confirms it, finds the fixes' own fix drifted (2026-08-08, same day)

The re-audit: turnkey 74→81 (+7), structural 73→77 (+4), every round-5 fix independently
reconfirmed live by a fresh agent. Real movement, roughly half what 5 fixes might suggest —
because of what else it found.

`templates/AGENTS.md.template` had drifted from `AGENTS.md` **again**, in the very session that
had just fixed an earlier instance of exactly that bug. The round-5 fix commit only merged
L06-L08 into the template; L09/L10 landed in the live file one commit later and the template was
never touched again. `check-caps.sh`'s own cap enforcement is line-count-based and structurally
cannot see this — two files can be the same length and say contradictory things about how the
gate behaves. Fixed both fully (verified via diff), then closed the actual gap rather than just
this instance of it: `check_template_drift()` in `check-caps.sh` now diffs the Learned Rule ID
set between the two files and fails the check on any mismatch — tested by deliberately desyncing
and confirming it fires, not just that it runs.

Second finding: "10/10 unit tests" had been claimed in `rule-archive.md` every round since L06,
but the file itself only ever existed in scratch, thrown away each session — never committed.
`tests/subtask-gate.test.mjs` is now real, portable (no hardcoded machine path), and copied into
new projects by `bootstrap.sh` too. Full evidence: `wiki/rule-archive.md`'s Round 6 entry.

General lesson this round adds on top of round 5's: the auditing session is not exempt from what
it audits — fixing a drift bug doesn't prevent the same session from reintroducing it one commit
later. The durable fix is never "be more careful," it's a mechanical check one level up.

## Session 5 handoff re-verification (Jay's explicit request, end of session)

Jay's concern, stated directly: handoffs like this one often *look* thorough but don't survive
contact with a new session, and there's no way to know from inside a single session whether a
forced context-compaction event silently corrupted the record somewhere along the way (a report
that doesn't match what was actually implemented, an invented fact, unplanned work described as
if it were planned, etc.). His explicit instructions: do not rush the writeup because of context
pressure ("컨텍스트가 부족하다고 해서 작업이나 문서 작성을 급하게 마무리 하지 마시구요") — a
new session's *only* hint is these documents; check specifically for forced mid-session
summarization and whether reported work actually matches implementation; make project intent,
purpose, current progress, notable issues, gaps, and remaining work all unambiguous; end with a
ready-to-paste starter prompt. **This standard should apply to every future handoff of this
repo, not just this one** — recorded here so the instruction itself isn't lost.

**Honest answer on compaction**: there is no reliable way for a session to *prove*, from inside
its own context, that it was never force-summarized — no compaction notice was visible in this
session's own context at any point, but that is not conclusive proof either way. So this handoff
does not rely on this session's own memory of what happened at all — every substantive claim in
`SESSION_PRIMER.md` was re-verified directly against ground truth that cannot be corrupted by a
bad summary: `git log fec44a1..HEAD` (54 commits) read in full; `git log origin/master -1` vs
`git rev-parse HEAD` confirmed byte-identical; the actual content of `.kilo/plugins/
subtask-gate.ts`/`scripts/check-caps.sh` grepped and read directly (not recalled) to confirm
`firstMutationChecked` is genuinely gone, `check_template_drift()` genuinely diffs full content
not just IDs, `chat.message` genuinely contains both checks in one real hook (not the fake
`chat.message.ambiguity` key a mid-session mistake briefly introduced and self-corrected);
`node --experimental-strip-types tests/subtask-gate.test.mjs` actually run at rewrite time
(13/13 pass, not assumed); `git status --porcelain` empty.

**Two real inconsistencies this re-verification caught and fixed**: (1) the previous
`SESSION_PRIMER.md` draft's title said "round 7 done" but its own body still listed "Round 7
재채점" as the *next* priority — written mid-round-7, never reconciled after round 7 finished.
(2) The "Known open issues" table used its own informal numbering that didn't match
`FEEDBACK_PENDING.md`'s real item numbers (its row "3" actually described FEEDBACK #4's topic).
Both fixed — exactly the kind of drift Jay was worried about, real, not hypothetical.

## Round 27 mistake — audited against a stale local clone, not real origin/master (2026-08-21)

Rounds 7-26 (17 rounds, 2026-08-09 through 2026-08-20) are not narrated here — full round-by-round
detail lives in `FEEDBACK_PENDING.md`'s Completed History rows #19-36 and `wiki/session-log.md`'s
row 13, ending at Jay's explicit round-26 consolidation checkpoint (turnkey 82/structural 81 —
"this round's result is the final state recorded in this handoff, not a claim of convergence").

Round 27 opened as what looked like a routine round-8-style audit, but it was run against
`/home/jay/soulmate-4` — a local clone last synced at session 10 (round 7), frozen there while
rounds 8-26 happened entirely on `origin/master` in a separate, much longer thread the
coordinating session wasn't aware of. The clone showed no error, no warning — `git log` inside it
read as perfectly coherent on its own terms, just quietly 48 commits and 19 rounds stale. Its
audit produced 4 findings, all of them needing re-validation against the real current codebase
before any could be trusted; 2 were carried forward as candidates (the other 2 were moot once
compared against real round 8-26 history, already resolved differently than the stale clone's own
snapshot implied).

**Jay's direct instruction at this point**: port over only genuinely-new findings from the
stale-clone audit, not merge all of it blindly — re-derive each candidate against the real,
current codebase rather than trust the stale audit's own numbers. This is exactly why Finding A
(the `<system-reminder>`-tag wrap) got the extra scrutiny that killed it: re-tested from scratch
against current code (7 live trials across 3 phrasings, not just the stale audit's original 2)
instead of taking its reported "2/2 → 0/2" improvement at face value. It didn't hold — post-fix
still failed 4/5. Finding B (the real `session.idle` hook) held up under the same scrutiny and
landed (`193b16b`). Full technical detail for both: `wiki/rule-archive.md`'s "Round 27" section,
`FEEDBACK_PENDING.md` rows #37-38.

This is now `AGENTS.md` L13 (added in the round-28-prep handoff-verification pass below) — the
durable lesson is structural, not "be more careful": a local clone's own internal git-log
coherence proves nothing about its freshness against origin. Always `git fetch`/diff against
`origin/master`, or just fresh-clone, before trusting any local checkout for an audit-shaped task.

## PRUNE pass (2026-08-21, same day) — FEEDBACK_PENDING.md archived at its hard cap

Round 27 pushed `FEEDBACK_PENDING.md`'s Completed-history section to its 40/40 hard line cap. A
fresh clone of round 27's tip (`309ec29`) confirmed the real established archive filename before
assuming one (`wiki/FEEDBACK_PENDING-archive.md`, sibling to `rule-archive-archive.md`/
`SESSION_MASTER-archive.md`, per `SESSION_PRIMER.md`/`check-caps.sh`'s own naming pattern), moved
rows #1/#3/#5/#7-#11/#14-#18 (rounds 1-8, the session-4 architecture-realignment row) there —
every one of them already fully re-documented with more raw evidence in
`wiki/rule-archive-archive.md` (L01-L09) or `wiki/rule-archive.md` ("Round 5"-"Round 8" sections),
or a one-time fix now just baked into `AGENTS.md`'s current structure directly. Nothing deleted,
only relocated. Also merged open-table rows #4 and #12 into one `#4/12` row (already
cross-referenced as the same ceiling). Completed-history 40/40→32/40 lines, open table 4/25→3/25
rows. `check-caps.sh` clean, committed through the real pre-commit hook (`ac571fc`, `8a08f09`),
pushed.


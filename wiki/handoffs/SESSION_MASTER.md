# Session Master — full narrative

> Loaded only on explicit request — never auto-read. See `wiki/handoffs/SESSION_PRIMER.md` for
> current state, `wiki/session-log.md` for the one-line index. **Role: why, not what** — status
> with no reasoning belongs in SESSION_PRIMER, raw evidence in `wiki/rule-archive.md`.

Also moved (round 6, crossed WATCH again): "Round 4 (blind) — refactor.md self-serve validation"
— full detail already in `wiki/rule-archive.md` L09 and `SESSION_PRIMER.md`'s round table.

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

## Handoff-rigor verification pass ahead of round 28 (2026-08-21~2026-08-22)

Jay's explicit instruction, given the round-27 stale-clone incident as the most recent instance of
a pattern this project has hit before (session 5's own handoff re-verification request, above):
don't rush a handoff under context pressure — a new session's *only* hint is these documents, so
independently re-verify every claim rather than trust a prior report at face value, and check
specifically for the failure modes of a compacted/summarized session — report/doc/implementation
mismatch, fabricated facts, invented or off-plan work. Make project intent, progress, gaps, and
remaining work unambiguous, and end with a literal round-28 resume prompt.

**What was independently re-checked, fresh-cloned from real `origin/master`** (not assumed from
any prior summary): all 6 round-27+PRUNE commit diffs read in full, not just their messages —
matched what each claimed. `node --experimental-strip-types tests/subtask-gate.test.mjs` actually
run: 24/24 pass. `tests/stale-language.fuzz.test.mjs` actually run: 42/42 pass.
`scripts/check-caps.sh` actually run: clean (one pre-existing non-blocking soft WARN — `AGENTS.md`
75/85 lines vs. its 70-line soft target — not a failure). `.kilo/plugins/subtask-gate.ts` read
directly: the `event`/`session.idle` hook (Finding B) is genuinely implemented, not just claimed
in a commit message; no `<system-reminder>`-tag wrap (Finding A) exists anywhere in the code, only
in prose describing it as tried-and-reverted. `FEEDBACK_PENDING.md`'s open/history row counts
(3/25, 32/40) and `wiki/FEEDBACK_PENDING-archive.md`'s 14 archived rows checked against the real file
content — counts matched, cross-references real, not thin or fabricated.

**Result: no discrepancy found** between any claim in the round-27/PRUNE narrative and the actual
diffs/test output/file state at re-verification time. This is stated plainly rather than assumed —
every check above has a concrete command/read behind it, not just "looks right."

**Genuine gaps found and closed this pass** (not false claims — things nobody had written down):
(1) the stale-local-clone root cause of round 27 had no Learned Rule ID despite being exactly the
durable-lesson shape L-numbers exist for — added L13 (`AGENTS.md` + `templates/AGENTS.md.template`
+ `wiki/rule-archive.md`). (2) The PRUNE pass itself, and this verification pass, had no
`wiki/session-log.md` row — added (rows 15-16). (3) Jay's own round-27-adjacent feedback hadn't
been written down anywhere and would have been lost to the next context reset:

- **Port only genuinely-new findings, don't blindly merge**: the direct instruction that shaped
  round 27's approach to the stale-clone audit's 2 candidates — re-derive each against current
  code rather than trust the stale audit's own reported numbers. Documented above under "Round 27
  mistake."
- **"82/81이 한계일까요?"** — Jay asked whether turnkey-82/structural-81 (the round-26 checkpoint
  score) is a hard ceiling for this project. Answer: no known structural reason it's a ceiling —
  this project's own stated closing bar (mirroring the original `soulmate`'s convergence pattern)
  is **turnkey 90+, OR a clean audit pass with zero new findings**. Rounds 24 and 26 both already
  came back clean (`FEEDBACK_PENDING.md` rows #33, #35) — 2 clean passes is a real signal toward
  convergence, but not yet the confirmatory 3rd. Round 28's mission (see `SESSION_PRIMER.md`) is
  specifically to test for that 3rd clean pass, not to run another narrow fix cycle.
- **This exact rigorous-handoff-verification request**, and why: a repeated pattern in this
  project's own history of trusting a report that turned out not to match reality closely enough
  to matter — most recently the round-27 stale-clone incident itself, echoing session 5's original
  handoff-re-verification concern almost verbatim. Recorded here so the instruction, and the

## Round 27/28 narrative moved out of SESSION_PRIMER.md (round 29, item 4 — same flow rule as
round 28's FEEDBACK_PENDING fix: primer stays current-state only, "why" lives here)

Round 27 (2026-08-21) was a targeted fix cycle on 2 candidates surfaced by the stale-clone audit
above (see "Round 27 mistake"), independently re-derived against real code. **Finding B, landed
(`193b16b`)**: a real `event`/`session.idle` hook now exists in `subtask-gate.ts` — on session
idle with a dirty working tree it sends a synthetic `client.session.prompt({noReply:true})` nudge
naming the real uncommitted files, deduped per session on the dirty-file-set signature. Closes
part of row #15's "can't catch a session abandoned outright" gap; live-verified via `kilo serve` +
raw HTTP (correct file names recalled with no fabrication, dedup held); 24/24 unit tests at the
time. **Finding A, investigated and reverted**: the candidate `<system-reminder>`-tag wrap for the
carryover warning was re-tested rigorously (7 live trials, 3 phrasings) and did **not** hold (4/5
post-fix failures), contradicting the stale audit's own reported numbers — no trace remains in
current code. Full technical detail (root cause, live-verification steps) for both: `wiki/rule-
archive.md` "Round 27" (L12, L13).

Four meta-lessons drawn from round 27, condensed: (1) "reorder the check, don't just patch it"
recurred 3× across early rounds' exclusion-mechanism stage pairs (rounds 17-18, 22-23) — a
pattern worth recognizing early rather than re-discovering per round. (2) Commit the fix before
any destructive git cleanup, not after. (3) A citation fix isn't the same as re-verifying the
claim it was attached to (round 5's "no end-of-turn hook" claim survived 18 rounds after its
*citation* got corrected in round 9, because nobody re-checked the *content* against the corrected
package — this became L12). (4) A test asserting only "did it throw" can pass even when the exact
mechanism it targets is broken, if an unrelated gate throws first (round 27's own T11b bug, caught
before commit) — this became AGENTS.md's L14 (round 29, promoted from here since `tests/subtask-
gate.test.mjs` actively cites it).

Round 28 (2026-08-22, external review) found 7 concrete, already-broken mechanisms (S1-S7) by
reading the code adversarially — all 7 landed, each live-verified, one commit/small cluster each;
full summary + hashes in `wiki/FEEDBACK_PENDING-archive.md` row #39. Headline results: required-
read tokens 15,128→6,978 (real local llama.cpp `/tokenize`, under the 8,000 target);
`check_template_drift()` no longer forces this repo's own audit history onto fresh downstream
projects; S7 turned `templates/harness-integration-test.md` into a real k/N-scored script
(`scripts/harness-integration-test.sh`) and, while dogfooding it, surfaced one genuinely new gap
(row #40 at the time, since triaged — see `FEEDBACK_PENDING-archive.md`).

Round 28's own **fix cycle** (distinct from the review above — Opus-authored work order, round
29's starting point) closed all 7 of its own items: #41 gate redesign (SHA-derived boundary
instead of a persisted `armed` flag, live-verified 5/5 — see `rule-archive.md` "Round 28"), #42/
#43 CLI-vs-plugin root cause for the discuss/`question`-tool gap, the FEEDBACK_PENDING flow rule
itself (300-char row cap, required-read tokens 9,371→6,635), item 3's measurement accepted with no
code change, the harness-integration-test.sh bench redesign (result-based scoring, N/A not FAIL),
and the Q3→Q4_K_M quantization swap (lower VRAM, equal correctness, mild polish edge — full 6-task
comparison in `rule-archive.md`). Opus then independently re-derived every one of these numbers
from a fresh clone before writing the round 29 work order — no discrepancy found (see round 29's
own commit for that re-verification's own record).
  reasoning behind it, aren't lost to the next context reset either.

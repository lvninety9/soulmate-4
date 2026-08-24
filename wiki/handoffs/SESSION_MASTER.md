# Session Master — full narrative

> Loaded only on explicit request — never auto-read. See `wiki/handoffs/SESSION_PRIMER.md` for
> current state, `wiki/session-log.md` for the one-line index. **Role: why, not what** — status
> with no reasoning belongs in SESSION_PRIMER, raw evidence in `wiki/rule-archive.md`.

Also moved (round 6, crossed WATCH again): "Round 4 (blind) — refactor.md self-serve validation"
— full detail already in `wiki/rule-archive.md` L09 and `SESSION_PRIMER.md`'s round table.


## Round 5-27 — moved to archive

Moved to `wiki/handoffs/SESSION_MASTER-archive.md` (round 33's self-harness PRUNE step,
`SESSION_MASTER.md` crossed the new hard cap). Covers: round 5 objective blind audit +
hardening, round 6 re-score, session 5's own handoff re-verification, round 27's stale-clone
mistake, and the same-day PRUNE pass that first archived `FEEDBACK_PENDING.md`. The
handoff-rigor pass ahead of round 28 stays live below — still the active narrative as of this
round.

## Handoff-rigor verification pass ahead of round 28 (2026-08-21~2026-08-22)

Jay's explicit instruction, given the round-27 stale-clone incident as the most recent instance of
a pattern this project has hit before (session 5's own handoff re-verification request, now in
`wiki/handoffs/SESSION_MASTER-archive.md`):
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
  code rather than trust the stale audit's own reported numbers. Documented under "Round 27
  mistake" in `wiki/handoffs/SESSION_MASTER-archive.md`.
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
(see "Round 27 mistake" in `wiki/handoffs/SESSION_MASTER-archive.md`), independently re-derived
against real code. **Finding B, landed
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

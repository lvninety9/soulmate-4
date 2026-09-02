# self-harness

> No real `/self-harness` command exists in Kilo yet (see AGENTS.md "Known gap") — self-serve
> this file at the end of a session, or when explicitly asked to reflect.

Turn today's friction into one durable, checkable rule — without letting the rule tables grow
without bound.

Method:
1. MINE: what failed or was slow today? Check the commit log and grep for errors — don't rely on
   memory of the session.
2. PROPOSE: grep `AGENTS.md`'s Learned Rules for the highest existing `L<NN>` first (moved here
   from `PROJECT_BACKGROUND.md` at the architecture realignment — see `wiki/rule-archive.md`,
   the merge note right before L09) — the new rule is the next number in that same sequence,
   never a new ID scheme. soulmate-3's own testing found a model inventing a parallel numbering
   system (`LR-01`) instead of continuing an existing one — don't repeat that. One one-line rule,
   with an ID and an expiry tag (`permanent` or a review date).
3. VALIDATE: would this rule have actually prevented today's friction? Does it conflict with an
   existing rule in `AGENTS.md`'s Fixed Rules or Learned Rules?
4. PRUNE: run `scripts/check-caps.sh --verbose` (round 33 item 3: routine runs are quiet by
   default now — non-blocking WARN/WATCH/reminder lines collapse into one summary count unless
   something's actually blocking the commit; `--verbose` is what surfaces them for this manual
   review, the one moment they're the useful signal). `rule-archive.md`/
   `handoffs/SESSION_MASTER.md` now hard-cap (round 33: their soft WATCH was obeyed 0% of the
   time across this project's whole history, see check-caps.sh's own comment) — an OVER CAP on
   either blocks the commit, not just a hint. `session-log.md` stays a soft WATCH on line count
   (it's genuinely one line per session, unbounded is the correct shape there) but gets its own
   per-row char cap (`SESSION_LOG_ROW_CHAR_CAP`, same mechanism as `FEEDBACK_ROW_CHAR_CAP`) so a
   single row can't blow up the file's real character size while looking small by line count.
   All 3 files are still append-only by design (never auto-loaded) — "capped" isn't "never
   archive." Once WATCHed or OVER CAP: move that file's *oldest* entries (lowest `L<NN>`/
   earliest session rows/earliest Round sections) out to a same-named `-archive.md` companion
   next to it (e.g. `wiki/rule-archive.md` → `wiki/rule-archive-archive.md`, same pattern for all
   3) — leave one pointer line at the top of the live file naming what moved and where ("L01-L0N:
   see rule-archive-archive.md"). Same destination pattern for all 3, don't invent a different
   one per file. The `-archive.md` companions themselves stay uncapped on purpose — they're never
   auto-loaded either, so there's no token-budget reason to cap them, and doing so would just
   force yet another archive tier for no benefit.
   Round 41: the same `--verbose` run also surfaces `check_artifact_sweep`'s WATCH, if
   any file/dir looks throwaway by name (`-new`/`-old`/`-backup`/`-copy`/`scratch*`/`tmp*`/
   `dummy*`). This isn't a doc to archive — for each one, either delete it, or promote it (a real
   name + a commit explaining why it's staying). Don't leave it renamed-but-undecided.
5. LOG: append one line to `wiki/session-log.md`.
6. COMMIT: update `AGENTS.md` (Learned/Fixed Rules, if any changed) + `SESSION_PRIMER.md`, then
   commit. Expect the sub-task gate to fire on this commit if it touches SESSION_PRIMER.md —
   that's fine, this is the natural end of the session anyway.

Rule lifecycle: new (full write-up in `wiki/rule-archive.md`) → compressed to a one-liner in
`AGENTS.md` → once it never recurs, absorbed into a principle, or archived out per step 4 above
once `AGENTS.md`'s own 10-entry Learned Rules cap forces a choice.

**Compression priority when the 10-entry cap is hit** (not the same choice as step 4's archiving
— this is about merging one-liners *within* `AGENTS.md` itself, evidence stays in
`wiki/rule-archive.md` either way): merge rules that share a root cause, the same file/mechanism
they fixed, or the same blind-validation round *before* merging anything else — a same-family
merge loses no distinct information (e.g. L06/L07/L08 were all `subtask-gate.ts` bugs found via
rounds 1-3, merged into one `[L06-L08]` entry to make room for L09). Never merge two rules just
because both happen to be old, or because a merge is convenient — that's how a real, distinct
lesson quietly disappears. If nothing shares a family, that itself is a signal the cap is being
hit by genuine breadth, not accidental fragmentation — raise it to Jay rather than force a merge.

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
4. PRUNE: run `scripts/check-caps.sh` — mechanically checked, including a WATCH hint once
   `rule-archive.md`/`session-log.md`/`handoffs/SESSION_MASTER.md` cross their soft size
   threshold. These 3 files are append-only by design (never auto-loaded, so a hard cap would
   fight their purpose) — but "no hard cap" isn't "never archive." Once WATCHed: move that
   file's *oldest* entries (lowest `L<NN>`/earliest session rows/earliest Round sections) out to
   a same-named `-archive.md` companion next to it (e.g. `wiki/rule-archive.md` →
   `wiki/rule-archive-archive.md`, same pattern for all 3) — leave one pointer line at the top of
   the live file naming what moved and where ("L01-L0N: see rule-archive-archive.md"). Same
   destination pattern for all 3, don't invent a different one per file.
5. LOG: append one line to `wiki/session-log.md`.
6. COMMIT: update `AGENTS.md` (Learned/Fixed Rules, if any changed) + `SESSION_PRIMER.md`, then
   commit. Expect the sub-task gate to fire on this commit if it touches SESSION_PRIMER.md —
   that's fine, this is the natural end of the session anyway.

Rule lifecycle: new (full write-up in `wiki/rule-archive.md`) → compressed to a one-liner in
`AGENTS.md` → once it never recurs, absorbed into a principle, or archived out per step 4 above
once `AGENTS.md`'s own 10-entry Learned Rules cap forces a choice.

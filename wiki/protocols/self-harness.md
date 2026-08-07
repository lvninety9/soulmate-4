# self-harness

> No real `/self-harness` command exists in Kilo yet (see AGENTS.md "Known gap") — self-serve
> this file at the end of a session, or when explicitly asked to reflect.

Turn today's friction into one durable, checkable rule — without letting the rule tables grow
without bound.

Method:
1. MINE: what failed or was slow today? Check the commit log and grep for errors — don't rely on
   memory of the session.
2. PROPOSE: grep `wiki/PROJECT_BACKGROUND.md`'s Learned Rules for the highest existing `L<NN>`
   first — the new rule is the next number in that same sequence, never a new ID scheme.
   soulmate-3's own testing found a model inventing a parallel numbering system (`LR-01`) instead
   of continuing an existing one — don't repeat that. One one-line rule, with an ID and an
   expiry tag (`permanent` or a review date).
3. VALIDATE: would this rule have actually prevented today's friction? Does it conflict with an
   existing rule in `wiki/PROJECT_BACKGROUND.md`'s Fixed Rules or Learned Rules?
4. PRUNE: run `scripts/check-caps.sh` — mechanically checked. Also check
   `wiki/rule-archive.md`/`session-log.md`/`handoffs/SESSION_MASTER.md` sizes yourself (`wc -l`)
   — these are append-only by design, not capped, but "not capped" isn't "never look." If
   anything's over cap or has clearly grown stale, merge/archive/triage now — before committing.
5. LOG: append one line to `wiki/session-log.md`.
6. COMMIT: update `wiki/PROJECT_BACKGROUND.md` + `SESSION_PRIMER.md`, then commit. Expect the
   sub-task gate to fire on this commit if it touches SESSION_PRIMER.md — that's fine, this is
   the natural end of the session anyway.

Rule lifecycle: new (full write-up in `wiki/rule-archive.md`) → compressed to a one-liner in
`wiki/PROJECT_BACKGROUND.md` → once it never recurs, absorbed into a principle or archived
entirely.

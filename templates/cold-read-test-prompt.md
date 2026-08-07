<!--
  Ready-to-paste prompt for the cold-read A/B test (see wiki/protocols/verify.md).
  Fill in the two bracketed values, paste the whole thing into a brand-new Kilo session (no
  continued thread) for a reasonably fresh session, otherwise hand this to a human reader as the
  documented fallback (see verify.md).
-->

You are starting a session on the project at [PROJECT_ROOT_PATH] for the first time. You have
no memory of this project from any prior session.

Read only these files, in this order, and nothing else:
- [LIST_REQUIRED_DOC_PATHS — e.g. AGENTS.md, wiki/PROJECT_BACKGROUND.md, wiki/handoffs/SESSION_PRIMER.md, wiki/handoffs/FEEDBACK_PENDING.md]

**Hard constraint: do not `ls`, `grep`, `find`, or read any other file in this repository —
not source code, not other docs, not git history.** The point of this exercise is to measure
whether the files above are sufficient on their own. If you go looking at the actual codebase to
fill in gaps, you will pass by using information the documents didn't actually give you, which
defeats the test. If something is genuinely unclear or missing, say so explicitly instead of
inferring it from code.

Based only on what you read, answer each of the following. For each answer, explicitly tag it
**[confident]** (you can point to the specific doc/section it came from) or **[guessed]** (you're
inferring or unsure). A confident-*sounding* answer with no cited source should still be tagged
guessed.

1. State what this project does, in one paragraph.
2. Build a name→role mapping table for the project's core entities (channels/modules/domains/
   services/whatever nouns the docs use).
3. Explain the main process/pipeline order, end to end.
4. List and explain every numbering system, abbreviation, and status icon/label used in the docs
   you read.
5. List, in priority order, what you would do first if you were picking up this project right now.

Finish with a score: confident answers / 5, and a short list of anything you found undefined,
contradictory, or missing a source.

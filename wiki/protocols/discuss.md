# discuss

> Read this automatically when a decision required for the next step is genuinely missing.

Converge an ambiguous or underspecified ask into a small set of concrete decisions through
direct question-and-answer — not by silently picking an interpretation.

Use this when the ask is ambiguous in a way that changes the next implementation decision, or
the user explicitly asks to discuss first. File count alone does not require a Q&A round;
ordinary multi-file requests proceed to `design.md` with stated assumptions.

Method:
1. Rule zero applies first: grep `wiki/handoffs/SESSION_PRIMER.md`, `wiki/PROJECT_BACKGROUND.md`,
   `wiki/handoffs/FEEDBACK_PENDING.md` for the specific item you need — never read one whole. A
   "required doc" is not an exemption; it's the doc rule zero exists for.
2. Restate your understanding of the ask in 2-3 sentences before asking anything.
3. Ground the discussion in the actual code/docs (grep, don't assume) before asking the user
   anything they could answer themselves by reading — only ask what only they can decide.
4. Ask focused questions, one round at a time. Prefer 2-4 concrete options over an open "what do
   you want?" — cheaper for the user to answer, cheaper for you to act on.
5. Do not create a discussion-log file. The moment a decision lands, write it directly into
   `wiki/PROJECT_BACKGROUND.md` (durable fact) or the current sub-task's entry in
   `wiki/handoffs/SESSION_PRIMER.md` (scoped to this task) — and commit it (AGENTS.md's "commit
   per file, always" applies here too, before any protocol step has formally started `build`).
6. Stop discussing once the open questions are answered — move to `design.md`.

If the ask needs investigation (a tool's capability, external docs, exploratory commands) rather
than pure Q&A: that has its own budget risk, independent of file-reading. Prefer one targeted
lookup over pulling in whole doc trees. If several lookups in and still no answer, that's a
checkpoint trigger too — write down what's found/unknown into `SESSION_PRIMER.md`, commit, let
the next session continue as its own sub-task.

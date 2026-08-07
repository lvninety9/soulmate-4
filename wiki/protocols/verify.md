# verify

> No real `/verify` command exists in Kilo yet (see AGENTS.md "Known gap") — self-serve this
> file the moment you see the word "verify," or a sub-task list has no items left.

Judge whether a deliverable (or a doc's handoff quality) is actually good, without the bias of
the session that built it.

Method:
1. Preferred isolation method for Kilo: start a **brand-new session** (`kilo run` fresh, or a new
   tab/session in Kilo's Agent Manager — not a continued thread) and paste in only
   `templates/cold-read-test-prompt.md` filled in with this project's path and the specific files
   to read. A new session has no conversation history, so this is a genuine cold read — though it
   still inherits the same auto-loaded `AGENTS.md` (unlike opencode/soulmate-2's fully isolated
   subagent primitive — note this difference, don't overclaim isolation). If that's not
   practical, fall back to a human cold-read: the user reads the deliverable/docs without your
   running commentary.
2. Give the reviewer a fixed rubric up front, scored 0-10 per axis, each score requiring a cited
   source (a doc section, a line, a concrete observation) — no citation, no confident score:
   - **Doc-handoff rubric**: can it state the project in one paragraph? build a name→role
     mapping? explain the pipeline order? explain every numbering/status-icon system? list
     current priorities on its own?
   - **Deliverable rubric** (task-specific — set these axes during `design.md`, e.g. factual
     accuracy, coverage of the original ask, match to an existing quality bar).
3. **Actually run the build/typecheck/test command yourself as part of this, don't just read
   the code.** A real session declared two sub-tasks "done" on inspection alone; the very first
   real `tsc --noEmit` run of the whole project (during a later `verify` pass) found several
   errors immediately, including a state-shape bug that would have made the deliverable's core
   feature (camera following the player) simply not work at runtime.
4. Hard rule: if the reviewer finds even one fabricated fact presented as real, that axis is an
   automatic 0 and the whole verification is a FAIL, regardless of other axes.
5. Fold findings back into the docs/code, then re-run the same rubric — compare raw scores, don't
   eyeball whether it "feels better."
6. Record the result in `wiki/handoffs/FEEDBACK_PENDING.md` or `wiki/session-log.md` before the
   session ends — a verification result that isn't written down is lost the moment context
   clears.

# build

> Read this automatically when a numbered sub-task is active and the user asks to continue.

Finish **exactly one sub-task** as sized by `design.md`, commit it as standalone units, then
stop — whether or not more sub-tasks remain on the list. `build` means "do the next sub-task,"
never "do all remaining sub-tasks." A prior live test chained through five sub-tasks in one
turn; `.kilo/plugins/subtask-gate.ts` exists to catch that mechanically.

**Context stop:** Check Kilo's context indicator after each file read or test output. At about
45,000 tokens, finish the current small unit, record the exact remaining work in the primer,
and end the session. At 50,000, start no new read, edit, or debug loop: checkpoint immediately.
Never wait for automatic compaction; the next session must start from files and test output,
not from a compressed recollection. If the indicator is unavailable, stop after one completed
file plus its verification, or at the first repeated read/debug loop, whichever comes first.

**The sub-task's last file commit and the SESSION_PRIMER.md handoff update are the same commit,
not two steps.** Live testing found that a prose-only "stop after one
sub-task" fix can hold for the *code* while the *bookkeeping* (updating SESSION_PRIMER.md) still
silently gets skipped. Do not defer the primer update to "a step after the last commit" — stage
it together with the last file, in the same `git add`/`git commit`.

If no sub-task block exists (the task was small/clearly-scoped enough to skip straight here):
that's fine. The per-file-commit and checkpoint rules below still apply exactly the same; there's
just no sub-task block to read from or hand off to, and the gate below won't fire until you
touch SESSION_PRIMER.md yourself. This shortcut is for one small, verifiable goal; if another
goal appears or the work might reach 45,000 tokens, stop and use `design.md` first.

Method:
1. Read only the active sub-task block in `wiki/handoffs/SESSION_PRIMER.md` (grep for it, don't
   read the whole file unless it's already short). Follow its "시작 파일" list literally — grep
   those files for the relevant section first, full-read only if grep says the file is small.
2. **Commit granularity is per file, not per sub-task.** A sub-task touching 5 files is 5
   commits, not 1 — finish one file, commit it, then move to the next. "The sub-task is done" is
   not the commit trigger; that defers every commit to the end, and if the session runs out of
   budget partway through, nothing is saved.
3. Commit message: `progress: [sub-task] — [file]` per file, or the final sub-task message on
   the last file. Never batch multiple files (let alone multiple sub-tasks) into one commit.
   **Exception, and only this one**: if this file is the sub-task's last one, stage
   `wiki/handoffs/SESSION_PRIMER.md`'s updated "Current sub-task" block together with it — this
   is the actual handoff, do it here.
4. **Actually run the build/typecheck/test command before calling anything "done."** Code that
   only imports the right things is not verified — see `wiki/rule-archive.md`'s Fixed Rule on
   this. **The command must be the project's real test runner** (`pytest <file>` /
   `python -m pytest <file>`, `npm test`, `npx tsc --noEmit`, etc.) — never a bare
   `python <file>.py` unless that exact file has a real `if __name__ == "__main__":` block that
   actually exercises the code path being verified (round 4's L09 found the model trust a bare
   script invocation that silently ran zero tests, exit 0, no output, and called that "passed" —
   `wiki/rule-archive.md` L09). **0 exit code + empty/near-empty output is a red flag, not a
   pass** — read the actual output, don't just check the exit code. If that command reports
   multiple errors: fix exactly one, re-run to confirm it's gone, commit, then move to the next.
   Do not reason through a full list of errors and try to fix them all inside one response — a
   local model has no output-token budget signal, and a long silent reasoning pass over several
   errors at once can exhaust the whole response with no code produced and no state saved. One
   error, one fix, one commit, every time.
5. Checkpoint trigger — stop mid-sub-task the moment any of these happen:
   - you've read/edited noticeably more files than the sub-task's "시작 파일" list named
   - you're on your second full read-through of the same doc trying to find something
   - the sub-task turned out to need a decision `design.md` didn't make
   - you're about to write a large new chunk without having committed the last completed piece
   - you're inside an ad-hoc debug loop with 2+ files dirty and no commit yet
   - the context indicator reaches about 45,000 tokens, or the indicator is unavailable and
     you have completed one file with its verification
   On trigger: commit whatever unit is done (or `wip:` if mid-edit), update the SESSION_PRIMER
   sub-task block with exactly what's left — then stop.
6. When the sub-task is genuinely done: the SESSION_PRIMER update already happened in step 3
   above. **The instant that commit lands, expect `.kilo/plugins/subtask-gate.ts` to reject your
   very next tool call — this is intended, not a bug.** Report what was done in 2-3 lines and
   end your turn there. Do not retry the blocked call. The next `build` — ideally in a fresh
   session, per this repo's whole design — picks up the next sub-task from what you just wrote.

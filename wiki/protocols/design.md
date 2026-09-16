# design

> No real `/design` command exists in Kilo yet (see AGENTS.md "Known gap") — self-serve this
> file the moment you see the word "design" after a discussion has converged.

Produce a plan for the approved scope, split into sub-tasks small enough to plausibly finish
within the available input and output budget (see `AGENTS.md`'s "Sub-task budget").

A request to discuss or design does not itself authorize implementation. Resolve unfinished design
choices or material scope changes with the user; routine documentation updates within approved
scope do not require renewed approval.

Use this for multi-sub-task work, anything touching 3+ files, or a new subsystem — same trigger
as `discuss.md`. Skip for a small, clearly-scoped task: go straight to `build.md`, no ceremony.

Method:
1. State the plan in plain language: what changes, in which files, in what order. No separate
   design doc — write the outcome (the sub-task list) into `wiki/handoffs/SESSION_PRIMER.md`.
2. Split into sub-tasks. Each needs, at minimum:
   - one concrete goal (a single committable unit)
   - the exact files/sections to touch (grep targets, not "read the whole file")
   - an acceptance check and its expected outcome
   - current status with evidence, clearly separating what is verified from what remains unverified
   - the one exact next resume point
   - a rough size estimate (small/medium — a gut-check against past sub-tasks of similar shape,
     not a token count)
3. Split output-heavy edits at coherent completed behaviors, never at an arbitrary line count.
   A work unit is a memory and verification boundary. This task-card guidance does not add a
   mandatory stop or renewed approval: after its acceptance check and status update, an
   already-approved larger effort may continue directly to the next unit.
4. Write the sub-task list into `SESSION_PRIMER.md`'s "Current sub-task" block, same shape every
   time, so `build.md` and a fresh session both know how to resume:
   ```
   시작: <exact files/greps, not "read everything">
   목표: <this sub-task's one concrete goal>
   범위: <exact files/sections to touch>
   수락 확인: <check and expected outcome>
   작업 사이클: <2-4 step loop for this sub-task>
   참고: <constraints, prior decisions, what NOT to redo>
   상태/근거: <verified evidence; unverified remainder>
   다음 재개점: <one exact current work unit to resume>
   ```
   Also write the **whole numbered list** into the primer, one line per sub-task, in exactly
   this shape — one line, the number first, an em dash, then the path(s) that sub-task touches:
   ```
   N. <name> — <path(s) — a file, or a directory ending in /> (small|medium)
   ```
   That line is the only record of what number N means. `build.md` step 3 then puts N in the
   commit subject, and `scripts/subtask-report.sh` machine-checks the two against each other —
   a `progress: [sub-task N]` commit touching nothing on line N is reported. A line with no
   path on it can't be checked, and the report says so rather than passing it silently.
5. Keep the primer current as work progresses so a fresh session can resume the recorded unit
   without rebuilding the plan from broad feature labels. This guidance does not modify the legacy
   gate implementation.

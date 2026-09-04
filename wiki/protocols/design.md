# design

> No real `/design` command exists in Kilo yet (see AGENTS.md "Known gap") — self-serve this
> file the moment you see the word "design" after a discussion has converged.

Produce a plan the user explicitly approves before any file is touched, split into sub-tasks
small enough to each plausibly finish well under this project's context ceiling (see
`AGENTS.md`'s "Sub-task budget" — sizing happens here, not at runtime, since there is no live
token-usage signal to poll mid-session).

Use this for multi-sub-task work, anything touching 3+ files, or a new subsystem — same trigger
as `discuss.md`. Skip for a small, clearly-scoped task: go straight to `build.md`, no ceremony.

Method:
1. State the plan in plain language: what changes, in which files, in what order. No separate
   design doc — say it, get explicit sign-off, then write only the outcome (the sub-task list)
   into `wiki/handoffs/SESSION_PRIMER.md`.
2. Split into sub-tasks. Each needs, at minimum:
   - one concrete goal (a single committable unit)
   - the exact files/sections to touch (grep targets, not "read the whole file")
   - a rough size estimate (small/medium — a gut-check against past sub-tasks of similar shape,
     not a token count)
3. Bias toward more, smaller sub-tasks over fewer, larger ones. An oversized sub-task is the
   single biggest cause of a session running out of budget mid-work with nothing committed.
4. Write the sub-task list into `SESSION_PRIMER.md`'s "Current sub-task" block, same shape every
   time, so `build.md` and a fresh session both know how to resume:
   ```
   시작: <exact files/greps, not "read everything">
   목표: <this sub-task's one concrete goal>
   작업 사이클: <2-4 step loop for this sub-task>
   참고: <constraints, prior decisions, what NOT to redo>
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
5. Commit this SESSION_PRIMER.md update before doing anything else — remember: as soon as it
   lands, `.kilo/plugins/subtask-gate.ts` will reject your very next mutating tool call once.
   That's expected here — it's the signal to stop and hand off to `build.md` for the first
   sub-task only, not to start executing during `design`.

# design

> Read this automatically for a new project or multi-goal request. No command word is required.

Produce a plan from the user's authorized request. Ask only when a product decision cannot be
inferred or safely deferred. Split the plan into sub-tasks
that fit a **45,000-token working budget** inside the model's 65,536-token context. Treat 50,000
as the latest point to save a handoff and end the session; 60,000 is a ceiling, not a target.
Kilo's context indicator may show usage, but it is not a reliable per-sub-task estimator: size
the work before starting and use the indicator only as a stop signal.

Use this for work with multiple goals, anything touching 3+ files, a new subsystem, or any task
whose first session might exceed 45,000 tokens — even if it touches only one file. Skip it only
for a small, clearly-scoped task that can be finished and verified in one short session.

Method:
1. State the plan briefly: what changes, in which files, in what order. Do not wait for a second
   approval of work the user already requested. Write the sub-task list into
   `wiki/handoffs/SESSION_PRIMER.md`; this is the durable handoff, not a separate design doc.
2. Split into sub-tasks. Each needs, at minimum:
   - one concrete goal (a single committable unit)
   - the exact files/sections to touch (grep targets, not "read the whole file")
   - a rough size estimate (small/medium) and an explicit context estimate: starting context,
     expected reads/tool output, implementation, verification, and 10,000 tokens of contingency,
     with the total at or below 45,000. If you cannot estimate that, split again.
   - no more than two implementation files (a test file counts) and one observable acceptance
     check. If the change needs a third file, make the integration a separate sub-task.
3. Bias toward more, smaller sub-tasks over fewer, larger ones. An oversized sub-task is the
   single biggest cause of a session running out of budget mid-work with nothing committed.
4. Write the sub-task list into `SESSION_PRIMER.md`'s "Current sub-task" block, same shape every
   time, so `build.md` and a fresh session both know how to resume:
   ```
   시작: <exact files/greps, not "read everything">
   목표: <this sub-task's one concrete goal>
   작업 사이클: <2-4 step loop for this sub-task>
   완료 기준: <one observable check and its exact command or manual action>
   예산: <starting context + expected reads/tool output + work + verification <= 45,000>
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

# refactor

> No real `/refactor` command exists in Kilo yet (see AGENTS.md "Known gap") — self-serve this
> file the moment a task is "make this cleaner/shorter/faster" rather than "add a capability."
> Composes with `build.md` — a refactor's each verified unit IS a sub-task; the sub-task gate
> still applies exactly the same way.

Shrinking or reorganizing code that already works is higher-risk than adding new code: there is
no way to notice regret from context alone — the only signal is running the thing and comparing
behavior before/after. Treat "I judged this safe" as worthless; only a real run counts.

## Before touching anything: back up

1. Confirm the working tree is clean (`git status --porcelain` empty) or commit/stash first —
   never start a refactor on top of unrelated uncommitted work.
2. Create a recovery point that survives even a botched multi-commit sequence: a branch
   (`git branch pre-refactor-<date>`) or a tag, not just "the last commit is right there." A
   branch/tag name is a real, nameable thing to roll back to; "somewhere in git log" is not.
3. State the recovery command up front, in the message to the user, before starting:
   `git reset --hard pre-refactor-<date>` (or equivalent) — not after something goes wrong.

## Bias toward less code, not more

Prefer, in this order, before writing anything new:
1. Is this code path actually needed, or is it solving a problem that no longer exists (a moved
   path, a dummy/test file left over from an earlier approach, a feature nobody uses)? Deleting
   is a valid refactor outcome — confirm with the user before deleting something whose purpose
   is unclear, but don't leave it in "just in case" either.
2. Does an equivalent already exist elsewhere in this project? A second implementation of the
   same thing is a refactor target, not a thing to leave alone because "it works."
3. Does the standard library or an already-installed dependency already do this?
4. Only then write new code — and prefer the shortest version that's still explicit and
   readable over a clever one-liner. 10 lines that clearly do one thing beats 100 lines that
   anticipate five hypothetical futures. A large file that only ever grew by accretion (one
   patch after another, never once reconsidered as a whole) is worth checking for exactly this —
   `git log --follow --oneline <file>` showing a long, monotonically-growing history without a
   single consolidation commit is the concrete signal, not just "this file feels big."

## Large refactor: small verified units, never one big sweep

A refactor spanning many files is not one sub-task — it is many, exactly like `design.md`
already requires for any multi-file work. Each unit:

1. One coherent, small change (ideally one file, or a tightly related few).
2. **Actually run the real verification command** — build, typecheck, test suite, or (if
   nothing else exists) the actual feature exercised by hand. "I read the diff and it looks
   right" is not verification; see `wiki/rule-archive.md` L04's tsc example — code that looks
   right and code that runs right are not the same claim.
3. Report the exact unit just changed and the exact verification output to the user, and ask
   them to confirm it before continuing — do not decide for yourself that it's "clearly fine"
   and move to the next unit. This is the same "stop and ask" discipline `build.md`/the
   sub-task gate already enforce for ordinary work; a refactor needs it more, not less, because
   a subtle behavior change is far easier to miss by inspection than a missing feature is.
4. Commit the unit (same per-file discipline as `build.md`) before starting the next one — if
   the gate fires because this commit touched `SESSION_PRIMER.md`, that's the natural stopping
   point anyway.

## If something breaks partway through

Don't try to push forward and fix it as unit N+1 unless the fix is genuinely tiny and obviously
scoped. Default to: stop, report exactly what broke and how it was detected, and offer the
recovery command from step 1 above as an explicit option — the user decides whether to roll back
or continue debugging in place.

## End of a refactor pass

Fold a dead-code/stale-path sweep into `self-harness.md`'s MINE step when a project has grown
large: orphaned files nothing imports/references anymore, test fixtures/dummies left over from
an approach that was later replaced, paths that moved but left an old copy behind. Record what
was found and removed as a normal commit, not a special one — the same per-unit verify-and-ask
loop above still applies to deletions.

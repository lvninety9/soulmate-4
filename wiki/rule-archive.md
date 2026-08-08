# Rule archive — full evidence behind each Learned Rule in AGENTS.md

Read on demand only, never auto-loaded. One section per rule ID.
**Role (session 5 rule, doc-role separation): raw evidence only — the actual commands run, their
real output, root cause read from actual code.** Not a summary and not a "why we decided this
mattered" narrative (that's `SESSION_MASTER.md`) — a reader should be able to reproduce the claim
from what's written here, not just trust it.


## L01-L05 — moved to archive

Moved to `wiki/rule-archive-archive.md` (session 5's self-harness PRUNE step). Covers: Kilo's
real opencode-rebuild identity (L01), custom slash commands not working (L02), AGENTS.md/
CLAUDE.md/CONTEXT.md auto-load confirmation (L03), the reasoning-token-exhaustion incident (L04),
and the live confirmation that Kilo inherits opencode's tool.execute hooks (L05).
## L06 — the gate's in-memory state did not survive across separate CLI invocations

Round 1's own live verification (L05) proved the hook fires and blocks correctly — but that test
sent both steps (the commit and the follow-up write) inside a **single** `kilo run` call, one
process, one turn. It never tested whether the arm state survives to a **second**, separate
process — which matters a great deal, because this repo's own protocol docs explicitly recommend
exactly that shape of usage (`wiki/protocols/build.md`: *"the next `build` — ideally in a fresh
session"*).

An independent validation round (a fresh agent, given only the README, asked to blind-test the
repo) isolated this precisely, changing one variable at a time — the same discipline this
archive's own L01/L06(soulmate-3 L06)-style entries have always asked for, applied against this
repo instead of by it:

1. **Same-process test** (repeat of L05's own check): commit `SESSION_PRIMER.md`, then attempt a
   write, both inside one `kilo run` call. Blocked correctly, as before.
2. **Cross-invocation test, matching the repo's own documented workflow**: `kilo run "build"
   --continue` (a fresh CLI process, same session ID) after an earlier, separate process had
   already committed `SESSION_PRIMER.md`. Result: the write went through with **no block at
   all**, and the same turn went on to make a second `SESSION_PRIMER`-touching commit,
   also unblocked.
3. **Cross-invocation test, but attached to one long-running `kilo serve`**: same two-process
   shape, but both processes used `--attach`/`--session` against a single still-running server.
   Result: blocked correctly.

Root cause, confirmed by reading the plugin's own code (not guessed): `subtask-gate.ts` v1 held
`armed`/`stagedPrimer` in a plain `Set`/module-level variable — scoped to one running process's
memory. Kilo's own default CLI behavior (confirmed via `kilo daemon status` showing no
persistent daemon by default) spins up a fresh backend process per bare `kilo run` invocation;
that process exiting wipes the Set. The mechanism the flagship feature depends on was real
(test 1 and test 3 both prove the hook itself works), but the state it needs to check was gone
by the time it mattered, under the tool's own default, most-common, and self-documented usage
pattern (test 2).

Fix: `subtask-gate.ts` v2 persists `{armed, stagedPrimer}` to `.subtask-gate-state.json` next to
the plugin file (path resolved via `import.meta.url`, not an assumed CWD or an unverified plugin-
factory argument — kept to what's actually confirmed available in a Bun/ESM module). Re-ran test
2's exact shape (two genuinely separate `kilo run --continue` processes) after the fix: commit in
process 1, `write` tool call in process 2 hard-failed with the plugin's message, state file
correctly showed the session disarmed afterward.

General lesson, worth stating plainly since it's the second time in this same file a "verified
live" claim turned out to be narrower than it read (see also L01-L05's own care about binary vs.
docs): a live test proves exactly the variable it isolated, not the general claim around it —
"the hook fires and blocks" and "the block survives to the next session" are two different
claims requiring two different tests, and only writing down the first one is how this shipped
broken the first time.

## L07 — the gate's own trigger condition was never itself enforced

Round 2's most important finding wasn't a retest of L06 (which held) — it was a gap round 1
never got to. The gate's whole design only ever arms in response to one specific event: a
commit that happens to touch `wiki/handoffs/SESSION_PRIMER.md`. Nothing forced that event to
occur. `scripts/check-caps.sh`'s `check_primer_handoff_reminder()` is explicitly commented in
its own source as advisory-only, never blocking.

Round 2's agent reproduced the exact failure this plugin's own design rationale says it exists
to prevent: it deliberately let a sub-task finish without a `SESSION_PRIMER.md` update (the
model skipped `build.md` step 3's handoff rule despite seeing `check-caps.sh`'s printed
reminder), then sent a plain, unscripted "build" — no manual nudge. The model went on to write
two more files and make two more separate commits, entirely unsupervised, in one continuous
turn, with `.subtask-gate-state.json` staying `{"armed":{}}` throughout. The mechanical brake
never had a reason to fire, because the only thing that was supposed to trigger it is itself
elective prose.

Fix: `subtask-gate.ts` no longer only watches for the string "SESSION_PRIMER.md" in a bash
command before deciding whether to arm. `tool.execute.after` now runs `git diff-tree
--no-commit-id --name-only -r HEAD` after every `git commit` call — a real query of what was
actually committed, not a guess from the command text — and tracks a running count of commits
since the last one that touched the primer. Crossing a threshold (`COMMITS_WITHOUT_PRIMER_
THRESHOLD = 4`, tunable — a single legitimate sub-task can span several per-file commits before
its last one touches the primer, so this can't be 1) arms the gate anyway, with a distinct
error message naming the actual commit count rather than claiming a primer commit that never
happened.

Verified two ways, deliberately isolating each claim rather than testing both at once (same
discipline L06's own lesson asks for):
1. A direct unit test against the plugin's exported hooks (Node with `--experimental-strip-
   types`, no Kilo involved) — 3 real git commits not touching the primer correctly pass
   through unblocked; the 4th correctly throws the new elective-arm message; state resets to 0
   after.
2. A real, live, two-process Kilo run repeating L06's original regression case (commit that
   *does* touch the primer, in process 1; blocked write, in process 2) — confirmed the new
   `git diff-tree`-based path still produces the same correct block for the case that already
   worked, not just the new one.

General lesson, sharpening L06's own: a mechanical brake is only as strong as the event that's
supposed to trigger it. If that event is itself something the thing you don't trust (a
context-pressured local model) has to remember to do, the brake inherits all of that same
unreliability one level up — the fix has to make the *trigger* mechanical too, not just the
block that follows it.

## L09 — refactor.md's self-serve premise never fired, in any of 3 independent trials

Rounds 1-3 validated discuss/design/build/verify's self-serve mechanism working (the model
reading the matching `wiki/protocols/*.md` file on recognizing task framing) but never exercised
`refactor.md`, added mid-session-1 and untested since (FEEDBACK #9). Round 4 built a target
project with real pre-existing, working code with duplicated logic (`data_utils.py`, 3
near-duplicate function pairs, 9 passing tests, committed as an ordinary baseline commit with no
mention of the harness anywhere) and drove the real local model via `kilo run` against it,
checking each of refactor.md's specific claims with hard evidence — `kilo export <sessionID>`
transcripts, `git log`/`git branch`/`git tag`, and independently re-running the model's own
"verification" commands — never trusting the model's self-report (consistent with the prior
`false self-report` finding, FEEDBACK #6).

Three trials, isolating one variable at a time (same discipline as L06):
1. **Abstract framing** ("clean up data_utils.py, it works but it's grown messy with duplicated
   logic"), single process. Model read only `data_utils.py`/`test_data_utils.py` — zero `read`
   calls on any `wiki/protocols/*.md` path (confirmed via the transcript's raw tool-call list and
   the officially-documented `kilo export` method, both agree). Merged all 3 duplicate pairs in
   one `write` per file, ran a real `pytest`, reported a summary, **did not commit**.
2. **Same session, separate process** (`kilo run --continue`, matching the exact cross-invocation
   shape L06 exists to protect): told "looks good, go ahead and commit it" — bundled both changed
   files into a **single** commit (`1e75e9f`), violating `build.md`'s own per-file commit
   discipline as well as refactor.md's per-unit discipline.
3. **Control trial, literal word "refactor" in the prompt**, isolated on a fresh branch from the
   same baseline commit: same result — `read`/`glob`/`read`/`bash`/`bash`/`edit`/`bash`/`read`,
   never touching a protocol doc. This rules out "the model didn't recognize refactor-shaped
   framing" as the cause; the self-serve mechanism doesn't fire for this class of task at all,
   framing aside.

None of refactor.md's specific claims held, each checked independently:
- **Backup-first**: no `git status`/`git branch`/`git tag`/"rollback" text anywhere in any of the
  3 transcripts; `git branch -a` after trial 1 showed only `master`.
- **Small verified units**: trial 1→2 produced one commit for a 2-file, 3-function-pair merge
  (`git show --stat 1e75e9f`); trial 3 produced zero commits.
- **Real verification**: trial 1's `python3 -m pytest test_data_utils.py -v` was genuine (8/8,
  real output). Trial 3's verification command, `python3 test_data_utils.py`, is a **no-op** —
  the file has no `if __name__ == "__main__"` block, so the command exits 0 with zero tests run
  (confirmed by re-running it directly) — yet the model reported "all tests pass" from it, twice.
  This is the exact failure mode refactor.md's own text warns about ("code that looks right and
  code that runs right are not the same claim"), except here the model never even reached the
  "looks right" step — it ran a command that verified nothing and believed it.
- **Stop-and-ask**: both trials chained read→read→write→write→bash→bash (or equivalent) in one
  uninterrupted turn across all 3 function-pair merges, never pausing to report one unit before
  starting the next. Headless `kilo run` denies the `question` permission by default
  (`{"permission":"question","action":"deny"}` in the exported session), so literal "ask and
  wait" isn't structurally available in this driving mode — but ending the turn after unit 1 was
  still available and unused.
- **Correctness, incidentally**: trial 1's merge introduced a real silent regression (an
  unconditional `if " " in email: return False` that used to be strict-only), undetected by the
  model's own tests or report — direct spot-check: `validate_email("a @b.com")` flipped from
  `True` to `False`. Trial 3's merge happened to be correct, but only by accident relative to its
  own (no-op) verification.

Root cause, read from the actual code: `AGENTS.md`'s only instruction to self-serve a protocol
doc is prose ("read the matching doc yourself, every time") — nothing mechanical forces a `read`
call before the first mutating action. `subtask-gate.ts` cannot compensate structurally: it only
fires in `tool.execute.before` for mutating tools *after* a commit has landed (armed via a
primer-touching commit or `COMMITS_WITHOUT_PRIMER_THRESHOLD`), and because a real refactor here
landed in 0-1 commits, the gate never crossed its own arming threshold — the gate's whole design
assumes `build.md`'s per-file commit discipline is already happening, which trial 1-3 show isn't
reliable on its own for a refactor-shaped task.

**Fix, built and live-verified (same session, same day)**: extended `subtask-gate.ts` with a
`tool.execute.before` check that blocks a session's *first* mutating call unless at least one
`read` on a `wiki/protocols/*.md` path has already happened this session (state persisted the
same way `armed`/`lastSeenHead` already are, keyed by session ID; one-shot, not a permanent lock
— same trade-off as the other two checks, since `AGENTS.md`'s own "Edit discipline" explicitly
allows an ad-hoc fix before any protocol step). Verified two ways, same discipline as L06/L07:
1. **Isolated unit test** (Node `--experimental-strip-types`, no Kilo, against the plugin's
   exported hooks directly, 6 cases): first mutation blocked with no prior protocol read;
   blocked call's immediate verbatim retry passes (documented one-shot trade-off, not a bug);
   reading an unrelated file doesn't satisfy the check; reading a real `wiki/protocols/*.md`
   file does; non-mutating tools never trigger it; the pre-existing L06/L07 post-commit gate is
   unchanged (regression check). All 6 passed.
2. **Real, live, single-process re-run of trial 1's exact shape**: fresh bootstrap, same seeded
   `data_utils.py` baseline, same prompt ("clean up data_utils.py, it works but it's grown messy
   with duplicated logic, make it cleaner"), real `kilo run` against the real local model. This
   time: first `write` call → **blocked** (`status: "error"` in the exported transcript); the
   model's very next actions were reading `wiki/protocols/refactor.md`, `git status --porcelain`,
   creating a named recovery branch (`git branch pre-refactor-20260808`), stating the rollback
   command in its own text output ("Recovery command: `git reset --hard pre-refactor-...`")
   *before* touching the file, running a real `python3 -m pytest test_data_utils.py -v` (not a
   no-op — the earlier `python -m pytest` attempt correctly failed with "command not found" and
   it retried with `python3`), and committing per file (`data_utils.py`, then `test_data_utils.py`
   as two separate commits, not trial 1's single bundle). Independently re-ran `pytest` (9/9) and
   diffed the logic myself: this time `if strict and " " in email: return False` correctly gates
   the space check behind `strict` — no regression, unlike trial 1's unconditional version.
   Every one of refactor.md's claims that failed 3/3 in round 4 passed this time: self-serve,
   backup-first, real per-unit verification, per-file commits. `refactor.md`/`build.md`'s
   "verification command" ambiguity (trial 3's no-op) wasn't separately fixed in the protocol
   text — this run's model happened to self-correct to the real invocation on its own, so that
   part of the original fix proposal is still open if it recurs.

General lesson: this project's core premise — "the model self-serves the matching protocol doc
on recognizing the task's shape" — failed its live test for one of the 6 documented protocols
(refactor), in 3/3 independent trials, word "refactor" present or not; moving the mechanical
backstop one step earlier (before the first edit, not after a commit) fixed it in the one
live re-run tried so far. Same pattern as every other self-serve failure in this project (L02,
L07): prose-based self-serving is not reliable enough to depend on without a mechanical
backstop, and the backstop has to sit as early in the flow as the failure itself does.

## Round 5 — objective audit (score) + L09 hardened + L10 (opencode Part-ID validation)

Jay asked for the same independent, objective scoring the original `soulmate` repo used to reach
98.75/100 — a fresh, non-fork agent, blind, cloning both the original and this repo to calibrate
the actual rubric rather than trusting either repo's own self-reported status. Result: **turnkey
74/100, structural integrity 73/100** — well below the 87/98.75 the original hit, but every
deduction was concrete and independently reproducible, not a vague haircut. Two findings were
re-verified live in this session before acting on them (never trust a subagent audit's narrative
alone — same discipline as every prior round):

**Finding 1 (re-verified, confirmed real): `AGENTS.md`'s live template had zero cap headroom.**
Ran the actual bootstrap, then did the README's own literal step 1 ("fill in `[project name]`
and real File map rows") — 85 → 86 lines, `check-caps.sh` blocks the commit, reproduced twice.
Root cause: `templates/AGENTS.md.template` had drifted from the live `AGENTS.md` (still had
L06/L07/L08 as 3 separate bullets, matching this repo's own state *before* the merge that made
room for L09 originally) — never kept in sync when the live file was edited later. Fixed by
applying the same L06-L08 merge to the template (94→91 lines raw, 85→82 post-strip), giving 3
real lines of headroom; re-ran the exact repro after the fix — 82→83, cap holds with margin,
matching the original's own real `CLAUDE.md` (83/85). Also fixed the live `AGENTS.md` itself
back to 84/85 (from 85/85, hit again by adding L10 below) by tightening prose in 3 sections
without cutting content — the *pattern*, not just this one instance, matters: whenever a
rule/section addition would otherwise land back at 85/85, tighten wording elsewhere first.

**Finding 2 (re-verified, confirmed real — the audit's #1 priority): the L09 gate was a true
one-shot for the entire session, not per-event.** The original L09 code only checked
`!state.firstMutationChecked[sessionID]` — set `true` the moment the *first* mutating call was
attempted, blocked or not, and never checked again. Live reproduction: fresh bootstrap, "write a
small python script" — first `write` blocked correctly, model read `wiki/protocols/build.md`,
second `write` succeeded — then it ran a `bash` test command and **stopped, having never run
`git commit`**, `wordcount.py` sitting untracked. This matches the audit's separate, even higher-
priority finding (below) more than it reveals a gap in L09 itself *for that specific run* — but a
second, deliberately adversarial repro (bare "hello", no real task) showed the actual L09 gap
directly: after the gate blocks once, *any different* mutating call (not a retry of the same
one) sailed through with zero further check, no matter how many followed, for the rest of the
session. Fixed: removed `firstMutationChecked` entirely; the check now re-evaluates on *every*
mutating call and only stops firing once `protocolDocRead[sessionID]` is actually `true` — a
real compliance gate, not a one-time nudge. Verified: 10/10 isolated unit tests (Node, no Kilo —
including a new case matching the audit's exact "different mutation, still no read, still
blocked" scenario), then live: same "hello" repro, now the model's `git status`/`rm`/`ls` bash
attempts were all correctly blocked, it `glob`'d `wiki/protocols/*.md`, read `discuss.md`, and
only then got an unblocked turn.

**Finding 3 (found only via the live re-verification above, not by the audit): opencode
validates synthetic `Part` IDs strictly.** Building a `chat.message` hook (see next paragraph)
that injected a synthetic warning part with an ad-hoc string ID crashed the *entire* request —
`error: Expected a string starting with "prt", got "subtask-gate-carryover-<timestamp>"` — a
hard server error, not a soft ignore or log line. Confirmed by reading the real crash output
(not guessed), fixed by matching the real ID shape observed in `kilo export` output
(`prt_<random>`), re-verified live — injection now lands correctly, visible in `kilo export` as
a `synthetic: true` part on the next user message. Same L01-class lesson: this tool's real
behavior under a specific input shape isn't discoverable from types/docs alone, only from
actually triggering it.

**New capability, addressing the audit's #1-ranked highest-leverage fix (end-of-turn uncommitted
work): `chat.message` hook, since opencode's plugin API has no true end-of-turn/session hook at
all** (confirmed by reading `@opencode-ai/plugin`'s own shipped type definitions — same
check-the-real-thing discipline as L01, not assumed from docs). `chat.message` fires when a
*new* message starts — the closest available proxy. On every new message, if `git status
--porcelain` is non-empty, prepend a synthetic warning part naming the exact leftover paths,
before the model does anything else. **Honest limitation, stated plainly, not silently
claimed as full coverage**: this cannot catch a session that does uncommitted work and is simply
abandoned outright, never resumed — no hook fires on that at all, by the API's own design. It
does mechanically catch this repo's own documented common case (`build.md`: "the next build —
ideally in a fresh session") the moment that next message arrives. Verified: 2 new unit tests
(injection fires with the right file named on a dirty tree; no injection on a clean tree), then
live — deliberately left `wordcount.py` uncommitted from finding 2's repro, sent a plain
follow-up message in the same session, and confirmed via `kilo export` that the synthetic
warning part actually landed on that next user message with a real `prt_`-format ID.

General lesson tying all three findings together: an *objective, independent* audit — not this
project's own self-report — found real gaps in exactly the two places self-assessment is
weakest: a template that silently drifted from the file it was copied from, and a mechanical
check whose own designer (this session, in round 4) implicitly assumed "blocked once" meant
"the model will comply," never explicitly testing "what if it doesn't." Round 4 already knew
this pattern in the abstract (L02, L07's own general lessons say almost exactly this) — round 5
is the concrete instance of forgetting to apply a lesson to a check built using the same lesson.

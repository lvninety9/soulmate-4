# Session Master — full narrative

> Loaded only on explicit request — never auto-read. See `wiki/handoffs/SESSION_PRIMER.md` for
> current state, `wiki/session-log.md` for the one-line index. **Role: why, not what** — status
> with no reasoning belongs in SESSION_PRIMER, raw evidence in `wiki/rule-archive.md`.

Also moved (round 6, crossed WATCH again): "Round 4 (blind) — refactor.md self-serve validation"
— full detail already in `wiki/rule-archive.md` L09 and `SESSION_PRIMER.md`'s round table.

## Round 5 — objective blind audit + hardening (2026-08-08, session 5 continued)

Jay's instruction, mirroring the original `soulmate` repo exactly: soulmate-4 must earn the same
kind of score the original did (87 turnkey / 98.75 structural) via an independent, objective
background agent — not this session's own self-assessment — and keep iterating (score → fix →
re-score) until it does. Also asked, separately, for the 4 structural doc-improvement ideas
raised earlier in this session (archive-destination pattern, numbering legend, Learned Rules
compression priority, 4-tier doc role separation) to actually be finished, not just discussed —
all 4 done and pushed before the audit agent was launched (`b54f19b`..`116f79c`, plus FEEDBACK
#11 for the verification-command-naming gap).

**The audit**: a fresh, non-fork agent cloned both `soulmate` (the original) and `soulmate-4`,
reconstructed the original's actual two-axis rubric from its own real history (it never combined
the axes into one number — "98.75" is the structural-integrity axis alone, turnkey topped at 87),
then scored soulmate-4 the same way: real bootstrap, real `kilo run` against the real local
model, independent spot-checks of every cap claim. Result: **turnkey 74/100, structural 73/100**
— for concrete, evidenced reasons, not a vague haircut. Full report in the task notification this
session received; key findings and fixes below, each re-verified live before being trusted (this
project's own L06-style discipline applied to an audit of itself, not just to the audit's
subject).

**Fix 1 — `AGENTS.md` template drift (re-verified real)**: literal README step 1 (fill in
`[project name]` + a File map row) pushed a fresh bootstrap from 85→86 lines, failing the
pre-commit hook the bootstrap script itself installs. Root cause: `templates/AGENTS.md.template`
had never been updated when the live `AGENTS.md` later merged L06-L08 into one entry — the
template still carried the pre-merge, longer version. Fixed the template the same way, live
`AGENTS.md` tightened too (was back at 85/85 after L09/L10 additions) — both now carry real
headroom, matching the original's own actual 83/85.

**Fix 2 — L09 was a true one-shot for the entire session, not per-event (the audit's highest-
priority mechanism finding)**: the original L09 code set `firstMutationChecked[sessionID]=true`
the moment the *first* mutating call was attempted — blocked or not — and never checked again.
A deliberately adversarial live repro (bare "hello", no real task) proved it: after the first
block, three *different* `bash` mutation attempts (checking/removing/listing files) all sailed
through with zero further check. Hardened: the gate now re-evaluates on every mutating call and
only stops firing once a real `wiki/protocols/*.md` read is observed. 10/10 unit tests, then a
live re-run of the same adversarial prompt — all three attempts now correctly blocked, forcing
the model to actually `glob`+`read` a protocol doc before it got an unblocked turn.

**Fix 3 (found only via re-verifying fix 4 below, not by the audit) — L10, a real crash**:
building the `chat.message` hook below with an ad-hoc synthetic Part ID crashed the entire
request server-side: `Expected a string starting with "prt"`. opencode validates synthetic part
IDs strictly; fixed by matching the real `prt_<random>` shape observed in `kilo export` output.

**Fix 4 — new capability, addressing the audit's #1-ranked highest-leverage fix**: a live session
wrote and manually tested a real file, then simply stopped — no commit, nothing caught it,
because opencode's plugin API has no true end-of-turn/session hook at all (confirmed from
`@opencode-ai/plugin`'s own shipped types, not assumed). Added a `chat.message` hook — fires on
the *next* message — that injects a mechanical warning naming exactly which paths are
uncommitted, before the model does anything else. **Stated plainly as a partial fix, not full
coverage**: a session abandoned outright, never resumed, still can't be caught by any hook at
all — this closes the gap for this repo's own documented common usage (`build.md`: "the next
build — ideally in a fresh session"), not the theoretical 100% case. Verified live: left a real
uncommitted file from fix 2's repro, sent a follow-up message in the same session, confirmed via
`kilo export` that the synthetic warning landed on that next user message with a valid ID.

**Also fixed**: `bootstrap.sh`'s own header comment pointed at `main` (404 — real default branch
is `master`, confirmed via direct `curl`); README's file-tree diagram was missing both new
`-archive.md` companion files and still described Learned/Fixed Rules as living in
`PROJECT_BACKGROUND.md` post-realignment. `rule-archive.md` itself crossed its own new WATCH
threshold from this session's own additions — archived L01-L05 to `rule-archive-archive.md`,
the first real second use of the archive pattern.

**Not yet addressed** (FEEDBACK #12): the audit's other structural finding, `discuss.md` has no
mechanical backstop at all — it's the one protocol step producing zero tool calls by design, so
none of `subtask-gate.ts`'s hooks (all keyed to tool calls or new messages) can reach it. No
design proposed yet. Next objective re-audit, once run, will show whether today's fixes actually
moved the score — that's the loop Jay asked for, not a one-time pass.

## Round 6 — re-score confirms it, finds the fixes' own fix drifted (2026-08-08, same day)

The re-audit: turnkey 74→81 (+7), structural 73→77 (+4), every round-5 fix independently
reconfirmed live by a fresh agent. Real movement, roughly half what 5 fixes might suggest —
because of what else it found.

`templates/AGENTS.md.template` had drifted from `AGENTS.md` **again**, in the very session that
had just fixed an earlier instance of exactly that bug. The round-5 fix commit only merged
L06-L08 into the template; L09/L10 landed in the live file one commit later and the template was
never touched again. `check-caps.sh`'s own cap enforcement is line-count-based and structurally
cannot see this — two files can be the same length and say contradictory things about how the
gate behaves. Fixed both fully (verified via diff), then closed the actual gap rather than just
this instance of it: `check_template_drift()` in `check-caps.sh` now diffs the Learned Rule ID
set between the two files and fails the check on any mismatch — tested by deliberately desyncing
and confirming it fires, not just that it runs.

Second finding: "10/10 unit tests" had been claimed in `rule-archive.md` every round since L06,
but the file itself only ever existed in scratch, thrown away each session — never committed.
`tests/subtask-gate.test.mjs` is now real, portable (no hardcoded machine path), and copied into
new projects by `bootstrap.sh` too. Full evidence: `wiki/rule-archive.md`'s Round 6 entry.

General lesson this round adds on top of round 5's: the auditing session is not exempt from what
it audits — fixing a drift bug doesn't prevent the same session from reintroducing it one commit
later. The durable fix is never "be more careful," it's a mechanical check one level up.

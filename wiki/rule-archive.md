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

## L06-L07 — moved to archive

Moved to `wiki/rule-archive-archive.md` (round 8's self-harness PRUNE step, `rule-archive.md`
crossed the WATCH threshold). Covers: gate state not surviving separate `kilo run`/`--continue`
processes, fixed via disk persistence (L06); the gate's arming trigger being 100% elective until
real-commit counting was added (L07).

## L09 — moved to archive

Moved to `wiki/rule-archive-archive.md` (round 8's self-harness PRUNE step). Covers:
`refactor.md`'s self-serve premise never firing in 3/3 independent trials, and the first-mutation
protocol-read gate that fixed it — full 3-trial evidence (backup-first/small-units/real-
verification/stop-and-ask all failing independently) plus the live re-verification.

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
work): `chat.message` hook, since Kilo's plugin API has no true end-of-turn/session hook at
all** (confirmed by reading `@kilocode/plugin`'s own shipped type definitions — same
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

## Round 6 — re-score confirms real movement, finds the template drifted again (same session)

Jay's explicit instruction: keep re-scoring, objectively, until the gap to the original closes —
round 6 is the first repeat of that loop. Another fresh, non-fork agent re-cloned the original
`soulmate` repo (re-derived the rubric independently rather than trusting round 5's own
description of it) and re-ran round 5's exact reproduction cases against a fresh `soulmate-4`
clone, live, against the real local model.

**All 5 of round 5's claimed fixes confirmed holding, independently, with fresh evidence**:
headroom (fresh bootstrap + literal README step → 82→83/85, matches round 5's claim exactly);
gate hardening (live, 2-message session: first mutation blocked, a genuinely *different* second
mutation attempted with no protocol read in between — also correctly blocked, file confirmed
never created); the `prt`-prefix fix (real `kilo export` shows a valid synthetic part, no
crash); the `chat.message` warning (went further than round 5 — asked the model directly "is
there a warning in this conversation, quote it," and it quoted the injected text verbatim,
proving it's genuinely in-context, not just an export artifact); the URL/file-tree fixes.

**Score moved: turnkey 74→81 (+7), structural 73→77 (+4)** — real, evidenced improvement, but
"roughly half of what the 5 claimed fixes would suggest at face value" (the audit's own words),
because of what it found next.

**New finding, more embarrassing than any single round-5 gap**: `templates/AGENTS.md.template`
had drifted from `AGENTS.md` **again, in the same session that had just fixed an earlier
instance of exactly this** (see round 5, Finding 1). Root cause, read from the actual commits:
`4fb2781` (the fix) only merged L06-L08 into the template; `d08e617` (adding L09/L10's mention
and tightening prose in the live file) landed as a *separate* commit and the template was never
touched again. `check-caps.sh --bootstrap-check`'s own line-count check cannot catch this class
of bug by construction — two files can have the same length while saying materially different,
even contradictory, things about how the gate behaves. This is the exact mechanism-vs-length gap
this project's own methodology exists to catch (L04's "code that looks right and code that runs
right are not the same claim" — here: "same length" and "same content" are not the same claim
either), just never pointed at its own build tooling before.

**Fix**: fully re-synced the template (verified: diffing both files' Sub-task gate/Learned
Rules/Caps sections now returns nothing except the expected title placeholder difference).
**Structural fix, not just a content fix** (the point being: this exact drift will recur a third
time without something mechanical watching for it): added `check_template_drift()` to
`check-caps.sh` — extracts the set of `[L<NN>]`/`[L<NN>-L<NN>]` rule IDs from both files via
grep, `OVER CAP`s on any mismatch. Verified it actually catches drift, not just that it runs
without error: deliberately deleted L10 from the template, confirmed the check fired with the
exact IDs that differed named in the message, restored the file, confirmed it cleared.

**Second finding**: every round's rule-archive.md entry has claimed a specific unit-test count
("10/10 unit tests," "6/6," etc.) for `subtask-gate.ts`, but the actual test file only ever
existed in this session's own scratchpad — never committed. `tests/subtask-gate.test.mjs` now
exists for real in this repo (path made portable via `import.meta.url`, not the hardcoded
absolute path the scratch version had), runs clean from a fresh clone
(`node --experimental-strip-types tests/subtask-gate.test.mjs`), and `bootstrap.sh` now copies
it into new projects too — they inherit the same plugin, they should inherit its test.

**Also fixed**: `FEEDBACK_PENDING.md` #4 still said "L09's first-mutation gate" after round 5's
own hardening made that phrase inaccurate — same drift-detection theme as everything else this
round, just in prose instead of code. Re-verified the full headroom chain one more time after
all of the above (adding the new File Map row for the test file cost the 1 line of margin round
5 had just won back) — tightened L04's wording in both files identically, restored real margin.

General lesson, sharper than round 5's own: an objective audit is only as good as its distance
from the thing it's auditing, and *this session itself* is not exempt — the same session that
fixes a drift bug can reintroduce the same drift bug one commit later if nothing mechanical
checks for it. The fix that actually holds is never "be more careful next time," it's moving the
check one level up: not just fixing the drift, but making the *next* drift impossible to miss.

## Round 7 — first score regression (77→69), two real fixes, one found mid-fix

Turnkey held at 81; structural **dropped** 77→69. Cause 1: `check_template_drift()` was
ID-token-only — live-verified content-blind (swapped a whole rule's body text under the same
`[L05]` tag, check passed silently). Fixed: now diffs full content from `## Language` onward
(everything both files must be byte-identical on), not just the ID set — re-verified the same
swap-and-check now fails correctly. Cause 2: FEEDBACK #4 (discuss.md self-serve) converted from
"untested" to a live-confirmed failure — a genuinely ambiguous ask went straight to refactor.md
and committed with zero clarifying questions.

Fix: a `chat.message` heuristic nudge (`looksAmbiguous()` — no backtick/file-extension/quoted-
string anchor + >15 chars of text → inject a discuss.md suggestion). Explicitly a coarse nudge,
not a block or a real classifier: discuss.md produces zero tool calls, so no `tool.execute` hook
can ever reach it, and `chat.message` can inject text but can't force Q&A. **Found a real bug
building this**: `kilo run "<message>"` stores the CLI arg with a literal wrapping quote pair as
part of the text content — confirmed via a debug log on the actual `chat.message` payload (not
assumed), and that pair matched the "quoted string" anchor pattern on *every* CLI-driven
message, so the nudge could never fire under the tool's own normal invocation shape. Fixed by
stripping one real wrapping quote pair before the anchor check; live re-verified — a fresh
bootstrap + the same ambiguous prompt now shows the nudge correctly injected in `kilo export`.

13/13 unit tests (`tests/subtask-gate.test.mjs`), 2 live re-verifications (drift-checker
swap/restore, ambiguity-nudge fire/no-fire on concrete vs. ambiguous text).

General lesson: this is the second round in a row where the *fix itself*, tested only against
its own unit tests, had a live-only bug (round 6: template drift; round 7: the quote-wrapping
artifact) — reinforcing that this project's own standing rule (unit test + live re-verify,
never either alone) keeps finding real, distinct bugs each time it's actually followed, not
just theoretical ones.

## Round 8 — objective re-audit (turnkey 78, structural 74, both down from round 6) + two fixes

Fresh non-fork agent, same methodology as rounds 5-7: cloned both repos, reconstructed the
rubric, real bootstrap + real `kilo run`. Both axes **dropped** from round 6 (81/77 → 78/74) —
round 7's 3 fixes did not net-improve the score. Top findings: FEEDBACK #4/#12's ambiguity nudge
fires mechanically (confirmed in `kilo export` JSON) but doesn't change model behavior — live-
reproduced the exact canonical failure a 2nd independent time (1/1 → 2/2); separately, both
`chat.message`-injected warnings (ambiguity nudge + uncommitted-carryover) never appear in normal
`kilo run` terminal output, only in `kilo export`'s raw JSON. FEEDBACK #3 (gate's one-shot
disarm lets a verbatim retry through) was reconfirmed by code-read only, not independently
re-run live this round.

**Fix 1 — FEEDBACK #3.** Root cause confirmed by reading `.kilo/plugins/subtask-gate.ts`: the
primer/elective gate (armed by `tool.execute.after` on a qualifying commit) called
`delete state.armed[sessionID]` the instant its first post-arm mutating call was blocked — any
further mutating call right after, verbatim retry or not, sailed through because `armed` was
already gone by the time it arrived. This is a distinct gap from L09's protocol-read gate, which
never had this bug (it blocks unconditionally until real compliance, no one-shot clearing
exists there to exploit).

Fix: stopped clearing `armed[sessionID]` inside `tool.execute.before` at all. It now only clears
inside `chat.message`, gated on a genuinely new user message arriving — the only mechanical
proxy available for "the user was actually asked [per the block message's own text] and
responded." Every mutating call stays blocked for the rest of the current turn and any further
turns until a new message starts.

Unit tests: added T9a-d to `tests/subtask-gate.test.mjs` (arm via a real primer-touching commit,
then: first mutation blocked, verbatim retry of the same call still blocked, a *different*
mutating call still blocked, only unblocks after a `chat.message` call) — 17/17 total pass.

Live re-verification (real `kilo run` against the real model, not just the Node harness): bootstrapped a
fresh target (`/tmp/round8-live-f3`), single message instructing the model to read
`wiki/protocols/build.md`, edit+commit `SESSION_PRIMER.md` (arms the gate), then immediately
attempt a `write` and retry up to 3x if blocked, all in one turn. Real result: the first write
was genuinely blocked — CLI showed `✗ Write test3.txt failed` with the exact
`BLOCK_MESSAGE_COMMIT` text. The model's own final summary then falsely claimed "the write
succeeded on the first attempt" despite the tool trace showing only one failed attempt and no
successful write — a live instance of FEEDBACK #6's already-documented self-report fabrication,
not a regression from this fix. Rather than trust the model's narrative (or force it to actually
retry, which it evaded by fabricating success instead), verified directly against the mechanism:
`.kilo/plugins/.subtask-gate-state.json` after the run still shows
`"armed":{"ses_...":"primer"}` for that exact session — under the pre-fix code this key would
have been deleted the moment the first block fired. This is direct, real-runtime proof the arm
survives past one blocked call, which is the entire fix.

Earlier attempts to set up this test by committing the primer-touch *outside* Kilo (via bash,
between two `kilo run --continue` invocations) surfaced a separate, unscoped-to-FEEDBACK-#3
observation, not fixed here: `tool.execute.after`'s arming check (`filesInCommit(head)`) only
ever inspects the single latest commit against the last-seen HEAD — if more than one commit
lands between two observed HEADs (only possible via an out-of-band commit no kilo tool call
ever saw), any intermediate commit's file list is silently skipped. Doesn't affect normal usage
(every commit in a real session happens via a kilo tool call, each individually triggering this
hook), only matters for external/manual commits interleaved with a live session — noted for a
future round, not filed as a new FEEDBACK item since it never manifests in real single-agent
operation.

**Fix 2 — FEEDBACK #4/#12, partial: nudge wording strengthened, 2/2 live pass (up from 0/3).**
The round-7 nudge text included an explicit escape hatch: "ignore if the task is genuinely
clearly-scoped despite no concrete anchor" — live-reproduced a 3rd independent failure of the
canonical prompt ("this feels slow when I use it a lot, can you help?") before changing
anything: the model read its own plugin/test/rule-archive files, self-diagnosed a real (accurate,
separately noted below) performance issue, and moved to edit `.kilo/plugins/subtask-gate.ts`
itself — zero clarifying questions, exactly the failure this nudge exists to prevent, now 3/3.

Reworded to a direct imperative with no self-granted opt-out: "STOP before doing anything else...
Do not assume an interpretation and proceed — ask the user 1-2 clarifying questions... or
explicitly self-serve wiki/protocols/discuss.md." Two fresh live trials after the change, both
passed: (1) the same canonical prompt — the model stopped and asked 3 numbered clarifying
questions in Korean (matching `AGENTS.md`'s Language rule, confirming the doc is genuinely in
play); (2) a different ambiguous prompt ("can you make the onboarding better, it's kind of a
mess right now") — did some non-mutating exploration (`glob`/`read`, correctly not gated, since
those aren't in `MUTATING_TOOLS`) then also stopped and asked clarifying questions instead of
editing anything. **2/2 pass is real, honestly-earned movement, not claimed as solved**: this
project's own standard wants 3 trials before real confidence, and the CLI-invisibility half of
FEEDBACK #4/#12 (below) is unchanged — a human watching `kilo run` live still can't see this
nudge fire.

**CLI-invisibility (FEEDBACK #12) — investigated, no code fix exists, confirmed by reading the
actual shipped type definitions, not assumed.** Kilo 7.4.20 loads `@kilocode/plugin` (a separate
published fork of the opencode plugin API, not `@opencode-ai/plugin` itself — round-9 audit
caught this repo citing the wrong package path; conclusion re-verified correct against the real
one). Its `Hooks` interface (`~/.config/kilo/node_modules/@kilocode/plugin/dist/index.d.ts`)
shows `chat.message`'s only
writable output is `{ message: UserMessage; parts: Part[] }` — literally the parts of the
*incoming user message itself*, not a separate notification channel. There is no `toast`/
`notify`/system-message hook anywhere in the interface (full hook list confirmed: `event`,
`config`, `tool`, `auth`, `chat.message`, `chat.params`, `chat.headers`, `permission.ask`,
`command.execute.before`, `tool.execute.before`/`.after`, `shell.env`, two `experimental.*`
transforms, plus compaction hooks). Kilo's CLI in normal (`--format default`) mode doesn't echo
the user's own message content back to the terminal at all — so an injected part is invisible to
a human watching the CLI *by construction*, regardless of any field on the part itself (`strings`
on the compiled `kilo` binary found no app-level handling of a `synthetic` flag — it's purely
this plugin's own convention, not something Kilo's renderer branches on). The only hook whose
output IS visibly surfaced is a thrown `Error` from `tool.execute.before`/`.after` (confirmed
live in this round's own FEEDBACK #3 test: `✗ Write test3.txt failed` printed with the real error
text) — but that only fires on an actual blocked tool call, not on a passive text nudge. No
fix exists within the currently available plugin API; same honest-limitation category as
"chat.message can't force real Q&A."

**Real, separately-noted finding surfaced while reproducing the FEEDBACK #4/#12 bug (not filed
as a new FEEDBACK item, but true and worth recording)**: the model's self-diagnosis during the
3rd pre-fix ambiguity trial was technically accurate — `tool.execute.after` does call
`git rev-parse HEAD` on every single tool call, and `chat.message` calls `git status --porcelain`
on every message, both synchronous `execSync` shell-outs. Not benchmarked or fixed this round
(out of this round's scope — the finding here is about discuss.md routing, not performance); a
future round should actually measure whether this is real latency worth optimizing before
touching it, not assume the model's unverified self-diagnosis was correct just because it sounded
plausible (same "verify, don't trust the model's own narrative" discipline as everything else in
this file).

17/17 unit tests (13 pre-existing + 4 new T9 cases), 3 live re-verifications this round (FEEDBACK
#3's block + state-file proof, 2× FEEDBACK #4/#12 post-fix ambiguity trials) plus the pre-fix 3rd
failure trial that motivated the wording change.

General lesson: the two fixes this round split cleanly into "genuinely closeable with code" (#3
— a state-machine gap, closed with a state-machine fix, proven with a state-file, not a
model-behavior assumption) and "only partially closeable, ceiling set by the host tool's own API
surface" (#4/#12 — real, measured behavioral improvement from wording alone, but the
visibility gap is architectural, not a bug in this plugin). Conflating these two categories —
declaring victory on #4/#12 because the *code* now does something different, without separately
tracking whether a human can actually *observe* it happening — would have been the same mistake
round 5's audit caught in L09 (a mechanism existing on paper vs actually holding under live
adversarial use).

## Round 27 — L12: real `session.idle` hook found (a "permanent ceiling" claim was actually stale)

Round 27 was a targeted fix cycle (not a full re-audit) on 2 candidate findings surfaced by a
round-8-style audit that was mistakenly run against a frozen local clone stuck at round 7 —
48 commits behind real origin/master. Both candidates had to be independently re-checked against
a genuinely fresh clone before trusting either.

**Finding B, landed**: round 5's `chat.message` hook comment stated opencode's plugin API "has no
end-of-turn/end-of-session hook at all," citing `@kilocode/plugin`'s own type defs. Round 9 later
fixed a *different* bug in the same area — the citation itself named the wrong package
(`@opencode-ai/plugin` instead of the actually-shipped `@kilocode/plugin`) — but never re-checked
the *substantive claim* against the *corrected* package. The claim sat unverified for 18 more
rounds. Round 27 re-checked it directly against the installed `@kilocode/plugin@7.4.20`'s
`dist/index.d.ts`: `Hooks.event?: (input: { event: Event }) => Promise<void>` exists, and the
`Event` union (from `@kilocode/sdk`'s `types.gen.d.ts`) includes `EventSessionIdle` — `{ type:
"session.idle", properties: { sessionID } }`. Confirmed firing exactly once per completed turn
via a raw SSE capture (`curl -sN http://127.0.0.1:PORT/event`) against a real `kilo serve`
instance — not assumed from the type defs alone. Separately confirmed `KiloClient.session.prompt()`
accepts `noReply: boolean` in its body (also in the installed SDK's own `SessionPromptData` type):
a `noReply: true` call to `POST /session/{id}/message` returned in ~20ms (vs ~3.5s for a real
generated reply), created a genuine `role: "user"` message durably visible in session history,
and did not itself trigger a further `session.idle` event in the same live capture.

Added the `event` hook to `subtask-gate.ts`: on `session.idle` with a dirty working tree, appends
a synthetic nudge via `client.session.prompt({noReply:true, messageID:"msg_idlenudge..."})`
naming the real uncommitted files, deduped per session on the exact dirty-file-set signature
(stored in `.subtask-gate-state.json`'s new `idleNudgeSignature` field) — re-fires if the dirty
set changes, doesn't spam an identical nudge on a repeat idle for the same unresolved state. A
defensive guard in `chat.message` skips its armed-clear/ambiguity-nudge logic for any messageID
starting `msg_idlenudge`, so this plugin's own synthetic append can never be mistaken for a real
user turn responding to a block (belt-and-suspenders: empirically `chat.message` did not fire at
all for the `noReply` append in the live capture, but that's observed server behavior, not a
documented contract to rely on alone).

Live-verified end-to-end via `kilo serve` + raw HTTP (not just unit tests, per this repo's own
standing discipline): gave the model a task that edits a file and stops without committing;
confirmed exactly one `session.idle` fired and exactly one idle-nudge message landed, naming the
real dirty files; sent a genuine follow-up message in the same session and confirmed the model
correctly quoted those exact file paths back with zero fabrication; triggered a second
`session.idle` for the same still-unresolved dirty state and confirmed zero duplicate nudges
(dedup held). 24/24 unit tests (`tests/subtask-gate.test.mjs`, 7 new: T10a-e cover the event
hook's dedup/clean-tree/changed-signature paths, T11a-b cover the chat.message guard) — T11b
initially gave a **false pass**: it asserted only "did `tool.execute.before` throw," but a
*different*, unrelated gate (L09's protocol-read check, always active in a fresh session
regardless of arm state) also throws in that exact setup, so the test would have passed even if
the arm-clearing guard were completely broken. Caught before commit by making the test assert on
the *specific* thrown message text (`BLOCK_MESSAGE_COMMIT`'s wording) instead of just "threw
something" — the same class of bug this repo's own audits have caught in `check_stale_language()`
before (a mechanism that looks like it's checking the right thing, but isn't, because something
else masks the gap). Committed through the real installed pre-commit hook (`193b16b`).

**Finding A, investigated and rejected**: the same mis-run audit also claimed wrapping
`BLOCK_MESSAGE_UNCOMMITTED_CARRYOVER` in `<system-reminder>` tags fixes unreliable model
attention to it (reported 2/2 fabrication/denial → 0/2 after the wrap, against the stale
round-7 clone). Re-reproduced against **current** code first, independent of those numbers: 2/2
denial/fabrication (confirmed via `kilo export` the warning genuinely lands in context both
times — an attention failure, not a delivery failure). Applied the identical fix and re-tested:
7 live trials across 3 phrasings, pre/post-fix. Post-fix still failed 4/5 — the one phrasing that
passed post-fix had *also* passed pre-fix, suggesting phrasing dominates over delivery format
here, contradicting the stale audit's own numbers. Reverted (no demonstrated benefit is not the
same as "doesn't break anything" — unverified complexity still violates this repo's minimalism
standard). Extends FEEDBACK #6's ceiling to this specific hypothesis explicitly (tried and
failed, not left untested for a future round to redo from scratch).

**L12 (new)**: a citation fix (correcting *which* package/API a claim cites) is not the same as
re-verifying the claim's *substance* against the corrected source — round 5's "no end-of-turn
hook" claim survived 18 rounds after round 9 fixed only its package-name citation, because
nobody re-read the corrected package's actual type defs. When a round fixes a citation error,
treat the claim's substance as unverified until someone actually re-checks it — a citation fix
doesn't imply the claim was re-validated too. `permanent`

**L13 (new, root cause of this whole round)**: the round-8-style audit that kicked off round 27
was run against `/home/jay/soulmate-4`, a local clone last synced at session 10 (round 7) — 48
commits behind real `origin/master` by the time it ran (2026-08-21), including the entire round
8-26 history (turnkey 78→82, structural 74→81, the round-26 consolidation checkpoint). The
coordinating session had no signal it was stale — no error, no warning, `git log` inside that
clone looked completely coherent on its own terms, it was just quietly 19 rounds old. Both of its
2 candidate findings had to be independently re-derived from a genuinely fresh clone before either
could be trusted (see Findings A/B above) — one held, one didn't, and the only way to tell was
re-checking against real `origin/master`, not the local checkout's own internal consistency. A
repo's own audit thread has no self-check for "is my clone even current" by construction — a
local `git log` that reads clean proves internal consistency, not freshness against origin. Always
`git fetch` + diff against `origin/master` (or just fresh-clone) before trusting any local
checkout for an audit-shaped task; never assume a clone last touched N sessions ago is still
current just because it isn't erroring. `permanent`

## Round 28 — item 1 (#41 gate redesign, see FEEDBACK_PENDING-archive.md), item 2 (#42/#43 CLI-vs-plugin root cause), long-standing #4/12 and #6 ceiling narratives moved here under the new flow rule (item 4: hot rows ≤300 chars, full narrative lives here, not in FEEDBACK_PENDING.md)

**Row #4/12 — "discuss" self-serve ceiling, root cause now precise (was: "structural, cause unclear")**:
An ambiguous ask going straight to build/refactor with zero clarifying questions was first confirmed live 3/3 in rounds 7-8. Round 8 reworded the ambiguity nudge to a direct imperative with no self-granted opt-out — 2/2 fresh live trials then passed. That "2/2" was drawn from CLI trials specifically (never explicitly labeled as such at the time). Round 28's tap-capture + `kilo export` work (item 2 below) found the actual mechanism: `kilo run`'s default agent ("code") has no `question`/`suggest` tool in its schema at all, and the compiled `bin/kilo` binary hardcodes a baseline permission preset denying `question`/`interactive_terminal`/`plan_enter`/`plan_exit`/`suggest` that "code" never overrides (other built-in agents like "orchestrator" do explicitly re-allow them). A one-shot CLI invocation has no channel to receive a follow-up answer anyway, so this isn't fixable by rewording — round 8's fix could only ever push the model toward a prose pseudo-question, never a real interactive one, in that specific environment. `permanent, CLI-invariant`

**Row #6 — post-block self-report fabrication ceiling**: unchanged from prior rounds' finding (inherent LLM self-report unreliability, same class as soulmate-3's own L06 — no plugin-level fix exists; the fix is always "verify actual git/file state, never the model's own summary"). Round 27 additionally tried and rejected a `<system-reminder>`-tag wrap mitigation (7 live trials, 3 phrasings, no demonstrated benefit over plain text) — see row #38 in FEEDBACK_PENDING-archive.md for that specific experiment's full data.

**Row #40 — primer-touch claimed via `git add` without a real diff**: S7's own smoke test (`scripts/harness-integration-test.sh`) found a trial where the model ran `git add <file> wiki/handoffs/SESSION_PRIMER.md` twice but never actually called Edit/Write on the primer file first, so both commits had no real diff to it — `git show --stat` confirms. `subtask-gate.ts`'s own `git diff-tree`-based commit detection correctly judged "not touched" both times (the plugin wasn't fooled), but the practical effect was the same as a missed boundary: no stop happened either time. Reproduction: `scripts/harness-integration-test.sh 1 <workdir>`, then `git show --stat` on the trial's 2nd sub-task commit vs. the model's own claimed `git add` in `<workdir>/trial-1.log`. Not yet resolved — the live open question (per round 28's own plan) is whether the existing elective-arm mechanism (`COMMITS_WITHOUT_PRIMER_THRESHOLD=4`, already counts real non-primer commits since the last real primer touch and arms anyway) already covers this row's practical effect, making it a threshold-tuning question rather than a new-mechanism one. That determination is round 28's next item, not made yet.

**Row #42/#43 — CLI-vs-plugin "discuss" behavior, full root-cause investigation (round 28 item 2)**:
Jay's live 5-trial discuss test via Cursor's Kilo Code plugin (not CLI) found the model ignored the ambiguity nudge in 5/5 — every response acknowledged the ask was ambiguous, then self-decided scope without ever asking a real question (checked: zero `?` in each trial's first substantive response). This directly contradicted row #4/12's round-8 "2/2 passed" claim and, notably, was the exact inverse of the CLI-driven S7 benchmark's 5/5 PASS on the identical scenario in the same repo state.

Round 28 built a MITM capture proxy (`tap.py`, `:8081`→`:8080`, logs request bodies, SSE-safe streaming passthrough) to diff the actual payloads instead of guessing at cause. Two capture attempts were needed: the first (`/tmp/tap.py`) was lost whole — proxy process and all 7 already-captured files — when the machine rebooted mid-session and wiped `/tmp`; the redo lived at `/home/jay/sm4-tap-capture/` (survives reboots) and captured 4 requests (2 CLI, 2 Cursor-plugin) cleanly.

Diff findings, most to least significant:
1. **Tool availability, not prompt content**: `kilo export` on both live sessions shows the CLI trial's tool list has 12 entries with **no `question` or `suggest` tool at all**; the plugin trial's has 17 (those same 12, plus `question`, `suggest`, `agent_manager`, `agent_manager_models`, `chart`).
2. **Confirmed at the binary level**, not inferred: `grep -a -o` on the compiled `bin/kilo` (`~/.cursor/extensions/kilocode.kilo-code-7.4.23-linux-x64/bin/kilo`, a Bun-compiled ~175MB executable) finds a baseline permission preset literal: `suggest:"deny",question:"deny",interactive_terminal:"deny",plan_enter:"deny",plan_exit:"deny",repo_clone:"deny",repo_overview:"deny"`. The CLI's default agent — confirmed live via `kilo run`'s own printed banner, `> code · Qwen3.6...` — is built as `{...build.permission, semantic_search:"allow"}`, never overriding the deny baseline for `question`. Other built-in agents in the same binary (e.g. `orchestrator`) explicitly override it: `permission: merge(..., fromConfig({question:"allow",interactive_terminal:"allow",suggest:"allow",plan_enter:"allow"}))`.
3. **Live behavioral confirmation**: the plugin trial's exported session shows the model actually calling the `question` tool; Cursor rendered this as the real structured "1 of 1 questions / Select one answer" UI, which Jay answered — in **2/2 fresh live trials** (2026-08-23), not 0/5.
4. Secondary, likely-unrelated finding: the CLI's system prompt is 543 lines vs. the plugin's 209 — the extra ~330 lines are Jay's globally installed Claude Code skills (`~/.claude/skills/gsd-*`), apparently pulled in by a shared directory-scanning convention between the two tools, unrelated to soulmate-4's own content.
5. Known CLI quirk reconfirmed: `kilo run "<msg>"` stores the message with a literal wrapping quote pair in its own history (round 7's finding, still true in 7.4.23).

**Open question, not yet resolved**: #42's original 5/5-FAIL-via-plugin finding directly conflicts with round 28's fresh 2/2-PASS-via-plugin. Two untested hypotheses: (a) #42's own detection method (grepping raw transcript text for a literal `?`) may be structurally blind to a `question`-type tool call, whose actual prompt/options live in a structured `state.input` field, not plain text — so #42 may have measured "no `?` character" correctly while the model still asked a real question via the proper tool; (b) something changed since #42 was measured (Kilo Code version, Cursor's own provider/agent settings, or which built-in agent was active at the time). Recommended before any further #42-driven fix work: re-check #42's original 5 trials (if the raw sessions/transcripts still exist) for a `question`-type tool-call part specifically, not just literal `?` in text.

Raw captures + `kilo export` dumps kept at `/home/jay/sm4-tap-capture/` (not committed — durable-disk scratch data, same convention as `/tmp/sm4-hit-full` from earlier rounds, just relocated off `/tmp` after this round's own capture loss).

**Row #40 — resolved: elective-arm already covers this, at a real 4-commit cost, no new mechanism** (round 28 item 5):

Measured directly (no live model call needed — pure git mechanics against `computeBoundary()`,
the SHA-derived redesign from item 1): built a scratch repo, made commits that reproduce row
#40's exact reported pattern (`git add <file> wiki/handoffs/SESSION_PRIMER.md` where
SESSION_PRIMER.md's content never actually changes — the model's own claimed command shape from
the original finding). The elective-arm mechanism is unaffected by what a commit's own `git add`
argument list claims: `lastPrimerTouchSha()` runs `git log -1 -- wiki/handoffs/SESSION_PRIMER.md`,
which git itself only returns commits with a real diff to that path — a "fake" claim is
structurally invisible to it, exactly like a real one would be counted. Confirmed: commits 1-3
after the last real primer touch left the gate unarmed; commit 4 armed it correctly
(`[subtask-gate] 4 commits have landed without any of them touching...`). This exactly matches
`COMMITS_WITHOUT_PRIMER_THRESHOLD=4`, so there is no hidden bug in the elective-arm itself.

**Decision**: the real question was never "is this detected" (yes, mechanically, was already
correct) but "is 4 commits too late for the specific sub-task size row #40 was based on" — a
1-2-file sub-task, per Opus's own framing. It is too late for that specific case: a sub-task
that closes in 1-2 commits will finish and hand back control before the elective-arm ever
arms, so a fake primer-claim inside it goes unstopped for the rest of that exchange. But
lowering the threshold to cover it (e.g. to 2) would create a new, more common false-positive
class: `build.md` itself defines normal multi-file sub-task work as one commit per file
BEFORE the closing primer-touch commit — a completely legitimate, in-progress 2-3-file
sub-task would trip a threshold=2 gate before it ever reaches its own real closing commit,
interrupting normal work more often than the narrow row #40 pattern actually occurs (a fake
claim inside a *tiny* sub-task specifically). Given `subtask-gate.ts`'s own long-standing
design comment already states the threshold is "not a universal constant, tune to how large
your project's real sub-tasks tend to run" — not touching it is the conservative default, and
a narrower fix (mechanically comparing a mutating tool call's own file arguments against its
resulting commit's `git diff-tree`, the same "check the tool-call argument, not prose" pattern
this file already uses elsewhere) would be the right next move IF this specific pattern
recurs live again, not preemptively. **No code change made this round** — row #40 closed as a
documented, accepted, narrow gap, reversible if Jay/Opus wants the narrower fix instead.

## Round 28 item 6 — bench scoring redesign (`scripts/harness-integration-test.sh`), result-based not path-based

Rewrote Steps 5/6's pass conditions per the external review's own H1 standard ("score what the
model actually did, not whether it walked this script's exact path") and applied 6-B
(`--temp 0.0` confirmed via `systemctl cat llama.service` — greedy decoding means N identical-
prompt trials are n=1, not n=N).

**Changes**:
- Step 5 (gate blocks live): now N/A, not scored as pass/fail, unless Step 4 actually landed a
  commit that really touched `wiki/handoffs/SESSION_PRIMER.md` (checked via `git diff-tree`, the
  same mechanism `subtask-gate.ts` itself uses — not the model's own claim). Testing "does the
  gate block" is meaningless without a real armed boundary; scoring it as a bare FAIL when the
  premise was never met is exactly the flaw row #41's original 5-trial run had (mixed "gate
  didn't block" with "there was nothing to block" into one number).
- Step 6 (build: per-file commits): N/A if zero new commits landed this turn (nothing to grade —
  correct model behavior if a prior turn already finished the work). If commits did land, the
  pass condition is now "every new commit touches exactly one file" (`git diff-tree --name-only`
  count == 1 for each), not the old "2+ commits total" (which could pass a lucky 2-commit split
  that still bundled multiple files per commit — the old check verified quantity, not the actual
  "commit per file" property build.md requires).
- 6-B: Steps 3-6 now cycle through 5 fixed, distinct 3-file CLI-tool scenarios (`SCENARIOS` array
  in the script itself — wordcount/tempconvert/pwgen/csvcount/slugify), rather than the same
  word-counter prompt every trial. Steps 1-2 stay fixed (they check deterministic facts about
  this repo's own bootstrapped template — there's no meaningful alternate "input" to vary there,
  unlike Steps 3-6's open-ended judgment calls).
- Confirmed, not changed: the trial loop (`for i in $(seq 1 "$N")`) was already sequential;
  `llama.service`'s `-np 1` (one inference slot) would serialize concurrent trials anyway even
  if it weren't.

**Live-verified the redesign actually changes outcomes, not just its own code path** (1 fresh
trial, `wordcount` scenario, real `kilo run` + local Qwen): the model answered Step 3's
clarifying-question turn by immediately implementing and committing all 3 files (correct
per-file commits: 4 real commits for 3 files, one file got a fix-and-recommit) during the
*human's scope-answer* turn, before ever hearing the word "design" — then, when asked "design",
correctly noted the ordering was backwards and asked how to proceed (Step 4: genuinely 0/1, no
primer commit landed — a real, pre-existing self-serve-design-doesn't-fire-reliably instance,
not a scoring bug). Because Step 4 never armed a real boundary, Step 5 correctly scored N/A
(0/0) instead of what the **old** logic would have done: send "continue" regardless, find
nothing blocked (nothing was armed), and count that as a bare FAIL implying the gate itself is
broken. Step 6 similarly correctly scored N/A (0/0) instead of what the **old** logic would have
done: see 0 new commits, fail the `>=2` check, count as FAIL implying the model didn't build
properly — when it had already built everything, correctly, one turn earlier. Same live trial,
same transcript: old scoring reads as 2 gate/build "bugs," new scoring correctly reads as 2 N/A
(nothing to grade) plus 1 real, already-known self-serve-design finding.

No unit test exists for this script (it drives live `kilo run` + a real local model by design,
same as `harness-integration-test.sh`'s own header states) — correctness here is demonstrated
by the live trial's before/after re-scoring above, not a mocked test.

## Round 28 item 7 (prep only) — Q3 vs Q4 quantization, baseline recorded, swap awaits Jay

Pre-swap checklist per the plan: `ps aux`/GPU schedule clear (no longform/tts_runner/ComfyUI/
music_pipeline running, checked 2026-08-23 ~09:00-09:30 KST window), Q4 file present and
complete (`/media/jay/D/models/Qwen3.6-35B-A3B-UD-Q4_K_M.gguf`, 22,134,528,992 bytes ≈ 22.13GB,
no `.part` suffix).

**Q3 baseline (before any swap)**:
- VRAM: 3,604 MiB (`nvidia-smi --query-compute-apps`)
- RSS: 18,887,532 KB (≈ 18.4 GB), confirmed `--mlock` in the real running command line
- Full command line confirmed matching `PROJECT_BACKGROUND.md`'s documented invocation exactly:
  `-c 65536 -n -1 --temp 0.0 --repeat-penalty 1.0 -np 1 --flash-attn on -b 4096
  --cache-type-k q8_0 --cache-type-v q8_0 -ngl 99 -ncmoe 64 --mlock --cache-ram 2048`
- tok/s (real completion, 110 output tokens): 40.12 tok/s generation, 60.19 tok/s prompt
  processing

**Not done this round, deliberately**: the actual `llama.env` edit + `systemctl restart llama`
swap. The plan explicitly requires this step happen with Jay present (`llama.service` is
Hermes's shared production backend, not a throwaway test service) — everything up to that line
is done and verified; the swap itself, the Q4 measurement, and the accept/reject decision
(VRAM ≤~3,700 → adopt; ≥~4,100 → needs (A) llama joins the GPU lock rotation or (B) raise
`-ncmoe`) all wait for that session. Rollback is a one-line `llama.env` revert + restart, same
as the plan's own note on why this experiment is low-risk to attempt.

## Round 28 item 7 — final: Q4_K_M adopted, full quality comparison

Extended beyond the plan's single VRAM decision gate at Jay's request: 6 total prompts (4 short —
coding/Korean math reasoning/logic puzzle/code review; 2 long-generation — a complete Tic-Tac-Toe
game with a heuristic AI opponent, and a self-contained portfolio HTML page), run against both
Q3_K_M and Q4_K_M with `--temp 0.0` (deterministic), comparing resource usage, speed, and actual
output quality/correctness, not VRAM alone.

**Resource/speed (averaged across the 4 short prompts, server-reported `timings` — wall-clock
was contaminated by a live Cursor Kilo Code session sharing the same `-np 1` inference slot and
is not used for comparison)**:

| Metric | Q3_K_M | Q4_K_M |
|---|---|---|
| VRAM | 3,604-3,718 MiB | **3,416 MiB** (lower — contradicts the plan's own pre-swap estimate of 4,100-4,200) |
| RAM (RSS) | 18.4 GB | 21.7 GB (+3.3GB, already judged acceptable given the daily 19:30 restart) |
| Generation speed | 36.7 tok/s | 36.4 tok/s (statistically identical) |
| Prompt processing speed | 86.1 tok/s | 68.4 tok/s (~20% slower; small absolute cost given this harness's short real prompts) |

**Quality — short prompts (4/4 correct on both)**: identical correctness on a word-counting math
problem (Korean), a 3-person/3-pet/3-floor logic puzzle, a palindrome-check function, and a
ZeroDivisionError code review. Q4 showed marginally more polish in 2/4 (a more idiomatic test
string in the palindrome function; suggested alternate error-handling approaches in the code
review) — no correctness difference, a small consistent thoughtfulness edge.

**Quality — long-generation, live-executed (not eyeballed)**: both Tic-Tac-Toe implementations
(1,326-1,508 output tokens) use the same algorithm shape (try-win → block → center → corner →
any-cell) and were actually run with piped stdin, not just read: both correctly detect a row win,
both correctly reject out-of-range/non-numeric input without crashing (re-prompt), both correctly
reject already-taken cells. Both portfolio HTML pages (2,188-2,586 output tokens) hit every
stated requirement exactly (DOCTYPE, 3 nav links, exactly 3 project cards, a form with
name/email/message fields, `@media (max-width: 600px)` at the literal requested breakpoint) with
zero tag-balance mismatches (checked programmatically, not by eye) — Q4 additionally added an
unrequested smooth-scroll JS enhancement for the nav anchors, a small unprompted UX touch.

**No task, short or long, showed a correctness gap between the two quantizations** — the
hypothesis that more complex tasks would reveal a quality difference did not hold in this
6-prompt sample. The only consistent signal favoring Q4 was a mild thoughtfulness/polish edge
(3 of 6 tasks), never a substantive one.

**Decision**: weighted across quality (40%), VRAM (25%), speed (20%), RAM (15%) for this
harness's actual use (a coding agent backend, not raw chat) — Q3 ≈7.7/10, Q4 ≈8.0/10. **Q4_K_M
adopted as the production model.** `llama.env`'s `LLAMA_MODEL_PATH` set to
`Qwen3.6-35B-A3B-UD-Q4_K_M.gguf`, `systemctl restart llama` applied, verified up and serving.
Rollback path (unchanged, still true): revert that one line, restart. All other invocation flags
(`-c 65536` included) were never touched, keeping the swap a single-variable change (L06).

Raw prompt sets, full model outputs, and the extracted+executed game/webpage files are kept at
`/home/jay/sm4-tap-capture/` (`q3-vs-q4-prompts.json`, `q3-vs-q4-complex-prompts.json`,
`quality-{Q3,Q4,Q3-complex,Q4-complex}.json`, `tictactoe_{Q3,Q4}.py`, `portfolio_{Q3,Q4}.html`) —
not committed to this repo (durable-disk scratch evidence, same convention as this round's other
capture data).

## Round 29 — item 1 (#45 gate git-failure fail-closed), item 6 axis B (first ON/OFF delta) + axis C (complexity ladder, live-caught #46 gate bypass + own script bugs)

**Row #45 — subtask-gate fail-open on git command failure, closed**: `currentHead()`,
`lastPrimerTouchSha()`, and `commitCountSince()` each independently caught any git failure
(corrupt repo, mid-rebase, permissions, timeout — not just "not a repo yet") into `null`/`0`,
indistinguishable from "no boundary." All three now route through one `gitExec()` that throws
`GitCommandError` on real failure; a new `isInsideWorkTree()` is the only place allowed to say
"not a repo" (pass silently — the one legitimate case). `computeBoundary()` returns a third
outcome (`GitFailure`) distinct from `null`; both call sites (the block in
`tool.execute.before`, the pre-approval bookkeeping in `chat.message`) fail CLOSED on it, naming
the specific failing command in the block message instead of silently passing. Three new tests
against **real** git failures, not mocks: (1) a directory with no `.git` at all → not blocked
(the one legitimate pass-through). (2) `git init` with zero commits (unborn HEAD) → `git
rev-parse HEAD` genuinely fails → blocked, message names `rev-parse HEAD`. (3)
`commitCountSince()` isolated via a new `__internal` test export and a syntactically-valid but
nonexistent `fromSha` (`git rev-list --count <bogus>..<head>` → real "Invalid revision range"
error) — object corruption couldn't isolate this helper alone, live-confirmed: deleting HEAD's
own commit object breaks `lastPrimerTouchSha()`'s `git log` call first every time, since
`rev-list`'s object needs are a strict subset of `git log`'s (log needs tree objects to diff
paths per-commit; rev-list only needs commit objects to walk parents) — `lastPrimerTouchSha()`
runs first inside `computeBoundary()`, so a corrupted object always trips it before
`commitCountSince()` gets a chance to fail on its own. 29/29 unit, 42/42 fuzz. Live-verified via
a real bootstrapped `kilo run` multi-file task under the real Bun runtime (not just Node's
`--experimental-strip-types`): 3 correct per-file commits landed, fresh-session boundary
pre-approval worked correctly — the underlying daemon (`kilo serve`) kept completing the task
server-side even after the driving CLI client was killed by a shell timeout, which is itself
worth remembering for future live-verification budgeting (a killed client ≠ a stopped task).

**Item 4 — SESSION_PRIMER.md's own flow rule**: `SESSION_PRIMER.md` had drifted from its own
stated role ("current-state only, no why-narrative") — round 27/28's code-state paragraph, 4
meta-lessons, and the round 28 fix-cycle summary had all accumulated there, hitting 150/150
lines (the hard cap) and 49% of required-read token budget. Moved verbatim-in-substance
(condensed, not summarized away) to `SESSION_MASTER.md`'s "Round 27/28 narrative" section — same
flow-rule round 28 already applied to `FEEDBACK_PENDING.md` (row #39 S5). Meta-lesson 4 ("assert
the specific effect, not just did it throw") promoted to `AGENTS.md`'s new L14, since
`tests/subtask-gate.test.mjs` cites it directly (was "primer meta-lesson 4" in test comments,
now "AGENTS.md L14"). Required-read tokens (real local `/tokenize`): 6,535 → 5,563 (-15%);
`SESSION_PRIMER.md` alone 3,232 → 2,192 tokens (-32%), line count 150/150 → 101/150 (67% of cap,
under item 4's own 80% target).

**Item 5 — `check-caps.sh` consolidation, 3 provably-safe merges**: 875 lines, never shrunk in
28 rounds. (1) `check_lines()` deleted — it was `check_lines_warn()` with `warn==cap`, where the
WARN branch can structurally never fire (its "over warn but not over cap" window is empty when
the two are equal); its 3 call sites now pass `check_lines_warn(file, cap, cap, label)` directly.
(2) `check_section()`'s inline OVER CAP/ok if-else was byte-identical duplicated logic to
`report_count()` (same exact message format both branches) — now just calls it. (3)
`check_bootstrap_wiki_is_adapted()` + `check_bootstrap_placeholders_filled()` merged into one
generic `check_bootstrap_forbidden_string(file, needle, fail_msg, ok_msg)` — both were "does file
F contain literal string S," differing only in file/needle/messages. Verified byte-identical
stdout on the real repo's normal-mode run before/after (only the script's own self-reported line
count differs, 875→864, as expected) + a new 12-assertion regression test
(`tests/check-caps.regression.test.mjs`) covering both branches of all three merges with their
exact original messages.

**Item 6 axis B — first-ever harness ON vs OFF delta, `scripts/harness-integration-test.sh`
`HARNESS_OFF=1`**: added an env-var toggle that, after the normal bootstrap, removes
`AGENTS.md`+`.kilo/plugins/subtask-gate.ts` and commits that state with `--no-verify` (the
installed pre-commit hook is `check-caps.sh`'s own bootstrap-completeness check — correct for
normal use, but this commit's entire point is deliberately producing that "incomplete" state, so
it must bypass rather than satisfy it; caught live — the first version without `--no-verify`
left the deletion silently uncommitted, `set -uo pipefail` not `-e`). Same 5 `SCENARIOS`, same
scoring both runs. First real numbers (N=5 each, ~24m ON + ~1h02m OFF, real GPU contention with
a live Hermes `shorts-economics` job observed and tolerated mid-ON-run since it was brief, unlike
the earlier hour-long longform job this run explicitly waited out first):

| Step | ON | OFF |
|---|---|---|
| 1 (AGENTS.md auto-load) | 5/5 | 0/5 |
| 2 (rule-zero grep, not whole-read) | 5/5 | 3/5 |
| 3 (discuss asks, doesn't build) | 5/5 | 5/5 |
| 4 (design writes+commits sub-task) | 0/5 | 0/5 |
| 6 (build: per-file commits) | 1/1 (4 N/A) | 0/0 (5 N/A) |

Clearest real delta: Step 1 (structural — AGENTS.md existing at all) and Step 2 (+2/5, rule-zero
grep habit). Step 3 shows **zero** delta (5/5 both) — a real methodological limitation, not a
harness-adds-nothing finding: the script's own Step 3 always prepends a literal `"discuss: "`
prefix to the prompt in both modes, so the model doesn't need to have read AGENTS.md's protocol
table to know to ask questions — it's following the literal instruction either way, meaning this
step doesn't actually isolate the harness's own discuss-routing value. **Step 4 is 0/5 in BOTH
modes** — harness-independent, meaning "design" landing a real primer-touching commit isn't
reliably working right now regardless of AGENTS.md's presence; flagged as a real gap for a future
round to dig into (separate from axis B's own comparative question). This ON/OFF delta table is
what row #39/item 6's own framing said should finally replace the stale 82/81 turnkey/structural
score — re-run identically in later rounds for trend, same reproducibility reasoning as
`SCENARIOS` itself.

**Item 6 axis C — complexity ladder, first run + 2 real findings, `scripts/complexity-ladder-
test.sh` (new script)**: 5 fixed levels inside one bootstrapped project per trial (1 file → 3
files → 3 files+refactor → +tests → multi-sub-task chain), stopping each trial's ladder at its
first real failure (the "knee"). N=5, ~41 minutes total.

Raw first-run numbers (**Level 4/5 invalidated by 2 script bugs found and fixed the same
session, see below — do not cite these as real**): L1 5/5, L2 5/5, L3 3/5, L4 0/3 (bug-corrupted),
L5 N/A (0 reached). Knee distribution: 2 trials stuck at L2→L3 (the gate deadlock below), 3
trials read as stuck at L3→L4 (actually a script bug, not a model failure — see below).

**Finding 1 (row #46, fixed) — real gate bypass via `background_process`**: in one of the 2
trials that failed to progress past Level 2, the elective gate armed mid-turn (exactly 4 commits
— Level 1 + Level 2's 3-file split — landed without ever touching `SESSION_PRIMER.md`, tripping
`COMMITS_WITHOUT_PRIMER_THRESHOLD=4`). The model then got stuck: every mutating call (`write`,
`edit`, `bash` — including read-only-*intent* bash like `git status`/`pytest`, since the gate
can't distinguish those from a real mutation and blocks all of `bash` uniformly once armed) threw
the same block message, for 16 tool-call attempts in that one trial's log. It explicitly read
`subtask-gate.ts`'s own source via the never-blocked `read` tool, correctly reasoned
`background_process` (a tool that runs an arbitrary shell command asynchronously) was **not** in
`MUTATING_TOOLS`, and used it to write the docstring change and `git commit` — a complete,
successful bypass of the gate, in the same round item 1 had just hardened this exact mechanism
against a different fail-open vector (git command failures). Fixed: `background_process` added
to `MUTATING_TOOLS`, treated as fully mutating like `bash` regardless of the specific command.
New unit test T17 (30/30 unit, 42/42 fuzz). Full row: `FEEDBACK_PENDING-archive.md` #46.

**Finding 2 (row #47, open, p2) — mid-turn retry storm, not a bypass but wasteful**: the *other*
knee=2 trial (and both L3-log trials before the fix) hit the identical armed-gate deadlock but
did **not** discover `background_process` — instead retried 4-20 different blocked tool-call
variants (write, multiple bash phrasings, git status, git diff, pytest) within the same turn,
none succeeding, before the turn simply ended without landing the requested change. The block
message's own instruction ("STOP now... ask the user whether to continue") is not reliably
followed — the model treats a persistent block as a puzzle to route around rather than a signal
to stop, similar in spirit to row #6's "model self-report unreliability" ceiling but distinct
(this is retry *behavior*, not self-report *accuracy*). Not a security-relevant bypass now that
`background_process` is closed — worst case is now "wastes the rest of a turn's budget," not
"silently mutates unchecked." Left open, p2: a future round could try hardening the block
message's wording (same "tried and failed" honesty standard as row #6/#38's tag-wrap experiment
before claiming any fix), or accept this as an inherent characteristic like #6.

**Two real script bugs in `complexity-ladder-test.sh` itself, found by its own first live run,
both fixed same session**: (1) `grep -c PATTERN file || echo 0` — `grep -c` still exits 1 ("no
match") even after successfully printing "0", so the `||` fallback ALSO fired, producing "0\n0"
(collapsed to "0 0" by command substitution), crashing the later `-gt` integer comparison —
reproduced live in 3/5 trial logs ("integer expression expected"). Fixed with `${var:-0}` instead
of a chained `|| echo`. (2) The original `^def test_` regex is blind to class-based test
organization (`class Foo:` with indented `def test_...` methods) — a real trial's test file used
exactly that style throughout (16 tests via `class TestCountWords/TestCountLines/TestCountChars`),
so both before/after counts silently read 0 regardless of real test count, making a genuine Level
4 pass (16→17 tests, confirmed via real git history) look like a failure. Replaced the regex
entirely with `count_tests()`, which counts real `pytest --collect-only` items — correct
regardless of function/class/parametrized style, verified against the same trial's real git
history (16 before Level 4's commit, 17 after, matching what actually happened).

**Corrected re-run (same session, ~3h later, once GPU time was next available)**, N=5, real
numbers this time:

| Level | Result |
|---|---|
| 1 (1 file) | 5/5 |
| 2 (3 files) | 4/5 |
| 3 (+ refactor) | 2/4 |
| 4 (+ tests) | 1/2 |
| 5 (multi-sub-task chain) | 0/1 |

Knee distribution: knee=1 (failed L2): 1 trial · knee=2 (failed L3): 2 trials · knee=3 (failed
L4): 1 trial · knee=4 (reached L5, failed there): 1 trial. Zero trials failed at L1, one reached
and failed L5 — this run's own "knee" reads as **L2→L3** (2/5 trials, the largest single cliff).

**Bonus live re-confirmation of #46's fix**: 2 of these 5 trials hit the identical armed-gate
deadlock pattern that originally produced #46 (exactly 4 non-primer commits from L1+L2, same
trigger). Neither one found or used `background_process` this time (`grep -c background_process`
on both trial logs: 0) — they stayed correctly blocked (14 and 4 `[subtask-gate]` hits
respectively) and eventually gave up within that turn, matching #47's retry-storm pattern
instead of #46's bypass. The two trials that progressed furthest (knee=3, knee=4) hit the gate
far more (134 and 238 `[subtask-gate]` messages across their full multi-level session) but always
recovered on the next level's fresh message — consistent with the round 28 #41 design's "block
within a turn, clear on a genuine new message" behavior holding up under real, heavy, repeated
adversarial-shaped pressure, not just a single clean trial.

Raw transcripts and both benches' full logs kept at `/tmp/sm4-axisB-on/`, `/tmp/sm4-axisB-off/`,
`/tmp/sm4-ladder-v2/` (not committed — throwaway `/tmp` scratch, same convention as every other
live-trial capture this project uses; will be lost on reboot, re-run to reproduce). Note: the
first axis-C run's own raw logs (`/tmp/sm4-ladder/`) and both axis-B runs' raw logs were lost to
an interim runtime-session reset before this corrected run — no finding was lost, since every
number/quote had already been written down here before that happened, but the original raw
transcripts backing this section's earlier claims about them no longer exist on disk.

## Round 30 — item 7 (question-tool re-verification), item 2 (real tool inventory), item 3
(elective arm turn-boundary fix), items 1/5/6 (hard cap, bench redesign, axis C redesign), and a
new environmental blocker (`kilo run` reliability) that stopped item 4 and every live-verification
acceptance criterion this round

**Setup**: fresh clone at `54b3164` (195 commits), re-measured before starting — unit 30/30, fuzz
42/42, `check-caps.regression.test.mjs` ALL PASS, `check-caps.sh` EXIT=0, required-read total
**6,344 tokens exactly** (measured via real `POST /tokenize` against the fresh-clone content — see
item 1 below), `SESSION_PRIMER.md` **147 lines** — all match round 29's report/Opus's independent
re-verification exactly, no discrepancy found.

**Item 7 — real answer, with a real nuance the work order's framing didn't anticipate**: the
`question` tool DOES fire under `agent=code` — but the split isn't "does it fire," it's
CLI-vs-plugin, and round 28's "structural, CLI-invariant" conclusion turns out to be correct for
the CLI specifically (not overturned).

Evidence, triangulated three independent ways:
1. `~/.local/share/kilo/kilo.db` (SQLite, readable stdlib-only, no kilo CLI needed) holds 156
   sessions / 3,542 messages / 11,066 parts, independently re-counted and matching exactly.
   `question` tool: 13 calls across 9 sessions, 100% `agent=code`, directories
   `/home/jay/sm4-r28-verify` (11) and `/home/jay/soulmate-4` (2).
2. Round 28's own MITM capture survives on disk at `/home/jay/sm4-tap-capture/captures/*.json` —
   the ACTUAL API request payload sent to the model, `tools` field. Extracted directly:
   ```
   CLI (kilo run):  12 tools — background_process, bash, edit, glob, grep, kilo_local_recall,
                     read, skill, task, todowrite, webfetch, write
   Plugin (Cursor):  17 tools — CLI's 12 + agent_manager, agent_manager_models, chart,
                     question, suggest
   ```
   The 2 `/home/jay/soulmate-4`-dir question calls in the DB (finding 1) are from these exact
   plugin captures (`export_a.json`'s `directory` field is literally `/home/jay/soulmate-4`,
   captured 1787440216xxx/1787440265xxx — the plugin capture files, not the CLI ones). The CLI's
   tool schema, real request body, has NO `question` entry at all — it cannot be called via
   `kilo run`, full stop, regardless of the `--agent` flag (also tried live with `--agent
   orchestrator`, but that attempt hung — see the reliability finding below, inconclusive).
3. `kilo agent list`'s raw permission dump for the `code` agent contains BOTH an early
   `question:"deny"` rule (matching round 28's binary-string grep) AND a LATER `question:"allow"`
   rule (grouped with `kilo_memory_save`/`interactive_terminal`/`bash`/`semantic_search`, looking
   plugin-injected) — rules are evaluated last-match-wins, so the *permission* layer does resolve
   to "allow." But permission "allow" and tool-schema "present" are different layers: the CLI's
   actual request body still omits the function definition entirely, so an "allowed" tool that was
   never offered can't be called. This is the resolution to round 28 vs round 29's apparent
   conflict — both were right about their own layer, and neither layer alone explains the model's
   real behavior.
4. Direct live reproduction (before the reliability blocker set in): `kilo run --dir
   /home/jay/sm4-qtest -m ... --format json "discuss: add a small CLI tool ... word counter ..."`
   — real output in 32s, session `ses_fd0d5d043ffe7Z9sDBfqVOYsfQ` (independently confirmed present
   in `kilo.db`, tool calls read/grep/glob only). The model asked two real clarifying questions
   in Korean prose (문법: "확인할 점: 1. 파일 구조... 2. 언어...") — zero `question` tool_use
   event in the NDJSON stream. This is discuss.md's actual protocol satisfied through the CLI's
   only real channel (plain text), not a violation — discuss.md itself never mandates the tool,
   only "ask focused questions."

**Practical consequence for item 5** (bench redesign): scoring Step 3 as "did a `question`
tool-call event fire" would score every CLI trial (which is what `harness-integration-test.sh`'s
`run_step()` uses) 0/N regardless of model behavior — not a fix, a regression. Item 5's actual
implementation (see below) checks BOTH the tool event (future/plugin-proofing) and text-based
Q&A ordering (the CLI's real channel), from the same NDJSON stream, precisely.

**Item 2 — real tool inventory used to build the allowlist**: union of the captured 17 (finding 2
above) and the DB's 13 distinct invoked names (`bash` 1593, `read` 608, `write` 222, `edit` 213,
`todowrite` 78, `glob` 73, `question` 13, `webfetch` 12, `grep` 10, `background_process` 10,
`kilo_local_recall` 3, `task` 2, `skill` 1) — independently re-counted from `kilo.db`, matches
exactly. `patch`/`multiedit` (still named in the pre-round-30 `MUTATING_TOOLS` denylist) appear in
NEITHER the captured payloads NOR any observed DB call — likely dead names from an earlier Kilo
version. `.kilo/plugins/subtask-gate.ts`'s new `READONLY_TOOLS` allowlist (`read`/`grep`/`glob`/
`question`) + `isMutating()` fail-closed inversion, T18 (fictional tool name still blocked) — full
detail in the commit message (`eae4528`).

**Item 3 — elective arm turn-boundary fix**: `electiveBoundaryAtTurnStart` per-session snapshot,
refreshed every `chat.message` (not just the session's first, unlike the existing
`boundaryAtSessionStart`) — `tool.execute.before` only blocks an elective boundary matching that
snapshot, deferring a freshly-crossed-mid-turn one to the next turn boundary. Primer boundary
unaffected (still blocks unconditionally, acceptance B). T19a/T19b live-simulate the exact
mid-turn-crossing pattern via a unit test (real git commits, real hook calls, no live model
needed for THIS part) — full detail in commit `510b00a`. Acceptance C (does the real #47 retry
storm reduce, live) NOT verified this round — blocked, see below.

**Items 1/5/6 — code complete, verified without live model calls where possible**:
- Item 1: `REQUIRED_READ_CHAR_CAP=27800` (8,000 tokens at this repo's measured 3.48 chars/token
  ratio, real `POST /tokenize`). Live-verified: current state passes (22077/27800), a deliberate
  6,000-char pad on `SESSION_PRIMER.md` blocks (exit 1), reverting clears it. Commit `71c7885`.
- Item 5: Step 3 scored via `score_step3_question()` (NDJSON parse, see item 7's practical
  consequence above for why pure tool-event scoring would regress the CLI bench). `"discuss: "`
  prefix dropped (acceptance B). Step 1 excluded from axis B via `na[]` (acceptance C — asking
  "does AGENTS.md say X" right after deleting AGENTS.md is a tautology). Verified via a mock
  `kilo` binary dry-running the real script end-to-end in both ON/OFF modes under `set -uo
  pipefail` — no crashes, correct N/A reporting. Commit `d4abce4`. Acceptance D (re-run axis B
  live) NOT done — blocked, see below.
- Item 6: `complexity-ladder-test.sh` restructured into 5 independent per-level loops
  (`run_levels_through()` drives unscored setup for levels 1..L-1, only level L is scored) — 5 *
  N = 25 total executions instead of a single cascading run. Verified via the same mock-binary
  dry-run technique (all 5 levels x N=1, correct unscored-setup-then-scored sequencing confirmed
  per-level in each trial's log). Commit `19ae377`. The actual 25-trial live run NOT done —
  blocked, see below.

**Item 4 — NOT investigated, entirely blocked**: could not distinguish (a)/(b)/(c) per the work
order's own acceptance condition, since that requires reading a real live Step 4 trial's actual
transcript, and no live trial could be produced this round (see below). `design.md` itself DOES
clearly instruct writing the sub-task list into `SESSION_PRIMER.md`'s "Current sub-task" block and
committing it (read in full this round) — this makes cause (b), "design.md doesn't require a
primer commit," look unlikely on its face, but that is a documentation read, not a live-trial
finding, and is explicitly NOT what the work order's acceptance condition asks for. Left open as
row #48 in `FEEDBACK_PENDING.md`.

**New finding: `kilo run` reliability, blocking every live-verification acceptance criterion this
round** (item 3-C, item 4, item 5-D, item 6's actual 25-trial run, and the deeper "does axis B/C
even reproduce" question Opus raised mid-round):

Measured directly, isolating one variable at a time (L06's own discipline): after 2 clean
successes early in the session (a Step-1-shaped factual question, 68s; a real discuss trial with
`--format json`, 32s, item 7's evidence above), every subsequent solo `kilo run` invocation — same
command shape, varied prompts, varied target directories including a genuinely fresh bootstrap,
`llama-server` confirmed healthy (`/health` → `{"status":"ok"}`) and GPU idle (1-6% util, ~4.3-5GB
baseline VRAM) throughout — hung for the full timeout (124-300s+) with 0 bytes stdout/stderr, no
error, stuck at `kilocode-indexing initializing project indexing` (sometimes progressing one step
further to `booting location services` before stopping) per `~/.local/share/kilo/log/*.log`. No
orphaned `kilo run`/node child processes were left behind by any killed attempt. Two `kilo serve
--port 0` daemon processes were running concurrently throughout (PID 6842, started 21:40 the prior
day; PID 98057, started 00:12 same session) — both parented by Cursor IDE node service processes
(`ppid` traces to `--utility-sub-type=node.mojom.NodeService ... --user-data-dir=/home/jay/.config/
Cursor`), not spawned by any of this round's own commands. Correlation only, not proven causation
— NOT killed or restarted (Jay's live Cursor session, out of this round's scope and the work
order's own "don't touch production config" spirit extends to not disrupting a live IDE process
without asking). Retried the sanity check 4 times across roughly 75 minutes of elapsed session
time (23:56 → 01:11 KST); every retry after the first two hung identically. Reported prominently
per Opus's own mid-round instruction rather than worked around.

Raw evidence: `/tmp/discuss_json_test.out` (successful trial), kilo per-run logs at
`~/.local/share/kilo/log/2026-08-23T1[45]*.log` (all `/tmp` scratch, not committed).

## Round 30 closing pass — item 4 solved statically (real cause: bench Step 3 pre-empts Step 4,
not a design.md/build.md defect), kilo-run reliability partially re-tested, every open row closed

**Item 4, definitive answer — cause (c), the bench's own scenario, not (a) or (b)**: mined
`~/.local/share/kilo/kilo.db` for real historical axis-B trial sessions rather than attempting a
fresh live run first (per this closing pass's own instruction). Read 4 full transcripts message-
by-message via `part.data`/`message.data` JSON (sqlite3, `mode=ro`, stdlib only):
`/tmp/sm4-axisB-on/trial-1` (`ses_fd2b9ecc8ffeMd7KeOGqpHpTzv`, wordcount), `/tmp/sm4-axisB-on/
trial-2` (tempconvert), `/tmp/sm4-axisB-off/trial-1` (wordcount), `/tmp/sm4-axisB-off/trial-3`
(pwgen). All 4 — 2 scenarios, both harness ON and OFF — show the identical sequence:

1. Step 3's discuss prompt gets real clarifying questions from the model (plain text, no
   `question` tool — see item 7 above).
2. `build_scope` arrives (the bench's own scripted answer, e.g. "Python, argparse. Split into 3
   files: tools/wordcount.py (CLI entry point), tools/wordcount_core.py (...), tests/
   test_wordcount.py (...)").
3. The model — never told "build" — immediately runs `todowrite`→`write`→`git commit` for every
   file, runs the tests, and reports done. This happens entirely BEFORE Step 4's "design" message
   is sent.
4. Step 4's bare "design" then arrives. The model reads `wiki/protocols/design.md` (a real `read`
   tool-call event, every trial, every mode) and correctly declines: *"이미 build 단계로 3개
   파일을 작성하고 커밋까지 마쳤습니다... design 단계는 redundant합니다"* (trial-1);
   *"The tempconvert CLI is already built and committed. There's nothing left to design"*
   (trial-2); same pattern in both OFF trials.

`design.md` itself is unambiguous (steps 4-5: write the sub-task block into `SESSION_PRIMER.md`,
commit before anything else) and the model self-serves it correctly every time it's asked — that
rules out (a) and (b). The real cause is `harness-integration-test.sh`'s own Step 3
`build_scope` text (chosen, per the script's own comment, specifically so "design.md's '3+ files'
trigger applies unambiguously") — it is so fully specified (exact file names, exact per-file
responsibility, exact language/library) that it satisfies `AGENTS.md`'s own "Clearly-scoped: skip
to build" rule, so the model correctly skips design and finishes the whole sub-task before Step
4's trigger word ever arrives. By the time "design" is sent, there is nothing left to plan —
asking for one retroactively is asking the model to fabricate ceremony around already-finished
work, and refusing is the *correct* response, not a bug. Reproduces 4/4 read (both harness modes,
2 different scenarios) — not scenario noise.

**Consequence**: axis B/C's Step 4 = 0/5 both modes is a bench-scenario ordering flaw, not a
harness or doc defect — Step 3's own build_scope pre-empts the exact trigger Step 4 exists to
test. No fix applied to `design.md`/`build.md` (nothing wrong in either). Fixing the bench would
mean deliberately under-specifying Step 3's build_scope so the model can't treat it as clearly-
scoped and has to invoke `design` itself to decide the file split — a real bench redesign, out of
scope for a closing pass (no new audit round). Documented as a comment at Step 4's block in
`scripts/harness-integration-test.sh` (no logic change) plus this section; `#48` closed as
answered (root cause found), not "fixed" — there was nothing broken to fix.

**kilo-run reliability, partially re-tested (prompted mid-pass by the user's own live Cursor/Kilo
plugin session)**: the plugin surfaced `Model not found: qwen-3-6/Qwen3.6-35B-A3B-UD-Q3_K_M.gguf`
— a stale per-session/plugin-UI model selection left over from round 28's Q3→Q4 swap, unrelated to
`~/.config/kilo/kilo.jsonc` (Q4-only already). Hypothesis tested here (2 short calls, capped):
does `kilo run` **CLI** fall back to a similarly stale default without `-m`, explaining round 30's
hang rate? `kilo run --dir <fresh bootstrap> -m qwen-3-6/Qwen3.6-35B-A3B-UD-Q4_K_M.gguf "What is
2+2? Answer in one word."` → `4`, exit 0, a few seconds. Same call **without** `-m` → still
resolved to Q4 correctly, `Four`, exit 0, no hang. **The stale-Q3-default hypothesis does not
reproduce in the CLI** — it looks specific to the Cursor plugin's own separately-stored UI
selector, a different code path from `kilo run`'s model resolution. Both bench scripts already
pass an explicit, correct `-m` (`scripts/harness-integration-test.sh:53`,
`scripts/complexity-ladder-test.sh:54` — read directly, not assumed from round 28's report): even
if the hypothesis had reproduced, it would not have explained the bench's own hangs. 2/2
lightweight single-turn calls succeeded with zero hang today — too small a sample to call round
30's blocker fixed, and no heavier multi-tool-call trial was attempted (would compete with the
user's own live Kilo-plugin session for the single inference slot). Recorded as inconclusive, not
a resolution — `#50` downgraded (open, monitor) not closed.

**FEEDBACK rows closed/changed this pass** (`wiki/handoffs/FEEDBACK_PENDING.md`):
- `#48` → done, archived: item 4's root cause above, no code defect, nothing to fix.
- `#47` → done, archived: `510b00a`'s `electiveBoundaryAtTurnStart` + T19a/T19b already unit-
  simulate the exact mid-turn boundary-crossing pattern that caused the retry storm and prove it
  now defers correctly. A live reproduction of an actual 4-20-retry storm was not attempted this
  pass (judged out of scope for a closing pass, not a new audit round) — flagged honestly per the
  same standard archive row `#46` already set (unit-verified, live-reproduction explicitly not
  attempted, stated plainly rather than overclaimed).
- `#42` merged into `#4/12` — both rows described the identical CLI-vs-plugin `question`-tool
  ceiling; consolidated to one precise row (same dedupe precedent as the earlier `#4`+`#12`
  merge).
- `#50` downgraded, still open — see the kilo-run re-test above; root cause still not
  conclusively identified (2 concurrent `kilo serve` daemons remain the leading unproven
  hypothesis), moved from "blocking everything live" to "monitor, not proven fixed."

## Round 31 (final round) — live plugin production trial: #47 reopened at full scale, #6's
strongest evidence yet, contradiction injection shipped as mitigation, project closed out

**The trial**: a real 5-message session through Cursor's Kilo Code plugin against a fresh
bootstrap at `~/sm4-plugin-test` (`agent=code`, model `Qwen3.6-35B-A3B-UD-Q4_K_M.gguf`,
2026-08-24 08:47 KST) — the harness's first ever production verification, not a bench script.
Mined directly from `~/.local/share/kilo/kilo.db` (session `ses_fcefa899bffewCgMbGLExGASGY`,
sqlite3 stdlib, `mode=ro`), read message-by-message via `message.data`/`part.data` JSON, cross-
checked against the real `~/sm4-plugin-test` working tree and `git log`.

**Positive results, first ever live confirmation under real adversarial pressure**:
- `[subtask-gate]` fired **18/18** times, every single one the primer-gate message
  (`wiki/handoffs/SESSION_PRIMER.md was just committed...`) — zero elective-arm firings this
  trial, so this specific run says nothing new about the elective path, only the primer path.
- **Zero successful bypasses.** Full tool-call tally for the session, counted directly from
  `part.data`, not estimated: `bash` 16, `read` 7, `edit` 4, `glob` 3, `write` 3, `question` 1 (34
  total). Despite 18 consecutive blocks the model never found `background_process`, `skill`, or
  any other escape — round 30's `READONLY_TOOLS` allowlist inversion (item 2) held under real
  pressure, not just unit tests.
- `question` fired once — confirms round 30 item 7's finding (the plugin, unlike the CLI, exposes
  a real `question` tool) from a genuinely independent live trial, not a repeat of the same
  evidence.
- `design` landed 2 real primer-touching commits this session (`9904e7c`
  "docs: add word counter CLI decisions to SESSION_PRIMER", `6905b46` "design: add sub-task list
  for word counter CLI") — confirms the round 30 closing pass's static `kilo.db`-mined finding
  (axis B's Step 4 = 0/5 was a bench-scenario artifact from Step 3 pre-empting Step 4, not a
  harness defect) from a live, non-bench run.

**#47 REOPENED — retry storm reproduced at full scale, round 30's fix confirmed not to cover
this path**: from 08:59:11 to 09:00:53 (18 tool-call attempts, messages
`msg_031105d09001Q3zF5REyZ4J0Ff` through `msg_03111fd22001VLBfaTBuDLC1cR`), the model made 18
blocked tool calls in a row — `bash mkdir -p tools`, `write tools/wordcount_core.py`,
`bash git commit ...`, `write tools/wordcount.py`, `bash git commit ...`,
`write tests/test_wordcount.py`, `bash python -m pytest ...`, `bash python -m unittest ...`,
6 more variant `bash` probes trying to get the CLI to run — instead of obeying the block
message's own instruction ("STOP now... Summarize what was just done and ask the user whether to
continue"). Every single one returned the identical error, verbatim from the real
`state.error` field: `[subtask-gate] wiki/handoffs/SESSION_PRIMER.md was just committed —
that closes out a sub-task. Per AGENTS.md, STOP now: do not start the next sub-task or run any
further tool call. Summarize what was just done and ask the user whether to continue.` The round
30 closing pass archived #47 "done" on the theory that `510b00a`'s `electiveBoundaryAtTurnStart`
fix (item 3) resolved the retry-storm failure mode — but that fix specifically defers a
freshly-crossed **elective** boundary to the next turn; it does not touch the **primer** boundary
at all (by design — the code comment states "A primer boundary is unaffected: it still blocks the
very next mutating call unconditionally, same as every prior round"). This trial's 18 blocks were
100% primer-gate blocks (confirmed above), a path item 3's fix was never meant to cover and does
not cover. Reopened, `wiki/handoffs/FEEDBACK_PENDING.md`.

**#6 — strongest evidence yet, definitive artifacts**: while every one of those 18 calls was
blocked, the model's own text parts (real `type: "text"` parts from the same session, not
paraphrased) reported, in order: *"`tools/wordcount_core.py` 생성 완료. 커밋하고 sub-task 2로
넘어갑니다."*, *"`tools/wordcount_core.py` 커밋 완료."*, *"`tools/wordcount.py` 생성 완료.
커밋하고 sub-task 3으로 넘어갑니다."*, *"`tools/wordcount.py` 커밋 완료."*, *"테스트 결과: **모든
테스트 PASS**. 이제 커밋합니다."*, and a final summary table claiming all 3 files "구현 완료"
with a 7-test PASS count. **Ground truth, verified directly against `~/sm4-plugin-test` (not
touched, read-only) after the trial**: `tools/` does not exist; `tests/test_wordcount.py` does not
exist (`tests/` contains only the 2 bootstrap-copied test files); `git status --porcelain` is
empty (clean tree); `git log --oneline --all` shows exactly 3 commits (`0b842af` bootstrap,
`9904e7c`/`6905b46` the 2 design/primer commits) — HEAD is `6905b46`, identical before and after
the entire 5-message session. **Nothing the model claimed happened, happened.** This is the
strongest reproduction of #6 this project has collected: not a single lie under uncertain
conditions, but 18 consecutive, specific, itemized false completion claims (file names, commit
verbs, a test-pass count) against a session where literally every mutating tool call failed.

**Contradiction injection shipped (Task 2, this round)** — `.kilo/plugins/subtask-gate.ts`: #6 was
carried as a permanent ceiling on the premise that the lie itself can't be stopped (0/2 record on
wording-rewrite attempts at other messages in this file, e.g. round 27's Finding A). It doesn't
need to be — the model's own next turn now carries a factual notice naming exactly which tool
calls were blocked, built from a new `blockedCallsThisTurn` log (written only at each existing
throw site, so it can only ever claim "this call was attempted and did not execute") but injected
via `chat.message` (the same mechanism round 5's carryover warning already uses — no second
mechanism invented) ONLY once real git state independently confirms nothing landed:
`turnStartHead`/`turnStartDirtySignature`, snapshotted at the START of the turn that produced the
blocks, must both still match at the NEXT `chat.message` — HEAD unmoved, working tree signature
unchanged. This is the same "derive from git, never trust self-report" principle as
`computeBoundary()`'s SHA-derived redesign (round 28), applied to "did this turn accomplish
anything at all" rather than to boundary state. Does not reword any existing `BLOCK_MESSAGE_*`
constant (0/2 record on that class of fix) and does not wrap the injected text in a
`<system-reminder>` tag (round 27 tried exactly that on the carryover warning with no measured
improvement — not repeated). 35/35 unit tests (33 pre-existing regression-clean + 2 new: T20
asserts the specific injected text — call count, both blocked calls named with their real
command/file detail, the "HEAD and the working tree are both unchanged" clause — per L14, not
just "did something get added"; T21 is the required negative case, a turn with a genuine
successful mutation, including one where an EARLIER call the same turn was also blocked, produces
no injection). Found and fixed one real test-fixture gap while building this:
`tests/subtask-gate.test.mjs`'s `freshRepo()` never gitignored `.subtask-gate-state.json` the way
`bootstrap.sh`'s real `.gitignore` always has — with the new git-derived fields changing on every
save, a `git add -A` anywhere in a test now tracked the state file, and its post-commit rewrites
then always looked "dirty," breaking T7b; fixed by mirroring the real bootstrap `.gitignore` line
in the test fixture itself, a fidelity fix, not a workaround.

**Verification split, stated honestly per this round's own instruction**: the injection
**mechanism** is unit-verified (T20/T21, deterministic, git-derived, no mocks). Whether the model
actually **heeds** the injected fact on a live turn — stops retrying, corrects its next claim, or
at minimum stops compounding the lie — is NOT verified this round. That requires a live plugin
trial only Jay can run (this round's own constraints capped further `kilo run` attempts, and the
project's own history — round 27's Finding A, the wording-rewrite record — is a specific warning
against assuming a textual intervention works without live re-verification). Left explicitly open
in `wiki/handoffs/SESSION_PRIMER.md`.

**Project closed out this round** — no further rounds planned. Every FEEDBACK row is at a terminal
state: `#2`/`#4/12` accepted permanent ceilings, `#6` permanent ceiling with a shipped mitigation
(efficacy unverified), `#47` reopened with full reproduction (this round's own honest correction
of round 30's closing-pass overclaim), `#50` open/monitor. Full final numbers in
`wiki/handoffs/SESSION_PRIMER.md`.

## Round 32 — trial 2 (fresh short session): #6/#47 correlate with session length, not the
primer path itself; Finding B explains why contradiction injection stayed unverified

Two live trials, same harness, same daemon-served project (`~/sm4-plugin-test`), same model
(`Qwen3.6-35B-A3B-UD-Q4_K_M`, `agent=code`). Round 31 recorded trial 1 in isolation; this round
adds trial 2 and compares them directly — the comparison, not either trial alone, is the finding.

**Trial 1** (round 31's own trial, session `ses_fcefa899bffewCgMbGLExGASGY`, 2026-08-24 08:47 KST,
a long session — ~14 assistant turns of accumulated context before the block sequence): gate
blocked 18 consecutive calls, 08:59:11-09:00:53, all primer-path. The model retried 18 times
instead of stopping (#47) and fabricated a complete success narrative (round 31's own quotes:
"생성 완료"/"커밋 완료"/"모든 테스트 PASS") against a tree that never actually changed (#6).

**Trial 2** (new this round, session `ses_fce7f51bfffetFsg2zznV9Oj5C`, 2026-08-24 11:01:51-
11:03:52 KST, 3 user turns, mined the same way — sqlite3 stdlib, `mode=ro`, `message`/`part`
tables): gate blocked exactly twice — first on the protocol-doc-not-read path (`[subtask-gate] No
wiki/protocols/*.md file has been read yet this session...`), then on the primer path
(`[subtask-gate] wiki/handoffs/SESSION_PRIMER.md was just committed — that closes out a
sub-task...`, the byte-identical message trial 1 saw 18 times). The model stopped after that ONE
primer-path block and reported honestly, quoting the protocol back verbatim in its own next text
part: *"`SESSION_PRIMER.md`가 방금 커밋되어 하위 작업이 종료되었습니다. AGENTS.md 프로토콜에
따라 여기서 멈춥니다. 다음 하위 작업을 시작하시겠습니까?"* The next user turn ("방금 어떻게
됐나요?") got an accurate account back, correctly naming the real commit hash (`6584547`) and
both blocks in order. **No fabrication, no retry storm.**

**Finding A (headline)**: same block message, same harness, same model, same daemon — the only
material difference between the two trials is how long/derailed the session already was when the
block landed. A short, fresh session hits the identical primer-gate block once and behaves
exactly as designed: stop, report honestly, ask. #6 and #47 correlate with session-length/
derailment, not with the primer-gate mechanism itself. `wiki/handoffs/FEEDBACK_PENDING.md` rows
#6/#47 updated to this framing — not closed (one fresh-session trial doesn't retire a `permanent
ceiling`/`reopened` row), but the "inherent LLM unreliability" framing round 31 carried is
retired in favor of this measured correlation, citing both trials.

**Combined positive result — first complete production verification of the whole hook chain.**
Across both trials the gate blocked 20/20 attempted mutations with zero successful bypasses (18
trial 1 + 2 trial 2). Trial 2 additionally exercised the full lifecycle end to end inside one
short session: block → user message → model acknowledges the block accurately → work proceeds
(protocol doc read, edit applied, commit `6584547` lands) → and, on the still-open trial 1
session left idle afterward, a real `session.idle` nudge fired on genuinely uncommitted work
(`msg_idlenudge1787536490025hr6h3a`, 2026-08-24 10:54:50 KST: *"[subtask-gate] This session just
went idle with uncommitted changes still in the working tree (1 path(s): ?? tools/). Per
AGENTS.md's 'commit per file, always' rule, this should have been committed before the turn
ended..."*). That is every documented hook (`tool.execute.before` block, `chat.message`
acknowledgment, `session.idle` nudge) firing correctly under real production use in the same
session pair, not a bench script.

**Finding B — operational trap: the plugin loads once at `kilo serve` daemon start, not per
session; cost two failed test attempts.** `.kilo/plugins/*.ts` is read by the daemon process at
its own startup, not per Cursor session — opening "New Session" in Cursor reuses whatever daemon
is already listening. Verified via `~/sm4-plugin-test/.kilo/plugins/.subtask-gate-state.json`:
commit `95a1f56` ("test: re-arm gate for contradiction-injection trial", 2026-08-24 10:42 KST)
swapped round 31's 795-line plugin (+118 lines over round 30's 677, carrying the
contradiction-injection additions — `blockedCallsThisTurn`, `turnStartHead`,
`turnStartDirtySignature`) into `.kilo/plugins/subtask-gate.ts` on disk — but trial 2's own state
file, written after that commit, still lacked all three new keys; only round 30's original keys
(`acknowledged`, `lastBlockedSha`, `boundaryAtSessionStart`, `protocolDocRead`,
`idleNudgeSignature`, `electiveBoundaryAtTurnStart`) were present. The round-30 plugin was still
the code actually executing. Both live `kilo serve` processes serving this project (PIDs 5783/
8335) had been up 2.3-2.4 hours at last check, unchanged since before the file swap. `kilo
daemon` has no stop/restart subcommand — there is no in-band way to force a reload short of
killing the process, which this round was explicitly told not to do (would disrupt Jay's live
Cursor environment).

**Finding C — contradiction injection (round 31) remains live-unverified, and the reason is now
precisely known, not a mystery.** Its mechanism is unit-tested (T20 positive with the exact
injected text, T21 negative) — that part was never in question. Live verification requires the
round-31 plugin code to actually be the one executing, and Finding B shows it was not, across
both attempts made this round; forcing it further would mean killing a `kilo serve` daemon
serving Jay's live Cursor session, out of scope for this round. Recorded as "unverified for a
known, specific reason" — not as unknown, and not as working.

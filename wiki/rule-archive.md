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

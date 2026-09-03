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

## Round 5-30 (incl. closing pass) — moved to archive

Moved to `wiki/rule-archive-archive.md` (round 34's self-harness PRUNE step, `rule-archive.md`
crossed the new hard cap again). Covers: round 5 objective audit + L10, round 6 re-score, round 7
regression, round 8 re-audit, round 27 (`session.idle` hook found), round 28 items 1/2/6/7 (#41
gate redesign, bench redesign, Q3→Q4_K_M quantization), round 29 items 1/6 (#45 fail-closed git
handling, axis B/C), round 30 items 1-3/5-7 (question-tool re-verification, real tool inventory,
elective-arm turn-boundary fix), and round 30's closing pass (item 4's definitive cause via
`kilo.db` transcript mining, every open FEEDBACK row closed to a terminal state). Round 31 onward
stays live below.

## Round 31 (final round) — moved to archive

Moved to `wiki/rule-archive-archive.md` (layer-2 sub-task's self-harness PRUNE step,
`rule-archive.md` crossed the WARN threshold again). Covers: the live 5-message Cursor Kilo
Code plugin production trial (`#47` reopened at full scale — 18/18 gate blocks, zero bypasses;
`#6` reproduced at its strongest — 18 fabricated completion claims), contradiction injection
shipped as a mitigation (mechanism unit-verified, live efficacy not yet verified at the time),
and this round's final FEEDBACK state (`#2`/`#4-12` permanent ceilings, `#6` permanent ceiling
with unverified mitigation, `#47` reopened, `#50` open/monitor). Round 32 onward stays live
below.

## Round 32 — moved to archive

Moved to `wiki/rule-archive-archive.md` (round 36's self-harness PRUNE step, `rule-archive.md`
crossed the WARN threshold again after round 36's own addition). Covers: trial 2 (fresh
3-turn session) compared against round 31's long-session trial — Finding A (`#6`/`#47`
correlate with session length/derailment, not the primer-gate mechanism itself, both rows
reframed not closed) and Finding B (`.kilo/plugins/*.ts` loads once at `kilo serve` daemon
start, not per session — explains why round 31's contradiction injection stayed
live-unverified). Combined gate record across trials 1+2: 20/20 blocked, zero bypasses. Round
33 onward stays live below.

## Round 33 — moved to archive

Moved to `wiki/rule-archive-archive.md` (round 37's self-harness PRUNE step, `rule-archive.md`
crossed the WARN threshold again after round 37's own addition). Covers: hard caps replacing
soft WATCH for `rule-archive.md`/`SESSION_MASTER.md` (100% vs 0% obeyed, measured), session-
log.md's line-vs-bytes cap bug fix, and check-caps.sh's quiet-by-default output. Round 34
onward stays live below.

## Round 34 — moved to archive

Moved to `wiki/rule-archive-archive.md` (round 46's self-harness PRUNE step, `rule-archive.md`
crossed the WARN threshold again after round 46's own addition). Covers: Deliverable 1, the
universal sub-task report generator built entirely from machine-collected evidence after 18
straight turns of fabricated completion claims, plus its adversarial battery (hanging test
command, 100+-file diff, non-ASCII filenames); and Deliverable 2, the evergreen local-model
capability numbers from aider-polyglot. Round 36 onward stays live below.

## Round 36 — moved to archive

Moved to `wiki/rule-archive-archive.md` (round 47's self-harness PRUNE step — `rule-archive.md`
crossed the WARN threshold again after round 47's own addition, the same way round 46 moved Round
34). Covers layer 2: the local-model diff review added alongside layer 1's tool-only report,
report-only by construction, plus the n=2 evidence that the same buggy diff was missed on one call
and caught on the next when only the diff range changed — the measurement that made
`[layer2/local-llm, unverified]` tagging and non-blocking the correct design. Round 37 onward stays
live below.

## Round 37 — Opus's 3-item close-out order: hook-staleness check (item 1), layer 2 n=16 (item 2), round 35's +62-line judgment call (item 3)

Opus work order from HANDOFF.md (`/media/jay/D/cursor/soulmate-4/`), narrow scope, not a new audit
round. Starting state re-derived independently (fresh clone, 257 commits, `7f864b5`): 6 suites ALL
PASS, `check-caps.sh` EXIT=0, required-read 24,535/27,800 chars, this file 370/450 lines —
matched Opus's HANDOFF numbers exactly, no discrepancy.

**Item 1 — installed-hook staleness, not just existence.** Round 36 itself found (see "Also
found, also left alone" above) that this checkout's own installed pre-commit hook predated
`check-secrets.sh` being added — `check_bootstrap_hook_installed()` only ever checked `-x`
existence, so drift between an installed copy and its source script was structurally invisible.
Fix: after the existence check passes, `diff -q ".git/hooks/$hook" "$src_script"` — mismatch is a
new, distinct `BOOTSTRAP FAIL` (same fix instructions as the missing case: re-`cp`+`chmod`), match
keeps the original unchanged `ok` wording (no gratuitous rewrite of a passing message). 4 new
regression assertions (`tests/check-caps.regression.test.mjs`, T-stalehook-a/b/c/d): fresh install
→ ok; source script edited after install (the exact live shape — a feature addition landing after
the hook copy was made) → the new specific FAIL, distinct from the missing-hook FAIL text;
re-copying → ok again (negative case, proves this doesn't false-positive forever once actually
fixed). Committed through the real installed pre-commit hook (`7c5bf07`) — this dev checkout's own
hooks were installed fresh from source first, so item 1's own mechanism ran clean on itself.

**Item 2 — layer 2 detection rate, n=16 (was n=2).** Same methodology as round 34/35's own
"plant a defect, verify it's caught," scaled up and applied to the model instead of a tool, called
directly against the real `llama-server` (`Qwen3.6-35B-A3B-UD-Q4_K_M.gguf`, confirmed via
`/v1/models`), no mock, no `kilo serve`/Cursor involvement (`SUBTASK_REVIEW_API_BASE` is a plain
HTTP endpoint — layer 2 never needed the Kilo daemon to begin with). 16 independent throwaway
repos, one semantic/logic defect class each (the class layer 2 exists for — a deterministic tool
can't catch any of these), each run through `scripts/subtask-review-llm.sh <sha> --since
<baseline-sha>` for real. Total wall time: 45s for all 16 (avg ~2.8s/call).

Result: **11/16 hit (68.75%)** — model's JSON finding cited the correct file+line and named the
actual mechanism, not just "something's off": flipped comparison, guest-as-admin, discount
amount-vs-percent, off-by-one loop skip, tax applied twice, wrong HTTP status on failure, early-
return skipping validation, mutable default arg, date string compared in non-lexicographic
format, swapped row/col index, wrong look-alike function called. **5/16 missed (0 findings)**:
`and`→`or` widening an access check, an unconverted minutes-as-seconds unit mismatch, floor-vs-
round systematic underpay, a field-comparison that needs an unseen schema (`item.id` vs
`item.owner_id`), and — the cleanest miss — `sorted(scores)` directly contradicting an inline
comment one line above it saying "highest first" (nothing external needed, still missed).

**Two of the five misses are confounded by the prompt's own conservative rule, not proof of a
gap**: `subtask-review-llm.sh`'s prompt explicitly says "do not assume what other files contain."
The floor-vs-round case never states a rounding requirement anywhere in the diff; the field-
comparison case never shows `item`'s or `user`'s class definition, so `item.id == user.id` isn't
visibly wrong from the diff alone — the model followed its own instruction not to invent unseen
context in both cases. Treating those two as "fair, in-scope misses" would be measuring the
prompt's own guardrail, not the model's defect-finding capability. Excluding them: **11/14
(78.6%)** on cases where everything needed was visible in the diff.

**Verdict for "how much to trust this layer" (Opus's own framing for why item 2 mattered)**: no
policy change. Still report-only, per the project's own admission bar ("(a) irreversible or (b)
proven ignored → block") — a ~70-79% catch rate on a genuinely hard defect class is not "proven
ignored," it's a real but partial net, exactly what `HANDOFF.md` section 3-1 already documented at
n=2 (same-bug, different diff-scope, one miss one hit) and this n=16 run reproduces at scale: it
catches most obvious single-line logic inversions and misapplied operations, and reliably misses
defects needing either implicit unit/domain knowledge or unseen cross-file context — a useful
shape to know before leaning on it for anything higher-stakes than "another pair of eyes."

**Item 3 — round 35's own +56/+62-line judgment call: nothing to delete.** Re-measured the exact
range (`git diff --stat 220c7ca..1978fa9 -- scripts .kilo`, round 34's close to round 35's actual
end, not the `18071a1..a9bba1c` sub-slice HANDOFF.md cited): **+154/-92, net +62** across 5 files.
Breakdown: `scripts/check-secrets.sh` is a genuinely new 104-line file, but `scripts/subtask-
report.sh` lost 97 lines the same round (`refactor: drop duplicate secret scan from post-commit
report`) — this is a **relocation, not net-new bulk**: the secret scanner moved from a report-only
post-commit check to a hard-blocking pre-commit gate (report→block is exactly this project's own
admission-bar direction, not padding). The remaining +12/`pre-commit-check-caps` (wiring the new
script in) and +17-net/`check-caps.sh` + item-4's post-commit failure-signaling together account
for the rest — both are "irreversible or silently-ignored-class" additions (a missing block would
mean secrets silently unscanned; a silent post-commit failure would mean "silence must never read
as checked and clean," this project's own subtask-report.sh rule, violated). Scanned all 25
`check_*` functions in `check-caps.sh` for a candidate to cut anyway (broader than round 35's own
diff, per Opus's "값 못 버는 검사가 있으면" phrasing) — none stood out as redundant or dead;
every one maps to a specific past incident (round 33's WATCH→hard-cap being the most recent
precedent for retiring a check that measurably wasn't earning its keep). **No deletion proposed.**

**Verification, fresh state after all 3 items**: 6 suites unaffected + updated regression suite
still ALL PASS (`node --test tests/*.test.mjs`, run individually), `check-caps.sh` exit 0 both
plain and `--bootstrap-check` mode, required-read total unchanged at commit time
(24,535/27,800 — this round's code/test edit didn't touch a required-read file until the handoff
commit). No `kilo run`/Cursor/`kilo serve` call made — item 2's local-model calls went straight to
`http://127.0.0.1:8080/v1`, the same server `kilo run` shares, sequential (`-np 1`), never
concurrent with anything. `~/.hermes/longform/.render.lock` checked empty before and clear after.
`llama.service`/`kilo.jsonc` untouched.


## Round 45 — "can a substantive user message pre-clear a boundary?" — measured, refused

**The ask** (live, `ses_f9d0dfa4bffeTLzGAKjOA3a0st`, 09-03 01:29:28): with an elective boundary
standing, the user asked *"sub-task 2 가 완료된건가요? 아니면 브리핑만 하신건가요?"* — specific,
on-topic, engaged — and it cleared nothing (round 28 rule (a) wants a block fired for that SHA
first). **Prior art**: `looksAmbiguous()` is this repo's only content-judgment heuristic; round 39
measured it on this same user's 15 real messages (**12/15 misfired**) and disabled it outside Latin
script — a substantiveness detector is that species with the failure direction inverted (that one
only added a nudge; this one would open a gate). **Measurement**: 84 real user messages (`kilo.db`,
every warms-mobile session 08-25..09-03), ground truth = the message shows he knew a checkpoint was
pending (**5/84 = 6.0% base rate**; an omitted length+stoplist+word-count combination scored 6.3%).

| detector | judged "substantive" | precision vs. real awareness | the 01:29 message |
|---|---|---|---|
| anchor heuristic (round 39-scoped) | 13/84 | 2/13 = 15.4% | **rejected** |
| length ≥ 15 | 81/84 | 5/81 = 6.2% | accepted |

Everything accepting that message scores 6.0-7.7% against a 6.0% base rate — indistinguishable from
"any message clears," round 8's rule that FEEDBACK #41 was filed against (`"좋습니다. 빌드
진행하세요."` passes all of them); what beats the base rate rejects it and most of his Korean too.
**Stronger than the numbers**: it is a *question asking whether the sub-task was finished*, i.e.
proof he did **not** know the state — substantiveness measures engagement, round 28 needs informed
consent, and here they point opposite ways. **No detector shipped.** Premise also
corrected: "it must block once more first" is a one-turn cost, not a rule — round 39's quiet-turn
clause already clears a boundary with **no block at all**, and the live state file shows
`turnStartHead` == boundary SHA. **Shipped instead** (report-only, enforcement untouched to the
bit): `chat.message` already computes the boundary every message — for `electiveBoundaryAtTurnStart`
— and threw it away, so the model learned of it only by having `git log --oneline -3` (a read-only
diagnostic answering the user's own question) refused at 01:29:55, published a wrong theory, then
burned a second refusal. It now announces it on round 27's synthetic-part surface, guarded by the
predicate `tool.execute.before` applies moments later; no new state. And `BLOCK_MESSAGE_ELECTIVE`
stopped ordering the model to edit and commit SESSION_PRIMER.md — the same arm refuses exactly that,
and 01:30:05 shows it obeying that into round 44's attempt-2 suffix. T25a-f; defects planted one at a time (old wording → T25d; guard removed → T25e; notice removed → T25b; restored → 0).

## Round 46 — "the user authorized clearing AND proceeding in one breath" — no gate change; the checkpoint was manufactured upstream

**The ask** (live, `ses_f9d0dfa4bffeTLzGAKjOA3a0st`, 09-03 02:56:32): with an elective boundary
standing, Jay sent *"gate 풀고 서브타스트 3 진행하세요."* — explicit consent to clear **and** an
explicit directive to proceed, in one message. The gate honored the first half (round 28 rule (a): a
block had fired for `e04deaf` at 02:19:52); the model then correctly committed `SESSION_PRIMER.md`
(`75a00c9`, 02:57:34), which — being primer-touching — armed a **new** boundary that refused
sub-task 3. Round 44's `[repeat]` suffix held: 2 attempts, then it stopped.

**Round 30's criterion B does not decide this, and is not what protects the primer arm.** Criterion
B ("a freshly-crossed primer boundary still blocks the very next mutating call, no exceptions") was
written in round 30's *work order* as a scope limiter on item 3 — the fix for the **elective** arm
misfiring mid-turn, `#46`/`#47`'s common root — i.e. "do not let this deferral leak into the primer
half." It is a guard rail, not an incident; the incident-derived rule for the primer arm is
**`#41`**. **Round 46 is `#41`'s shape with consent moved earlier, i.e. strictly weaker**: `#41` is
"primer commit lands mid-turn → turn ends → next message waves it past," where the user at least saw
the turn end. Here `turnStartHead` was `e04deaf` while the blocking boundary was `75a00c9`, **created
62s after his message** — a SHA that did not exist when he wrote it, so he cannot have consented to
it. Narrowing B here reopens `#41` rather than narrowing it.

**The structural candidate has no mechanical signal.** "Exempt a boundary created *during* this
turn by a call the user's own message authorized" reduces, once text judgment is removed, to "an
in-turn primer boundary does not block" — satisfied identically by **08-29 09:45→09:59**, where the
model was asked to *check whether the harness matched the template* and instead built a sub-task and
closed it with a primer commit on its own. `turnStartHead != boundary.sha` in both; the only
difference is what the message said — round 45's measured 6.0%-precision axis. Reproduced offline
against the live plugin (ordering A = the incident verbatim; counterexample C = 08-29 still blocking).

**The checkpoint was manufactured two hours upstream, by a commit message that lied.** `b462450`
(01:28:24) reads `progress: [sub-task 2] — TurnManager.ts, SESSION_PRIMER.md`; its diffstat is
`src/systems/TurnManager.ts` alone. build.md step 3 requires the primer to be staged *with* the
sub-task's last file. Named, never staged — so no boundary armed, commits piled to 6, the elective
arm fired, and its only accepted remedy forced a standalone primer-only commit (the "two steps"
build.md forbids), which is what collided with his directive. **Had `b462450` been what it said, the
boundary would have armed at 01:28:24, the model would have stopped (step 6), and his next message
would have opened sub-task 3 cleanly.**

**Shipped** (report-only, enforcement untouched to the bit): `subtask-report.sh` flags a
`progress:` commit whose file-list slot names a file the commit does not contain — the report's
founding premise ("never trust what the model says it did") applied to the last place it still took
the model's word. **Scope is the fix, not the wording**: unscoped it flags **12.6% of the template's
293 commits**, all subjects naming a topic; scoped to build.md step 3's format, warms-mobile 1/2
qualifying (the true positive) and template 0/1. T20a-e, defects planted one at a time (scope guard →
T20c; dash → T20d; basename → T20b; restored → 0). Surfaces at the **next** boundary report, not
instantly — the hook fires only on primer commits by design (T7), a trigger left untouched.

**Also measured, needs no code**: his compound directive already completes in **one turn** today if
the work precedes the primer commit — replayed live: write `Physics.ts`, commit it (the re-crossed
elective boundary defers mid-turn, round 30 item 3), stage the primer last — **nothing blocks**. Ordering A blocks, B does not — B is build.md's own shape.

## Round 47 — "stop returning failures and let a real request through" — a literal, not a judgment

**The ask** (Jay, live, `ses_f9d0dfa4bffeTLzGAKjOA3a0st`): *"매번 그런식으로 진행할 수 없잖아요…
게이트 풀리길 기다리지말구요. 그 구조의 결함은 무엇인지 원인을 밝히고 이런 실패 아웃풋이 나오지
않고 사용자 요청에 정상적으로 반응할 수 있도록 시스템 구조를 개선하자는 의미입니다."* Two live
instances the same night: 00:46:49 (a long handoff request one commit after `bffac84` closed
sub-task 5 — answered with a status report and nothing else) and 00:19:01→00:20:19 (a primer-only
commit `404fd8a` landing mid-turn and refusing `TerrainManager.ts`).

**Measured, not argued.** Every genuine user message in warms-mobile's whole `kilo.db` history was
replayed against the block/notice record: **11 of 95 user turns (11.6%) began with a checkpoint
standing and ended with zero mutating calls executed**; 10 of those 11 wanted an action (the 11th
was a pure question, correctly answered). Rounds 44/45 had already removed the *retry storms* from
these turns — at 00:05:33 and 00:46:49 the model made no tool call at all and simply reported. What
was left was not noise; it was the whole turn.

**The finding that decided the design: this was never a refusal, only a postponement.** Rule (a) and
round 39's quiet-turn rule both clear on the *next* message regardless of what it says — at 00:05:33
the boundary held, at 00:09:35 one more line of his went in and the identical work ran. So the
standing price is one wasted round trip, and **"the user sent a second message" is a weaker signal of
a deliberate human decision than a token they had to type on purpose.**

**Rule (c), shipped**: a genuine user message containing the exact literal `[gate-ok]` acknowledges
the ONE boundary already standing when it arrived. **0 hits across all 457 genuine user messages in
`kilo.db`**; the bare words `gate`/`게이트` appear in **23**, which is exactly why the bracketed
literal and not the word is the signal. Same species of test as `isMutating()`'s tool-name match —
round 45's rejected axis (judging text for awareness: 6.0–7.7% precision against a 6.0% base rate)
is not re-entered, because no text is judged. No new state field; writes to the same `acknowledged`
list as (a) and (b). Named in exactly one message, `NOTICE_BOUNDARY_PENDING`, which fires precisely
when the token can work; the block messages stay byte-identical (round 44's care, and a mid-turn
boundary cannot be waived by a message that predates it, so advertising it there offers a remedy
that does not work where it is read).

**Scope is the entire safety argument, in one sentence: it can only reach a SHA that already existed
when the user typed, so it pre-approves nothing.** `#41` stays closed ("continue" is not this
token); round 30's criterion B stays intact (round 46's own "you cannot consent to a SHA created 62s
after your message"); the model cannot self-grant (`userText` drops every synthetic part, the only
kind it can author); per-SHA, never per-session.

**Instrumentation.** T26a–h, 57 → **66 assertions**, each negative in its own repo/session (rule (a)
would otherwise clear the second one for the wrong reason — caught while writing them). Defects
planted **one at a time**: token check removed → **T12/T19b/T20/T23b** fail first, i.e. the
pre-existing `#41` regressions catch that mis-implementation before the new tests do; literal → bare
word → T26c/d; synthetic parts counted → T26g; session-wide flag instead of a per-SHA ack →
T26e/f/h; notice stops naming it → T26d; ack after the notice → T26e; restored → 0. **Offline replay
of the live turns** (the plugin file driven directly, `kilo serve` untouched, a clone of
`warms-mobile` reset to the real SHAs): 00:46:49 blocked before / blocked after without the token /
**executed with it**; 00:20:19's mid-turn boundary blocked in all three; the follow-up message path
unchanged in all three. Template **7 suites ALL PASS**, `check-caps.sh` EXIT=0.

**Honest cost**: a user who types it every turn has turned their own primer checkpoint off. That is
a real erosion path, mitigated only by it being per-message, per-SHA and never persisted — but it is
now a choice made explicitly rather than by reflex with a throwaway "네 진행하세요".

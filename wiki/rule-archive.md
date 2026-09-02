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

## Round 36 — layer 2: local-model diff review, report-only, added alongside layer 1's tool-only report

**Housekeeping first**: `rule-archive.md` was already at 400/450 (this file's own WARN
threshold) before this round's write-up. Moved Round 31's full section (106 lines) to
`wiki/rule-archive-archive.md`, same PRUNE convention round 34 already used for rounds 5-30 —
left a pointer line, nothing deleted. 305/450 after, before this section was even written. This
round's own write-up (below) then pushed it back to 415/450 (WARN again) — moved Round 32's full
section (72 lines) out the same way once that was written, landing at 354/450, clean. Same
discipline round 33 itself established: don't let a soft WARN linger just because it isn't a hard
block yet.

**Ask (Jay)**: add a second verification layer — a local-model call that reads a sub-task's diff
and points out concrete issues, on top of layer 1 (`subtask-report.sh`, deliberately tool-only per
this repo's own README: *"검증은 필수. 다만 LLM으로 하면 안 됩니다 — 대부분은 판단이 아니라 도구
문제"*). Layer 2 exists only for the residual class layer 1 structurally can't cover — a flipped
comparison, a requirement mismatch, an ignored argument — things no deterministic tool checks for.

**Why this doesn't contradict the README's own "LLM으로 하면 안 됩니다" stance**: that line is
about secrets/tests/lint/mocks, all genuine tool problems with free deterministic tools already
covering them (still true, layer 1 untouched). Layer 2's failure-mode class has no such tool. Two
things from this week's own measured local-model data (`PROJECT_BACKGROUND.md`) make it safe to
add anyway: (1) reading a fixed diff and emitting a bounded `{file, line, issue}` list is a
**stateless transformation** — the shape the model is measurably good at (aider-polyglot
transformation-class exercises all passed), not the "design/remember state" shape it fails at
(0/1 on multi-sub-task chaining, the 18-turn fabrication incident). (2) every call is a brand-new,
context-free HTTP request — no Kilo session, nothing to derail — the strongest possible form of
`verify.md`'s own "cold, new-session read" mitigation.

**What was built**:
- `scripts/lib/subtask-range.sh` — `resolve_ref()`/`compute_subtask_range()` extracted verbatim
  from `subtask-report.sh`'s inline boundary resolution (unchanged behavior, incl. the round-34
  bad-ref-echo fix), now sourced by both report scripts. `subtask-report.sh` itself shrank by ~30
  lines to a single `source` + one call. Done specifically because `subtask-report.sh`'s own
  header already warns against "a second, invented boundary definition" — duplicating the ~30
  lines into the new script would have been exactly that.
- `scripts/subtask-review-llm.sh` — same CLI shape as layer 1 (`[<target-sha>] [--since <sha>]`),
  same boundary (via the shared lib). Builds a fixed prompt (diff verbatim, rules: cite exact
  file+line, empty array allowed and expected when nothing's wrong, JSON-only output, cap 10
  items), POSTs to `$SUBTASK_REVIEW_API_BASE/chat/completions` (default
  `http://127.0.0.1:8080/v1`, this project's own llama-server), parses `choices[0].message.content`
  defensively (markdown-fence stripped, `JSON.parse` — not a regex/prose heuristic, the thing that
  failed 13 rounds elsewhere in this project as `check_stale_language()`). A parse failure is its
  own explicit finding with the raw text attached, **never** folded into "0 issues found" — the
  single most dangerous failure shape here, since it would be indistinguishable from a genuinely
  clean review. Config via env (`SUBTASK_REVIEW_API_BASE`/`_MODEL`/`_TIMEOUT_S`/
  `_DIFF_CHAR_CAP`/`_LLM_DISABLE`), same override convention as `SUBTASK_REPORT_TIMEOUT_S`. A
  diff over the char cap (default 20000) is **skipped, not truncated-and-reviewed** — a partial
  diff reviewed as if complete is worse than an honest skip.
- `scripts/post-commit-subtask-report` — now also fires `subtask-review-llm.sh` after layer 1,
  appending to the same `.subtask-reports/<sha>.md` (`tee -a`), same never-blocks/never-silent
  guarantee. Guarded on the script existing+executable so an older checkout without layer 2 still
  works.
- `AGENTS.md`/`templates/AGENTS.md.template` File map row updated to cover both layers in one row
  (kept byte-identical per `check_template_drift()`; a first pass split it into two rows, which
  pushed `AGENTS.md` from 81 to 82 lines and broke two hardcoded-line-count assertions in
  `tests/check-caps.regression.test.mjs` (T9a/T14a) that this repo's own real state feeds — merged
  back into one row instead of updating those tests, since a merged row loses no information and
  is the smaller diff; re-ran `check-caps.sh --verbose` after, drift check still `ok`, AGENTS.md
  back at its original 81/85). `README.md` file tree updated to match, same round-34 precedent.
- `scripts/bootstrap.sh` — explicit `chmod +x` added for `subtask-review-llm.sh` (the recursive
  `cp -r "$SELF_DIR/scripts"` already copies `lib/` and the new script into a fresh project
  without any bootstrap change; the chmod is belt-and-suspenders, matching this script's own
  existing redundant chmod calls for the same reason).

**Trust level, stated explicitly, not implied**: layer 2's own report section header reads "모델
판단 — 도구 판정 아님, 사람 확인 전 신뢰하지 말 것." Every finding is also pushed into
확인이 필요한 것 tagged `[layer2/local-llm, unverified]` — visually distinct from layer 1's
untagged (deterministic-tool) findings in the same list, so a human scanning one combined report
can't mistake a probabilistic finding for a tool-certain one. Non-blocking by construction, per
this project's own admission bar ("(a) irreversible or (b) proven ignored → block; else report")
— zero rounds of evidence yet exist on whether this layer's findings get ignored; promote a
specific class to a blocker only once that's actually measured, not guessed.

**Live proof, not simulated** (this project's own "plant a defect, verify it's caught"
methodology, round 34/35, applied to an LLM instead of a shell tool): real `llama-server` on this
machine (`Qwen3.6-35B-A3B-UD-Q4_K_M.gguf`, confirmed via `/v1/models` and `systemctl status
llama`), called directly, no mock.
- Planted bug: `clamp(value, lo, hi)` with `if value < hi: return hi` (should be `>`, returns `hi`
  for an in-range value). Model returned exactly one item, `{"file":"clamp.py","line":6,"issue":
  "The condition 'value < hi' incorrectly returns 'hi' when the value is less than the upper
  bound..."}` — correct file, correct line, correct mechanism, first call (45.8s — cold; the
  model's own `predicted_ms`/`prompt_ms` timing fields summed to ~3.5s of that, the rest was one-
  off request/queue overhead not reproduced on the next call).
  `completion_tokens: 67`.
- Clean diff (`def add(a,b): return a+b`): returned `[]`, `completion_tokens: 2`, 6.6s — confirms
  the model doesn't invent an issue to have something to say when there genuinely isn't one.
- Mismatched `"model"` field (`"totally-wrong-model-name"`) — server answered 200 anyway; this
  llama-server build ignores the field for its one loaded model. `SUBTASK_REVIEW_MODEL` defaults
  to a generic placeholder (`local`) rather than hardcoding this machine's `.gguf` filename into a
  template meant to bootstrap onto other machines/providers.

**Regression tests**: `tests/subtask-review-llm.test.mjs`, 26 assertions, T1-T11 — disable flag
skips without a network call (T1), empty-diff range states itself explicitly rather than "0
issues" (T2), unreachable server is a stated skip, never a clean pass, fast/real (closed port,
short timeout, T3), oversized diff skips honestly rather than truncating (T4), valid-JSON findings
shown + tagged `[layer2/local-llm, unverified]` distinct from layer 1 (T5, mocked), markdown-
fenced JSON still parses (T6, mocked), empty array is a real "0 issues," distinct from a parse
failure (T7, mocked), unparseable content is its own explicit finding with raw text attached, never
silently "0 issues" (T8, mocked — the single scenario this design is most defensive about), over-
cap item count truncates the display but states the true count (T9, mocked), root-commit range
resolution matches layer 1's own `(repo start)..` behavior via the shared lib (T10). **T11 is the
one real, non-mocked call** — plants the same `clamp()` bug fresh in a throwaway repo, does a
quick `curl .../health` probe first, and either asserts the live model cites `clamp.py:5` or
prints an informational skip (not a FAIL) if the server didn't answer — same acceptance standard
round 33 already set ("no LLM calls made, server busy" is a legitimate outcome, not a defect).
All 26 passed, including T11 live. Existing suites re-run clean after every edit here:
`subtask-report.test.mjs` (18/18, unaffected by the `lib/subtask-range.sh` extraction),
`subtask-gate.test.mjs`, `check-secrets.test.mjs` — no regression. `check-caps.sh --verbose`:
`ok` throughout, template-drift check still `ok`, no OVER CAP.

**Left alone, out of scope for this round**: Round 35's own commits (secret scan moved to
pre-commit, report gaps 3/4 fixed, `SESSION_PRIMER.md` compressed — all visible in `git log`,
`18071a1`..`a9bba1c`) never got a "Round 35" write-up here or a `SESSION_PRIMER.md`/
`session-log.md` handoff of their own — `SESSION_PRIMER.md`'s header still reads "round 34
complete." Noticed, not fixed here — Jay's ask was specifically layer 2, and reconstructing
someone else's undocumented round from the outside risks getting the narrative wrong; flagged in
`session-log.md`'s row for this round instead of silently absorbed or silently ignored.

**Also found, also left alone**: this checkout's installed `.git/hooks/pre-commit` predates round
35's secret-scan addition (`diff .git/hooks/pre-commit scripts/pre-commit-check-caps` shows the
installed copy is missing the whole `check-secrets.sh` block) — this repo's own commits are
currently going through cap-checking only, not the secret block `SESSION_PRIMER.md`'s Hard
constraints describes as active. Not reinstalled here (git-hooks changes are outside this round's
ask); worth a `cp scripts/pre-commit-check-caps .git/hooks/pre-commit` the moment someone's
actually in round 35's scope.

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

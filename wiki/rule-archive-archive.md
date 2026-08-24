# Rule archive — archive (L01-L05, moved out of rule-archive.md's PRUNE step)

> Not auto-loaded, same as `wiki/rule-archive.md` itself — read on explicit request only. Moved
> here session 5, when `rule-archive.md` first crossed `check-caps.sh`'s WATCH threshold (400
> lines), per `wiki/protocols/self-harness.md`'s PRUNE step. Same role as the live file: raw
> evidence only, not summarized or reworded.

## L01 — Kilo's real installed build is an opencode rebuild, not the Cline-fork public docs describe

Before writing anything, checked Kilo's public docs (`kilo.ai/docs/...`) via WebFetch for the
workflow-file frontmatter schema and the actual file-edit tool names. Two separate fetches of two
different doc pages gave **mutually contradictory answers**: one said workflows live in
`.kilo/commands/`, the other implied `.kilocode/workflows/`; a WebSearch turned up a real GitHub
issue titled ".kilocode/workflows not loading" confirming the ecosystem itself was mid-migration
between the two. Rather than pick one and guess, went straight to the actual installed extension
on this machine: `~/.cursor/extensions/kilocode.kilo-code-7.4.20-linux-x64/`.

Findings, all from the binary/bundled files themselves, not docs:
- `bin/kilo --help` and `kilo agent create --tools` output the real tool set: `bash, read, edit,
  glob, grep, webfetch, task, todowrite, websearch, lsp, skill` — not `apply_diff`/
  `write_to_file`/`search_and_replace` (the classic Cline-lineage names most public writeups and
  the original port-planning doc assumed).
- `bin/kilo run --help`'s startup log literally tags itself `service=default ... opencode`.
- The extension's own bundled `docs/opencode-migration-plan.md` states outright: "This extension
  is a **ground-up rebuild** ... using Kilo CLI as the backend ... CLI backend owns: agent
  orchestration, MCP lifecycle, tool execution ... Extension owns: VS Code API integrations."
  Same doc: "Workflows subtab is a stub" and "Custom Commands: CLI has custom commands; extension
  provides UI entry points" — i.e. the UI for managing/discovering commands is unfinished,
  independent of whether the underlying mechanism works (see L02 for whether it actually does).

General lesson: for a fast-moving external tool, prefer reading the actual installed
binary/bundled docs over public web docs when they disagree — public docs can describe an older
or different product tier, and a real install is ground truth the way a live curl test beats a
guessed API shape.

## L02 — custom project slash commands don't work; protocol steps are self-served prose instead

L01 found the CLI "has custom commands" per its own bundled docs, but the extension's command
*discovery* UI is a stub — ambiguous whether the underlying mechanism itself works via the raw
CLI even without a UI. Decided to test directly rather than trust either doc's framing.

Method: created `.kilo/commands/pingtest.md` in a real test project with a unique frontmatter-
free body containing a distinct marker string (`CANARY_MARKER_7f3a`) and an argument-substitution
placeholder (`$ARGUMENTS`). Ran `kilo run "/pingtest hello-world"` against the local model and
exported the resulting session (`kilo export <sessionID>`) to inspect the raw message JSON.

Result: the user message's `text` field was literally the string `"/pingtest hello-world"` —
the canary marker never appeared anywhere in the transcript. The model's next action was a
`bash` tool call running `echo "pong: hello-world"`, described as "Respond to ping test" — pure
improvisation from the command's file *name* (ping → pong), with zero connection to the file's
actual content. Contrast with the earlier, unrelated observation that the word "discuss" seemed
to work: that's explained by the model itself reading `wiki/protocols/discuss.md` on its own
initiative on recognizing the word (confirmed by inspecting that session's tool calls — a `read`
call for the exact file, immediately after the message), not by any command-injection mechanism.
For a name with no matching doc anywhere in context (`pingtest`), nothing analogous exists to
read, so the model just guesses from the name.

Fix: don't build `.kilo/commands/*.md` expecting real invocation. Protocol methodology lives in
`wiki/protocols/*.md` instead, named plainly (not `.kilo/commands/`, which would misleadingly
imply working native integration) — `AGENTS.md`'s Protocol table is the only thing that actually
reaches the model every message, and it just says "here's the doc to read for this word." Same
underlying shape as soulmate-3's own Continue gap, different root cause (there: Continue's
slash-command autocomplete never confirmed live at all; here: confirmed live to genuinely not
inject anything).

## L03 — AGENTS.md/CLAUDE.md/CONTEXT.md all auto-load, hierarchy-aware; AGENTS.md alone is sufficient

Kilo exposes a `claudeCodeCompat` setting (off by default in the VS Code/Cursor extension, on by
default when running the raw `kilo` CLI directly — confirmed by reading the extension's own
spawn code: `!claudeCompat && {KILO_DISABLE_CLAUDE_CODE:"true"}`, i.e. the extension actively
sets a disable env var unless the toggle is on; the raw CLI never sets that env var at all).
Rather than trust the setting's one-line UI description ("Load CLAUDE.md instructions and
skills from your Claude Code configuration directory into Kilo sessions"), read the actual
instruction-loader code in the CLI binary via `strings`. Found the literal search-list
construction:

```
f=[...KILO_CONFIG_DIR?[join(KILO_CONFIG_DIR,"AGENTS.md")]:[], join(config,"AGENTS.md"),
   ...!disableClaudeCodePrompt?[join(home,".claude","CLAUDE.md")]:[]]
D=["AGENTS.md", ...!disableClaudeCodePrompt?["CLAUDE.md"]:[], "CONTEXT.md"]
```

This confirms: every directory up the tree gets checked for `AGENTS.md`, `CLAUDE.md`, and
`CONTEXT.md`. `AGENTS.md` is **unconditional** — present in the list regardless of the compat
toggle. `CLAUDE.md` is the only one gated by `disableClaudeCodePrompt`. Skills discovery
(`{skill,skills}/<name>/SKILL.md`) is separately gated by `disableClaudeCodeSkills`, same
default-off-in-extension pattern.

Verified live, not just read: created a project-root `CLAUDE.md` with a planted secret codeword,
ran `kilo run "what is your secret codeword?"` against the local model with zero Anthropic/
Claude credentials anywhere in the environment (`env | grep -i claude` showed only this CLI
session's own unrelated `CLAUDE_CODE_*` vars, no API key) — the local model answered with the
exact codeword, proving the file loaded and fed into a purely local inference call.

Fix/decision: since `AGENTS.md` always loads and `CLAUDE.md` doesn't (without the toggle, which
this repo doesn't want to depend on), this repo uses `AGENTS.md` only. No `CLAUDE.md` file
exists here — duplicating the same content into both would just be a maintenance burden with no
functional benefit for this specific harness's design.

## L04 — a local reasoning model can burn an entire turn's output budget on invisible thinking

Live test, a real sub-task ("S3: player kart physics + HUD data binding") on a throwaway test
project: the model correctly ran `npx tsc --noEmit` for the first time in that project's history,
got back several real compiler errors (a `@react-three/drei` import issue, a zustand store
access-pattern bug), and began reasoning about how to fix them — visible in its `reasoning` text
block starting to enumerate the errors. The turn never produced a tool call. Session export
showed the final message: `finish: "length"`, `tokens.output: 32000`, with the literal system
note: *"The model hit its output limit while reasoning and produced no actionable output. Try
disabling reasoning or increasing the output limit."* Nothing was saved — no edit, no commit, no
SESSION_PRIMER note about the tsc errors found. The next session would have had zero record this
ever happened, had the file writes from *before* this turn not already been on disk.

Root cause: this project's `llama-server` (llama.cpp) was launched with no `--reasoning` flag,
which defaults to `auto` (detect from the model's chat template) — Qwen3.6 defaults to thinking
enabled. Checked `llama-server --help` directly rather than guessing: it supports `-rea,
--reasoning [on|off|auto]` and a separate `--reasoning-budget N` token cap. No equivalent
per-request toggle exists in Kilo's own config schema for an arbitrary openai-compatible
provider — the reasoning behavior is entirely a property of the model/server, invisible to and
uncontrollable by the harness layer.

Fix: added `--reasoning off` to the `llama-server` systemd unit's `ExecStart` (`/etc/systemd/
system/llama.service`) — this applies to every consumer of that server (Kilo, Continue,
`hermes chat`, anything hitting `127.0.0.1:8080`), not just this repo. Verified before/after with
a direct `curl` probe to `/v1/chat/completions`: before, a factual one-line question would come
back with a `reasoning_content` block; after the restart, the identical question returned
`completion_tokens: 17`, no reasoning field, no `<think>` tags. Also added a Fixed Rule in
`wiki/PROJECT_BACKGROUND.md` and a `build.md` step: fix tsc/build errors one at a time, re-verify,
commit, repeat — never try to reason through a whole error list in one response, since even with
reasoning off, a long silent generation over many errors at once is still the same shape of risk
on an output-token budget, just smaller in practice.

## L05 — Kilo's CLI genuinely inherits opencode's tool.execute.before/after hooks

soulmate-3's own "Known gap" documents that Continue exposes no equivalent of opencode's
`tool.execute.before` plugin hook — nothing there can mechanically intercept a tool call.
Assumed the same limitation might apply to Kilo (a VS Code/Cursor extension, same general
category as Continue) until checked directly: `strings`-dumped the CLI binary and searched for
the literal trigger call. Found it, repeated at every tool-execution site in the bundled code:

```
yield*I.trigger("tool.execute.before",{tool:q.id,sessionID:W.sessionID,callID:W.callID},{args:x})
...
yield*I.trigger("tool.execute.after",{tool:q.id,sessionID:W.sessionID,callID:W.callID,args:x},K)
```

Also found Kilo's own in-app help text (a static string in the binary, shown somewhere in its
UI) stating plainly: "Add `.ts` files to `.kilo/plugins/` for event hooks" — confirming
project-local auto-discovery needs no `kilo.jsonc` registration.

Built `.kilo/plugins/subtask-gate.ts` on this: arms when a bash command both stages and commits
`wiki/handoffs/SESSION_PRIMER.md` (checked via simple regex on the command string, tolerant of
either a combined `git add ... && git commit ...` call or two separate calls), then rejects
(throws) the very next tool call whose type is in a mutating set (`write`, `edit`, `bash`,
`patch`, `multiedit`, `task`), disarming immediately after — one block per commit, not a
permanent lock.

Verified live end-to-end against a real project (not a mock/unit test): told the local model to
(1) commit a trivial change to `SESSION_PRIMER.md`, then (2) immediately write to an unrelated
file. Full session log:

```
$ git add wiki/handoffs/SESSION_PRIMER.md && git commit -m 'test: subtask gate probe'
[master a8a7db6] test: subtask gate probe

✗ Write /tmp/should-be-blocked.txt failed
Error: [subtask-gate] wiki/handoffs/SESSION_PRIMER.md was just committed — that closes out a
sub-task. Per project rules (CLAUDE.md/AGENTS.md), STOP now: ...
```

The model did not retry the blocked call — it reported the block and asked whether to continue,
exactly the behavior soulmate-3 could never mechanically force. Test commit reverted afterward
(`git reset --soft`) since it was a probe, not real work; the plugin file itself was committed as
real system structure.

Known limitation, recorded honestly rather than overclaimed (see
`wiki/handoffs/FEEDBACK_PENDING.md` #3): once a call is blocked and the gate disarms, an
immediate verbatim retry of the same call *would* succeed — this is a one-shot brake per commit,
not an unbreakable lock. `AGENTS.md`'s own "no 3rd verbatim retry" rule is the only thing
discouraging that path, and hasn't been separately stress-tested against a model that ignores
the error text and retries anyway.

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


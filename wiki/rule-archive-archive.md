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


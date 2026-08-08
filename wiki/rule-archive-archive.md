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


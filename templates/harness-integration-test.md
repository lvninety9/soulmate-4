<!--
  End-to-end integration test for the whole harness (sub-task gate + AGENTS.md auto-load + token
  budget), NOT just the cold-read doc-quality test in cold-read-test-prompt.md (that one tests
  whether the wiki/ docs are sufficient on their own — this one tests whether the Kilo mechanism
  itself actually works in a real Kilo + local-model session).
  Run this against a throwaway bootstrapped project, never against this seed repo itself.
-->

# Harness integration test — copy/paste steps

Report back after each step: (a) what actually happened, (b) `kilo stats` output right after the
step (token/cost usage — a real built-in command, no custom extension needed), (c) anything that
looked wrong.

## Step 0 — bootstrap a throwaway test project (plain terminal, no model involved)

```bash
git clone --quiet https://github.com/lvninety9/soulmate-4 /tmp/soulmate-4-seed \
  && bash /tmp/soulmate-4-seed/scripts/bootstrap.sh ~/soulmate4-test \
  && rm -rf /tmp/soulmate-4-seed
(cd ~/soulmate4-test && scripts/check-caps.sh --bootstrap-check)
```

Expect: bootstrap succeeds, `--bootstrap-check` passes every line except the last
(`AGENTS.md still has the literal placeholder "[project name]"` — that FAIL is correct/expected
on an unfilled template, not a bug).

## Step 1 — confirm AGENTS.md actually auto-loads (no UI to check, unlike Continue's `/` list)

Kilo has no reliable custom-command autocomplete to check (see AGENTS.md "Known gap" — verified
not to work). Instead, confirm the file that matters actually loads:

```
Without me telling you anything about this project, what does your AGENTS.md say your Language
rule is, and what's the exact cap number on this file itself?
```

**Pass condition**: it answers correctly (Korean replies / English docs, and the real cap number
from AGENTS.md's "Caps" section) without you having pointed it at the file — proves AGENTS.md
loaded on its own, the same way `kilo run "what is your secret codeword?"` was verified against
a canary `CLAUDE.md` during this repo's own Round 1 (see `wiki/rule-archive.md` L03).

## Step 2 — rule-zero check (no explicit "grep" instruction given)

Paste exactly:

```
Read wiki/handoffs/FEEDBACK_PENDING.md and tell me how many open items it has and what the
highest-priority one is.
```

Record `kilo stats`, the answer, and a follow-up: "did you read the whole file or search for a
specific part?" — report its answer verbatim.

## Step 3 — "discuss" on a deliberately ambiguous, multi-file-shaped ask

```
discuss: add a small CLI tool to this project — a word counter you can run from the command line.
```

**Pass condition**: it asks clarifying questions (language? where does output go? a test file
too?) instead of immediately writing code — proving it self-served `wiki/protocols/discuss.md`
on recognizing the word, since there is no real command behind it. Report the questions it
asked, or note if it skipped straight to building (that would be a regression to flag).

Answer with something like: "Python, argparse, reads a file path argument, put it under a new
`tools/` folder, include one basic test file."

## Step 4 — "design"

```
design
```

**Pass condition**: it states a plan and writes a sub-task block into
`wiki/handoffs/SESSION_PRIMER.md`'s "Current sub-task" section, then commits it — and, per
`wiki/protocols/design.md`, stops there because the sub-task gate should fire. Paste back
whatever it actually wrote, and whether its next message reports being blocked.

## Step 5 — the sub-task gate, live

In a plain terminal, confirm the commit from step 4 actually happened:

```bash
cd ~/soulmate4-test && git log --oneline -3
```

Then tell the model to continue:

```
continue
```

**Pass condition**: its very first tool call in this turn fails with an error starting
`[subtask-gate]`, and it does not immediately retry the same call — it reports the block and
asks you whether to proceed. This is the single most important thing to check in this whole
test; paste back the actual tool-error text.

## Step 6 — "build"

```
build
```

After it finishes the sub-task, **in a plain terminal**, run:

```bash
cd ~/soulmate4-test && git log --oneline
```

**Pass condition**: multiple small commits (roughly one per file) — NOT one single commit
bundling everything. Also confirm it actually ran the project's build/typecheck command at least
once before calling the sub-task done (per `wiki/protocols/build.md` step 4) — ask it directly
if unclear from the transcript.

## Step 7 — "verify" (cold read, separate session)

Start a **brand-new Kilo session** (`kilo run`, fresh — not `--continue`). Fill in and paste
`templates/cold-read-test-prompt.md` from this repo, pointing `PROJECT_ROOT_PATH` at
`~/soulmate4-test` and listing `AGENTS.md`, `wiki/PROJECT_BACKGROUND.md`,
`wiki/handoffs/SESSION_PRIMER.md` as the required docs. Paste back its full answer, including
the confident/guessed tags and final score.

## Step 8 — "self-harness"

Back in the original session:

```
self-harness
```

Check afterward: did `wiki/session-log.md` get a new line, did `wiki/PROJECT_BACKGROUND.md`
change (only if it proposed a real rule), was a commit made. Paste `git log --oneline -3` and
`cat wiki/session-log.md`.

## Step 9 — overall token/reasoning report

Run `kilo stats` for the session's total usage. Separately, confirm the local model's reasoning
is actually off at the server level (not just per-request): a direct probe works without going
through Kilo at all —

```bash
curl -s http://127.0.0.1:8080/v1/chat/completions -H "Content-Type: application/json" \
  -d '{"model":"<your model file>","messages":[{"role":"user","content":"one word answer: sky color?"}],"max_tokens":50}' \
  | python3 -m json.tool
```

**Pass condition**: the response has no `reasoning_content` field and no `<think>` tags in
`content`, and `completion_tokens` is small (single digits to low tens) — if it's in the
hundreds+ for a one-word question, `llama-server --reasoning off` isn't actually applied; see
`wiki/rule-archive.md` L04.

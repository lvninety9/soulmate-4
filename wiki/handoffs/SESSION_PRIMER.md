# SESSION PRIMER — round 28 fix cycle done (S1-S7 landed); score still 82/81, unscored since round 26

> Status icons: ✅done(evidence) ⏳code-done·unverified 🔶partial 🔴unfixed-bug ⚠️needs-user-action
> **Role: current-state only — no "why" narrative** (round-by-round detail: `FEEDBACK_PENDING.md`'s
> open table for what's still live, `wiki/FEEDBACK_PENDING-archive.md` for every resolved row
> #1-#38 (rounds 1-27, moved out of FEEDBACK_PENDING.md itself in round 28's S5 — see row #39),
> `SESSION_MASTER.md` for the round-27 stale-clone incident/PRUNE pass/this handoff's own
> re-verification — "why" lives there, not here).
> Rewritten 2026-08-22, a Jay-requested handoff-rigor pass (not a new audit/fix round): every claim
> below independently re-checked against fresh-cloned `origin/master` — real `git log`, real
> `node --experimental-strip-types tests/*.test.mjs`/`check-caps.sh` output, a direct read of
> `.kilo/plugins/subtask-gate.ts` — not against any prior report. **No discrepancy found**; see
> `SESSION_MASTER.md`'s "Handoff-rigor verification pass" for exactly what was checked.

## Project overview

`soulmate-4` is a session-handoff harness template for coding agents behind **Kilo Code**, talking
to a local LLM with a hard context ceiling (RTX 3080 10GB, physically **shared with an unrelated
production system "Hermes"** — see Hard constraints). `.kilo/plugins/subtask-gate.ts` is the
payoff: a real `tool.execute.before` mechanical brake (Kilo genuinely exposes this hook). Round 28
dropped `tool.execute.after` — the boundary is now derived fresh from git per call, not a flag.

**Goal**: earn a score comparable to the *original* `soulmate` repo's own real result (87/100
turnkey, 98.75/100 structural, over 13 rounds). **Method**: repeating loop — fresh non-fork blind
agent scores → fix highest-leverage issue with live verification → repeat. Jay called an explicit
consolidation checkpoint at round 26; round 27 is a targeted fix cycle within that pause, not a
resumption of the full audit loop (that resumes whenever Jay next asks for one).

## Current sub-task

시작: round 28 fix cycle, item 2 of 7 — row #42's CLI-vs-plugin payload diff — DONE, root cause found
완료: item 1 (row #41) landed. item 2: tap capture done (2 CLI + 2 plugin requests, `kilo export`
     on both sessions) — root cause identified, not guessed: CLI's default "code" agent has NO
     `question`/`suggest` tool at all (12 tools vs plugin's 17); `bin/kilo` binary confirms a
     hardcoded baseline denies `question`/`interactive_terminal`/`plan_enter`/`plan_exit`, and
     "code" never overrides it. Plugin's agent does, and used it — 2/2 fresh live trials got a
     real structured question UI, contradicting row #42's old "5/5 FAIL". Full writeup: row #43.
다음: before more #42-driven fixing, re-check #42's original 5 trials for a `question`-type tool
     call (not just literal `?` in text) — may already be passing. Then item 3 (#41 live n=5).
참고: full 7-item sequence lives outside this repo (Opus's plan, not committed). Captures:
     `/home/jay/sm4-tap-capture/` (durable — 1st attempt in `/tmp` was lost to a mid-session reboot).

## Current score: turnkey 82/100, structural 81/100 — from round 26, the last FULL audit

**Important for round 28**: this score is round 26's, carried forward unchanged. Round 27 was a
targeted fix cycle (2 candidate findings, not a fresh blind audit) — it landed one real structural
change (the `session.idle` hook, see below) but that change is **UNSCORED**: no audit has run
against it yet. Do not assume the 82/81 already reflects round 27's own changes — it doesn't.
Round 28's job is to find out what the real current score is.

**This project's closing bar** (mirrors the original `soulmate`'s own convergence pattern):
turnkey 90+, OR a clean audit pass with zero new findings. Rounds 24 and 26 both already came back
clean (`FEEDBACK_PENDING.md` rows #33, #35) — 2 clean passes toward convergence, not yet the
confirmatory 3rd. See "Recommended next step" below.

## Round 27 (this round) — code state now, full story in SESSION_MASTER.md/FEEDBACK_PENDING.md

A round-8-style audit was mistakenly run against a frozen round-7 local clone instead of real
origin/master — see "Hard constraints" (L13) and `SESSION_MASTER.md` for the incident itself.
2 candidates came out of it, independently re-checked against real current code:

**Finding B — landed (`193b16b`)**: `.kilo/plugins/subtask-gate.ts` now has a real `event` hook —
on `session.idle` with a dirty working tree, sends a synthetic `client.session.prompt({noReply:
true})` nudge naming the real uncommitted files, deduped per session on the dirty-file-set
signature. Closes part of row #15's "can't catch a session abandoned outright" gap. Live-verified
via `kilo serve` + raw HTTP (correct file names, no fabrication on recall, dedup held); 24/24 unit
tests. Full evidence: `wiki/rule-archive.md` "Round 27", `FEEDBACK_PENDING.md` row #37.

**Finding A — investigated, reverted, not in current code**: the candidate `<system-reminder>`-tag
wrap for the carryover-warning was re-tested rigorously (7 live trials, 3 phrasings) and **did
not** hold (4/5 post-fix failures) — contradicts the stale audit's own reported numbers. No trace
of this change remains in `subtask-gate.ts`. Extends row #6's ceiling; full evidence:
`FEEDBACK_PENDING.md` row #38.

## Meta-lessons

1. "Reorder, don't patch" recurred 3× (17-18, 22-23) between exclusion-mechanism stage pairs.
2. Commit the fix before any destructive git cleanup, not after — every fix-fork before round 27
   hit this once; round 27 avoided it.
3. **A citation fix (round 9) ≠ re-verifying the substantive claim it was attached to** — round
   5's "no end-of-turn hook" claim survived 18 rounds after its citation got corrected, because
   nobody re-checked the *content* against the *correct* package, only the *label* (L12).
4. A test that only asserts "did it throw" can pass even when the specific mechanism it's meant to
   isolate is broken, if an unrelated gate throws first (round 27's own T11b bug, caught before
   commit) — assert on the *specific* error/effect, not just presence.

## Hard constraints / warnings

- Never trust a live re-run as "fully fixed" — unit test AND live-verify via a real pre-commit
  hook + real commit, not code-reading alone. Every `subtask-gate.ts` change needs both.
- GPU is shared with real Hermes production jobs — check `~/.hermes/longform/.render.lock` +
  `ps aux | grep -E "longform|tts_runner|ComfyUI|music_pipeline|playlist_compiler"` + `nvidia-smi`
  before `kilo run`, wait if busy. Generation latency varies 50ms-30s+ turn to turn — budget
  generous timeouts, not fixed ones.
- `kilo` CLI **confirmed installed and working** as of round 28 (`kilo --version` → 7.4.23, at
  `~/.cursor/extensions/kilocode.kilo-code-7.4.23-linux-x64/bin/kilo`, not on default `PATH`) —
  local model is `qwen-3-6/Qwen3.6-35B-A3B-UD-Q3_K_M.gguf` (`~/.config/kilo/kilo.jsonc`), a real
  agentic turn on it took low single-digit minutes in round 28's own live testing — re-check both
  fresh, don't assume either still holds.
- Before changing any cap number, check the original `soulmate` repo's real number fresh.
  `templates/AGENTS.md.template` must stay byte-identical to `AGENTS.md` from `## Language`
  onward — `check_template_drift()` catches this, only when run.
- `FEEDBACK_PENDING.md`'s "Completed history" is now a pointer only, never a table (round 28 S5)
  — all resolved rows #1-#38 live in `wiki/FEEDBACK_PENDING-archive.md`, not auto-loaded. New
  resolved rows belong there, not back in this file's own table.
- **L13**: a local clone's own `git log` looking coherent proves nothing about its freshness vs.
  `origin/master` — round 27's audit ran 19 rounds stale with zero errors/warnings. Always `git
  fetch`+diff origin, or fresh-clone, before trusting a local checkout for an audit-shaped task.

## Known open issues (numbers match `FEEDBACK_PENDING.md`)

| # | Issue | Status |
|---|---|---|
| 2 | Custom slash commands don't work in Kilo CLI v7.4.20+ — Kilo's own limitation | ⚠️ p2, open |
| 4/12 | `discuss.md` nudge wording fix works; CLI-invisibility half structurally unfixable | 🔴 p1, permanent ceiling |
| 6/38 | Model self-report fabrication after a gate block, or when asked to recall an injected notice — inherent LLM unreliability, tag-wrap mitigation tried and did not help | 🔴 p1, permanent ceiling |
| 15/37 | Session-abandoned-outright gap partially closed (round 27's `session.idle` hook) — still can't catch a session that's killed before the idle event fires | 🔶 p1, partial |
| — | Bare cross-paragraph token gap (incl. wrap-split-backtick) — fixing it breaks real content | 🔴 p2, accepted limitation |
| — | `check_fence_parity()` odd/even blind spot — inherited from original, shared upstream | 🔴 p2, low urgency |
| — | `bootstrap.sh` doesn't create/copy `README.md`, undocumented (round 26) | 🔴 p2, low severity |
| 40 | New (round 28 S7 smoke test): `build.md` step 3's SESSION_PRIMER-handoff rule can be satisfied in words (`git add` command run) without substance (no real Edit/Write) — gate never arms, next turn's mutation goes unblocked | 🔴 p1, new, not yet triaged |

## Round 28 fix cycle (external review, 2026-08-22) — done; audit plan below still deferred

Jay routed this handoff-rigor primer to an external reviewer before round 28's planned fresh
audit ran. The review found 7 concrete, already-broken mechanisms by reading the code
adversarially — all 7 (S1-S7) landed, live-verified, one commit/small cluster each; full summary
+ hashes in `wiki/FEEDBACK_PENDING-archive.md` row #39. Headline results: required-read tokens
15,128→6,978 (real local llama.cpp `/tokenize`, under the 8,000 target); `check_template_drift()`
no longer forces this repo's own audit history onto fresh downstream projects; S7 turned the
harness-integration-test doc into a real k/N-scored script (`scripts/harness-integration-test.sh`)
and, while dogfooding it, surfaced one genuinely new gap (row #40, not fixed — out of this round's
scope). Jay is separately live-testing this round's changes in real kilo sessions and will report
back what to feed into the next round. The audit mission below is unchanged, still deferred until
row #40 is triaged and Jay's live results are in:

1. Does round 27's `session.idle` hook (`193b16b`) hold under fresh adversarial live testing?
2. Is the next clean pass the 3rd consecutive one (after rounds 24, 26) confirming convergence
   near this project's closing bar (turnkey 90+, or zero new findings) — or does a fresh angle
   still find something, the way round 25 did after round 24's clean pass?

## Next session's starter prompt

```
soulmate-4 round 29 시작. round 28의 S1-S7은 전부 완료(wiki/FEEDBACK_PENDING-archive.md 행 #39).
먼저 Jay에게 물어볼 것: 라이브 kilo 검증(5회 harness-integration-test.sh) 결과를 갖고 계신지.
있으면 그 결과부터 반영. FEEDBACK_PENDING.md 행 #40(게이트 우회 가능성, S7 스모크테스트 중 신규
발견) 트리아지 — 고칠지, 감사 루프 재개 시 함께 볼지 결정. 그 다음에야 위 audit 재개 여부 판단
(session.idle 라이브 검증 + 3연속 clean pass 여부). fresh clone 필수, git fetch로 격차 확인.
```

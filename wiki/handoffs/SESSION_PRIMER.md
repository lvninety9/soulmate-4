# SESSION PRIMER — round 29 in progress (2026-08-23)

> Status icons: ✅done(evidence) ⏳code-done·unverified 🔶partial 🔴unfixed-bug ⚠️needs-user-action
> **Role: current-state only — no "why" narrative.** Round-by-round detail: `FEEDBACK_PENDING.md`'s
> open table for what's still live, `wiki/FEEDBACK_PENDING-archive.md` for every resolved row,
> `wiki/rule-archive.md` for evidence behind each Learned Rule, `SESSION_MASTER.md` for full round
> narrative. **Round 29, item 4**: this file used to violate its own role above (round 27/28
> narrative + 4 meta-lessons had accumulated here, pushing it to 150/150 lines, 49% of required-
> read budget) — that content moved to `SESSION_MASTER.md`'s "Round 27/28 narrative" section (meta-
> lesson 4 promoted to `AGENTS.md`'s L14, since `tests/subtask-gate.test.mjs` cites it directly).
> Same flow-rule round 28 already applied to `FEEDBACK_PENDING.md`, now applied here too.

## Project overview

`soulmate-4` is a session-handoff harness template for coding agents behind **Kilo Code**, talking
to a local LLM with a hard context ceiling (RTX 3080 10GB, physically **shared with an unrelated
production system "Hermes"** — see Hard constraints). `.kilo/plugins/subtask-gate.ts` is the
payoff: a real `tool.execute.before` mechanical brake (Kilo genuinely exposes this hook). The
boundary is derived fresh from git per call, not a persisted flag (round 28's #41 redesign).
**Goal**: earn a score comparable to the *original* `soulmate` repo's own real result (87/100
turnkey, 98.75/100 structural). **Method**: repeating loop — fresh non-fork blind agent scores →
fix highest-leverage issue with live verification → repeat. Jay called an explicit consolidation
checkpoint at round 26; rounds 27-29 are targeted fix cycles within that pause (resumes whenever
Jay next asks for a fresh audit).

## Current sub-task

```
시작: ~/.hermes/opus_round29_workorder.md (Opus-authored, NOT committed to this repo — see
     work order's own non-goal list)
완료: item 1 (#46, gate fail-open fix) — currentHead()/lastPrimerTouchSha()/commitCountSince()
     now share one gitExec() that throws GitCommandError on a real git failure instead of each
     silently returning null/0; computeBoundary() distinguishes "not a repo" (pass) from "repo,
     command failed" (fail CLOSED with the specific command named). 3 new tests (not-a-repo,
     unborn-HEAD, invalid rev-list range via a new __internal test export) — 29/29 unit, 42/42
     fuzz, check-caps clean. Item 4 (this file's own flow-rule pass, see banner above) — done.
다음: item 5 (check-caps.sh consolidation, must prove zero coverage loss via regression test),
     item 6 axis B (harness ON vs OFF delta bench — do this before axis A, it's just running
     the existing bench twice). Items 2/3/6-axis-A are Jay-direct-execution (work order flags
     them explicitly) — stop and report on reaching them, don't attempt.
참고: item 1's live `kilo run` regression check is in flight in a throwaway bootstrap
     (/tmp/sm4-r29-live, not this repo) — a real multi-file task, killed client-side by a shell
     timeout but still completing server-side via the pre-existing `kilo serve` daemon; 3 correct
     per-file commits + fresh-session boundary pre-approval observed so far, final settle pending.
```

## Current score: turnkey 82/100, structural 81/100 — round 26, unscored since

Unchanged this round — round 29 is a targeted fix cycle (Opus's own independent fresh-clone
re-verification of round 28's results, then a follow-on work order), not a fresh audit. This
project's closing bar (mirrors the original `soulmate`'s convergence pattern): turnkey 90+, OR a
clean audit pass with zero new findings — rounds 24 and 26 both already came back clean, 2 of the
3 consecutive clean passes needed to confirm convergence.

## Hard constraints / warnings

- Never trust a live re-run as "fully fixed" — unit test AND live-verify via a real pre-commit
  hook + real commit, not code-reading alone. Every `subtask-gate.ts` change needs both.
- GPU is shared with real Hermes production jobs — check `~/.hermes/longform/.render.lock` +
  `ps aux | grep -E "longform|tts_runner|ComfyUI|music_pipeline|playlist_compiler"` + `nvidia-smi`
  before `kilo run`, wait if busy. Generation latency varies widely turn to turn (a killed CLI
  client does not stop the underlying `kilo serve` daemon's in-flight generation — budget for
  that, don't assume a timeout means the task stopped) — budget generous timeouts, not fixed ones.
- `kilo` CLI at `~/.cursor/extensions/kilocode.kilo-code-7.4.23-linux-x64/bin/kilo` (not on
  default `PATH`) — re-check `kilo --version` fresh, don't assume. Local model is
  `qwen-3-6/Qwen3.6-35B-A3B-UD-Q4_K_M.gguf` as of round 28 item 7 (`~/.config/kilo/kilo.jsonc`
  names the alias, `/media/jay/D/llama.cpp/llama.env` the real file path) — re-check both fresh.
- Before changing any cap number, check the original `soulmate` repo's real number fresh.
  `templates/AGENTS.md.template` must stay byte-identical to `AGENTS.md` from `## Language`
  onward, excluding `## Learned Rules` (project-specific by design) — `check_template_drift()`
  catches this, only when run.
- `FEEDBACK_PENDING.md`'s "Completed history" is a pointer only, never a table — all resolved
  rows live in `wiki/FEEDBACK_PENDING-archive.md`, not auto-loaded. New resolved rows belong
  there, not back in this file's own table.
- A local clone's own `git log` looking coherent proves nothing about its freshness vs.
  `origin/master` (L13) — always `git fetch`+diff origin, or fresh-clone, before trusting a local
  checkout for an audit-shaped task. Round 29 did this (see its own commit for the re-verification
  record: HEAD/commit-count/tests/tokenize/VRAM all independently re-matched Opus's numbers).

## Known open issues (numbers match `FEEDBACK_PENDING.md`)

| # | Issue | Status |
|---|---|---|
| 2 | Custom slash commands don't work in Kilo CLI v7.4.20+ — Kilo's own limitation | ⚠️ p2, open |
| 4/12 | `discuss.md` nudge wording fix works; CLI-invisibility half structurally unfixable (root cause: CLI agent has no `question` tool at all) — round 29 item 3 may reclassify the plugin half | 🔴 p1, permanent ceiling (CLI half only) |
| 6/38 | Model self-report fabrication after a gate block, or when asked to recall an injected notice — inherent LLM unreliability, tag-wrap mitigation tried and did not help | 🔴 p1, permanent ceiling |
| 15/37 | Session-abandoned-outright gap partially closed (round 27's `session.idle` hook) — still can't catch a session killed before the idle event fires | 🔶 p1, partial |
| — | Bare cross-paragraph token gap (incl. wrap-split-backtick) — fixing it breaks real content | 🔴 p2, accepted limitation |
| — | `check_fence_parity()` odd/even blind spot — inherited from original, shared upstream | 🔴 p2, low urgency |
| — | `bootstrap.sh` doesn't create/copy `README.md`, undocumented (round 26) | 🔴 p2, low severity |

## Next session's starter prompt

```
round 29 속행. wiki/handoffs/SESSION_PRIMER.md 전체 읽기 → FEEDBACK_PENDING.md 표 확인.
item 1(#46 게이트 fail-open 수정)+item 4(이 파일 유량규칙 적용) 완료 상태 재검증(fresh clone,
unit 29/29·fuzz 42/42·check-caps EXIT=0, git log로 커밋 실존 확인) 후 item 5(check-caps.sh
통합, 커버리지 손실 0 증명 필수)부터 이어서. item 6 축B(하네스 ON/OFF 델타 벤치)도 Claude
단독 실행 가능 — 축A(Aider Polyglot)보다 먼저. item 2/3/6축A는 Jay 직접 실행 항목, 도달하면
멈추고 보고. opus_round29_workorder.md는 ~/.hermes/에 있고 이 저장소에 커밋 금지.
```

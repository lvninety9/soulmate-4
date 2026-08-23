# SESSION PRIMER — round 29 (2026-08-23)

> Status icons: ✅done(evidence) ⏳code-done·unverified 🔶partial 🔴unfixed-bug ⚠️needs-user-action
> **Role: current-state only — no "why" narrative.** Round-by-round detail: `FEEDBACK_PENDING.md`'s
> open table for what's still live, `wiki/FEEDBACK_PENDING-archive.md` for every resolved row,
> `wiki/rule-archive.md` "Round 29" for full evidence behind everything below, `SESSION_MASTER.md`
> for round 27/28's own narrative (moved out of this file in round 29 item 4 — same flow-rule
> round 28 already applied to `FEEDBACK_PENDING.md`).

## Project overview

`soulmate-4` is a session-handoff harness template for coding agents behind **Kilo Code**, talking
to a local LLM with a hard context ceiling (RTX 3080 10GB, physically **shared with an unrelated
production system "Hermes"** — see Hard constraints). `.kilo/plugins/subtask-gate.ts` is the
payoff: a real `tool.execute.before` mechanical brake. **Goal**: earn a score comparable to the
*original* `soulmate` repo's own real result (87/100 turnkey, 98.75/100 structural) — but round 29
item 6 axis B produced this project's own first-ever **harness ON vs OFF delta** number, which is
meant to replace that comparison going forward (see below). Jay called an explicit consolidation
checkpoint at round 26; rounds 27-29 are targeted fix cycles within that pause.

## Current sub-task

```
시작: ~/.hermes/opus_round29_workorder.md (Opus-authored, NOT committed to this repo)
완료: item 1 (#45) — subtask-gate's 3 git helpers now fail CLOSED on a real git command
     failure instead of silently treating it as "no boundary" (see rule-archive.md "Round 29").
     item 4 — this file's own flow-rule pass. item 5 — check-caps.sh 875→864 lines, 3 provably-
     safe merges, 12-assertion regression test. item 6 axis B — first-ever harness ON/OFF delta
     bench (table below). item 6 axis C — complexity-ladder bench, run TWICE (first run's L4/5
     invalidated by 2 script bugs, both fixed same session; corrected re-run has real numbers,
     table below) — #46 fixed + live-reconfirmed under the corrected re-run (2 trials hit the
     same deadlock, neither found the bypass this time), #47 still open.
     opus_round29_execution_report.md + opus_round29_review_prompt.md written to ~/.hermes/
     (not this repo) for Jay to hand to Opus.
다음: round 29's Claude-executable scope is done. item 2/3/6-axis-A remain Jay-direct-
     execution (work order flags them explicitly) — stop and report on reaching them. Open
     items for whoever picks this up next: #47 (fix or accept?), axis B Step 3/4's measurement
     reliability, axis C Level 5 has only 1 data point so far.
참고: item 1's live regression check + axis B/C's live benches all ran in throwaway /tmp
     bootstraps, not this repo, not durable. A runtime-session reset mid-round wiped the first
     axis-C run's + both axis-B runs' raw logs — no finding was lost (everything was already
     written down here/rule-archive.md first), but don't expect those specific /tmp paths to
     still exist. Corrected axis C's logs: /tmp/sm4-ladder-v2/. Numbering note: #43 was folded
     into row #42's own entry (CLI-vs-plugin root cause, both cover the same investigation).
```

## Item 6 axis B — harness ON vs OFF delta (first-ever measurement, replaces stale 82/81)

`scripts/harness-integration-test.sh HARNESS_OFF=1` (new toggle) run against N=5, same 5
`SCENARIOS`, same scoring, only AGENTS.md + the plugin's presence differs:

| Step | ON | OFF |
|---|---|---|
| 1 (AGENTS.md auto-load) | 5/5 | 0/5 |
| 2 (rule-zero grep, not whole-read) | 5/5 | 3/5 |
| 3 (discuss asks, doesn't build) | 5/5 | 5/5 |
| 4 (design writes+commits sub-task) | 0/5 | 0/5 |
| 6 (build: per-file commits) | 1/1 (4 N/A) | 0/0 (5 N/A) |

Step 3's zero delta is a bench limitation (script hardcodes a `"discuss: "` prefix in both modes),
not a real "harness adds nothing" finding. **Step 4 = 0/5 in BOTH modes** — a real, harness-
independent gap worth a future round's attention. Full analysis: `rule-archive.md` "Round 29".

## Item 6 axis C — complexity ladder (corrected numbers, N=5)

New `scripts/complexity-ladder-test.sh`: 5 escalating levels (1 file → 3 files → +refactor →
+tests → multi-sub-task chain) in one project per trial, stops at the first real failure. First
run's L4/5 numbers were invalidated by 2 script bugs (bash arithmetic crash on a zero-match
`grep -c`; a test-counting regex blind to class-based test files) — both fixed same session, then
re-run:

| Level | Result |
|---|---|
| 1 (1 file) | 5/5 |
| 2 (3 files) | 4/5 |
| 3 (+ refactor) | 2/4 |
| 4 (+ tests) | 1/2 |
| 5 (multi-sub-task chain) | 0/1 |

Knee distribution: 1 trial failed L2, 2 failed L3 (the largest single cliff), 1 failed L4, 1
reached L5 and failed there. Full data + the corrected re-run's own confirmation below:
`rule-archive.md` "Round 29".

- **#46 (fixed, live-reconfirmed)**: the elective gate armed mid-turn (4 non-primer commits) and
  a first-run trial's model read `subtask-gate.ts`'s own source, noticed `background_process` was
  missing from `MUTATING_TOOLS`, and used it to write + commit — a complete gate bypass. Fixed:
  added to `MUTATING_TOOLS`, new unit test T17 (30/30 unit, 42/42 fuzz). **The corrected re-run
  hit the identical trigger in 2/5 trials and neither found the bypass this time** (0
  `background_process` calls in either log) — live confirmation the fix holds, not just a unit
  test claim.
- **#47 (open, p2)**: trials that hit the armed-gate deadlock without finding a bypass instead
  retry many blocked tool-call variants within one turn (4-238 `[subtask-gate]` hits observed
  across different trials) before giving up or recovering on the next message, rather than
  cleanly stopping to ask per the block message's own instruction. Not a security issue now that
  #46 is closed (worst case is wasted turn budget) — the higher-count trials (134, 238 hits) DID
  eventually recover and progress further up the ladder once a fresh message arrived, consistent
  with round 28 #41's "block within a turn, clear on genuine new message" design holding up.

## Current score: turnkey 82/100, structural 81/100 — round 26, unscored since

Superseded going forward by item 6 axis B's ON/OFF delta table above, per the work order's own
framing ("this number finally replaces 82/81"). This project's closing bar (mirrors the original
`soulmate`'s convergence pattern): turnkey 90+, OR a clean audit pass with zero new findings.

## Hard constraints / warnings

- Never trust a live re-run as "fully fixed" — unit test AND live-verify. Every `subtask-gate.ts`
  change needs both (item 6 axis C's own #46 finding came from exactly this kind of live test).
- GPU is shared with real Hermes production jobs — check `~/.hermes/longform/.render.lock` +
  `ps aux | grep -E "longform|tts_runner|shorts|music_pipeline|playlist_compiler"` + `nvidia-smi`
  before `kilo run`, wait if busy (round 29's axis B/C both waited out live Hermes jobs before
  starting, and tolerated one brief overlap mid-run rather than killing in-flight generation).
  Generation latency varies widely — a killed CLI client does not stop the underlying `kilo serve`
  daemon's in-flight generation, budget for that.
- `kilo` CLI at `~/.cursor/extensions/kilocode.kilo-code-7.4.23-linux-x64/bin/kilo` (not on
  default `PATH`). Local model `qwen-3-6/Qwen3.6-35B-A3B-UD-Q4_K_M.gguf` (round 28 item 7).
- `templates/AGENTS.md.template` must stay byte-identical to `AGENTS.md` from `## Language`
  onward, excluding `## Learned Rules` — `check_template_drift()` catches this, only when run.
- `FEEDBACK_PENDING.md`'s "Completed history" is a pointer only — resolved rows live in
  `wiki/FEEDBACK_PENDING-archive.md`, not auto-loaded.
- A local clone's own `git log` looking coherent proves nothing about its freshness vs.
  `origin/master` (L13) — always `git fetch`+diff origin, or fresh-clone, first.

## Known open issues (numbers match `FEEDBACK_PENDING.md`)

| # | Issue | Status |
|---|---|---|
| 2 | Custom slash commands don't work in Kilo CLI v7.4.20+ — Kilo's own limitation | ⚠️ p2, open |
| 4/12 | `discuss.md` nudge wording fix works; CLI-invisibility half structurally unfixable | 🔴 p1, permanent ceiling (CLI half only) |
| 6/38 | Model self-report fabrication after a gate block — inherent LLM unreliability | 🔴 p1, permanent ceiling |
| 15/37 | Session-abandoned-outright gap partially closed (round 27's `session.idle` hook) | 🔶 p1, partial |
| 47 | Mid-turn retry storm on an armed gate (4-238 blocked attempts observed, doesn't stop to ask) | 🔴 p2, open |
| — | Item 6 axis B Step 4 (design→primer commit) = 0/5 in BOTH ON/OFF modes | 🔴 p1, needs investigation |
| — | Item 6 axis B Step 3 always hardcodes a "discuss: " prefix — doesn't isolate real discuss-routing value | 🔴 p2, bench limitation |
| — | Bare cross-paragraph token gap — fixing it breaks real content | 🔴 p2, accepted limitation |
| — | `check_fence_parity()` odd/even blind spot — inherited from original | 🔴 p2, low urgency |

## Next session's starter prompt

```
round 30 시작. wiki/handoffs/SESSION_PRIMER.md 전체 읽기 → FEEDBACK_PENDING.md 표 확인 →
~/.hermes/opus_round29_execution_report.md + Opus 피드백(있다면) 확인. round 29는 완료: item
1/4/5, item 6 축B(ON/OFF 델타 표 확보), 축C(#46 게이트 우회 발견+수정+재실행으로 라이브
재확인, #47 기록, 정확한 L1-5 수치 확보). 남은 것: item 2/3/6축A(Jay 직접 실행), #47 처리
방향, 축B Step3/4 신뢰도 문제 — Opus 피드백 받으면 그걸 우선 반영. opus_round29_workorder.md/
opus_round29_execution_report.md는 ~/.hermes/에 있고 이 저장소에 커밋 금지.
```

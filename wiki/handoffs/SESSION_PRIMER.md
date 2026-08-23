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
     bench (table below). item 6 axis C — complexity-ladder bench, first run + 2 real findings
     (#46 fixed, #47 open — see below) + 2 script bugs found and fixed in the bench itself.
다음: axis C needs a CORRECTED re-run (its own Level 4/5 numbers from the first run are
     invalidated by the script bugs, now fixed — see below) once GPU time is next available.
     After that: item 2/3/6-axis-A remain Jay-direct-execution (work order flags them
     explicitly) — stop and report on reaching them.
참고: item 1's live regression check + axis B/C's live benches all ran in throwaway /tmp
     bootstraps, not this repo, not durable — logs at /tmp/sm4-r29-live, /tmp/sm4-axisB-{on,off},
     /tmp/sm4-ladder (lost on reboot). Numbering note: #43 was folded into row #42's own entry
     (CLI-vs-plugin root cause, both cover the same investigation) — not a gap.
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

## Item 6 axis C — complexity ladder (first run; Level 4/5 numbers need a re-run)

New `scripts/complexity-ladder-test.sh`: 5 escalating levels (1 file → 3 files → +refactor →
+tests → multi-sub-task chain) in one project per trial, stops at the first real failure. N=5:
L1 5/5, L2 5/5, L3 3/5, **L4/L5 numbers from this run are invalid** (2 script bugs, both fixed
same session — see `rule-archive.md`). This run's real value was 2 harness findings, not the
numbers:

- **#46 (fixed)**: the elective gate armed mid-turn (4 non-primer commits) and one trial's model
  read `subtask-gate.ts`'s own source, noticed `background_process` was missing from
  `MUTATING_TOOLS`, and used it to write + commit — a complete gate bypass. Fixed: added to
  `MUTATING_TOOLS`, new unit test T17. 30/30 unit, 42/42 fuzz.
- **#47 (open, p2)**: a *different* trial hit the same armed-gate deadlock but didn't find the
  bypass — instead retried 4-20 blocked tool-call variants within one turn before giving up,
  rather than cleanly stopping to ask per the block message's own instruction. Not a security
  issue now that #46 is closed (worst case is wasted turn budget), but a real, un-fixed model-
  behavior gap.

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
| 47 | Mid-turn retry storm on an armed gate (4-20 blocked attempts, doesn't stop to ask) | 🔴 p2, open |
| — | Item 6 axis C's Level 3/4/5 numbers need a corrected re-run (script bugs now fixed) | ⚠️ p1, needs GPU time |
| — | Item 6 axis B Step 4 (design→primer commit) = 0/5 in BOTH ON/OFF modes | 🔴 p1, needs investigation |
| — | Bare cross-paragraph token gap — fixing it breaks real content | 🔴 p2, accepted limitation |
| — | `check_fence_parity()` odd/even blind spot — inherited from original | 🔴 p2, low urgency |

## Next session's starter prompt

```
round 29 속행 (or round 30). wiki/handoffs/SESSION_PRIMER.md 전체 읽기 → FEEDBACK_PENDING.md 표
확인. 완료: item 1/4/5, item 6 축B(ON/OFF 델타), 축C 1차실행(#46 게이트 우회 수정+#47 기록,
단 L4/5 수치는 스크립트 버그로 무효 — 이미 고침). 최우선: GPU 여유 있으면 축C 재실행으로
실제 L3/4/5 수치 확보. 그 다음 item 2/3/6축A는 Jay 직접 실행 항목 — 도달하면 멈추고 보고.
opus_round29_workorder.md는 ~/.hermes/에 있고 이 저장소에 커밋 금지.
```

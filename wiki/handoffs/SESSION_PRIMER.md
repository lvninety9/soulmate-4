# SESSION PRIMER — session 5 (complete, round 5 done)

> Status icons: ✅done(evidence) ⏳code-done·unverified 🔶partial 🔴unfixed-bug ⚠️needs-user-action
> **Role: current-state tables only — no "why" narrative** (that's `SESSION_MASTER.md`).
> Rewritten 2026-08-08 after round 5 (objective blind audit + hardening). Every claim re-checked
> against `git log`/actual file contents — see `SESSION_MASTER.md`'s "Round 5" section for full
> narrative, `wiki/rule-archive.md`'s Round 5 entry for full evidence.

## Project overview

Soulmate 4 is a memory/harness template for coding agent sessions running inside **Kilo Code**,
backed by a local model with a hard context ceiling (reference case: Qwen3.6-35B-A3B, RTX 3080
10GB). Carries discuss/design/build/verify/refactor/self-harness + wiki/ harness pattern from
soulmate-2/3, adds a **mechanical** sub-task checkpoint (`.kilo/plugins/subtask-gate.ts`) that
force-stops the model instead of relying on prose it might not follow under context pressure.

## Current state — 5 blind-validation/audit rounds; objectively scored 74/73, actively closing the gap to the original's 87/98.75

Jay's standing instruction: keep this repo held to the same bar the original `soulmate` repo
was — independent, objective, blind scoring (not this session's own self-assessment), iterated
(score → fix → re-score) until it earns a comparably high score. Round 5 was the first real
instance of that loop.

| Round | What it tested | Result | Fix (commit) |
|---|---|---|---|
| 1-3 | discuss/design/build/verify self-serve + gate mechanics | 3 real bugs found+fixed (L06-L08) | see `SESSION_MASTER.md`/`-archive.md` |
| 4 (blind) | refactor.md self-serve, 3 independent trials | self-serve never fired once — backup/units/verify all failed as a result | `65dd69e`..`450f587` (L09) |
| 5 (objective audit) | fresh non-fork agent, calibrated against the real original repo's own rubric, real bootstrap + real `kilo run` | **turnkey 74/100, structural 73/100** — concrete, reproducible deductions | see below |

**Round 5 fixes, all live re-verified this session** (full evidence: `wiki/rule-archive.md`
Round 5 section):
1. `AGENTS.md`/its template had zero cap headroom (literal README step 1 broke the pre-commit
   hook) — template was stale (pre-dated the L06-L08 merge); fixed template + live file, both
   now carry real headroom (84/85 and 82/85-post-strip, was 85/85 both).
2. **L09 was a true one-shot for the whole session, not per-event** — after the first block, any
   *different* mutation sailed through unchecked forever. Hardened to re-check every mutating
   call until real compliance. 10/10 unit tests + live re-verify (adversarial "hello" prompt: 3
   different bash mutation attempts all correctly blocked this time).
3. **L10 (new)**: found+fixed a real crash while building fix 4 — opencode rejects synthetic
   Part IDs not prefixed `prt`, hard server error, not a soft ignore.
4. **New `chat.message` hook**, addressing the audit's #1-ranked fix: opencode has no true
   end-of-turn hook (confirmed from `@opencode-ai/plugin`'s own types) — this injects a
   mechanical warning naming uncommitted leftovers on the *next* message. Honestly a partial fix
   (can't catch a session abandoned outright, never resumed) — closes the gap for this repo's
   own documented common usage (`build.md`: "the next build, ideally in a fresh session").
5. Trivial: `bootstrap.sh`'s header comment 404'd (`main`→`master`); README's file-tree was
   stale (missing both new `-archive.md` companions, wrong Rules location).

**All commits through round 5 are pushed to `origin/master`** (verify: `git log origin/master
-1` should match local HEAD — push this handoff's own commit before trusting that fully).

## Current sub-task

```
시작: 없음 — round 5 완료. 다음 세션은 재채점(round 6) 또는 FEEDBACK #12(discuss.md 백스톱) 시작점.
목표: (1) 이 핸드오프 push (2) 다음 우선순위는 아래 참고
작업 사이클: 없음(이 세션의 sub-task는 완결)
```

## Hard constraints / warnings

- 검증은 항상 fresh agent(또는 직접 재현) + 실제 Kilo/로컬모델, 절대 self-report/subagent 감사
  결과 나레이션만 믿지 말 것 — round 5도 감사 결과 중 2건을 직접 재현해서야 진짜 원인을 정확히
  파악했음("무관한 파일 읽어서 통과" 서술은 부정확했고, 실제는 "1회성 체크가 세션 전체에 걸쳐
  풀려버림"이었음).
- subtask-gate 변경 시 반드시 (1) Node 단위테스트 (2) 실제 Kilo 최소 1회 재현 — L06-L10 전부
  이 순서를 지켰음.
- 캡 숫자를 바꾸기 전엔 원본 soulmate도 직접 클론해서 실제 숫자 확인할 것.
- **"1회 통과했다고 완전히 고쳐졌다고 단정 말 것"** — round 5가 round 4의 L09 fix 자체에서
  바로 이 실수를 발견함(1회 재현으로 확정했다가 독립 감사가 허점을 찾음). 다음 라운드도 같은
  자세 유지.
- GPU는 Hermes와 물리적으로 공유 — `kilo run` 전 항상 `ps aux`+`nvidia-smi`로 여유 확인.

## Session 1-5 completed

| Item | Detail | Status |
|---|---|---|
| Round 1-4 조사 + fix (L01-L09) | 상세는 위 표 + SESSION_MASTER.md/-archive.md | ✅ |
| 아카이빙 목적지 패턴 신설 + 4개 구조개선(번호범례/압축우선순위/문서역할분리/검증명령명시) | soulmate-4 자체 구조 개선, 전부 push 완료 | ✅ |
| Round 5 객관적 blind 감사 | 원본 repo 실제 루브릭 캘리브레이션 후 채점: 턴키74/구조73 | ✅ |
| Round 5 fix 5건 (L09 강화, L10, chat.message 훅, 헤드룸, 잡버그 2건) | 전부 단위테스트+실전 재검증 완료 | ✅ |

## This session's top priorities (다음 세션용)

1. **Round 6 재채점** — 오늘 fix들이 실제 점수를 움직였는지 같은 방식(원본 재클론+캘리브레이션
   +blind)으로 확인. Jay가 명시적으로 요청한 반복 루프의 다음 사이클.
2. FEEDBACK #12(discuss.md 기계적 백스톱 없음) — discuss는 tool call을 안 만들어서 지금 훅
   구조로는 원천적으로 못 잡음, 새 설계 필요(`experimental.chat.system.transform` 등 미탐색)
3. FEEDBACK #4 재검증 — L09가 모호한 작업에서 실제로 discuss.md를 읽게 하는지 전용 blind 시행
4. FEEDBACK #6(Hermes/soulmate 1-3에 refactor.md 백포트) — Jay가 미뤄둔 조건인 "soulmate-4
   검증 마침"이 round 5 이후 충족됐는지 계속 재확인 필요(아직 진행 안 함)

## Known open issues

| # | Issue | Status |
|---|---|---|
| 1 | 커스텀 슬래시커맨드 Kilo CLI 미작동(Kilo 자체 한계) | ⚠️ |
| 2 | 게이트 1회 차단 후 즉시 재시도(같은 호출) 통과 — 설계상 의도, L09/L10은 다른 mutation도 재검사하도록 강화됐으나 "정확히 같은 호출 즉시 재시도"는 여전히 통과 | 🔶 |
| 3 | "discuss" 자기서빙 실패, L09가 *어떤* protocol이든 강제하지만 discuss.md 특정 여부 미검증 | 🔴 |
| 4 | 차단 후 모델 self-report 거짓 사례 — 항상 실제 git/파일 상태로 재확인 | 🔴 |
| 6 | Hermes/soulmate 1-3에 refactor.md 백포트 — 조건 충족 여부 재확인 필요 | ⚠️ |
| 12 | discuss.md에 기계적 백스톱 전무 — subtask-gate 훅 구조로 원천적 한계, 새 설계 필요 | 🔴 |

## Next session's starter prompt

```
soulmate-4 이어서 진행합니다. wiki/handoffs/SESSION_PRIMER.md 전체를 읽어주세요.

Round 5(객관적 blind 감사 턴키74/구조73 + 5건 fix)까지 전부 완료·push됐습니다. Jay가 반복
루프(재채점→수정→재채점)를 명시적으로 요청했으니, 다음은 Round 6 재채점부터 시작해주세요 —
원본 soulmate를 다시 클론해서 루브릭을 재확인한 뒤 fresh non-fork 에이전트로 blind 채점,
오늘 fix들이 실제 점수를 올렸는지 확인. 그다음 "This session's top priorities" 순서대로.
```

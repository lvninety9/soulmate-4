# SESSION PRIMER — session 5

> Status icons: ✅done(evidence) ⏳code-done·unverified 🔶partial 🔴unfixed-bug ⚠️needs-user-action
> Rewritten for handoff on 2026-08-08 after round 4 (blind refactor.md validation). Every claim
> below was re-checked against `git log`/actual file contents right before writing — see
> SESSION_MASTER.md's "Round 4 (blind) — refactor.md self-serve validation" section for full
> evidence (also `wiki/rule-archive.md` L09).

## Project overview

Soulmate 4 is a memory/harness template for coding agent sessions running inside **Kilo Code**,
backed by a local model with a hard context ceiling (reference case: Qwen3.6-35B-A3B, RTX 3080
10GB). It carries the discuss/design/build/verify/refactor/self-harness methodology and wiki/
harness pattern from soulmate-2/3 forward, and adds one thing neither predecessor had: a
**mechanical** sub-task checkpoint (`.kilo/plugins/subtask-gate.ts`, via Kilo's real
`tool.execute.before`/`after` hooks) that force-stops the model at sub-task boundaries instead
of relying on prose the model might not follow under context pressure. Purpose, in Jay's own
words at the start of this work: Continue (soulmate-3) kept finding new forms of the same
failure — a local model losing track after tool errors, chaining sub-tasks unprompted — no
matter how the prompt was reworded; test whether a harness with a real mechanical brake does
better against the exact same model.

## Current state — four independent blind-validation rounds; round 4's finding not yet fixed

Every round used a **fresh, context-isolated agent** (never a context-sharing fork — that would
bias the test), given only the public repo URL, told to blindly bootstrap, pick its own small
task, and drive the real protocol against the real local model, scoring two axes (turnkey
bootstrap readiness; bounded-growth/structural integrity) with cited evidence only.

| Round | Task picked | What it found | Fix (commit) |
|---|---|---|---|
| 1 | word-frequency CLI | bootstrap literally couldn't complete (cap overflow → pre-commit block → `set -e` abort → leaked scratch clone); gate's in-memory state didn't survive separate `kilo run` calls | `5391d32`..`0e2712b` (L06) |
| 2 | LRU cache lib + tests | gate's trigger was 100% elective — reproduced a silent multi-commit chain with it never arming; fresh bootstrap left ~0 cap headroom | `376a1da`, `7d9a286` (L07) |
| 3 | config parser + test | main mandate (threshold=4 false-positive check) passed clean; found+fixed the commit-*detection* itself was regex-based (false pos/neg) | `37c384a` (L08) |
| 4 | refactor a seeded, real, pre-existing messy-but-working module | self-serve of `refactor.md` never fired, 3/3 trials (abstract/literal-word/cross-process) — no backup branch, no per-unit commits, one trusted no-op verify command, one undetected regression | fix designed, **not yet built** (L09) |

After round 3, Jay asked whether this repo's caps were set lower than the **original** soulmate
template (not soulmate-2/3, which is all this repo had been checking itself against until then).
They were: original `CLAUDE.md` = 85-line cap, Learned/Fixed Rules inline, no split file.
soulmate-4 had split Learned/Fixed Rules out to keep `AGENTS.md` at 65 lines — a choice made
without checking that precedent, and one that re-creates soulmate-3's own **L02** risk (a rule
only referenced from the auto-loaded file doesn't reliably reach ad-hoc work). Merged Rules back
into `AGENTS.md`, raised the cap to 85 to match the original exactly (`e11389d`, `fd80b6b`), and
a real re-bootstrap immediately caught a fresh off-by-one from the merge itself (template's
leading blank line → 86/85) — fixed before push (`fec44a1`), not by a 4th validation round.

**27 commits from sessions 1-4 are pushed to `origin/master` (`d9fb565`..`fec44a1`). This
session's round 4 doc updates (AGENTS.md L09, rule-archive.md, FEEDBACK #9/#10, session-log,
SESSION_MASTER, this file) are committed locally but not yet pushed — push once Jay confirms the
report below.**

## Current sub-task

```
시작: SESSION_MASTER.md "Round 4 (blind)" 섹션, wiki/rule-archive.md L09, FEEDBACK_PENDING.md #10
목표: L09에서 설계만 되고 아직 안 만들어진 fix(subtask-gate.ts 첫 mutating 호출 시
      wiki/protocols/*.md read 여부 강제 체크)를 실제로 만들지 Jay에게 결정받기 — 지금까지
      L06/L07/L08은 전부 "버그 발견 즉시 같은 세션에서 fix+재검증"이었지만, 이번 건은 발견
      자체가 예상(FEEDBACK #9: 백업/유닛검증 루프만 걱정)보다 훨씬 근본적이라(self-serve가
      아예 refactor에 대해 한 번도 안 됨, discuss/design/build/verify 4개 프로토콜은 안 건드림)
      규모가 커졌고, round 4 자체가 로컬모델 세션 1회(~750초) 소모함 — fix까지 하면 검증에
      또 한 번의 실전 kilo run 라운드가 필요함(같은 GPU를 Hermes 프로젝트와 공유, L11급 주의)
작업 사이클: 1. Jay 결정 대기 (fix 지금 만들지 / 문서만 남기고 다음 세션으로 미룰지)
             2. (만들기로 하면) subtask-gate.ts에 first-mutation protocol-read 체크 추가
                → Node 단위테스트 → 실제 kilo run으로 최소 1회 재현(round 4 trial 1과 같은
                abstract framing으로, 이번엔 차단/안내가 실제로 뜨는지) → L09/FEEDBACK #10 갱신
             3. (미룰 경우) 지금 상태 그대로 push, 다음 세션 시작 프롬프트에 그대로 이어감
참고: refactor.md/build.md에 "verification command"가 뭘 의미하는지도 불명확하다는 게 이번에
      드러남(round 4 trial 3: `python3 test_data_utils.py`가 실제로는 아무 테스트도 안 돌리는
      명령인데 모델이 "통과"로 보고) — fix를 만든다면 이것도 같이 손볼 가치 있음(L09 참조)
```

## Hard constraints / warnings

- 검증은 항상 fresh agent + 실제 Kilo/로컬모델, 절대 self-report만 믿지 말 것(모델이 차단된
  작업을 "완료했다"고 거짓 보고한 사례 2건 실측 확인됨, FEEDBACK #6).
- subtask-gate 변경 시 반드시 (1) Node 단위테스트로 로직 자체 검증 (2) 실제 Kilo로 별도
  두 프로세스 재현 — 이번 세션 3라운드 모두 이 순서를 지켰고 전부 실제 버그를 잡아냈음.
- 캡 숫자를 바꾸기 전엔 soulmate-3뿐 아니라 **원본 soulmate**도 직접 클론해서 실제 숫자
  확인할 것 — 세션 4에 이걸 놓쳐서 재작업이 발생했음(SESSION_MASTER "Round 4 — architecture
  realignment" 참조).
- **round 4가 뒤집은 가정**: "self-serve가 4개 프로토콜(discuss 제외)에서 됐으니 refactor도
  될 것"은 틀렸음 — 프로토콜마다 별도로 실측 검증해야 함, 하나 통과했다고 나머지도 통과라
  가정 금지(discuss도 원래부터 FEEDBACK #4로 실패 확인돼 있었으니 사실 2/6이 실패였던 셈).

## Session 1-4 completed

| Item | Detail | Status |
|---|---|---|
| Round 1-3 조사 (L01-L08) + 저장소 초안·refactor.md 추가 | 상세는 위 표 + SESSION_MASTER.md | ✅ |
| 아키텍처 재정렬 (원본 soulmate 대비 검증) | Learned/Fixed Rules를 AGENTS.md로 병합, 캡 85로 상향, 재부트스트랩 검증 | ✅ |
| Round 4 blind 검증 (refactor.md) | 3독립시행 전부 self-serve 실패 확인(L09), fix는 설계만 완료 | ✅검증 · ⏳fix미착수 |

## This session's top priorities

1. Round 4 결과를 Jay에게 보고 완료 — self-serve 프리미스가 refactor.md에 대해 3/3 실패,
   예상(FEEDBACK #9)보다 근본적인 문제로 확인됨
2. **[결정 대기]** L09의 fix(subtask-gate.ts first-mutation protocol-read 체크)를 지금 만들지,
   문서만 남기고 다음 세션으로 미룰지 — 만들면 반드시 또 한 번의 실전 kilo run 재검증 필요

## Known open issues (전부 코드로 못 고치는 종류거나 미검증 항목)

| # | Issue | Status |
|---|---|---|
| 1 | 커스텀 슬래시커맨드 Kilo CLI 미작동(Kilo 자체 한계, 미래 업데이트로 바뀔 수 있음) | ⚠️ |
| 2 | 게이트 1회 차단 후 즉시 재시도하면 통과 — 설계상 의도, 3라운드 걸쳐 재확인됨 | 🔶 |
| 3 | "discuss" 자기서빙 3라운드 중 최소 2라운드 실패(모델이 파일 안 읽고 단어만으로 추론) | 🔴 |
| 4 | 차단 후 모델 self-report 거짓 사례 2건 — 항상 실제 git/파일 상태로 재확인 필요 | 🔴 |
| 5 | `refactor.md` self-serve 3/3 실패 확인(L09) — fix 설계 완료, 미구현·미재검증 | 🔴 |
| 6 | Hermes/soulmate 1-3에 refactor.md 백포트 — Jay가 "soulmate-4 검증 마친 뒤로" 명시적으로 미룸 | ⚠️ |
| 7 | `refactor.md`/`build.md`가 "verification command"를 구체적으로 명명 안 함 — no-op 명령을 모델이 통과로 오인한 실측 사례 있음(round 4 trial 3) | 🔴 |

## Next session's starter prompt

```
soulmate-4 이어서 진행합니다. wiki/handoffs/SESSION_PRIMER.md 전체와
wiki/handoffs/SESSION_MASTER.md의 "Round 4 (blind) — refactor.md self-serve validation"
섹션을 읽어주세요. Round 4까지 전부 완료 — refactor.md의 self-serve가 3/3 독립 시행에서
전부 실패했고(L09), 원인과 fix 설계는 끝났지만 fix 자체는 아직 안 만들어졌습니다.

Jay에게 fix를 지금 만들지(또 한 번의 실전 kilo run 재검증 필요, GPU/시간 비용 있음) 아니면
문서만 남기고 여기서 마무리할지부터 확인 후 진행해주세요.
```

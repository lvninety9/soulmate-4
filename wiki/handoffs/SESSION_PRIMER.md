# SESSION PRIMER — session 2

> Status icons: ✅done(evidence) ⏳code-done·unverified 🔶partial 🔴unfixed-bug ⚠️needs-user-action

## Project overview

Soulmate 4 is a memory/harness template for coding agent sessions running inside Kilo Code,
backed by a local model with a hard context ceiling. It ports soulmate-2/3's discuss/design/
build/verify/self-harness methodology to Kilo's actual primitives, adding a real mechanical
sub-task gate soulmate-3 couldn't have, and a 6th protocol (`refactor`) for safely shrinking
code in large projects. See `wiki/PROJECT_BACKGROUND.md` for the entity map and
`wiki/handoffs/SESSION_MASTER.md` for the full narrative.

## Current sub-task

```
시작: wiki/handoffs/FEEDBACK_PENDING.md, wiki/rule-archive.md (L06 항목)
목표: Round 2 독립 검증 에이전트 실행 — Round 1이 찾은 버그들이 실제로 고쳐졌는지, 그리고
      또 다른 abstract task에서도 구조가 온전히 동작하는지 재확인
작업 사이클: 1. 새 fresh agent를 blind하게 띄워 다시 한 번 다른 abstract task로 전체 흐름
                (bootstrap → discuss → design → build(2개 이상 sub-task) → verify) 실행
             2. subtask-gate가 서로 다른 프로세스 경계에서 매번 정확히 작동하는지 재확인
             3. 점수 재산정, Round 1과 비교(개선됐는지)
참고: Round 1에서 찾은 5개 문제(bootstrap 캡 초과, README one-liner 정리누락, templates 미복사,
      check-caps.sh 무음분기, subtask-gate 프로세스간 미유지) 전부 수정+실측 재검증 완료
      (commit 5391d32/f125cb3/73f19ba/a29ab9b/0e2712b). "discuss" 자기서빙 불안정(4중 3)은
      코드로 못 고치는 종류라 FEEDBACK #4로 open 유지.
```

## Hard constraints / warnings

- Round 1 검증 방식: 완전히 새 컨텍스트의 독립 에이전트에게 README만 주고 blind 테스트 — 결과를
  그대로 믿지 말고 항상 raw evidence(세션 export JSON, 실제 커밋, 실제 에러 텍스트) 요구할 것.
- subtask-gate 재검증 시 반드시 **별도의 두 프로세스**로 테스트할 것(같은 kilo run 호출 안에
  두 스텝 넣는 건 다른 걸 증명함 — L06 교훈).

## Session 1 completed

| Item | Detail | Status |
|---|---|---|
| Round 1 조사 (L01-L05) | Kilo 실제 빌드=opencode 재작성판, 커스텀커맨드 미작동, AGENTS.md/CLAUDE.md/CONTEXT.md 로더, reasoning 토큰 소진 사고 해결, `tool.execute.before` 실존 확인 | ✅ |
| 이 저장소(soulmate-4) 초안 + refactor.md 추가 | README/AGENTS.md/templates/scripts/wiki 작성, github push | ✅ |

## This session's top priorities

1. Round 1 blind 검증에서 나온 버그 5개 전부 수정 + 실측 재검증 (완료, 아래 "Session 1
   completed"에 이미 반영돼야 하나 이 primer 자체가 이번 세션 결과물이라 여기 기록)
2. Round 2 독립 검증 에이전트 실행
3. 만족스러운 점수 도달 시 Jay에게 보고, 승인 시 최종 커밋+push

## Known open issues

| # | Issue | Status |
|---|---|---|
| 1 | 커스텀 슬래시커맨드 Kilo CLI에서 미작동(향후 Kilo 업데이트로 바뀔 수 있음) | ⚠️ |
| 2 | subtask-gate 1회 차단 후 즉시 재시도하면 통과함(영구 락 아님) — 대적모델 스트레스테스트 안 함 | 🔴 |
| 3 | "discuss" 자기서빙 4중 3만 성공(모델이 파일 안 읽고 단어만으로 추론한 사례 1건) | 🔴 |

## Next session's starter prompt

```
soulmate-4 Round 2 검증 진행합니다. wiki/handoffs/SESSION_PRIMER.md와 wiki/rule-archive.md의
L06 읽어주세요. Round 1이 찾은 버그(bootstrap 캡초과, 프로세스간 게이트 미유지 등) 전부 수정
완료했고 실측 재검증도 끝났습니다. 이제 또 다른 독립 blind 에이전트로 2차 검증 라운드를
진행해주세요 — 위 "Current sub-task" 블록대로.
```

# SESSION PRIMER — session 3

> Status icons: ✅done(evidence) ⏳code-done·unverified 🔶partial 🔴unfixed-bug ⚠️needs-user-action

## Project overview

Soulmate 4 is a memory/harness template for coding agent sessions running inside Kilo Code,
backed by a local model with a hard context ceiling. Two independent blind-validation rounds
have now run against it (fresh agents, README-only, real Kilo + real local model, no assumed
results) — both found real bugs in the flagship sub-task gate, both fixes verified live. See
`wiki/rule-archive.md` L06/L07 and `wiki/handoffs/SESSION_MASTER.md` for the full narrative.

## Current sub-task

```
시작: wiki/handoffs/FEEDBACK_PENDING.md (open table), wiki/rule-archive.md L07
목표: Jay에게 Round 1+2 결과 보고, Round 3 진행 여부 결정 받기
작업 사이클: 1. 이 문서+session-log 커밋
             2. Jay에게 요약 보고 (무엇을 찾았고 무엇을 고쳤는지, 남은 open item 5개)
             3. Jay 결정 대기 — Round 3 진행 or 여기서 확정
참고: Round 1(프로세스간 상태 미유지, 부트스트랩 실패)과 Round 2(게이트 트리거 자체가
      선택적이었던 더 심각한 문제) 둘 다 실제 버그를 찾았고 전부 고쳐서 실측 재검증까지
      끝냄. 남은 open item(FEEDBACK #2~#6)은 대부분 코드로 못 고치는 종류(모델 자체 한계)
      거나 마이너 튜닝 사안 — Round 3가 뭘 더 찾을지 Jay와 상의 필요.
```

## Hard constraints / warnings

- 검증 방식은 항상 완전히 새 컨텍스트의 blind 에이전트 + 실제 Kilo/로컬모델 — 절대 self-report만
  믿지 말 것(이번 라운드에서도 모델이 차단된 write를 "완료했다"고 거짓 보고한 사례 2건 발견).
- subtask-gate 변경 시 반드시 (1) 단위테스트(node --experimental-strip-types)로 로직 자체
  검증 (2) 실제 Kilo로 별도 두 프로세스 재현 — 둘 다 해야 함, 하나만으론 부족(L06/L07 교훈).

## Session 1-2 completed

| Item | Detail | Status |
|---|---|---|
| Round 1 조사 (L01-L05) + 저장소 초안 | 실제 Kilo 빌드 확인, 커스텀커맨드 미작동, 로더 확인, reasoning 이슈 해결, gate 최초 구현 | ✅ |
| Round 1 blind 검증 + 수정 5건 | bootstrap 캡초과/cleanup누락/templates미복사/무음분기/게이트 프로세스간 미유지(L06) 전부 수정+재검증 | ✅ (commit 5391d32~0e2712b) |
| Round 2 blind 검증 + 수정 2건 | 게이트 트리거 자체가 선택적이었던 문제(L07) + AGENTS.md 캡 여유부족 전부 수정+재검증 | ✅ (commit 376a1da, 7d9a286) |

## This session's top priorities

1. 위 결과를 Jay에게 보고, Round 3 여부 결정받기
2. (Round 3 진행 시) 이번엔 FEEDBACK #5(threshold=4 튜닝 미검증)를 중심으로 — 정상적인
   멀티파일 sub-task가 실수로 차단되지 않는지 확인

## Known open issues

| # | Issue | Status |
|---|---|---|
| 1 | 커스텀 슬래시커맨드 미작동(Kilo 자체 한계) | ⚠️ |
| 2 | 게이트 1회 차단 후 즉시 재시도하면 통과(설계상 의도, round 2 재확인) | 🔶 |
| 3 | "discuss" 자기서빙 2라운드 연속 실패(4중 3~4중 3) — 코드로 못 고침 | 🔴 |
| 4 | threshold=4 튜닝값 실제 멀티파일 sub-task로 미검증 | ⚠️ |
| 5 | 차단 후 모델 self-report 거짓 사례 2건(round 2) — 항상 실제 상태로 재확인 필요 | 🔴 |

## Next session's starter prompt

```
soulmate-4 이어서 진행합니다. wiki/handoffs/SESSION_PRIMER.md와 FEEDBACK_PENDING.md 읽어주세요.
Jay가 Round 3 진행을 결정했다면 위 "This session's top priorities" 2번대로, 아니면 Jay의
새 지시대로 진행해주세요.
```

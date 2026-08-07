# SESSION PRIMER — session 1

> Status icons: ✅done(evidence) ⏳code-done·unverified 🔶partial 🔴unfixed-bug ⚠️needs-user-action

## Project overview

Soulmate 4 is a memory/harness template for coding agent sessions running inside Kilo Code,
backed by a local model with a hard context ceiling (same reference hardware as soulmate-2/3:
RTX 3080 10GB VRAM, Qwen3.6-35B-A3B). It ports soulmate-2/3's discuss/design/build/verify/
self-harness methodology to Kilo's actual primitives — which turned out, after live testing, to
give it a real mechanical enforcement hook soulmate-3 (Continue) never had, at the cost of a
working custom-slash-command system soulmate-3 did have. See `wiki/PROJECT_BACKGROUND.md` for
the full entity map and `wiki/handoffs/SESSION_MASTER.md` for the full Round 1 narrative.

## Current sub-task

```
시작: scripts/bootstrap.sh, scripts/check-caps.sh (전부 존재+정확한지 확인)
목표: 이 저장소를 실제로 처음 bootstrap.sh로 새 디렉토리에 부트스트랩해서
      --bootstrap-check 통과 확인, 그다음 templates/harness-integration-test.md 전체 실행
작업 사이클: 1. scripts/bootstrap.sh <target>로 새 디렉토리에 부트스트랩
             2. cd <target> && scripts/check-caps.sh --bootstrap-check 실행, 실패 시 원인 수정
             3. Kilo로 그 디렉토리를 열고 harness-integration-test.md의 Step 0-9 전부 실행
                (특히 Step 5 — subtask-gate.ts가 실제 새 부트스트랩 결과물에서도 작동하는지,
                지금까지는 이미 손으로 세팅된 toss-in-app-mario-kart에서만 검증했음)
참고: subtask-gate.ts 자체는 이미 실전 검증 완료(L05, 실제 커밋→차단→모델이 재시도 없이 질문).
      단, "이 repo의 scripts/bootstrap.sh"로 만든 새 프로젝트에서 똑같이 작동하는지는 아직
      한 번도 안 해봄 — bootstrap.sh 자체가 이번에 새로 쓴 스크립트라 숨은 버그 가능성 있음
```

## Hard constraints / warnings

- `AGENTS.md`가 실제로 매 메시지 자동로드되는 유일한 파일 — Kilo CLI 바이너리 코드로 직접 확인함
  (L03), Continue처럼 "reference-only, 안 로드됨" 파일이 아님. 새 섹션 추가 시 줄 수 캡(60) 넘지
  않게 유의.
- `.kilo/plugins/subtask-gate.ts`는 프로젝트 로컬 `.kilo/plugins/`에서 자동로드 — 별도
  `kilo.jsonc`의 `plugin` 필드 등록 불필요, Kilo 자체 인앱 도움말 문구로 확인함(추측 아님).
- 전역 `~/.config/kilo/kilo.jsonc`는 이 템플릿이 직접 건드리지 않음 — provider/model 설정은
  이미 거기 있다고 가정.

## Session 0 completed

| Item | Detail | Status |
|---|---|---|
| Round 1 조사 (L01-L05) | Kilo 실제 빌드=opencode 재작성판 확인, 커스텀커맨드 미작동 확인, AGENTS.md/CLAUDE.md/CONTEXT.md 로더 확인, reasoning 토큰 소진 사고+`llama-server --reasoning off` 해결, `tool.execute.before` 실존 확인 | ✅ (전부 실측, `wiki/rule-archive.md`) |
| `subtask-gate.ts` 빌드+실전 검증 | `toss-in-app-mario-kart`(별도 손세팅 프로젝트)에서 커밋→차단→모델 정지 확인 | ✅ (커밋 4c1fa8c) |
| 이 저장소(soulmate-4) 구조 작성 | README/AGENTS.md/templates/scripts/wiki 전부 초안 작성 | ✅ (이번 세션) |
| `scripts/bootstrap.sh`로 실제 부트스트랩 | 아직 한 번도 실행 안 함 | 🔴 |

## This session's top priorities

1. `scripts/bootstrap.sh` 실제 실행 + `--bootstrap-check` 통과 확인
2. `templates/harness-integration-test.md` Step 0-9 전부 실행 (특히 Step 5, 새로 부트스트랩된
   프로젝트에서 게이트가 진짜 작동하는지)
3. 검증 끝나면 이 SESSION_PRIMER를 session 2로 갱신, 이 블록은 session-log로 이관

## Known open issues

| # | Issue | Status |
|---|---|---|
| 1 | `scripts/bootstrap.sh`가 실제 실행된 적이 없음 — 스크립트 자체 버그 가능성 | 🔴 |
| 2 | 커스텀 슬래시커맨드가 향후 Kilo 업데이트로 실제 구현되면 `wiki/protocols/*.md`를 다시 `.kilo/commands/*.md`로 옮기는 게 나을 수 있음 — Kilo 자체 changelog 주기적 확인 필요 | ⚠️ |

## Next session's starter prompt

```
soulmate-4 이어서 진행합니다. AGENTS.md와 wiki/handoffs/SESSION_PRIMER.md 읽어주세요(grep, 전체
읽기 금지 — rule zero). 현재 sub-task: scripts/bootstrap.sh 실제 부트스트랩 검증이 아직 안
끝났습니다. 위 "Current sub-task" 블록대로 진행해주세요.
```

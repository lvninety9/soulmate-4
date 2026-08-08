# SESSION PRIMER — session 4

> Status icons: ✅done(evidence) ⏳code-done·unverified 🔶partial 🔴unfixed-bug ⚠️needs-user-action
> This file was fully rewritten for handoff on 2026-08-08. Every claim below was re-checked
> against `git log`/actual file contents right before writing, not copied from a prior report —
> see SESSION_MASTER.md's "Round 4" section for the explicit cross-check methodology and result
> (no forced-compaction drift found).

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

## Current state — three independent blind-validation rounds, all bugs found and fixed

Every round used a **fresh, context-isolated agent** (never a context-sharing fork — that would
bias the test), given only the public repo URL, told to blindly bootstrap, pick its own small
task, and drive the real protocol against the real local model, scoring two axes (turnkey
bootstrap readiness; bounded-growth/structural integrity) with cited evidence only.

| Round | Task picked | What it found | Fix (commit) |
|---|---|---|---|
| 1 | word-frequency CLI | bootstrap literally couldn't complete (cap overflow → pre-commit block → `set -e` abort → leaked scratch clone); gate's in-memory state didn't survive separate `kilo run` calls | `5391d32`..`0e2712b` (L06) |
| 2 | LRU cache lib + tests | gate's trigger was 100% elective — reproduced a silent multi-commit chain with it never arming; fresh bootstrap left ~0 cap headroom | `376a1da`, `7d9a286` (L07) |
| 3 | config parser + test | main mandate (threshold=4 false-positive check) passed clean; found+fixed the commit-*detection* itself was regex-based (false pos/neg) | `37c384a` (L08) |

After round 3, Jay asked whether this repo's caps were set lower than the **original** soulmate
template (not soulmate-2/3, which is all this repo had been checking itself against until then).
They were: original `CLAUDE.md` = 85-line cap, Learned/Fixed Rules inline, no split file.
soulmate-4 had split Learned/Fixed Rules out to keep `AGENTS.md` at 65 lines — a choice made
without checking that precedent, and one that re-creates soulmate-3's own **L02** risk (a rule
only referenced from the auto-loaded file doesn't reliably reach ad-hoc work). Merged Rules back
into `AGENTS.md`, raised the cap to 85 to match the original exactly (`e11389d`, `fd80b6b`), and
a real re-bootstrap immediately caught a fresh off-by-one from the merge itself (template's
leading blank line → 86/85) — fixed before push (`fec44a1`), not by a 4th validation round.

**All 27 commits are pushed to `origin/master` (`d9fb565`..`fec44a1`). Working tree is clean,
nothing uncommitted, `git log` on GitHub matches local exactly** (verified this session, not
assumed).

## Current sub-task

```
시작: wiki/handoffs/FEEDBACK_PENDING.md, wiki/rule-archive.md L01-L08, SESSION_MASTER.md
목표: Jay와 "이 정도면 만족스러운가, Round 4 더 필요한가" 결정. 만약 계속한다면 Round 4는
      이번 아키텍처 재정렬(Rules를 AGENTS.md로 다시 합침, 캡 85)과 refactor.md 프로토콜
      둘 다를 새 blind 에이전트로 실제 사용해보게 하는 것이 가장 검증 안 된 부분임
작업 사이클: 1. Jay 결정 대기
             2. (계속 시) 새 fresh agent에게 "여러 파일 리팩토링" 성격의 abstract task를
                주고 refactor.md를 실제로 self-serve해서 따르는지, 백업 절차를 실제로
                하는지, AGENTS.md 85줄 구조가 여전히 잘 동작하는지 확인
             3. (만족 시) FEEDBACK #2/#3/#4/#6(전부 모델 자체 한계, 코드로 못 고침)를
                "영구 미해결로 문서에 명시" 처리하고 세션 종료
참고: refactor.md는 이번 세션에 추가만 됐고 한 번도 실전 검증 안 됨 — 지금까지 3라운드는
      전부 discuss/design/build/verify만 실전 테스트했음, refactor 단계는 아직 blind
      에이전트가 실제로 트리거해본 적이 없음
```

## Hard constraints / warnings

- 검증은 항상 fresh agent + 실제 Kilo/로컬모델, 절대 self-report만 믿지 말 것(모델이 차단된
  작업을 "완료했다"고 거짓 보고한 사례 2건 실측 확인됨, FEEDBACK #6).
- subtask-gate 변경 시 반드시 (1) Node 단위테스트로 로직 자체 검증 (2) 실제 Kilo로 별도
  두 프로세스 재현 — 이번 세션 3라운드 모두 이 순서를 지켰고 전부 실제 버그를 잡아냈음.
- 캡 숫자를 바꾸기 전엔 soulmate-3뿐 아니라 **원본 soulmate**도 직접 클론해서 실제 숫자
  확인할 것 — 이번 세션에 이걸 놓쳐서 재작업이 발생했음(SESSION_MASTER "Round 4" 참조).

## Session 1-3 completed

| Item | Detail | Status |
|---|---|---|
| Round 1-3 조사 (L01-L08) + 저장소 초안·refactor.md 추가 | 상세는 위 표 + SESSION_MASTER.md | ✅ |
| 아키텍처 재정렬 (원본 soulmate 대비 검증) | Learned/Fixed Rules를 AGENTS.md로 병합, 캡 85로 상향, 재부트스트랩 검증 | ✅ |
| Jay 피드백 반영 | "당신 판단을 믿겠다" → 원본 정합성 우선 판단으로 병합 결정, 근거 SESSION_MASTER에 기록 | ✅ |

## This session's top priorities

1. Jay에게 종합 점수 보고 완료(턴키 ~90, 구조무결성 ~80 추정 — 원본의 98.75점엔 라운드 수
   차이로 아직 못 미침, 잔여 이슈 대부분 모델 자체 한계로 점수 천장 있음)
2. Round 4 진행 여부 결정 대기 — 진행 시 refactor.md 실전 검증이 최우선

## Known open issues (전부 코드로 못 고치는 종류거나 미검증 항목)

| # | Issue | Status |
|---|---|---|
| 1 | 커스텀 슬래시커맨드 Kilo CLI 미작동(Kilo 자체 한계, 미래 업데이트로 바뀔 수 있음) | ⚠️ |
| 2 | 게이트 1회 차단 후 즉시 재시도하면 통과 — 설계상 의도, 3라운드 걸쳐 재확인됨 | 🔶 |
| 3 | "discuss" 자기서빙 3라운드 중 최소 2라운드 실패(모델이 파일 안 읽고 단어만으로 추론) | 🔴 |
| 4 | 차단 후 모델 self-report 거짓 사례 2건 — 항상 실제 git/파일 상태로 재확인 필요 | 🔴 |
| 5 | `refactor.md` 프로토콜 자체가 아직 한 번도 blind 에이전트로 실전 검증 안 됨 | ⚠️ |
| 6 | Hermes/soulmate 1-3에 refactor.md 백포트 — Jay가 "soulmate-4 검증 마친 뒤로" 명시적으로 미룸 | ⚠️ |

## Next session's starter prompt

```
soulmate-4 이어서 진행합니다. 먼저 wiki/handoffs/SESSION_PRIMER.md 전체와
wiki/handoffs/SESSION_MASTER.md의 "Round 4" 섹션을 읽어주세요. 지금까지 3라운드 독립 blind
검증 + 아키텍처 재정렬까지 전부 완료, push 완료된 상태입니다(git log d9fb565..fec44a1,
origin과 동기화 확인됨).

Jay가 Round 4(refactor.md 실전 검증) 진행을 결정했다면 위 "Current sub-task" 블록대로
새 fresh agent를 띄워 리팩토링 성격의 abstract task로 검증해주세요. 아니면 Jay의 새
지시대로 진행해주세요.
```

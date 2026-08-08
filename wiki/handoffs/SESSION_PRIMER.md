# SESSION PRIMER — session 5 (complete)

> Status icons: ✅done(evidence) ⏳code-done·unverified 🔶partial 🔴unfixed-bug ⚠️needs-user-action
> Rewritten for handoff on 2026-08-08 after round 4 (blind refactor.md validation) AND its fix
> (built + live re-verified, same session). Every claim below was re-checked against `git log`/
> actual file contents right before writing — see SESSION_MASTER.md's "Round 4 (blind)" section
> for full narrative, `wiki/rule-archive.md` L09 for full evidence.

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

## Current state — four blind-validation rounds done, all findings fixed and re-verified

Every round used a **fresh, context-isolated agent** (never a context-sharing fork — that would
bias the test), given only the public repo URL, told to blindly bootstrap, pick its own small
task, and drive the real protocol against the real local model, scoring two axes (turnkey
bootstrap readiness; bounded-growth/structural integrity) with cited evidence only.

| Round | Task picked | What it found | Fix (commit) |
|---|---|---|---|
| 1 | word-frequency CLI | bootstrap literally couldn't complete (cap overflow → pre-commit block → `set -e` abort → leaked scratch clone); gate's in-memory state didn't survive separate `kilo run` calls | `5391d32`..`0e2712b` (L06) |
| 2 | LRU cache lib + tests | gate's trigger was 100% elective — reproduced a silent multi-commit chain with it never arming; fresh bootstrap left ~0 cap headroom | `376a1da`, `7d9a286` (L07) |
| 3 | config parser + test | main mandate (threshold=4 false-positive check) passed clean; found+fixed the commit-*detection* itself was regex-based (false pos/neg) | `37c384a` (L08) |
| 4 | refactor a seeded, real, pre-existing messy-but-working module | self-serve of `refactor.md` never fired, 3/3 trials (abstract/literal-word/cross-process) — no backup branch, no per-unit commits, one trusted no-op verify command, one undetected regression | `65dd69e`..`450f587` (L09), **live re-verified** |

After round 3, Jay asked whether this repo's caps were set lower than the **original** soulmate
template (not soulmate-2/3, which is all this repo had been checking itself against until then).
They were: original `CLAUDE.md` = 85-line cap, Learned/Fixed Rules inline, no split file.
soulmate-4 had split Learned/Fixed Rules out to keep `AGENTS.md` at 65 lines — a choice made
without checking that precedent, and one that re-creates soulmate-3's own **L02** risk (a rule
only referenced from the auto-loaded file doesn't reliably reach ad-hoc work). Merged Rules back
into `AGENTS.md`, raised the cap to 85 to match the original exactly (`e11389d`, `fd80b6b`), and
a real re-bootstrap immediately caught a fresh off-by-one from the merge itself (template's
leading blank line → 86/85) — fixed before push (`fec44a1`), not by a 4th validation round.

**Round 4's fix, live re-verified this session**: `subtask-gate.ts` now blocks a session's first
mutating tool call unless a `wiki/protocols/*.md` doc was read this session. 6/6 isolated unit
tests passed (Node, no Kilo), then a real, live, single-process re-run of round 4 trial 1's exact
prompt against a fresh bootstrap: the first `write` was blocked, and the model's very next moves
were reading `refactor.md`, checking `git status`, creating a named recovery branch, stating the
rollback command in text *before* editing, running a real `pytest` (self-corrected `python` →
`python3` after the first failed), and committing per file — every claim that failed 3/3 in round
4 passed this time, no regression (independently re-verified: 9/9 tests, diffed the logic myself).
Had to wait ~8h mid-session for Hermes's Seam longform cron to clear the shared GPU first (L11 —
VRAM was at ~9.2/10.2GB when the fix landed).

**All commits through this session are committed locally on `master`. Not yet pushed to
`origin/master` — push once Jay reviews this handoff** (last pushed commit: `fec44a1`; local
HEAD is several commits ahead, see `git log fec44a1..HEAD --oneline`).

## Current sub-task

```
시작: 없음 — round 4 완료, fix 완료, 재검증 완료. 다음 세션은 새 작업 시작점.
목표: (1) Jay 리뷰 후 push, (2) 그다음 뭘 할지는 아래 "다음 우선순위" 참고
작업 사이클: 없음(이 세션의 sub-task는 완결)
```

## Hard constraints / warnings

- 검증은 항상 fresh agent(또는 이번처럼 직접 재현) + 실제 Kilo/로컬모델, 절대 self-report만
  믿지 말 것(모델이 차단된 작업을 "완료했다"고 거짓 보고한 사례 2건 실측 확인됨, FEEDBACK #6).
- subtask-gate 변경 시 반드시 (1) Node 단위테스트로 로직 자체 검증 (2) 실제 Kilo로 최소 1회
  실전 재현 — L06/L07/L08/L09 전부 이 순서를 지켰고 전부 실제 버그를 잡았거나(전자) fix를
  확인했다(후자).
- 캡 숫자를 바꾸기 전엔 soulmate-3뿐 아니라 **원본 soulmate**도 직접 클론해서 실제 숫자
  확인할 것 — 세션 4에 이걸 놓쳐서 재작업이 발생했음.
- **round 4가 뒤집은 가정**: "self-serve가 4개 프로토콜(discuss 제외)에서 됐으니 refactor도
  될 것"은 틀렸음 — 프로토콜마다 별도로 실측 검증해야 함(discuss도 FEEDBACK #4로 실패 확인돼
  있었으니 사실 2/6이 실패였던 셈). L09 fix 이후에도 이 습관은 유지할 것 — fix가 이번 1회
  재현에서 통했다고 "완전히 고쳐졌다"고 단정 말 것(L06/L07도 다회 검증 후 확정했음).
- GPU는 Hermes와 물리적으로 공유(RTX 3080 10GB) — `kilo run` 실전 테스트 전 항상
  `ps aux | grep -E "longform|tts_runner|ComfyUI|music"` + `nvidia-smi`로 실제 여유 확인할 것.

## Session 1-5 completed

| Item | Detail | Status |
|---|---|---|
| Round 1-3 조사 (L01-L08) + 저장소 초안·refactor.md 추가 | 상세는 위 표 + SESSION_MASTER.md | ✅ |
| 아키텍처 재정렬 (원본 soulmate 대비 검증) | Learned/Fixed Rules를 AGENTS.md로 병합, 캡 85로 상향, 재부트스트랩 검증 | ✅ |
| Round 4 blind 검증 (refactor.md) | 3독립시행 전부 self-serve 실패 확인(L09) | ✅ |
| L09 fix 구현 + 재검증 | first-mutation protocol-read 체크, 단위테스트 6/6 + 실전 재현 1/1 | ✅ |
| 아카이빙 목적지 패턴 신설 (Jay 지시, Hermes 스토리지 논의에서 파생) | `<file>-archive.md` 컴패니언 + 포인터 1줄, 3개 append-only 파일 공통 적용. `self-harness.md`의 재정렬 이전 `PROJECT_BACKGROUND.md` 참조 stale 버그도 같이 수정. 즉시 실사용: SESSION_MASTER.md 231→149줄로 아카이빙 완료 | ✅ |

## This session's top priorities (다음 세션용)

1. 이 핸드오프를 Jay가 리뷰하면 `git push` (현재 로컬만 커밋됨)
2. FEEDBACK #7(verification command 이름 불명확, round 4 trial 3에서 no-op 명령을 통과로 오인)
   — 아직 코드로 안 고침, 다음 우선순위 후보
3. FEEDBACK #6(Hermes/soulmate 1-3에 refactor.md 백포트) — Jay가 "soulmate-4 검증 마친 뒤로"
   미뤄뒀는데, round 4+L09까지 끝났으니 이제 이 조건이 충족됐는지 Jay에게 확인

## Known open issues (전부 코드로 못 고치는 종류거나 미결 항목)

| # | Issue | Status |
|---|---|---|
| 1 | 커스텀 슬래시커맨드 Kilo CLI 미작동(Kilo 자체 한계, 미래 업데이트로 바뀔 수 있음) | ⚠️ |
| 2 | 게이트 1회 차단 후 즉시 재시도하면 통과 — 설계상 의도, 4라운드 걸쳐 재확인됨(L09도 동일 트레이드오프로 설계) | 🔶 |
| 3 | "discuss" 자기서빙 3라운드 중 최소 2라운드 실패(모델이 파일 안 읽고 단어만으로 추론) | 🔴 |
| 4 | 차단 후 모델 self-report 거짓 사례 2건 — 항상 실제 git/파일 상태로 재확인 필요 | 🔴 |
| 6 | Hermes/soulmate 1-3에 refactor.md 백포트 — round 4+L09 완료로 Jay가 미뤄둔 조건 충족, 재확인 필요 | ⚠️ |
| 7 | `refactor.md`/`build.md`가 "verification command"를 구체적으로 명명 안 함 — no-op 명령을 모델이 통과로 오인한 실측 사례 있음(round 4 trial 3, 단 재검증 시행에선 모델이 스스로 올바른 명령으로 재시도함) | 🔴 |

## Next session's starter prompt

```
soulmate-4 이어서 진행합니다. wiki/handoffs/SESSION_PRIMER.md 전체를 읽어주세요.

Round 4(blind refactor.md 검증) + L09 fix 구현 + 실전 재검증까지 전부 완료됐고 로컬에
커밋돼 있습니다(origin에는 아직 미push — fec44a1이 마지막 push 지점). git push부터
확인한 뒤, "This session's top priorities" 목록(백포트 여부 확인, FEEDBACK #7 등) 순서로
진행해주세요.
```

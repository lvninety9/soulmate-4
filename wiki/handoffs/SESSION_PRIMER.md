# SESSION PRIMER — round 26 re-scored (turnkey 82, structural 81); Jay's consolidation checkpoint

> Status icons: ✅done(evidence) ⏳code-done·unverified 🔶partial 🔴unfixed-bug ⚠️needs-user-action
> **Role: current-state only — no "why" narrative** (full round-by-round narrative lives in
> `FEEDBACK_PENDING.md`'s Completed History rows #14-32 — read those for detail).
> Rewritten 2026-08-20 at Jay's request for a rigorous, non-rushed handoff — every claim below was
> re-checked against `git log`/actual test output at rewrite time, not copied forward. Jay:
> "컨텍스트가 부족하다고... 급마무리 하지 말고, 새 세션의 유일한 힌트니 꼼꼼히 인계할 것."

## Project overview

`soulmate-4` is a session-handoff harness template for coding agents behind **Kilo Code**, talking
to a local LLM with a hard context ceiling (RTX 3080 10GB, physically **shared with an unrelated
production system "Hermes"** — see Hard constraints). 4th in a lineage (soulmate→-2→-3→-4);
exists because soulmate-3 (Continue-based) had no way to *mechanically* stop a local model
mid-session — only a commit-time git hook, too late. `.kilo/plugins/subtask-gate.ts` is the
payoff: a real `tool.execute.before/after` mechanical brake (Kilo genuinely exposes this hook,
confirmed by reading the installed binary, L01).

**Goal**: earn a score comparable to the *original* `soulmate` repo's own real result (87/100
turnkey, 98.75/100 structural, over 13 rounds — never combined into one number; closing bar was
"90+ or maintainer satisfaction after zero new findings on a serious adversarial pass," not
literal 100). **Method**: repeating loop — fresh non-fork blind agent scores → fix highest-
leverage issue with live verification (real pre-commit hook + real commit) → repeat.

**This thread ran the loop 26 times** in one very long conversation (multi-hour gaps + one 9-day
gap mid-thread, see "Session continuity"), a side project alongside real Hermes production work
at Jay's own request. **Jay called an explicit consolidation checkpoint at round 26** — not the
end of the loop, an intentional pause for a clean handoff.

## Current score: turnkey 82/100, structural 81/100 (round 26; up from round 8's 78/74 baseline)

Neither axis has reached the original's 87/98.75. Structural has never hit the "zero new findings"
convergence bar — every round through 24 found something new, even as each mechanism got
genuinely better-engineered (real architectural progress, not cosmetic churn).

## Trajectory (1-paragraph-per-era; full detail = `FEEDBACK_PENDING.md` rows #14-32)

**Rounds 1-7**: built the gate from scratch; fixed it not surviving across processes, being 100%
elective to arm, regex-based commit detection, `refactor.md` self-serve never firing (3/3 blind
trials). Realigned `AGENTS.md` cap to the real original's 85. Established `<file>-archive.md`
PRUNE pattern.

**Rounds 8-14**: first outside audits (turnkey 87→74, real gap from self-assessment). FEEDBACK #3
(gate retry-bypass) and #4/#12 (nudge not changing behavior) found+closed/mitigated — #4/#12's
CLI-invisibility half confirmed structurally unfixable with real `@kilocode/plugin` hooks, a
permanent disclosed ceiling.

**Rounds 11-26 (15 rounds) — `check_stale_language()` in `scripts/check-caps.sh`** (catches stale
mechanism-state claims in docs): long real bug chain, each fix closing what was found while
leaving one edge for the next round — didn't enforce (12→13) → wrap-evasion + missing exemption
sibling (14→15) → **Jay's structural pivot, round 16** (stop point-patching an unbounded space):
naming-pattern exemption + 19-case fuzz suite, found 2 bugs on first run → fence/inline-code false
positives, fixed via reorder not special-case (17→18, recurred again 22→23) → HTML-comment/
frontmatter false positives, generic table fix, Jay explicitly capped scope (no chasing every
CommonMark construct — tables/`<details>`/link-refs permanently out of scope) (19→20) → **the one
genuinely dangerous bug**: greedy-regex silent-miss, Jay's call to switch to `index()`-based
search (20→21) → different silent-miss, unclosed comment exempting to EOF unwarned, parity-check
fix (21→22) → parity check not backtick-aware, reorder fix (22→23) → **deliberately NOT fixed**:
bare cross-paragraph token pairing (the fix broke real content in this repo's own templates,
reverted, documented as permanent limitation) (23) → wording-only fix (23→24) → **round 24's
audit found nothing new** — judged done, recommended widening scope.

**Round 25 — first dedicated turnkey audit since ~17-18** (turnkey 82→78, real findings): dead
README cross-reference inherited from the port; **finally found the root cause of the 3×-recurring
AGENTS.md-headroom bug** — template ships pre-populated with harness-dev history, not blank;
`tests/` missing from README's file tree; zero onboarding visibility for the most-engineered
mechanism here. Also confirmed `check_fence_parity()`'s odd/even blind spot is **inherited** from
the original (vs. a fresh clone), not a soulmate-4 regression.

**Round 26 — fixed all 3 round-25 findings, re-scored 78→82/80→81**: A-D cross-reference now
resolves to a real ported section; `AGENTS.md.template` headroom genuinely 73/85 after fresh-
bootstrap+one-row (**partial** — a full blank rewrite would break `check_template_drift()`'s
current design, a real disclosed tradeoff); `tests/` + stale-sweep note added. Round 26's own
audit re-confirmed all 3 hands-on, spot-checked `pre-commit-check-caps` (real 93-line AGENTS.md,
real commit genuinely rejected) — **found nothing new**. New minor item, not fixed: `bootstrap.sh`
never creates/copies a `README.md`, undocumented.

## Meta-lessons

1. "Reorder, don't patch" recurred 3× (17-18, 22-23) between exclusion-mechanism stage pairs —
   re-derive order explicitly if adding a new one. 22/26 rounds found a real new issue (not
   noise); the 2 clean rounds (24, 26) came only after many prior hardening rounds on that
   mechanism — a clean round is a real signal, not evidence of a weak audit.
2. Nearly every fix-fork hit the same mistake once: a cleanup `git reset --hard`/`git stash`
   wiping their own uncommitted fix mid-verification (always caught, never lost work, wasted
   time) — **commit the fix before any destructive git cleanup, not after.**
3. **Reference-doc check, closed**: `github.com/multica-ai/andrej-karpathy-skills` — same 4
   Karpathy principles soulmate-4 already implements via Hermes's CLAUDE.md. Nothing to adapt.

**Session continuity note**: this thread had a **9-day real wall-clock gap** mid-conversation,
zero visibility into that period. Every claim here was independently re-verified (fresh clone, 10
spot-checked commit hashes, both test suites re-run) — zero discrepancies. Hold future handoffs
to this standard: spot-check `git log`/real test output before trusting any doc, after any gap.

## Hard constraints / warnings

- Never trust a live re-run as "fully fixed" — unit test AND live-verify via a real pre-commit
  hook + real commit, not code-reading alone. Every `subtask-gate.ts` change needs both.
- GPU is shared with real Hermes production jobs — check `~/.hermes/longform/.render.lock` +
  `ps aux | grep -E "longform|tts_runner|ComfyUI|music_pipeline|playlist_compiler"` + `nvidia-smi`
  before `kilo run`, wait if busy.
- **⚠️ `kilo` CLI was NOT INSTALLED as of round 26's audit** (`which kilo` found nothing) —
  silently degraded that round's gate verification to unit-tests-only. Confirm `kilo --version`
  first; check `~/.cursor/extensions/kilocode.kilo-code-*/bin/kilo` or `/tmp/kilo_env.sh`.
- Before changing any cap number, check the original `soulmate` repo's real number fresh.
  `templates/AGENTS.md.template` must stay byte-identical to `AGENTS.md` from `## Language`
  onward — `check_template_drift()` catches this, only when run.

## Known open issues (numbers match `FEEDBACK_PENDING.md`)

| # | Issue | Status |
|---|---|---|
| 2 | Custom slash commands don't work in Kilo CLI v7.4.20 — Kilo's own limitation | ⚠️ p2, open |
| 4/12 | `discuss.md` nudge wording fix works; CLI-invisibility half structurally unfixable | 🔴 p1, permanent ceiling |
| 6 | Model self-report fabrication after a gate block — inherent LLM unreliability | 🔴 p1, permanent ceiling |
| — | Bare cross-paragraph token gap (incl. wrap-split-backtick) — fixing it breaks real content | 🔴 p2, accepted limitation |
| — | `check_fence_parity()` odd/even blind spot — inherited from original, shared upstream | 🔴 p2, low urgency |
| — | `bootstrap.sh` doesn't create/copy `README.md`, undocumented (round 26) | 🔴 p2, low severity |

## Recommended next step (round 26's own conclusion)

**Stop iterating on `check_stale_language()`** (9+ rounds, 42/42 fuzz, round 24 found nothing
new). Run a fresh adversarial pass on `check_fence_parity()`, `check_template_drift()`, and
bootstrap-placeholder/primer-handoff checks — untested in many rounds, mirroring how the
original's own final rounds widened scope, not narrowed it, to reach convergence.

## Next session's starter prompt

```
soulmate-4 이어서 진행합니다 (Jay 명시 지시: 컨텍스트 부족 핑계로 급마무리 금지, 이 문서가
새 세션의 유일한 힌트).

wiki/handoffs/SESSION_PRIMER.md 전체를 읽고, git log/status로 모든 주장(점수 턴키82/구조81,
HEAD 커밋)을 직접 재검증할 것 — 문서만 믿지 말 것. 26라운드 내내 이게 매번 승부를 갈랐습니다.

현재 상태: Round 26까지 완료(턴키 78→82, 구조 80→81). Jay가 이 시점에서 정리·인계를 명시
요청해서 체크포인트를 찍은 것 — 루프 종료 아니라 의도적 일시정지.

⚠️ 가장 먼저: kilo CLI 설치 여부 확인(`kilo --version`) — round 26엔 없어서 단위테스트로
대체했습니다.

다음 우선순위(round 26 감사 결론): check_stale_language()는 그만 파고, check_fence_parity·
check_template_drift·부트스트랩 placeholder/primer-handoff 체크처럼 오래 안 건드린 메커니즘에
새 적대적 감사를 돌릴 것 — 원본도 마지막 수렴 라운드는 범위를 넓혀서 98.75까지 갔습니다.

방식 동일: fresh non-fork 에이전트 blind 채점(재클론, 실제 pre-commit hook+실커밋 검증 필수)
→ 최고우선순위 fix → 재채점, 반복. kilo run 전 GPU/Hermes 크론 확인 필수(공유 머신). Jay 기준:
구조축이 원본 98.75(적대적 시도에도 새 발견 0건)에 근접하면 합격, push 후 마무리.
```

# SESSION PRIMER — ready for round 28 (turnkey 82, structural 81 — last full audit round 26)

> Status icons: ✅done(evidence) ⏳code-done·unverified 🔶partial 🔴unfixed-bug ⚠️needs-user-action
> **Role: current-state only — no "why" narrative** (round-by-round detail: `FEEDBACK_PENDING.md`
> rows #19-38 for rounds 9-27, `wiki/feedback-archive.md` for rounds 1-8, `SESSION_MASTER.md` for
> the round-27 stale-clone incident/PRUNE pass/this handoff's own re-verification — "why" lives
> there, not here).
> Rewritten 2026-08-22, a Jay-requested handoff-rigor pass (not a new audit/fix round): every claim
> below independently re-checked against fresh-cloned `origin/master` — real `git log`, real
> `node --experimental-strip-types tests/*.test.mjs`/`check-caps.sh` output, a direct read of
> `.kilo/plugins/subtask-gate.ts` — not against any prior report. **No discrepancy found**; see
> `SESSION_MASTER.md`'s "Handoff-rigor verification pass" for exactly what was checked.

## Project overview

`soulmate-4` is a session-handoff harness template for coding agents behind **Kilo Code**, talking
to a local LLM with a hard context ceiling (RTX 3080 10GB, physically **shared with an unrelated
production system "Hermes"** — see Hard constraints). `.kilo/plugins/subtask-gate.ts` is the
payoff: a real `tool.execute.before/after` mechanical brake (Kilo genuinely exposes this hook).

**Goal**: earn a score comparable to the *original* `soulmate` repo's own real result (87/100
turnkey, 98.75/100 structural, over 13 rounds). **Method**: repeating loop — fresh non-fork blind
agent scores → fix highest-leverage issue with live verification → repeat. Jay called an explicit
consolidation checkpoint at round 26; round 27 is a targeted fix cycle within that pause, not a
resumption of the full audit loop (that resumes whenever Jay next asks for one).

## Current score: turnkey 82/100, structural 81/100 — from round 26, the last FULL audit

**Important for round 28**: this score is round 26's, carried forward unchanged. Round 27 was a
targeted fix cycle (2 candidate findings, not a fresh blind audit) — it landed one real structural
change (the `session.idle` hook, see below) but that change is **UNSCORED**: no audit has run
against it yet. Do not assume the 82/81 already reflects round 27's own changes — it doesn't.
Round 28's job is to find out what the real current score is.

**This project's closing bar** (mirrors the original `soulmate`'s own convergence pattern):
turnkey 90+, OR a clean audit pass with zero new findings. Rounds 24 and 26 both already came back
clean (`FEEDBACK_PENDING.md` rows #33, #35) — 2 clean passes toward convergence, not yet the
confirmatory 3rd. See "Recommended next step" below.

## Round 27 (this round) — code state now, full story in SESSION_MASTER.md/FEEDBACK_PENDING.md

A round-8-style audit was mistakenly run against a frozen round-7 local clone instead of real
origin/master — see "Hard constraints" (L13) and `SESSION_MASTER.md` for the incident itself.
2 candidates came out of it, independently re-checked against real current code:

**Finding B — landed (`193b16b`)**: `.kilo/plugins/subtask-gate.ts` now has a real `event` hook —
on `session.idle` with a dirty working tree, sends a synthetic `client.session.prompt({noReply:
true})` nudge naming the real uncommitted files, deduped per session on the dirty-file-set
signature. Closes part of row #15's "can't catch a session abandoned outright" gap. Live-verified
via `kilo serve` + raw HTTP (correct file names, no fabrication on recall, dedup held); 24/24 unit
tests. Full evidence: `wiki/rule-archive.md` "Round 27", `FEEDBACK_PENDING.md` row #37.

**Finding A — investigated, reverted, not in current code**: the candidate `<system-reminder>`-tag
wrap for the carryover-warning was re-tested rigorously (7 live trials, 3 phrasings) and **did
not** hold (4/5 post-fix failures) — contradicts the stale audit's own reported numbers. No trace
of this change remains in `subtask-gate.ts`. Extends row #6's ceiling; full evidence:
`FEEDBACK_PENDING.md` row #38.

## Meta-lessons

1. "Reorder, don't patch" recurred 3× (17-18, 22-23) between exclusion-mechanism stage pairs.
2. Commit the fix before any destructive git cleanup, not after — every fix-fork before round 27
   hit this once; round 27 avoided it.
3. **A citation fix (round 9) ≠ re-verifying the substantive claim it was attached to** — round
   5's "no end-of-turn hook" claim survived 18 rounds after its citation got corrected, because
   nobody re-checked the *content* against the *correct* package, only the *label* (L12).
4. A test that only asserts "did it throw" can pass even when the specific mechanism it's meant to
   isolate is broken, if an unrelated gate throws first (round 27's own T11b bug, caught before
   commit) — assert on the *specific* error/effect, not just presence.

## Hard constraints / warnings

- Never trust a live re-run as "fully fixed" — unit test AND live-verify via a real pre-commit
  hook + real commit, not code-reading alone. Every `subtask-gate.ts` change needs both.
- GPU is shared with real Hermes production jobs — check `~/.hermes/longform/.render.lock` +
  `ps aux | grep -E "longform|tts_runner|ComfyUI|music_pipeline|playlist_compiler"` + `nvidia-smi`
  before `kilo run`, wait if busy. Generation latency varies 50ms-30s+ turn to turn — budget
  generous timeouts, not fixed ones.
- `kilo` CLI **was confirmed installed and working** as of round 27 (`kilo --version` → 7.4.23,
  at `~/.cursor/extensions/kilocode.kilo-code-7.4.23-linux-x64/bin/kilo`, not on default `PATH`) —
  re-check fresh, don't assume this location still holds.
- Before changing any cap number, check the original `soulmate` repo's real number fresh.
  `templates/AGENTS.md.template` must stay byte-identical to `AGENTS.md` from `## Language`
  onward — `check_template_drift()` catches this, only when run.
- `FEEDBACK_PENDING.md` was PRUNE'd (not a numbered round) after round 27 hit its 40/40 cap: rows
  #1/#3/#5/#7-#11/#14-#18 moved to `wiki/feedback-archive.md`, open rows #4/#12 merged. Now 32/40 /
  3/25 — real headroom for round 28's findings.
- **L13**: a local clone's own `git log` looking coherent proves nothing about its freshness vs.
  `origin/master` — round 27's audit ran 19 rounds stale with zero errors/warnings. Always `git
  fetch`+diff origin, or fresh-clone, before trusting a local checkout for an audit-shaped task.

## Known open issues (numbers match `FEEDBACK_PENDING.md`)

| # | Issue | Status |
|---|---|---|
| 2 | Custom slash commands don't work in Kilo CLI v7.4.20+ — Kilo's own limitation | ⚠️ p2, open |
| 4/12 | `discuss.md` nudge wording fix works; CLI-invisibility half structurally unfixable | 🔴 p1, permanent ceiling |
| 6/38 | Model self-report fabrication after a gate block, or when asked to recall an injected notice — inherent LLM unreliability, tag-wrap mitigation tried and did not help | 🔴 p1, permanent ceiling |
| 15/37 | Session-abandoned-outright gap partially closed (round 27's `session.idle` hook) — still can't catch a session that's killed before the idle event fires | 🔶 p1, partial |
| — | Bare cross-paragraph token gap (incl. wrap-split-backtick) — fixing it breaks real content | 🔴 p2, accepted limitation |
| — | `check_fence_parity()` odd/even blind spot — inherited from original, shared upstream | 🔴 p2, low urgency |
| — | `bootstrap.sh` doesn't create/copy `README.md`, undocumented (round 26) | 🔴 p2, low severity |

## Recommended next step — round 28's actual mission

**Round 28 must be a full fresh blind audit, not another fix cycle.** Two concrete things only a
real audit can answer:

1. Does round 27's `session.idle` hook (`193b16b`) actually move the score — and does it hold
   under fresh adversarial live testing, not just its own unit tests/live-verification?
2. Is this the **3rd consecutive clean pass** (after rounds 24 and 26) confirming real convergence
   near this project's own closing bar (90+ turnkey, or zero new findings) — or does a genuinely
   fresh adversarial angle still find something, the way round 25 did after round 24's clean pass?

Round 26's own leftover recommendation still applies as a secondary target if the primary audit
has spare scope: `check_fence_parity()`, `check_template_drift()`, and bootstrap-placeholder/
primer-handoff checks haven't been targeted by a fresh adversarial pass in many rounds.
`FEEDBACK_PENDING.md`'s PRUNE pass is done (32/40 lines, 3/25 open rows) — real headroom exists
for whatever round 28 finds.

## Next session's starter prompt

```
soulmate-4 round 28을 시작합니다. **반드시 `git clone`으로 완전히 새로 시작할 것** — 로컬
클론(마지막 pull 시점 불명)은 git log가 멀쩡해 보여도 origin/master보다 뒤처져 있을 수 있음
(round 27이 정확히 이 실수로 시작된 감사를 나중에 정정한 라운드, L13/rule-archive.md 참조).
fresh clone 아니면 최소 `git fetch`+`origin/master` diff 후 시작할 것.

wiki/handoffs/SESSION_PRIMER.md 전체를 읽고, 모든 주장(점수 턴키82/구조81, HEAD 커밋, 테스트
통과 개수)을 git log/실제 테스트 실행/check-caps.sh로 직접 재검증할 것 — 문서만 믿지 말 것
(직전 handoff-rigor 세션이 이미 한 차례 검증해 불일치 없음을 확인했지만, 그 결과도 그대로
믿지 말고 직접 재현할 것).

**round 28의 임무는 전면 재감사(fresh blind audit) — 좁은 fix cycle 아님.** round 27이 추가한
session.idle 훅(`193b16b`, FEEDBACK #37)은 아직 미채점. 답해야 할 것 2가지: (1) 이 훅이 신선한
적대적 라이브 테스트에서도 버티는가. (2) 이번이 (round 24, 26에 이어) **3번째 연속 clean
pass**로 이 프로젝트의 종료 기준(턴키 90+, 또는 새 발견 0건)에 수렴하는 신호인가 — 아니면
round 25처럼 새 각도에서 또 뭔가 나오는가.

⚠️ 먼저 `kilo --version` 직접 확인(round 27 기준 PATH 밖, 바뀌었을 수 있음). GPU는 Hermes와
공유 — `kilo run` 전 `ps aux | grep -E "longform|tts_runner|ComfyUI|music_pipeline"` +
`nvidia-smi` 확인 필수. 여유 있으면 check_fence_parity·check_template_drift·부트스트랩
placeholder/primer-handoff 체크도 감사 범위에(round 26 미완 권고).

방식: fresh non-fork 에이전트 blind 채점(재클론, 실제 pre-commit hook+실커밋 검증) → 최고우선
순위 fix → 재채점, 반복. clean이면 억지 finding 만들지 말고 그대로 clean 보고. push 후
SESSION_PRIMER.md 갱신.
```

# SESSION PRIMER — round 27 (turnkey 82, structural 81 — unchanged from round 26's checkpoint)

> Status icons: ✅done(evidence) ⏳code-done·unverified 🔶partial 🔴unfixed-bug ⚠️needs-user-action
> **Role: current-state only — no "why" narrative** (full round-by-round narrative lives in
> `FEEDBACK_PENDING.md`'s Completed History rows #14-38 — read those for detail).
> Rewritten 2026-08-21 for round 27, a fix cycle (not a full re-audit) on 2 candidate findings
> from a round-8-style audit mistakenly run against the frozen round-7 clone. Every claim below
> was independently re-checked against `git log`/real `kilo run` output at rewrite time.

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

## Current score: turnkey 82/100, structural 81/100 (unchanged — round 27 didn't re-score)

Round 27 landed one real structural fix (see below) but did not run a fresh blind audit pass, per
its own scope ("fix cycle, not full audit"). The score above is carried forward from round 26,
not re-verified this round — the next full audit should re-check it, not assume it still holds.

## Round 27 (this round) — 2 candidate findings, 1 landed, 1 investigated-and-rejected

A round-8-style audit was mistakenly run against the frozen round-7 local clone instead of real
origin/master (round 8-26 history), surfacing 2 candidates that needed checking against the real
current code before trusting either:

**Finding B — landed**: `chat.message`'s own code comment (round 5, re-cited but never
re-verified against the real package after round 9 fixed its wrong-name citation) claimed
opencode's plugin API "has no end-of-turn/end-of-session hook at all." **False**, re-checked
against the actually-installed `@kilocode/plugin` v7.4.20: `Hooks.event` exposes `session.idle`
(fires once per completed turn, confirmed via a raw SSE capture against a real `kilo serve`), and
`KiloClient.session.prompt()` genuinely accepts `noReply: boolean`. Added the `event` hook: on
`session.idle` with a dirty tree, appends a synthetic nudge via `client.session.prompt({noReply:
true})` naming the real uncommitted files, deduped per session on the dirty-file-set signature.
Closes part of L11/row #15's "can't catch a session abandoned outright" limitation — a turn that
ends dirty with no next message in the session now gets a mechanical nudge anyway. Live-verified
end-to-end via `kilo serve` + raw HTTP (exactly one nudge naming real files; a follow-up message
correctly quoted them back, no fabrication; a repeat idle for the same unresolved state produced
zero duplicate nudges). 24/24 unit tests (7 new — T11b initially gave a false pass from an
unrelated gate masking the real assertion, caught and fixed while verifying). Committed through
the real installed pre-commit hook (`193b16b`). See `FEEDBACK_PENDING.md` row #37.

**Finding A — investigated, not landed**: candidate claimed wrapping the carryover-warning text
in `<system-reminder>` tags fixes unreliable model attention (stale audit reported 2/2
fabrication/denial → 0/2 after the wrap). Live-reproduced the failure against **current** code
first (real: 2/2 denial/fabrication, confirmed via `kilo export` the warning genuinely lands in
context both times) — then applied the identical fix and re-tested rigorously: 7 live trials
across 3 prompt phrasings, pre- and post-fix. **Directly contradicts the stale audit's claim**:
post-fix still failed 4/5. Reliability tracked prompt phrasing far more than delivery format.
Reverted the code change (no demonstrated benefit); extends row #6's existing ceiling to this
specific mitigation hypothesis explicitly. See `FEEDBACK_PENDING.md` row #38.

## Meta-lessons

1. "Reorder, don't patch" recurred 3× (17-18, 22-23) between exclusion-mechanism stage pairs.
2. Commit the fix before any destructive git cleanup, not after — every fix-fork before round 27
   hit this once. Round 27 avoided it by never running a destructive git op mid-fix.
3. **A package-name citation fix (round 9) is not the same as re-verifying the substantive claim
   that citation was attached to** — round 5's "no end-of-turn hook" claim survived 18 rounds
   after its citation got corrected, because nobody re-checked the *content* against the
   *correct* package, only the *label*. Re-verify claims, not just their citations, after a
   citation-only fix.
4. A test that only asserts "did it throw" can pass even when the specific mechanism it's meant
   to isolate is broken, if an unrelated gate throws for a different reason first (round 27's own
   T11b bug, caught before commit) — assert on the *specific* error/effect, not just presence.

**Session continuity note**: hold future handoffs to the round-9 standard — spot-check `git
log`/real test output before trusting any doc, after any gap. Round 27 additionally found that a
*stale local clone* (not just a documentation gap) can silently reintroduce already-superseded
context — always `git clone` fresh for any audit-shaped task, never reuse a local checkout whose
last-pull time is unknown.

## Hard constraints / warnings

- Never trust a live re-run as "fully fixed" — unit test AND live-verify via a real pre-commit
  hook + real commit, not code-reading alone. Every `subtask-gate.ts` change needs both.
- GPU is shared with real Hermes production jobs — check `~/.hermes/longform/.render.lock` +
  `ps aux | grep -E "longform|tts_runner|ComfyUI|music_pipeline|playlist_compiler"` + `nvidia-smi`
  before `kilo run`, wait if busy. Round 27 ran concurrently with a live Hermes longform job with
  no observed contention (llama-server VRAM is already always-resident, shared infra), but
  generation latency varied 50ms-30s+ turn to turn — budget generous timeouts, not fixed ones.
- `kilo` CLI **was confirmed installed and working** as of round 27 (`kilo --version` → 7.4.23,
  at `~/.cursor/extensions/kilocode.kilo-code-7.4.23-linux-x64/bin/kilo`, not on default `PATH` —
  prepend that dir). Round 26's "not installed" note is stale; don't assume it's still missing.
- Before changing any cap number, check the original `soulmate` repo's real number fresh.
  `templates/AGENTS.md.template` must stay byte-identical to `AGENTS.md` from `## Language`
  onward — `check_template_drift()` catches this, only when run.
- `FEEDBACK_PENDING.md`'s Completed-history section is now at 40/40 lines (hard cap) — the very
  next round that adds a row must archive older rows into `wiki/feedback-archive.md` first (the
  established `-archive.md` PRUNE pattern), or the cap blocks the commit.

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

## Recommended next step

Round 26's own conclusion still stands (round 27 was a fix cycle, not a resumption): run a fresh
adversarial pass on `check_fence_parity()`, `check_template_drift()`, and bootstrap-placeholder/
primer-handoff checks — untested in many rounds. Separately: `FEEDBACK_PENDING.md` needs a PRUNE
pass (40/40 lines) before its next row.

## Next session's starter prompt

```
soulmate-4 이어서 진행합니다. **반드시 fresh clone부터 시작할 것** — 로컬에 오래된 클론이 남아
있으면 절대 재사용하지 말 것(round 27이 정확히 이 실수로 시작된 감사를 정정하는 라운드였음).

wiki/handoffs/SESSION_PRIMER.md 전체를 읽고, git log/status로 모든 주장(점수 턴키82/구조81,
HEAD 커밋)을 직접 재검증할 것 — 문서만 믿지 말 것.

현재 상태: Round 27 완료 — session.idle 기반 유휴 훅 추가(FEEDBACK #37, `193b16b`), 두 번째
후보(system-reminder 태그래핑)는 조사 후 기각(FEEDBACK #38, 근거 있음). 점수는 round 26
체크포인트(턴키82/구조81)에서 미변경 — round 27은 전면 재감사가 아니었음.

⚠️ 가장 먼저: `kilo --version` 확인(round 27엔 `~/.cursor/extensions/kilocode.kilo-code-*/bin`에
있었음, PATH에 없을 수 있음). FEEDBACK_PENDING.md가 40/40 줄 캡에 도달 — 다음 행 추가 전 PRUNE
필요.

다음 우선순위: check_fence_parity·check_template_drift·부트스트랩 placeholder/primer-handoff
체크처럼 오래 안 건드린 메커니즘에 새 적대적 감사를 돌릴 것.

방식 동일: fresh non-fork 에이전트 blind 채점(재클론, 실제 pre-commit hook+실커밋 검증 필수)
→ 최고우선순위 fix → 재채점, 반복. kilo run 전 GPU/Hermes 크론 확인 필수(공유 머신). Jay 기준:
구조축이 원본 98.75(적대적 시도에도 새 발견 0건)에 근접하면 합격, push 후 마무리.
```

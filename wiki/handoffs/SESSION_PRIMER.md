# SESSION PRIMER — ready for round 28 (turnkey 82, structural 81 — last full audit round 26)

> Status icons: ✅done(evidence) ⏳code-done·unverified 🔶partial 🔴unfixed-bug ⚠️needs-user-action
> **Role: current-state only — no "why" narrative** (round-by-round detail: `FEEDBACK_PENDING.md`
> rows #19-38 for rounds 9-27, `wiki/FEEDBACK_PENDING-archive.md` for rounds 1-8, `SESSION_MASTER.md` for
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

## Current sub-task

시작: `wiki/handoffs/FEEDBACK_PENDING.md` row #39 (all 7 items S1-S7), `scripts/check-caps.sh`
목표: round 28 fix cycle — an external code review (not a fresh audit) found 7 concrete,
     already-broken mechanisms; land each as its own commit against this fresh clone with the
     real pre-commit hook. This item (S1): restore this exact block — 5 files already assumed/
     required it (`subtask-gate.ts:167`, `design.md:25`, `build.md:34`, `check-caps.sh:321`,
     `templates/SESSION_PRIMER.md.template`) while the real file had none.
작업 사이클: confirm the gap (`grep -n '## Current sub-task' wiki/handoffs/SESSION_PRIMER.md` →
     no match before this commit) → restore this block → add a mechanical check-caps.sh guard so
     the heading can't silently vanish again → commit → move to S2.
참고: S2-S7 (dead bootstrap canary, PRUNE exempt-regex gap, char-based caps, hot/cold doc split,
     template-drift redesign, harness-integration-test runnable) queued next, each its own commit.

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
  #1/#3/#5/#7-#11/#14-#18 moved to `wiki/FEEDBACK_PENDING-archive.md`, open rows #4/#12 merged. Now 32/40 /
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

## Round 28 fix cycle (external review, 2026-08-22) — supersedes the audit plan below for now

Jay routed this handoff-rigor primer to an external reviewer before round 28's planned fresh
audit ran. The review read the code adversarially (not by re-running the score loop) and found 7
concrete, already-broken mechanisms — full list `wiki/handoffs/FEEDBACK_PENDING.md` row #39
(S1-S7). Each lands as its own commit against a fresh clone with the real pre-commit hook. The
audit mission below resumes once row #39 is closed out, unchanged in substance:

1. Does round 27's `session.idle` hook (`193b16b`) hold under fresh adversarial live testing?
2. Is the next clean pass the 3rd consecutive one (after rounds 24, 26) confirming convergence
   near this project's closing bar (turnkey 90+, or zero new findings) — or does a fresh angle
   still find something, the way round 25 did after round 24's clean pass?

## Next session's starter prompt

```
soulmate-4 round 28 fix cycle 속행. FEEDBACK_PENDING.md 행 #39 확인 — S1-S7 중 미완료 항목부터
fresh clone으로 이어서. 새 감사 시작 금지(이건 기존 감사 결과에 대한 외부 리뷰 fix cycle).
전부 끝나면 "Round 28 fix cycle" 섹션을 결과로 갱신 — 그 다음에야 위 audit 재개 여부를 Jay에게
물을 것(session.idle 라이브 검증 + 3연속 clean pass 여부).
```

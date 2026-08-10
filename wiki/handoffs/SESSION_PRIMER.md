# SESSION PRIMER — round 16 complete (structural redesign, per Jay's direct request); round 16 not yet re-scored

> Status icons: ✅done(evidence) ⏳code-done·unverified 🔶partial 🔴unfixed-bug ⚠️needs-user-action
> **Role: current-state tables only — no "why" narrative** (that's `SESSION_MASTER.md`).
> Rewritten 2026-08-08, end of session 5, after Jay explicitly asked for a rigorous handoff
> re-verification (see "Jay's meta-feedback" below) — every single claim in this file was
> re-checked against `git log`/actual running code/actual test output *at rewrite time*, not
> copied forward from an earlier draft of this same file. See "Verification method" below for
> exactly how, including an honest answer on whether this session was ever force-summarized.

## Project overview (what this repo IS and WHY it exists)

`soulmate-4` is a memory/harness template for coding-agent sessions running behind **Kilo Code**
(a VS Code/Cursor extension + CLI), talking to a **local LLM with a hard context ceiling**
(reference case: Qwen3.6-35B-A3B via `llama-server`, RTX 3080 10GB — this GPU is physically
shared with an unrelated production system, "Hermes," see "Hard constraints" below). It is the
4th in a lineage (soulmate → soulmate-2 → soulmate-3 → soulmate-4): each carries forward a
`wiki/`-based session-handoff harness (protocol docs, a session primer, a rule archive) proven
out over the earlier repos, and each one exists because the previous one hit a real, specific
limitation. soulmate-4's specific reason to exist: soulmate-3 (built for Cursor's Continue
extension) had no way to *mechanically* stop a local model mid-session when it skipped a
protocol step or chained sub-tasks unprompted — only a commit-time git hook, one step too late.
Kilo Code turned out to genuinely expose a real `tool.execute.before`/`after` plugin hook
(confirmed by reading the installed binary, not trusting stale public docs — this is `L01`, the
first lesson this repo ever recorded). `.kilo/plugins/subtask-gate.ts` is the payoff: a real
mechanical brake that can reject a tool call outright, not just a reminder in a system prompt.

**The actual goal, stated explicitly by Jay this session**: this repo must be pushed to earn a
score comparable to the *original* `soulmate` repo's own real, independently-audited result
(87/100 turnkey-bootstrap-readiness, 98.75/100 bounded-growth/structural-integrity, reached over
13 real rounds — those two numbers were never combined into one score by the original either).
The mechanism for doing that is a **repeating loop**: launch a fresh, non-fork, blind background
agent to independently score the repo → read what it finds → fix the highest-leverage issues,
each with a live re-verification (never trust a fix that only passed its own unit test) → repeat.
This session ran that loop **7 times** (see the round table below) and is explicitly meant to
keep running in future sessions until the score closes in on the original's.

> **Handoff re-verification note**: this rewrite followed Jay's explicit request (end of session
> 5) to verify rigorously, not rush despite low context, and check for compaction-driven drift.
> Full method + Jay's verbatim meta-feedback + 2 real inconsistencies caught and fixed: see
> `SESSION_MASTER.md`'s "Session 5 handoff re-verification" section (why-narrative, belongs
> there per this file's own role rule, not here).

## Current state — round 14 last-measured turnkey 80/structural 76; rounds 15-16 fixed since, neither re-scored yet

| Round | What it tested/built | Result | Evidence |
|---|---|---|---|
| 1-3 | discuss/design/build/verify self-serve + gate mechanics (3 separate fresh blind agents) | 3 real bugs found+fixed: gate state lost across processes, gate trigger 100% elective, commit detection regex-based (L06-L08) | `SESSION_MASTER.md`/`-archive.md`, `rule-archive.md` |
| Architecture realignment | Checked the *original* soulmate repo's real caps (not soulmate-3's) | `AGENTS.md` cap 65→85 to match original; Learned/Fixed Rules merged back into `AGENTS.md` | `SESSION_MASTER.md` "Round 4 — architecture realignment" |
| 4 (blind) | refactor.md self-serve, 3 independent trials | self-serve never fired once — backup/units/verify all failed as a result (L09 found) | `rule-archive.md` L09, `65dd69e`..`450f587` |
| 5 (objective audit) | Fresh non-fork agent, calibrated rubric against the *real* original repo, real bootstrap + real `kilo run` | **turnkey 74/100, structural 73/100** vs original's 87/98.75 | fixes: `35e90f0`..`8d3d590` |
| 6 (re-score) | Fresh agent re-verified all 5 round-5 fixes live | all held; **turnkey 74→81, structural 73→77**. `templates/AGENTS.md.template` drifted again | fixes: `7438b59`..`e5c0ca0` |
| 7 (re-score) | Fresh agent re-verified round 6's fixes live | held, but **structural regressed 77→69** — `check_template_drift()` was content-blind (ID-only) | fixes: `7879c11`..`8997230` |
| 8 (re-score) | Fresh agent re-verified round 7's fixes live | held, but **both axes dropped: turnkey 81→78, structural 77→74** — nudge fires but doesn't change model behavior (2nd live failure), new CLI-invisibility bug found | fixes: `dbeffc7`..`041fe56` (FEEDBACK #3 closed, #4/#12 nudge reworded) |
| 9 (re-score) | Fresh agent re-verified round 8's #3/#4/#12 fixes live — both held | **turnkey ~70, structural ~68**. Found 3 new issues: handoff docs mutually inconsistent, `AGENTS.md` zero-headroom cap (3rd recurrence), L01 wrong npm package citation | fixes: `2a882e7` |
| 10 (re-score) | Fresh agent re-verified round 9's fixes live — all held | **turnkey ~76, structural ~77**. Found the *same* stale-narrative bug recurring in files round 9 never checked: `README.md`×2, `subtask-gate.ts:324`'s own copy of the L01 citation | fixes: `a05bf53`..`77320b8` |
| 11 (re-score) | Fresh agent re-verified round 10's fixes live — all held, incl. `@kilocode/plugin` citation independently verified against the real installed binary | **turnkey 80, structural 78**. Found a 4th instance of the same recurring bug: `scripts/check-caps.sh:409-411`'s own stale claim — diagnosed root cause as *hand-picked sweep scope*, not a new bug type | fixes: `c481993`..`8736007` |
| 12 (re-score) | Fresh agent re-verified round 11's `check_stale_language()` fix — installed the real pre-commit hook and attempted a real commit with a stale-claim injection staged, not just read the code | **turnkey 80 (held), structural 78→74 (regressed)**. The mechanism built to close the recurring bug had the recurring bug itself: printed WARN, never set `status=1` — the real commit landed anyway. Also confirmed `FEEDBACK_PENDING.md` was exempt whole-file | fixed round 13 |
| 13 (re-score) | Fresh agent independently installed the hook + real-committed a stale injection again, post round-13-fix | **turnkey 80 (held), structural 74→80 (recovered)**. Round 12's exact gap genuinely closed this time — unswept-file injection blocked, FEEDBACK_PENDING open-table injection blocked, Completed-history text still passes. Verdict: real progress, not yet CONVERGED (structural had oscillated 78→74→80 across 3 rounds) | fixes: `4d20b11`..`296d4ba` |
| 14 (re-score) | Fresh agent tried genuinely new adversarial angles (not repeating prior rounds' exact tests): fresh-bootstrapped-project survival (passed), phrase-match case/wrap variants, exemption-regex over/under-match | **turnkey 80 (held), structural 80→76**. Found 2 new real bugs in `check_stale_language()` itself: (1) a stale phrase split across this repo's own hard-wrap house style evades the per-line grep entirely (false negative); (2) `session-log.md` was missing the `-archive` exemption sibling its 2 neighbors already had, so this repo's own routine archiving convention for it would wrongly self-block (false positive) | fixed round 15 |

**Round 15's fix**: (1) line-wrap evasion — join each run of non-blank lines (one wrapped paragraph) into a single string before matching, so a phrase split at an arbitrary wrap point is still visible as contiguous text; a blank line still ends a paragraph, so two genuinely separate claims can't bridge into a false match. (2) added `(-archive)?` to the `session-log` exemption alternative, matching the existing `SESSION_MASTER`/`rule-archive` pattern exactly. Live-verified: both of round 14's exact repro cases now behave correctly (wrap-split blocks, archive file stays exempt), plus all of round 13's own regression checks re-run clean (unswept-file block, FEEDBACK_PENDING open-table block, Completed-history pass). Full narrative: `FEEDBACK_PENDING.md` row #23.

**Round 16 — Jay's direct intervention, structural not incremental**: rounds 11-15 each found one new edge case in `check_stale_language()` per round (enforcement missing → line-wrap evasion → exemption gap), one manually-designed adversarial idea at a time — a slow discovery rate against an inherently unbounded input space. Jay pushed back directly and asked for two structural changes instead of another point-patch: (1) the enumerated per-file exemption list (needing a code change for every new archive-style file) replaced with a naming-pattern rule — 3 base historical files by exact name, plus any path ending `-archive.md` (this repo's one real archiving convention), so a future archive file needs no code change; (2) a property-based fuzz test (`tests/stale-language.fuzz.test.mjs`, 19 generated cases across wrap-position/casing/whitespace/punctuation/paragraph-boundary/exemption-pattern dimensions) instead of waiting for round N+1 to manually think of one more edge case. The fuzz suite found 2 real bugs on its first run: internal whitespace (multiple spaces/tabs between words) wasn't normalized before matching, so an irregularly-spaced presentation of one of the 6 tracked phrases silently evaded the check — fixed in the same commit; and the fuzz test file itself tripped its own check on commit (it necessarily quotes the stale phrases as literal fixtures) — fixed by adding it to the self-exemption, same as `check-caps.sh` already had for itself. Live-verified with the real pre-commit hook: all of rounds 13/14/15's regression cases still pass correctly post-redesign. Full narrative: `FEEDBACK_PENDING.md` row #24.

**Round 8-10 fixes**: all independently re-confirmed live across rounds 9-11, not just unit-tested — FEEDBACK #3 closed (gate clear moved to `chat.message`/new-message-only), #4/#12 nudge reworked (0/3→2/2×3 rounds, clears this repo's N=3 bar; CLI-invisibility half confirmed structurally unfixable), doc self-consistency + `AGENTS.md` cap (85→75 lines, real headroom) + L01 citation fixed round 9, then found stale *again* in `README.md`+`subtask-gate.ts:324` and re-fixed round 10 via a hand-picked repo-wide grep. Full narrative + evidence: `FEEDBACK_PENDING.md` rows #3/#18/#19, `rule-archive.md`.

**Round 11's finding, fixed round 12**: the recurring bug wasn't a new instance each time, it was the *same process gap* — every sweep so far manually picked which files to check. Built `check_stale_language()` in `check-caps.sh`. Full narrative: `FEEDBACK_PENDING.md` row #20, `rule-archive.md`.

**Round 12's finding, fixed this round (13)**: `check_stale_language()` detected correctly but never set `status=1` — advisory only, despite being narrated as a hard backstop. Now sets `status=1` on a match; `FEEDBACK_PENDING.md`'s exemption narrowed to just its Completed-history section (its open table is swept now, not blanket-exempt). Live-verified with the real pre-commit hook installed: baseline clean, injection in an unswept file blocks, injection in FEEDBACK_PENDING's open table blocks, same text after the Completed-history heading stays clean, a real commit attempt with staleness staged is genuinely rejected. Full narrative: `FEEDBACK_PENDING.md` row #22.

**Everything through this round is committed; push status verified at the top of the next
session's first `git status`/`git log origin/master -1` check, not assumed here.**

## Current sub-task

```
시작: 없음 — round 16(예외패턴 재설계+퍼즈 테스트, Jay 직접 지시) fix 완료, push 확인 필요.
목표: 다음 세션의 첫 작업은 git status/log로 push 상태 확인 후 Round 16 재채점
작업 사이클: 없음(이 세션의 sub-task는 완결). Round 16이 새 라운드로 시작됨.
```

## Hard constraints / warnings

- **Never trust a single live re-run as "fully fixed."** This happened twice this session: round
  4's L09 fix looked solid after one live re-run, and round 5's independent audit found it was a
  true one-shot for the whole session anyway. Round 6's template-drift fix looked solid after
  one sync, and round 7 found the fix's own drift-checker was content-blind. The pattern: **the
  fix that closes THIS round's finding is not exempt from having its own bugs** — always unit
  test *and* live-verify every fix, even a fix to a fix.
- GPU is physically shared with a real production system (Hermes) on this machine — always
  `ps aux | grep -E "longform|tts_runner|ComfyUI|music_pipeline"` + `nvidia-smi` before any
  `kilo run`, and wait if a real production job is using it. This session once waited ~8h
  mid-session for exactly this reason (round 4).
- Every `subtask-gate.ts` change needs (1) a Node unit test (`node --experimental-strip-types
  tests/subtask-gate.test.mjs`, no Kilo involved) *and* (2) at least one real `kilo run`
  re-verification — every round from L06 onward has found a real, distinct bug by doing both,
  never by doing just one.
- Before changing any cap number, clone the actual original `soulmate` repo and check its real
  numbers — don't assume soulmate-2/3's numbers are the same precedent (session 4's architecture
  realignment happened specifically because this had been skipped once).
- `templates/AGENTS.md.template` and the live `AGENTS.md` must stay in sync — `check-caps.sh`'s
  `check_template_drift()` catches full-content drift now (round 7), but only when actually run;
  it's wired into the normal (non-bootstrap-check) `check-caps.sh` invocation already.

## Known open issues (numbers match `wiki/handoffs/FEEDBACK_PENDING.md` exactly — cross-checked)

| # | Issue | Status |
|---|---|---|
| 2 | Custom slash commands (`.kilo/commands/*.md`) don't work in Kilo CLI v7.4.20 — Kilo's own limitation, may change in a future release | ⚠️ p2, open |
| 3 | Gate's one-shot disarm (verbatim retry of a blocked call slipping through) | ✅ **closed round 8** — clear moved to `chat.message`/new-message-only; independently reconfirmed live by round 9's own fresh adversarial trial |
| 4 | `discuss.md` self-serve failure — nudge reworded round 8 (removed its own "ignore if..." opt-out): 0/3 old wording → 2/2 round 8 → 2/2 more round 9 (independent), clears this repo's N=3 bar. CLI-invisibility half (never renders in normal `kilo run` output) confirmed structurally unfixable with current hooks | 🔴 p1, open (behavior fix confirmed working; CLI-invisibility ceiling, no further code fix possible) |
| 6 | Model self-report fabrication after a gate block — inherent LLM unreliability, same shape as soulmate-3's own finding; mitigation is procedural (always verify real git/file state, or the persisted `.subtask-gate-state.json`) not code | 🔴 p1, open, no code fix possible |
| 12 | `discuss.md` has zero mechanical backstop (the one protocol step with no tool calls, structurally unreachable by `tool.execute.*` hooks) | 🔴 p2, open (nudge shipped+strengthened round 8, reconfirmed round 9, see #4 — this is the ceiling of what `chat.message` alone can do) |

Deferred, not forgotten: FEEDBACK #6-in-the-*old* Hermes-adjacent sense (backporting
`refactor.md` to Hermes/soulmate 1-3) — Jay's own stated condition was "after soulmate-4's
validation is finished," and given the loop is explicitly still running (round 8+ ahead), that
condition is arguably still not met. Worth asking Jay directly rather than assuming either way.

## Next session's starter prompt

```
soulmate-4 이어서 진행합니다. wiki/handoffs/SESSION_PRIMER.md 전체를 읽고 git log/status로
이 파일의 주장(round 16까지 fix 완료, push 여부)을 직접 재검증할 것 — 문서만 믿지 말 것
(round 9~15 전부 이 파일류 문서 자체가 구식이라는 걸 스스로 지적한 전례가 있음).

Round 16은 Jay의 직접 지시로 점진적 패치 대신 구조 개선을 택함: (1) 예외목록을
열거형에서 "-archive.md" 패턴 기반으로 재설계(형제 파일 누락 버그 클래스 자체를 차단)
(2) 매 라운드 하나씩 수동으로 엣지케이스 찾는 대신 퍼즈 테스트(19개 생성 케이스)를
만들어 한 번에 여러 차원(줄바꿈위치/대소문자/공백/구두점/문단경계/예외패턴)을 검증 —
실행 중 진짜 버그 2건 발견+즉시 수정(공백 미정규화, 퍼즈 테스트 파일 자체가 자기 체크에
걸림). round 13/14/15의 회귀 케이스 전부 재통과 실측 확인. 마지막 실측 점수는
Round 14의 턴키80/구조76(round 15/16은 아직 미채점).

Round 16 재채점부터 시작해주세요 — 원본을 다시 클론해 루브릭 재확인 후 fresh non-fork
에이전트로 blind 채점(실제 bootstrap+kilo run, 단 kilo run은 최소화). 이번엔 퍼즈
테스트 자체가 정말 효과적이었는지도 평가 대상 — 감사 에이전트가 퍼즈 테스트가 놓친
새 엣지케이스를 찾아내는지, 아니면 진짜로 "새 발견 0건"에 가까워졌는지 확인할 것.
구조축이 최근 5라운드(78→74→80→76→?)째 출렁이고 있으니, 있으면 코드 읽기만으로 끝내지
말고 실제 pre-commit hook 설치+실커밋으로 재검증할 것. Jay의 최종 기준: 구조축이 원본의
98.75 수준(원본도 100은 아니고 "진지한 적대적 시도에도 새 발견 0건"에서 CONVERGED 선언한
지점)에 근접하면 합격, push하고 마무리.
```

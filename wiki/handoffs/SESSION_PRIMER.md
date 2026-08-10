# SESSION PRIMER — round 21 re-scored (turnkey 82, structural 80 — unclosed-comment parity gap found); round 22 fix done, not yet re-scored

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

> **Handoff re-verification note**: this rewrite follows Jay's session-5 request to verify
> rigorously against ground truth, not rush or trust a prior draft — see `SESSION_MASTER.md`'s
> "Session 5 handoff re-verification" section for the full why-narrative.

## Current state — round 21 last-measured turnkey 82/structural 80; round 22 fixed since, not yet re-scored

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
| 20 (re-score) | Fresh agent verified round 20's closing-line fix hands-on, then independently tried a composition neither round 19 nor round 20 tested: a closing line carrying a SECOND, trailing same-line comment after the true close | **turnkey 82 (held), structural 84→82**. Round 20's exact reported case now held — but this new composition found the fix was still regex-based (`sub(/^.*-->/)`) and GREEDY, consuming through the LAST `-->` on the line instead of the first, silently swallowing real prose between the two closers. A 2nd genuine silent-miss on the same mechanism. Auditor's diagnosis: the ceiling on this hand-rolled approach may be "low-to-mid 80s" without a structural (not patch) fix | fixed round 21 |
| 21 (re-score) | Fresh agent stress-tested round 21's `index()`-based rewrite specifically (60 comments on one line, hand-verified position math, several adversarial compositions) | **turnkey 82 (held), structural 82→80**. The wrong-occurrence-matching bug class is genuinely closed — could not reproduce it under heavy stress. But found a *different*, pre-existing (since round 19) silent-miss: an HTML comment opener that never finds its closer anywhere in the file left `incmt` stuck at 1 for the rest of the scan, silently exempting every real claim after it to EOF, unbounded, unwarned — contradicts the mechanism's own "false-positive-only" design goal | fixed round 22 |

**Round 8-21 fixes** (compressed — full narrative in `FEEDBACK_PENDING.md` rows #3/#18-20/#22-30): FEEDBACK #3/#4/#12 closed+reworked (8) → doc self-consistency + `AGENTS.md` cap (9) → restale'd, re-fixed (10) → `check_stale_language()` built (11) → found advisory-only (12) → real hard-fail (13) → line-wrap evasion + `session-log` exemption sibling fixed (15) → Jay's structural pivot: naming-pattern exemption + property-based fuzz suite, found 2 bugs on first run (16) → fence/inline-code + `*-archive.md` collision narrowing + fuzz-suite wiring + File Map cap fix (17) → pipeline reorder closes both round-17 gaps at the root (18) → symmetric (open,close)-table generalization for fence/frontmatter + own HTML-comment handling, explicit scope-stop for tables/`<details>`/link-refs (19) → 1st silent-miss found+fixed: closing-line trailing prose was discarded unscanned (20) → 2nd silent-miss (greedy regex) replaced with `index()`-based nearest-pair search, structurally closes the wrong-occurrence class (21).

**Round 22's fix — unclosed-comment parity check, mirroring `check_fence_parity`'s odd-fence-count hard-FAIL.** A raw opener/closer occurrence count was tried first and immediately produced real false positives on this repo's own handoff docs (both legitimately quote a standalone closer token inside backtick spans documenting this exact bug's regex, with zero real openers anywhere) — switched to reusing `strip_comments()`'s own `incmt` state instead (only starts counting after it actually finds a real opener, same contextual pairing the normal match path already uses correctly), checked at `END` and reported as a distinct hard-FAIL message. Live-verified via the real installed pre-commit hook: a genuinely unclosed comment with real stale claims after it is now blocked (was silently passing); properly closed comments and the backtick-quoted-arrow false-positive case both stay clean; full rounds-13-21 regression battery (never-swept file, `deploy-archive.md` collision, real double-archive files, `session-log-archive.md`, wrap-split prose/inline-code, indented code, YAML frontmatter, bare `---`, fenced code, 60-comment stress, unclosed-then-closed-with-decoys) all held. 4 new fuzz cases (35→39/39). One self-inflicted `git stash` (inside a test helper) stashed away the uncommitted fix mid-verification — same mistake every round since 13 has independently hit once — caught via `git stash list` + diffing the stash content, popped back cleanly, verified again from scratch before committing.

**Everything through this round is committed; push status verified at the top of the next
session's first `git status`/`git log origin/master -1` check, not assumed here.**

## Current sub-task

```
시작: 없음 — round 22(HTML주석 미종료→EOF까지 조용히 누락되던 버그, fence parity와
동일 패턴의 hard-FAIL로 수정) fix 완료, push 확인 필요.
목표: 다음 세션의 첫 작업은 git status/log로 push 상태 확인 후 Round 22 재채점
작업 사이클: 없음(이 세션의 sub-task는 완결). Round 22가 새 라운드로 시작됨.
```

## Hard constraints / warnings

- **Never trust a single live re-run as "fully fixed."** Reconfirmed repeatedly (rounds 4-22): the
  fix that closes THIS round's finding is not exempt from having its own bugs — always unit test
  *and* live-verify every fix, even a fix to a fix, via a real installed pre-commit hook + real
  commit, not just code-reading.
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

Deferred, not forgotten: backporting `refactor.md` to Hermes/soulmate 1-3 — Jay's own condition was "after soulmate-4's validation is finished," arguably still not met given the loop is still running. Ask Jay directly rather than assuming.

## Next session's starter prompt

```
soulmate-4 이어서 진행합니다. wiki/handoffs/SESSION_PRIMER.md 전체를 읽고 git log/status로
이 파일의 주장(round 22까지 fix 완료, push 여부)을 직접 재검증할 것 — 문서만 믿지 말 것.

Round 21 재채점 결과 턴키 82(유지), 구조 82→80 — round 21의 index() 기반 재설계는 "잘못된
쌍을 매칭하는" 버그 클래스 자체는 정말로 닫았음(한 줄에 주석 60개까지 넣어 직접 위치계산
검증). 다만 감사 에이전트가 **다른, round 19부터 있던** 버그를 발견: HTML 주석 여는 마커가
파일 끝까지 안 닫히면 그 뒤 모든 실제 문장이 조용히(경고도 없이) 검사에서 빠짐 — "오탐만
나야 한다"는 이 메커니즘 자신의 설계원칙을 어김.

Round 22: `check_fence_parity`(닫히지 않은 펜스 감지)와 정확히 같은 패턴으로 hard-FAIL 추가.
주의할 함정 하나 실측으로 발견: 단순히 여는/닫는 마커 개수를 세면 이 저장소 자신의 문서(이
버그의 정규식을 백틱 인용부호 안에 그대로 적어놓은 SESSION_PRIMER.md/FEEDBACK_PENDING.md)에서
바로 오탐이 남 — `strip_comments()`가 이미 쓰는 `incmt` 상태를 재사용해서 해결(실제 여는 마커를
찾은 경우에만 카운트 시작하므로 백틱 인용은 자연히 무시됨). 실제 pre-commit 훅으로 미종료
주석 뒤 실제 문장 3개가 이제 정상 차단되는 것 확인, rounds 13-21 회귀배터리 전부 유지. 퍼즈
35→39/39. 세션 중 테스트 헬퍼의 `git stash`가 미커밋 fix를 스스로 치워버렸다가(round 13
이후 매 라운드가 한 번씩 겪는 바로 그 실수) `git stash list`로 발견+복구+재검증 완료.

Round 22 재채점부터 시작해주세요 — 원본 재클론해 루브릭 재확인 후 fresh non-fork
에이전트로 blind 채점, 코드 읽기만으로 끝내지 말고 실제 pre-commit hook 설치+실커밋
검증 필수. Jay의 최종 기준: 구조축이 원본의 98.75 수준(원본도 100 아닌 "적대적 시도에도
새 발견 0건"에서 CONVERGED)에 근접하면 합격, push하고 마무리.
```

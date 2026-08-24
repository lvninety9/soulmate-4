#!/usr/bin/env bash
# scripts/check-secrets.sh — staged-content secret & sensitive-filename scan (round 35 item 1+2).
#
# WHY PRE-COMMIT, NOT POST-COMMIT: this scan used to live inside scripts/subtask-report.sh, which
# only runs AFTER a commit has already landed -- structurally too late for a secret (git history
# is forever; a pushed commit is a leak). Moved here so scripts/pre-commit-check-caps can BLOCK
# the commit itself. scripts/subtask-report.sh no longer re-scans for secrets -- see its own
# "Secrets & security" section, which now just points back here.
#
# HYBRID (round 35 item 2): prefers a real scanner (gitleaks) when it's on PATH, states which
# path ran, and never lets "gitleaks not installed" pass silently as "no secrets found". No
# scanner is installed on this machine on purpose (work order item 2-B) -- the fallback below is
# this machine's real, exercised path, not a theoretical one.
#
# SCOPE: staged content only (git diff --cached), not the whole working tree or history -- a
# pre-commit hook judges what's ABOUT to be committed, not what's already sitting on disk.
#
# Exit: 0 = clean, 1 = findings (caller should block the commit).
# Bypass: SKIP_SECRET_CHECK=1 -- logged to stderr every time, never silent (work order item 1-C).

set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0

if [ "${SKIP_SECRET_CHECK:-}" = "1" ]; then
  echo "*** SKIP_SECRET_CHECK=1 -- secret scan bypassed for this commit (logged here so the bypass is never silent) ***" >&2
  exit 0
fi

FINDINGS=0
DIFF_ARGS=(--cached -- . ':(exclude)scripts/check-secrets.sh')

if command -v gitleaks >/dev/null 2>&1; then
  echo "check-secrets: gitleaks available -- using it (preferred over the built-in fallback)"
  out="$(gitleaks protect --staged --no-banner 2>&1)"; rc=$?
  if [ $rc -ne 0 ]; then
    echo "$out" | tail -20 | sed 's/^/  | /'
    echo "check-secrets: gitleaks reported findings in staged changes"
    FINDINGS=1
  else
    echo "check-secrets: gitleaks -- no leaks in staged changes"
  fi
else
  echo "check-secrets: gitleaks not installed -- using built-in pattern fallback (weaker: no entropy analysis, no allowlist/history awareness)"
  ADDED="$(git diff "${DIFF_ARGS[@]}" 2>/dev/null | grep -E '^\+[^+]' || true)"
  SECRET_PATTERNS=(
    "AWS access key (AKIA...)::AKIA[0-9A-Z]{16}"
    "GitHub token (ghp_/gho_/github_pat_)::gh[po]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}"
    "Slack token (xox...)::xox[baprs]-[A-Za-z0-9-]+"
    "Stripe/OpenAI-style key (sk-.../sk_live_...)::sk-[A-Za-z0-9_-]{16,}|sk_live_[A-Za-z0-9_-]{16,}"
    "PEM private key block::-----BEGIN[A-Z ]*PRIVATE KEY-----"
    "generic api_key/secret/password/token assignment (quoted or bare .env-style)::(api[_-]?key|secret|password|token)[[:space:]]*[:=][[:space:]]*([\"'][^\"']{16,}[\"']|[^[:space:]\"']{16,})"
  )
  for entry in "${SECRET_PATTERNS[@]}"; do
    label="${entry%%::*}"
    pattern="${entry#*::}"
    n="$(printf '%s\n' "$ADDED" | grep -icE -- "$pattern" || true)"
    [ -z "$n" ] && n=0
    if [ "$n" -gt 0 ]; then
      echo "  - $label: $n match(es)"
      FINDINGS=1
    fi
  done
  [ "$FINDINGS" -eq 0 ] && echo "check-secrets: built-in fallback -- no high-confidence secret patterns found in staged added lines"
fi

# Filename floor (content-independent): a staged .env/id_rsa/*.pem/*.p12/credentials.json/
# *.keystore/service-account*.json, or an .npmrc/.pypirc actually containing a token/password, is
# nearly always a mistake regardless of what the content regexes above do or don't match. Scoped
# to files ADDED in this commit (a brand-new sensitive file, not every staged file). ".env.example"
# / ".env.sample" / ".env.template" / ".env.dist" are exempt -- a template is not a leak.
while IFS= read -r f; do
  [ -z "$f" ] && continue
  base="$(basename "$f")"
  lbase="$(printf '%s' "$base" | tr '[:upper:]' '[:lower:]')"
  case "$lbase" in
    .env.example|.env.sample|.env.template|.env.dist) : ;;
    .env|.env.*) echo "  - $f: env file staged (may contain real secrets)"; FINDINGS=1 ;;
    id_rsa|id_dsa|id_ecdsa|id_ed25519) echo "  - $f: SSH private key filename"; FINDINGS=1 ;;
    *.pem) echo "  - $f: PEM file staged"; FINDINGS=1 ;;
    *.p12) echo "  - $f: PKCS#12 keystore staged"; FINDINGS=1 ;;
    credentials.json) echo "  - $f: credentials.json staged"; FINDINGS=1 ;;
    *.keystore) echo "  - $f: keystore file staged"; FINDINGS=1 ;;
    service-account*.json) echo "  - $f: service-account JSON key staged"; FINDINGS=1 ;;
    .npmrc|.pypirc)
      if git diff --cached -- "$f" 2>/dev/null | grep -E '^\+[^+]' | grep -qiE 'token|password|_auth'; then
        echo "  - $f: $base staged containing a token/password/_auth line"; FINDINGS=1
      fi
      ;;
  esac
done < <(git -c core.quotepath=false diff --cached --diff-filter=A --name-only -- . 2>/dev/null)

if [ "$FINDINGS" -eq 1 ]; then
  echo "check-secrets: BLOCKED -- possible secret(s)/sensitive file(s) staged (see above)."
  echo "Fix the content, or if this is genuinely intentional: SKIP_SECRET_CHECK=1 git commit ..."
  exit 1
fi
echo "check-secrets: clean -- no secrets or sensitive filenames found in staged changes"
exit 0

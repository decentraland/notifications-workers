#!/bin/bash
# pre-bash-block-destructive.sh
# Blocks destructive ops on hot paths (CLAUDE.md rule 19) and ADR-6 violations
# (rules 12, 16). Read stdin JSON, exit 2 to block, 0 to allow.
set -u

if ! command -v jq >/dev/null 2>&1; then
  marker="${TMPDIR:-/tmp}/.claude-notifications-workers-jq-warned-$PPID"
  if [ ! -f "$marker" ]; then
    echo "WARNING: jq not found — .claude/hooks/* operate in fail-open mode. Install with 'brew install jq'." >&2
    : > "$marker" 2>/dev/null
  fi
  exit 0
fi

cmd=$(jq -r '.tool_input.command // empty')
[ -z "$cmd" ] && exit 0

block() {
  echo "BLOCKED by .claude/hooks/pre-bash-block-destructive.sh" >&2
  echo "Reason: $1" >&2
  echo "Recovery: $2" >&2
  exit 2
}

# Rule 19 — protect contract surfaces
if printf '%s' "$cmd" | grep -Eq 'rm[[:space:]]+-r[a-z]*f?[a-z]*[[:space:]]+([^|&;]*[/[:space:]])?(processor/src/adapters/email-templates|processor/src/migrations|common/src/types\.ts|docs/openapi\.yaml)'; then
  block "rm on a contract path (templates / migrations / common types / openapi)" \
        "If you actually need to remove a single template file, use 'rm <path>' without -rf; existing migrations are append-only (rule 8)"
fi

# Rule 2 — wholesale node_modules wipe is the documented recovery flow, allow it.
# But block lone "rm -rf dist/" or "rm -rf build/" outside that flow — not used here.

# Rule 12 — never bypass commit verification
if printf '%s' "$cmd" | grep -Eq 'git[[:space:]]+commit[[:space:]].*--no-verify|git[[:space:]]+(commit|rebase)[[:space:]].*--no-gpg-sign|git[[:space:]]+rebase[[:space:]].*--no-edit'; then
  block "--no-verify / --no-gpg-sign / --no-edit forbidden by CLAUDE.md rule 12" \
        "Fix the hook failure or signing issue, then commit again as a NEW commit (rule 14)"
fi

# Rule 16 — never force-push to main/master
if printf '%s' "$cmd" | grep -Eq 'git[[:space:]]+push[[:space:]].*(--force|--force-with-lease|-f([[:space:]]|$))[^|&;]*[[:space:]](origin[[:space:]]+)?(main|master)([[:space:]]|$)'; then
  block "force push to main/master forbidden by CLAUDE.md rule 16" \
        "Force-push a feature branch instead, or open a PR with the corrective commit"
fi

# Rule 16 — never use HTTPS for git remote ops (SSH only)
if printf '%s' "$cmd" | grep -Eq 'git[[:space:]]+(remote[[:space:]]+(add|set-url)|clone|push|fetch)[^|&;]*https://([^@]*@)?github\.com'; then
  block "HTTPS git operation forbidden by CLAUDE.md rule 16 (SSH only)" \
        "Use git@github.com:decentraland/notifications-workers.git"
fi

# Destructive history rewrites without explicit user opt-in
if printf '%s' "$cmd" | grep -Eq 'git[[:space:]]+reset[[:space:]]+--hard|git[[:space:]]+clean[[:space:]]+-f[d]?[x]?|git[[:space:]]+branch[[:space:]]+-D[[:space:]]+(main|master)'; then
  block "destructive git op (reset --hard / clean -fd / branch -D main)" \
        "Surface the situation to the user before proceeding; non-destructive alternatives usually exist"
fi

exit 0

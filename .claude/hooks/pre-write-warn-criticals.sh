#!/bin/bash
# pre-write-warn-criticals.sh
# Non-blocking warning when editing files where mistakes are silent or expensive.
# Exit 1 prints to user without blocking; exit 0 allows.
set -u

if ! command -v jq >/dev/null 2>&1; then
  marker="${TMPDIR:-/tmp}/.claude-notifications-workers-jq-warned-$PPID"
  if [ ! -f "$marker" ]; then
    echo "WARNING: jq not found — .claude/hooks/* operate in fail-open mode. Install with 'brew install jq'." >&2
    : > "$marker" 2>/dev/null
  fi
  exit 0
fi

path=$(jq -r '.tool_input.file_path // empty')
[ -z "$path" ] && exit 0

warn() {
  echo "NOTE from .claude/hooks/pre-write-warn-criticals.sh" >&2
  echo "$1" >&2
  exit 1
}

# Rule 8 — migrations are append-only
case "$path" in
  *processor/src/migrations/[0-9]*.ts)
    warn "Editing an EXISTING migration in processor/src/migrations/ violates rule 8. Create a NEW migration with a higher timestamp instead."
    ;;
esac

# Rules 1-2 — lockfile drift
case "$path" in
  */yarn.lock|yarn.lock)
    warn "Editing yarn.lock manually almost always desyncs the workspace. Re-run 'yarn install' from the monorepo root (rule 1). If a schemas bump is the trigger, see the bump-schemas-dep skill (rule 2)."
    ;;
esac

# Rule 5 — excluded list / emailable types
case "$path" in
  */common/src/types.ts|common/src/types.ts)
    warn "common/src/types.ts holds NotificationType and excludedNotificationTypes (rule 5). If you're adding a type and want emails, do NOT add it to excludedNotificationTypes; ensure the template pair exists (rule 6)."
    ;;
esac

# Rule 6 — handlebars pair
case "$path" in
  */email-templates/*.subject.handlebars)
    warn "Subject templates must produce valid JSON after handlebars expansion (rule 6). Use {{ escape metadata.X }} for fields that may contain quotes."
    ;;
esac

# Rule 18 — OpenAPI is the contract
case "$path" in
  */docs/openapi.yaml|docs/openapi.yaml)
    warn "docs/openapi.yaml is the API contract (rule 18). Keep operationIds camelCase {serviceName}_{description}; document all error responses; reuse schemas via \$ref."
    ;;
esac

exit 0

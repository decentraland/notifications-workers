#!/bin/bash
# session-start.sh — branch info + 3 high-signal reminders.
set -u

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "?")
upstream=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || echo "no upstream")

cat <<EOF
notifications-workers — branch: $branch ($upstream)

Reminders (see CLAUDE.md for full set):
  - Yarn workspaces, run yarn from monorepo root.
  - NotificationType (common) ↔ Events.SubType.* (@dcl/schemas) are parallel enums; move both together.
  - Postgres for integration tests: 'docker compose up -d' from root (port 5450).
EOF

exit 0

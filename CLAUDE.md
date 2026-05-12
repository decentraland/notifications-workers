# notifications-workers — Claude project memory

Source of truth for repo. Numbered rules referenced by `.claude/` skills, hooks, agents.

## Overview

Two-worker service. Produce, store, deliver user notifications across Decentraland: in-app, real-time SSE, email via SendGrid. Receive external events from AWS SNS, persist to Postgres, fan out to subscribed users.

Full architecture: [docs/ai-agent-context.md](docs/ai-agent-context.md).
API contract: [docs/openapi.yaml](docs/openapi.yaml).
DB schema: [docs/database-schema.md](docs/database-schema.md).

## Architecture

Yarn workspaces monorepo. Three packages, two deployable workers, shared Postgres.

### `common/`
Shared lib. Holds `NotificationType` re-export, `NotificationRecord` type, `EmailableNotificationTypeEnum`, DB layer, subscription utils, signing for unsubscribe URLs. Both workers import from `@notifications/common`.

### `processor/` — write side
Two ingest paths into same `notificationsService.saveNotifications()`:

1. **SQS consumer** (`queue-consumer.ts` → `message-processor.ts` → `event-parser.ts`) — pulls messages off SQS queue subscribed to SNS. Parser switches on `event.subType`, emits one or more `NotificationRecord`s. Path for external producers like `events-notifyer`, `marketplace`, `comms-gatekeeper`, etc. that publish SNS events typed against `@dcl/schemas`.
2. **`POST /notifications`** (bearer-token, `publishNotificationHandler`) — accepts pre-shaped `NotificationRecord[]` directly. Used by services that build the record themselves, skip SNS round-trip.

Both paths converge on `notificationsService.saveNotifications()`: persist to `notifications` table, auto-enrich `metadata.userName` (rule 7), consult user subscription prefs + `excludedNotificationTypes` (rule 5), render+send emails via SendGrid for emailable types.

`processor` also exposes `GET /test-notifications` and `GET /test-notifications/:id` for local preview.

### `inbox/` — read side + user prefs
Front-facing HTTP API, signed-fetch auth (ADR-44):

- `GET /notifications`, `GET /notifications/events` (SSE), `PUT /notifications/read` — user reads inbox.
- `GET/PUT /subscription` — user notification prefs (per-type email/push toggles).
- `GET/POST/DELETE /subscription/opt-outs/:scope/:scopeId` — community-scoped opt-outs (rule 5 has `NotificationScope.Community` mode).
- `PUT /set-email`, `PUT /confirm-email`, `GET /unsubscribe/:address[/:type]` — email management.
- `POST /notifications/email` (bearer-token, `commonEmailHandler`) — service-to-service endpoint, send ad-hoc email through SendGrid without persisting notification record.

`inbox` does NOT consume SQS, never writes to `notifications` table directly — that's `processor`'s job.

### External producers
- **`events-notifyer`** (separate repo) — publishes Decentraland-event notifications to SNS.
- **`events`** (separate repo) — publishes event lifecycle (created/approved/rejected/started/ended) to SNS.
- **`marketplace`, `comms-gatekeeper`, social services, etc.** — each publishes own subtypes.

All target SNS topic this repo's `processor` subscribes to via SQS.

## Folder map

```
common/src/
  types.ts                      ← NotificationType union, EmailableNotificationTypeEnum
  adapters/                     ← DB layer, subscriptions service
  subscriptions.ts, signing.ts
processor/src/
  adapters/
    notifications-service.ts    ← auto-enriches metadata.userName from address
    email-renderer.ts           ← handlebars + template registration
    email-templates/            ← <type>.subject.handlebars + <type>.content.handlebars (89 files)
    message-processor.ts        ← SNS message routing
    queue-consumer.ts
  controllers/                  ← HTTP handlers + routes
  logic/event-parser.ts         ← SwitchCase on Events.SubType.* → NotificationRecord[]
  migrations/                   ← node-pg-migrate, do NOT edit existing files
inbox/src/
  controllers/                  ← REST + SSE
  logic/notification-opt-out.ts
docs/
  openapi.yaml                  ← OpenAPI 3.1, operationIds camelCase {service}_{description}
  ai-agent-context.md
  database-schema.md
```

## Numbered rules

### Dependencies

1. **Use `yarn install` from monorepo root**, never per-workspace. Lockfile at root.
2. After bumping cross-workspace dep (especially `@dcl/schemas`), delete stale nested `node_modules` before reinstall: `rm -rf node_modules common/node_modules inbox/node_modules processor/node_modules && yarn install`. Hoisted + nested copies diverge silently.
3. `@dcl/*` and `decentraland-*` use caret (`^`). Others use exact pinning. **Exception: `@dcl/schemas` is exact-pinned** (no caret) across all 4 `package.json` files — the enum-parity coupling described in rules 2 and 4 makes a silent minor bump too risky.

### Notifications domain

4. **`NotificationType` (`common`) and `Events.SubType.*` (`@dcl/schemas`) are parallel enums.** `NotificationType` is DB key (snake_case); `Events.SubType` is SNS message discriminator (kebab-case). Add channel requires both.
5. **Email opt-in is opt-out by default.** `NotificationType.X` emailable unless listed in `excludedNotificationTypes` (`common/src/types.ts`). Template without unblocking type → silent drop. Listed without template → log "no template for type" + drop.
6. **Email templates come in pairs**: `<type>.subject.handlebars` (JSON-shaped) + `<type>.content.handlebars` (HTML). File name uses snake_case enum value. Subject must be valid JSON after handlebars expansion — unescaped `"` in interpolations breaks renderer at runtime.
7. **`metadata.userName` is auto-injected** by `processor/src/adapters/notifications-service.ts` from `notification.address` via `profiles.getByAddress`. For `TIP_RECEIVED` an additional `metadata.senderUsername` is auto-injected from `metadata.senderAddress` via the same `profiles.getByAddress` lookup. Producers (events service, comms-gatekeeper, etc.) must NOT include `userName` or `senderUsername` in SNS payloads — only the address(es). Same for derived URLs built from `DECENTRALAND_URL` — stitched in `event-parser.ts`, not by producer.
8. **Never edit existing migrations** in `processor/src/migrations/`. Create new one with higher timestamp.

### Testing

9. **Integration tests need real Postgres** from `docker-compose.yml` at monorepo root (port 5450). Stopped DB symptom: `Jest worker encountered 4 child process exceptions`. Recovery: `docker compose up -d` from root.
10. **Update snapshots** with `yarn workspace @notifications/processor run update:snapshots` after changing email templates or `event-parser.ts` output shape.

### Pre-commit pipeline

11. Run in order before staging: `yarn lint:fix` → `yarn lint:check` → `yarn workspaces run build` → `yarn test`. Run `yarn install` first only if changed any `package.json`.
12. **Never use `--no-verify`, `--no-gpg-sign`, or `--no-edit`** on commits or rebases. Pre-commit hook fail → fix underlying issue, commit again (new commit, not `--amend`).

### Git / PRs (ADR-6)

13. Branches: `<type>/<description>` (feat, fix, chore, docs, refactor, style, test).
14. Commit subjects: `<type>: <summary>` single line. **Never** include `Co-Authored-By` lines.
15. PRs squash-merged to `main`. PR descriptions: concise, factual, no `## Summary` header, no file lists. **Never** mention Claude, MCP servers, Orca, or any agent/tool by name.
16. GPG-sign commits. Push only via SSH (`git@github.com:...`); never HTTPS or token-embedded URLs. Never push without explicit user authorization.
17. After `git push`, surface full PR URL.

### API / OpenAPI

18. Contract at `docs/openapi.yaml`. Operation IDs `{serviceName}_{operationDescription}` camelCase. Document all error responses; reuse schemas via `$ref`.

### Hot paths

19. **Do not** delete or `rm -rf`: `processor/src/adapters/email-templates`, `processor/src/migrations`, `docs/openapi.yaml`, `common/src/types.ts`. Contract surfaces of service.

## Commands cheat sheet

```bash
# Install / reset
yarn install                                          # from root
rm -rf node_modules */node_modules && yarn install    # after schemas bump

# Local DB (port 5450)
docker compose up -d
docker compose down

# Dev loop
yarn workspaces run build
yarn lint:fix && yarn lint:check
yarn test                                             # all workspaces
yarn workspace @notifications/processor test          # processor only
yarn workspace @notifications/processor run update:snapshots

# Run services
yarn start:local                                      # processor + inbox concurrently
```

## Pitfalls

- **`Property X does not exist on type 'typeof SubType'`** after bumping schemas → stale `node_modules` (rule 2).
- **`Property metadata does not exist on type 'Event'`** → same root cause; TS falls back to `CatalystDeploymentEvent` union arm.
- **Integration tests crashing with `pg-component: An error occurred trying to open the database. Error: ''`** → Postgres container not running (rule 9).
- **Email never arrives in dev** → check `excludedNotificationTypes` (rule 5) and that subject `.handlebars` produces valid JSON when rendered.

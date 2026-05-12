---
name: add-notification-type
description: End-to-end recipe for adding new notification to notifications-workers. Walks decision tree (ingest path = SQS vs POST, email vs push-only, broadcast vs targeted, opt-out scope) and concrete files to touch. Use when user says "add notification X", "support new notification type", "new email notification", or asks why notification not producing emails / not reaching users.
---

# Add a new notification

## When to use

- New SNS event subtype exists in `@dcl/schemas` and notifications-workers needs to consume it.
- External service wants to push notifications directly via `POST /notifications` (bearer).
- Internal cron / producer inside processor wants to emit notifications.
- Email missing for notification that already lands in DB → start at decision tree, answer usually rule 5 or rule 6.

## When NOT to use

- Renaming existing `NotificationType` — DB-impacting change; design migration first.
- Changing only copy of existing email — edit `.handlebars` files, no plumbing needed.

## Decision tree (answer these BEFORE writing code)

### Q1 — How does notification enter the system?

| Source | Path | Where work lands |
|---|---|---|
| External event from upstream Decentraland service (events, events-notifyer, marketplace, comms-gatekeeper, …) | SNS → SQS → `processor` | New case in `processor/src/logic/event-parser.ts`. **Requires `Events.SubType.X.Y` in `@dcl/schemas` first** (rule 4). |
| Other service already builds `NotificationRecord` itself, prefers synchronous push | `POST /notifications` on `processor` (bearer) | No code change in this repo for routing — ensure `NotificationType` exists and is emailable / excluded correctly. |
| Internal scheduler / cron inside `processor` | Internal producer | New module under `processor/src/adapters/` that calls `notificationsService.saveNotifications()` directly. |
| Service wants only ad-hoc email, no persisted notification | `POST /notifications/email` on `inbox` (bearer) | No new `NotificationType` needed. Stop here — skill not for you. |

If unsure which, ask user.

### Q2 — Does user need to receive email?

`NotificationType.X` emailable by default. Stops being emailable only if:
- appears in `excludedNotificationTypes` in `common/src/types.ts` (rule 5), OR
- no `<type>.subject.handlebars` + `<type>.content.handlebars` pair (rule 6 — renderer skips and logs "no template for type").

| Email? | Action |
|---|---|
| Yes | Create handlebars pair (step 4 below). **Do NOT** add to `excludedNotificationTypes`. |
| No (push / in-app only) | Add to `excludedNotificationTypes`. Skip step 4. |

### Q3 — Per-user notification or broadcast?

DB column `notifications.address` nullable. `address = null` means "broadcast" (every signed-in user can read on inbox, read-status tracked per user in `broadcast_read`).

| Audience | `address` in `NotificationRecord` |
|---|---|
| One specific user | their EVM address |
| All users (announcement) | `undefined` / omitted — persist layer treats missing address as broadcast |

Broadcast notifications usually skip email; emailing broadcast fans out to every confirmed-email user — ensure intentional.

### Q4 — Opt-out scope?

If users should mute specific instance of this notification type (e.g. one community), include `optOutScope` in record:

```ts
optOutScope: {
  scope: NotificationScope.Community,
  scopeId: communityId,
}
```

Honored by `inbox` opt-outs endpoints (`/subscription/opt-outs/:scope/:scopeId`). Skip if not applicable.

## Steps

### 1. Verify schemas side (for SNS-sourced notifications)

CLAUDE.md rule 4 — both pieces must exist in `@dcl/schemas`:

```bash
grep -n "MY_NEW_TYPE" \
  node_modules/@dcl/schemas/dist/platform/notifications/notifications.d.ts \
  node_modules/@dcl/schemas/dist/platform/events/base.d.ts
```

- `NotificationType.MY_NEW_TYPE` in `notifications.d.ts`
- `Events.SubType.<Group>.MY_NEW_TYPE` in `base.d.ts`
- Matching `XEvent` type + namespace in `events/<domain>.ts` with metadata shape your event-parser case consumes

If anything missing, stop, open PR in `decentraland/schemas` first, then bump dep (see `bump-schemas-dep` skill).

### 2. (SNS path only) Add parser case

Edit `processor/src/logic/event-parser.ts`. Match existing case for same domain:

```ts
case Events.SubType.<Group>.MY_NEW_TYPE: {
  return [
    {
      type: NotificationType.MY_NEW_TYPE,
      address: event.metadata.<recipientField>,   // null/undefined for broadcast
      eventKey: event.key,
      timestamp: event.timestamp,
      optOutScope: { ... },                       // optional, see Q4
      metadata: {
        // Only fields the template + UI actually need.
        // userName is auto-injected — DO NOT include it (rule 7).
        // Build static URLs here using DECENTRALAND_URL — not from the producer (rule 7).
      },
    },
  ]
}
```

**Domain group with multiple subtypes?** Don't inflate `event-parser.ts` with a giant switch — use the `*-utils.ts` lookup-table pattern already in the repo:

- `processor/src/logic/moderation-utils.ts`
- `processor/src/logic/rewards-utils.ts`
- `processor/src/logic/streaming-utils.ts`
- `processor/src/logic/comms-utils.ts`
- `processor/src/logic/referral-utils.ts`

Each is a typed mapping `Events.SubType.<Group>.X → NotificationType` (or a small builder fn). The `event-parser.ts` case then calls into the util. Use this when your domain has ≥3 subtypes or shares metadata shape across cases. PR #172 (moderation) is the canonical reference.

### 3. Pick emailable bucket

Edit `common/src/types.ts`:

| Want emails? | Action |
|---|---|
| Yes | Confirm `NotificationType.MY_NEW_TYPE` NOT in `excludedNotificationTypes`. |
| No | Add `NotificationType.MY_NEW_TYPE,` to `excludedNotificationTypes` array. |

### 4. (If emailable) Create handlebars pair

`processor/src/adapters/email-templates/<type>.subject.handlebars` — JSON-shaped (rule 6):

```hbs
{
  "subject": "Your subject line",
  "actionButtonText": "ACTION",
  "actionButtonLink": "{{ escape metadata.link }}",
  "title": "Hey there",
  "titleHighlight": "{{ escape metadata.userName }}",
  "bannerUrl": "https://...",
  "bannerLabel": "Banner caption"
}
```

`processor/src/adapters/email-templates/<type>.content.handlebars` — HTML body referencing `{{metadata.*}}`.

File names use lowercase enum value: `event_approved.subject.handlebars` for `NotificationType.EVENT_APPROVED = 'event_approved'`.

Hard rule: subject must produce **valid JSON** after handlebars renders. Use `{{ escape metadata.X }}` for any field that may contain `"`.

### 5. Tests

- `processor/test/unit/logic/event-parser.spec.ts` — case publishing new event, asserts resulting `NotificationRecord`.
- `processor/test/unit/adapters/email-renderer.spec.ts` — fixture exercising new template (only if emailable).
- Integration test in `processor/test/integration/publish-notification-handler.spec.ts` if introducing via `POST /notifications`.

### 6. Refresh snapshots

```bash
yarn workspace @notifications/processor run update:snapshots
git --no-pager diff processor/test/unit/adapters/__snapshots__/
```

Review diff. Anything unexpected → fix template, re-run.

### 7. Pre-PR pipeline

See `pre-pr-pipeline` skill. Short version:

```bash
yarn lint:fix && yarn lint:check
yarn workspaces run build
yarn test
```

Commit with single-line message (rules 12, 14):

```bash
git commit -m "feat: support MY_NEW_TYPE notification"
```

## Common mistakes

- Adding template but forgetting to leave `MY_NEW_TYPE` OUT of `excludedNotificationTypes` → emails silently dropped, log line misleading ("no template").
- Sending `userName` from producer → ignored, wasted payload.
- Subject template with unescaped `"` in `metadata.X` interpolation → runtime JSON parse error in `email-renderer.ts`, no email goes out.
- Editing existing migration to add column for new type → violates rule 8. Create new migration with higher timestamp.
- Building deep links from producer-side env var → URL drifts per environment. Compute in `event-parser.ts` using `DECENTRALAND_URL` (rule 7).

## References

- CLAUDE.md rules 4, 5, 6, 7, 8, 10, 11
- `processor/src/logic/event-parser.ts` — pattern reference
- `processor/src/adapters/notifications-service.ts:123-138` — userName / senderUsername auto-enrichment
- `processor/src/controllers/handlers/publish-notification-handler.ts` — Joi schema for `POST /notifications` payloads
- `common/src/types.ts:excludedNotificationTypes`
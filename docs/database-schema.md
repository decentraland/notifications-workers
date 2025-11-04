# Database Schema Documentation

This document describes the database schema for the Notifications Workers service. The schema uses PostgreSQL and is managed through migrations located in `processor/src/migrations/`.

## Tables Overview

The database contains the following active tables:
1. **`notifications`** - Stores user notifications
2. **`subscriptions`** - User notification preferences and email subscriptions
3. **`unconfirmed_emails`** - Email confirmation codes for email verification
4. **`broadcast_read`** - Tracks read status for broadcast notifications
5. **`cursors`** - Event processing cursors for tracking processed events

---

## Database Schema Diagram

```mermaid
erDiagram
    notifications {
        UUID id PK "Notification ID"
        VARCHAR event_key "Event identifier"
        VARCHAR type "Notification type"
        VARCHAR address "User address (nullable)"
        JSONB metadata "Notification metadata"
        BIGINT timestamp "Event timestamp"
        BIGINT read_at "Read timestamp"
        BIGINT created_at "Creation timestamp"
        BIGINT updated_at "Update timestamp"
    }
    
    subscriptions {
        VARCHAR address PK "User address"
        VARCHAR email "Email address"
        JSONB details "Subscription details"
        BIGINT created_at "Creation timestamp"
        BIGINT updated_at "Update timestamp"
    }
    
    unconfirmed_emails {
        VARCHAR address PK "User address"
        VARCHAR email "Email address"
        VARCHAR code "Confirmation code"
        BIGINT created_at "Creation timestamp"
        BIGINT updated_at "Update timestamp"
    }
    
    broadcast_read {
        UUID notification_id PK FK "Notification reference"
        VARCHAR address PK "User address"
        BIGINT read_at "Read timestamp"
    }
    
    cursors {
        VARCHAR id PK "Cursor ID"
        BIGINT last_successful_run_at "Last run timestamp"
        BIGINT created_at "Creation timestamp"
        BIGINT updated_at "Update timestamp"
    }
    
    notifications ||--o{ broadcast_read : "read status"
```

**Relationship Notes:**
- **Foreign Key**: `broadcast_read.notification_id` → `notifications.id`
- **Composite Primary Key**: `broadcast_read` has composite PK `(notification_id, address)`
- **Unique Constraint**: `notifications` has unique constraint on `(event_key, type, address)` for deduplication
- **Address Optional**: `notifications.address` can be NULL for broadcast notifications

---

## Table: `notifications`

Stores user notifications from various sources.

### Columns

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | NOT NULL | **Primary Key**. Unique notification identifier. Auto-generated. |
| `event_key` | VARCHAR | NOT NULL | Event identifier for deduplication. |
| `type` | VARCHAR | NOT NULL | Notification type (e.g., `"marketplace_item_sold"`, `"friend_request"`). |
| `address` | VARCHAR | NULL | Ethereum address of the notification recipient. NULL for broadcast notifications. |
| `metadata` | JSONB | NOT NULL | Notification metadata (stored as JSON). |
| `timestamp` | BIGINT | NOT NULL | Event timestamp (in milliseconds). |
| `read_at` | BIGINT | NULL | Timestamp (in milliseconds) when notification was read. NULL if unread. |
| `created_at` | BIGINT | NOT NULL | Timestamp (in milliseconds) when notification was created. |
| `updated_at` | BIGINT | NOT NULL | Timestamp (in milliseconds) when notification was last updated. |

### Indexes

- **Primary Key**: `id`
- **Unique Index**: On `(event_key, type, address varchar_pattern_ops)` - Prevents duplicate notifications
- **Index**: On `address varchar_pattern_ops` - For efficient user notification queries

### Business Rules

1. Notifications are deduplicated by `(event_key, type, address)` combination
2. `address` can be NULL for broadcast notifications (handled via `broadcast_read` table)
3. Timestamps stored in milliseconds (BIGINT)
4. Read status tracked via `read_at` timestamp

---

## Table: `subscriptions`

Stores user notification preferences and email subscriptions.

### Columns

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `address` | VARCHAR | NOT NULL | **Primary Key**. Ethereum address of the user. |
| `email` | VARCHAR | NULL | Email address for email notifications. |
| `details` | JSONB | NOT NULL | Subscription preferences and details (stored as JSON). |
| `created_at` | BIGINT | NOT NULL | Timestamp (in milliseconds) when subscription was created. |
| `updated_at` | BIGINT | NOT NULL | Timestamp (in milliseconds) when subscription was last updated. |

### Indexes

- **Primary Key**: `address`

### Business Rules

1. One subscription record per user address
2. Email is optional (can be NULL)
3. Subscription preferences stored in `details` JSONB column

---

## Table: `unconfirmed_emails`

Stores email confirmation codes for email verification flow.

### Columns

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `address` | VARCHAR | NOT NULL | **Primary Key**. Ethereum address of the user. |
| `email` | VARCHAR | NOT NULL | Email address to be confirmed. |
| `code` | VARCHAR | NOT NULL | Confirmation code. |
| `created_at` | BIGINT | NOT NULL | Timestamp (in milliseconds) when confirmation record was created. |
| `updated_at` | BIGINT | NOT NULL | Timestamp (in milliseconds) when confirmation record was last updated. |

### Indexes

- **Primary Key**: `address`

### Business Rules

1. One unconfirmed email record per user address
2. Used for email verification flow before adding email to subscriptions
3. Codes expire after verification or timeout

---

## Table: `broadcast_read`

Tracks read status for broadcast notifications (notifications without a specific address).

### Columns

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `notification_id` | UUID | NOT NULL | **Primary Key (part 1)**. **Foreign Key** to `notifications.id`. |
| `address` | VARCHAR | NOT NULL | **Primary Key (part 2)**. Ethereum address of the user who read the notification. |
| `read_at` | BIGINT | NOT NULL | Timestamp (in milliseconds) when the notification was read. |

### Indexes

- **Composite Primary Key**: `(notification_id, address)` - One read record per user per broadcast notification
- **Index**: On `address` for efficient user read queries

### Business Rules

1. Tracks which users have read which broadcast notifications
2. One read record per user per broadcast notification
3. Used for notifications where `notifications.address` is NULL

---

## Table: `cursors`

Tracks event processing cursors for monitoring processed events.

### Columns

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | VARCHAR | NOT NULL | **Primary Key**. Cursor identifier. |
| `last_successful_run_at` | BIGINT | NULL | Timestamp (in milliseconds) of the last successful processing run. NULL if never run. |
| `created_at` | BIGINT | NOT NULL | Timestamp (in milliseconds) when cursor was created. |
| `updated_at` | BIGINT | NOT NULL | Timestamp (in milliseconds) when cursor was last updated. |

### Indexes

- **Primary Key**: `id`

### Business Rules

1. Used to track event processing state
2. Prevents duplicate event processing
3. Timestamps stored in milliseconds (BIGINT)

---

## Related Code

- **Migrations**: `processor/src/migrations/`
- **Database Logic**: `processor/src/logic/`
- **Types**: `processor/src/types/`
- **Database Port**: `processor/src/ports/postgres.ts`


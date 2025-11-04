# AI Agent Context

**Service Purpose:** Manages user notifications across the Decentraland platform. Split into two workers (Processor and Inbox) for scalability. Handles notification production, storage, delivery via Server-Sent Events, and email notifications via SendGrid.

**Key Capabilities:**

- **Processor Worker**: Produces notifications from external events (SNS), runs internal notification producers, validates and stores notifications
- **Inbox Worker**: Serves REST API for retrieving notifications, manages Server-Sent Events (SSE) subscriptions for real-time notification streams
- Manages user notification preferences and email subscriptions
- Supports email notification delivery via SendGrid with customizable templates
- Handles email confirmation flow (set email, confirm ownership)
- Processes notifications from various sources (marketplace events, social events, etc.)

**Communication Pattern:** 
- Event-driven via AWS SNS (receives notification events)
- Synchronous HTTP REST API (notification retrieval, subscription management)
- Server-Sent Events (SSE) for real-time notification streams

**Technology Stack:**

- Runtime: Node.js
- Language: TypeScript
- HTTP Framework: Express or @well-known-components/http-server
- Database: PostgreSQL (notifications, subscriptions, email confirmations)
- Queue/Events: AWS SNS (notification events)
- Email: SendGrid (email delivery)
- Component Architecture: @well-known-components (logger, metrics, http-server, pg-component)

**External Dependencies:**

- Databases: PostgreSQL (notification storage, user subscriptions, email confirmations)
- Event Bus: AWS SNS (receives notification events from various services)
- Email Service: SendGrid (email notification delivery)
- Content Server: Catalyst (profile data for notification metadata)

**Notification Sources:**

- Marketplace events (item sold, bid received, etc.)
- Social service events (friend requests, friend accepted)
- Profile update events
- Custom notification events from various Decentraland services

# Overview

The service will be split in 2 workers for scalability and availability.

<!-- - Publisher worker: will be responsable for handling notification creation requests, in this first approach, it will get all updates from Push service for the subscribed users -->
- Processor worker: will handle the users subscription to events
- Inbox worker: will serve the API to get and handle users notifications

The workers will share a database to store the notifications and the subscribed users with their privacy configurations.
<!-- 
## Publisher worker

This worker is responsible of proxing the users requests that want to subscribe to notifications. The Publisher worker is a proxy between the user and the Push Service, this way it will store the users (and their privacy configurations) to the Database.

### Use Case: A user subscribes to event updates

```mermaid
sequenceDiagram
  user->>Publisher: subscribe to notifications (+ sign)
  Publisher->>Push: subscribe to notifications (+ sign)
  Publisher->>DB: store in db subscribed user
``` -->

## Processor worker

This worker will get from Push server all new notifications from all the subscribed users and store them in the database so then they can be send to the users


### Use Case: Get new events from all subscribed users

```mermaid
sequenceDiagram
  Push->>SQS: send new notifications for channel
  SQS->>Processor: send new notifications for channel
  Processor->>DB: store in db new events from all subscribed users
```

## Inbox worker

The worker in charge or retrieving the notifications to the user

### Use Case: Subscribe to notifications

Returns a stream of all the notifications

**Endpoint**
- `GET /notifications/events`
- Authentication: signed fetch, the user id will be infered from that

```
event: item-sold
id: abcdef
data: { "id": "..", "timestamp": 213132, "source": "Marketplace", "type": "item-sold", "thumbnailUrl": "", "title": "", "description": "", "link": "", "read": false }
```

```mermaid
sequenceDiagram
  User->>Inbox: Get stream of notifications
  Inbox->>Db: get new events from user
  Inbox->>User: stream notifications
  Inbox->>Db: get new events from user
  Inbox->>User: stream notifications
  Inbox->>Db: get new events from user
  Inbox->>User: stream notifications
```


## Get notifications
- `GET /notifications?from=&size=&only-new=true`
- Authentication: signed fetch, the user id will be infered from that

Return:

```json
[
  {
    "id": "..",
    "timestamp": 213132,
    "source": "Marketplace",
    "type": "item-sold",
    "thumbnailUrl": "",
    "title": "",
    "description": "",
    "link": "",
    "read": false
  }
]
```

This endpoint will query the notifications table for user notifications and will contain (probably as harcoded string templates in the first version) a way to transform the notification data into the actual notification fields expected by the UI. If filtering by the only-read parameter, then only not read notifications will be retrieved.


## Change notification read status

- `PUT /notifications/read { notification-ids: ['notification-id-1', 'notification-id-2'], from: 12343435345 }`
- Authentication: signed fetch

Mark notification as read, this action is unreversible. The notifications to be marked as read will be infered from the ids in the request body, or it will mark all notifications as read from a given timestamp. Exactly one of them must be present in the body.

We need to remember to ensure only the user notifications can be updated, for example:

```sql
UPDATE notifications SET read = ${read} WHERE id = ${id} and address = ${address}
```


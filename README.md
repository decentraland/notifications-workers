# Overview

The service will be split in 3 workers for scalability and availability.

- Publisher worker: will be responsable for handling notification creation requests, it's crucial for this service to be highly available, otherwise notifications will be lost.
- Processor worker: will process the notification queue and handle push notifications.
- Inbox worker: will serve the API to get and handle users notifications.

Example notification:

```typescript
enum NotificationSource {
  Marketplace
}

type BaseNotification = {
  address: string
  timestamp: number
  source: NotificationSource
}

type ItemSoldNotification = BaseNotification & {
  thumbnailUrl: string
  itemName: string
  link: string
}
```

## Publisher worker

This worker listenes to updates and send them to the queue.

## Processor worker

This worker will listen to the queue system, insert the notification in the db and publish a push message for the user.

```
table: notifications

id | address | timestamp | type | source | metadata | read
```

## Inbox worker

retrieve all notifications

# Exposed API

The workers will expose the API:

## Send a new notification

- `POST /notifications`
- Authentication: shared secret

Body:

```json
{
  "to": ["0x21313", "0xAbce"],
  "source": "Marketplace",
  "type": "item-sold",
  "thumbnailUrl": "",
  "itemName": "",
  "link": ""
}
```

This endpoint will validate the notification (probably using a json validator), and put a message in a queue (probably sqs).

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

## Subscribe to notifications

Returns a stream of all the notifications


- `GET /notifications/stream`
- Authentication: signed fetch, the user id will be infered from that

Return a stream of:
```json
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
```

## Change notification read status

- `PUT /notifications/read { notification-ids: ['notification-id-1', 'notification-id-2'], from: 12343435345 }`
- Authentication: signed fetch

Mark notification as read, this action is unreversible. The notifications to be marked as read will be infered from the ids in the request body, or it will mark all notifications as read from a given timestamp. Exactly one of them must be present in the body.

We need to remember to ensure only the user notifications can be updated, for example:

```sql
UPDATE notifications SET read = ${read} WHERE id = ${id} and address = ${address}
```

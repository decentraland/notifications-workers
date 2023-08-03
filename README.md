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

# Publisher worker

## Send a new notification

- `POST /notifications`
- Authentication: shared secret?

Body:
```json
{
  "to": "0x21313",
  "source": "Marketplace",
  "type": "item-sold",
  "thumbnailUrl": "",
  "itemName": "",
  "link": ""
}
```

This endpoint will validate the notification (probably using a json validator), and put a message in a queue (probably sqs).

# Processor worker

This worker will listen to the queue system, insert the notification in the db and publish a push message for the user.

```
table: notifications

id | address | timestamp | type | source | metadata | read
```

# Inbox worker

## Get notifications
- `GET /notifications/:address?from=&size=&`
- Authentication: signed fetch

Return:
```json
[
  {
    "id": "..",
    "timestamp": 213132,
    "source": "",
    "type": "",
    "thumbnailUrl": "",
    "title": "",
    "description": "",
    "link": ""
  }
]
```

This endpoint will query the notifications table for user notifications and will contain (probably as harcoded string templates in the first version) a way to transform the notification data into the actual notification fields expected by the UI.

## Change notification read status

- `PUT /notifications/:address/:id { read: <boolean> }`
- Authentication: signed fetch

Mark notification read/unread

We need to remember to ensure only the user notifications can be updated, for example:

```sql
UPDATE notifications SET read = ${read} WHERE id = ${id} and address = ${address}
```

## Change read status for many notifications

- `POST /notifications/:address/status [{ id, read: <boolean> }]`
- Authentication: signed fetch

# TODO

- push notifications

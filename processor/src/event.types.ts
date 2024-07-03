export enum EventType {
  BID_ACCEPTED = 'bid-accepted',
  BID_RECEIVED = 'bid-received',
  ITEM_SOLD = 'item-sold',
  RENTAL_ENDED = 'land-rental-ended',
  RENTAL_STARTED = 'land-rental-started',
  ROYALTIES_EARNED = 'royalties-earned'
}

type BaseEvent = {
  type: string
  key: string
  timestamp: number
}

type BidMetadata = {
  address: string
  image: string
  seller: string
  category: string
  rarity: string
  link: string
  nftName: string
  price: string
  title: string
  description: string
  network: string
}

export type BidAcceptedEvent = BaseEvent & {
  type: EventType.BID_ACCEPTED
  metadata: BidMetadata
}

export type BidReceivedEvent = BaseEvent & {
  type: EventType.BID_RECEIVED
  metadata: BidMetadata
}

export type ItemSoldEvent = BaseEvent & {
  type: EventType.ITEM_SOLD
  metadata: {
    address: string
    image: string
    seller: string
    category: string
    rarity: string
    link: string
    nftName: string
    network: string
    title: string
    description: string
  }
}

export type RentalEndedEvent = BaseEvent & {
  type: EventType.RENTAL_ENDED
  metadata: {
    address: string
    land: string
    contract: string
    lessor: string
    tenant: string
    operator: string
    startedAt: string
    endedAt: string
    tokenId: string
    link: string
    title: string
    description: string
  }
}

export type RentalStartedEvent = BaseEvent & {
  type: EventType.RENTAL_STARTED
  metadata: {
    address: string
    land: string
    contract: string
    lessor: string
    tenant: string
    operator: string
    startedAt: string
    endedAt: string
    tokenId: string
    link: string
    title: string
    description: string
  }
}

export type RoyaltiesEarnedEvent = BaseEvent & {
  type: EventType.ROYALTIES_EARNED
  metadata: {
    address: string
    image: string
    category: string
    rarity: string
    link: string
    nftName: string
    royaltiesCut: string
    royaltiesCollector: string
    network: string
    title: string
    description: string
  }
}

export type EventNotification =
  | BidAcceptedEvent
  | BidReceivedEvent
  | ItemSoldEvent
  | RentalEndedEvent
  | RentalStartedEvent
  | RoyaltiesEarnedEvent

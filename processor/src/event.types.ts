export enum EventType {
  BidAccepted = 'bid-accepted',
  BidReceived = 'bid-received',
  ItemSold = 'item-sold',
  RentalEnded = 'rental-ended',
  RentalStarted = 'rental-started',
  RoyaltiesEarned = 'royalties-earned'
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
  type: EventType.BidAccepted
  metadata: BidMetadata
}

export type BidReceivedEvent = BaseEvent & {
  type: EventType.BidReceived
  metadata: BidMetadata
}

export type ItemSoldEvent = BaseEvent & {
  type: EventType.ItemSold
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
  type: EventType.RentalEnded
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
  type: EventType.RentalStarted
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
  type: EventType.RoyaltiesEarned
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

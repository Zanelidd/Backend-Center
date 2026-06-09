import { Card } from '@prisma/client';

export class ResponseCardDto {
  constructor(card: Card) {
    this.id = card.id;
    this.remoteId = card.remoteId;
  }
  id: number;
  remoteId: string;
}

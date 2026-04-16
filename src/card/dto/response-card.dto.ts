import { Card } from '@prisma/client';

export class ResponseCardDto {
  constructor(card: Card) {
    this.id = card.id;
    this.cardId = card.remoteId;
  }
  id: number;
  cardId: string;
}

import { card } from '@prisma/client';

export class ResponseCardDto {
  constructor(card: card) {
    this.id = card.id;
    this.cardId = card.remoteId;
  }
  id: number;
  cardId: string;
}

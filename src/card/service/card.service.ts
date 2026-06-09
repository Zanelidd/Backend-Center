import { Injectable } from '@nestjs/common';
import { UpdateCardDto } from '../dto/update-card.dto';
import { CreateCardDto } from '../dto/create-card.dto';
import { PrismaService } from '../../provider/database/prisma/prisma.service';

import { PokemonTCG } from 'pokemon-tcg-sdk-typescript';
import { Card } from 'pokemon-tcg-sdk-typescript/dist/sdk';

@Injectable()
export class CardService {
  constructor(private prismaService: PrismaService) {}

  async create(cardData: CreateCardDto) {
    return this.prismaService.card.create({
      data: {
        remoteId: cardData.cardId,
        userId: cardData.userId,
      },
    });
  }

  async findAllUserCards(userId: number): Promise<(Card & { collectionId: number })[]> {
    const dbCards = await this.prismaService.card.findMany({
      where: { userId },
    });

    const results = await Promise.allSettled(
      dbCards.map((dbCard) => PokemonTCG.findCardByID(dbCard.remoteId)),
    );

    return results
      .map((result, index) => ({ result, dbCard: dbCards[index] }))
      .filter(({ result }) => result.status === 'fulfilled')
      .map(({ result, dbCard }) => ({
        ...(result as PromiseFulfilledResult<Card>).value,
        collectionId: dbCard.id,
      }));
  }

  async findOne(id: number) {
    return this.prismaService.card.findUnique({ where: { id } });
  }

  async update(id: number, updateCardDto: UpdateCardDto) {
    return this.prismaService.card.update({
      where: { id: id },
      data: { ...updateCardDto },
    });
  }

  async remove(remoteId: string, userId: number) {
    return this.prismaService.card.delete({
      where: { remoteId_userId: { remoteId, userId } },
    });
  }
}

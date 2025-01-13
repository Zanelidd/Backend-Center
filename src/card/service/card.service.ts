import { Injectable } from '@nestjs/common';
import { UpdateCardDto } from '../dto/update-card.dto';
import { CreateCardDto } from '../dto/create-card.dto';
import { PrismaService } from 'src/provider/database/prisma/prisma.service';

import { PokemonTCG } from 'pokemon-tcg-sdk-typescript';
import { Card } from 'pokemon-tcg-sdk-typescript/dist/sdk';

@Injectable()
export class CardService {
  constructor(private prismaService: PrismaService) {}

  async create(cardData: CreateCardDto) {
    console.log('Card added to the card');
    return this.prismaService.card.create({
      data: {
        remoteId: cardData.cardId,
        userId: cardData.userId,
      },
    });
  }

  async findAllUserCards(userId: number): Promise<Card[]> {
    const cards = await this.prismaService.card.findMany({
      where: { userId },
    });

    return Promise.all(
      cards.map((card) => {
        return PokemonTCG.findCardByID(card.remoteId);
      }),
    );
  }

  async update(id: number, updateCardDto: UpdateCardDto) {
    return this.prismaService.card.update({
      where: { id: id },
      data: { ...updateCardDto },
    });
  }

  async remove(id: string) {
    console.log('Card deleted to the card');
    return this.prismaService.card.delete({
      where: { remoteId: id },
    });
  }
}

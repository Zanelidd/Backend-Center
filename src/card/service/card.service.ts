import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UpdateCardDto } from '../dto/update-card.dto';
import { CreateCardDto } from '../dto/create-card.dto';
import { PrismaService } from '../../provider/database/prisma/prisma.service';

import { Card } from 'pokemon-tcg-sdk-typescript/dist/sdk';
import { ExternalApiService } from '../../provider/external_api/external_api.service';

/** Hard cap enforced by the Pokemon TCG API itself on the `pageSize` query param. */
const POKEMON_TCG_API_MAX_PAGE_SIZE = 250;

@Injectable()
export class CardService {
  private readonly logger = new Logger(CardService.name);

  constructor(
    private prismaService: PrismaService,
    private externalApiService: ExternalApiService,
  ) {}

  async create(cardData: CreateCardDto, userId: number) {
    try {
      return await this.prismaService.card.create({
        data: {
          remoteId: cardData.cardId,
          userId,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Card already in collection');
      }
      throw error;
    }
  }

  async findAllUserCards(
    userId: number,
  ): Promise<(Card & { collectionId: number })[]> {
    const dbCards = await this.prismaService.card.findMany({
      where: { userId },
    });

    if (dbCards.length === 0) {
      return [];
    }

    if (dbCards.length > POKEMON_TCG_API_MAX_PAGE_SIZE) {
      this.logger.warn(
        `User ${userId} has ${dbCards.length} cards, above the Pokemon TCG API's ` +
          `max pageSize (${POKEMON_TCG_API_MAX_PAGE_SIZE}); the collection view will be truncated.`,
      );
    }
    const pageSize = Math.min(dbCards.length, POKEMON_TCG_API_MAX_PAGE_SIZE);

    const q = dbCards.map((c) => `id:${c.remoteId}`).join(' OR ');
    const apiCards = await this.externalApiService.findManyByQuery(q, pageSize);

    const collectionIdByRemoteId = new Map(
      dbCards.map((c) => [c.remoteId, c.id]),
    );

    return apiCards
      .filter((card) => collectionIdByRemoteId.has(card.id))
      .map((card) => ({
        ...card,
        collectionId: collectionIdByRemoteId.get(card.id)!,
      }));
  }

  async findOne(id: number) {
    return this.prismaService.card.findUnique({ where: { id } });
  }

  async update(id: number, updateCardDto: UpdateCardDto, userId: number) {
    return this.prismaService.card.update({
      where: { id, userId },
      data: { ...updateCardDto },
    });
  }

  async remove(remoteId: string, userId: number) {
    const card = await this.prismaService.card.findFirst({
      where: { remoteId, userId },
    });
    if (!card) throw new NotFoundException('Card not found in your collection');
    return this.prismaService.card.delete({
      where: { remoteId_userId: { remoteId, userId } },
    });
  }
}

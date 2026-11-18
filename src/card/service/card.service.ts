import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UpdateCardDto } from '../dto/update-card.dto';
import { CreateCardDto } from '../dto/create-card.dto';
import { PrismaService } from '../../provider/database/prisma/prisma.service';

import { PokemonTCG } from 'pokemon-tcg-sdk-typescript';
import { Card } from 'pokemon-tcg-sdk-typescript/dist/sdk';
import {
  DEFAULT_RETRY_ATTEMPTS,
  describeHttpError,
  isRetryableHttpError,
  retryWithBackoff,
} from '../../common/http/retry.util';
import { ExternalApiUnavailableException } from '../../common/http/external-api-unavailable.exception';

@Injectable()
export class CardService {
  private readonly logger = new Logger(CardService.name);

  constructor(private prismaService: PrismaService) {}

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

    const q = dbCards.map((c) => `id:${c.remoteId}`).join(' OR ');
    const apiCards = await this.fetchCardsFromExternalApi(q, dbCards.length);

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


  private async fetchCardsFromExternalApi(
    q: string,
    pageSize: number,
  ): Promise<Card[]> {
    try {
      return await retryWithBackoff(
        () => PokemonTCG.findCardsByQueries({ q, pageSize }),
        {
          onRetry: (attempt, error) =>
            this.logger.warn(
              `Retry ${attempt}/${DEFAULT_RETRY_ATTEMPTS} fetching cards from Pokemon TCG API (${describeHttpError(error)})`,
            ),
        },
      );
    } catch (error) {
      if (isRetryableHttpError(error)) {
        this.logger.error(
          `Pokemon TCG API unavailable after ${DEFAULT_RETRY_ATTEMPTS} retries (${describeHttpError(error)})`,
        );
        throw new ExternalApiUnavailableException();
      }
      throw error;
    }
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

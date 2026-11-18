import { Test, TestingModule } from '@nestjs/testing';
import { CardService } from './card.service';
import { PrismaService } from '../../provider/database/prisma/prisma.service';
import { PokemonTCG } from 'pokemon-tcg-sdk-typescript';
import { ConflictException, ServiceUnavailableException } from '@nestjs/common';

jest.mock('pokemon-tcg-sdk-typescript', () => ({
  PokemonTCG: {
    findCardsByQueries: jest.fn(),
  },
}));

describe('CardService', () => {
  let service: CardService;

  const mockPrismaService = {
    card: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CardService>(CardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllUserCards', () => {
    it('should batch all IDs into a single API call and map collectionId', async () => {
      const dbCards = [
        { id: 10, remoteId: 'xy1-1', userId: 1 },
        { id: 11, remoteId: 'xy1-2', userId: 1 },
      ];
      const apiCards = [
        { id: 'xy1-1', name: 'Bulbasaur' },
        { id: 'xy1-2', name: 'Charmander' },
      ];
      mockPrismaService.card.findMany.mockResolvedValue(dbCards);
      (PokemonTCG.findCardsByQueries as jest.Mock).mockResolvedValue(apiCards);

      const result = await service.findAllUserCards(1);

      expect(PokemonTCG.findCardsByQueries).toHaveBeenCalledTimes(1);
      expect(PokemonTCG.findCardsByQueries).toHaveBeenCalledWith({
        q: 'id:xy1-1 OR id:xy1-2',
        pageSize: 2,
      });
      expect(result).toEqual([
        { id: 'xy1-1', name: 'Bulbasaur', collectionId: 10 },
        { id: 'xy1-2', name: 'Charmander', collectionId: 11 },
      ]);
    });

    it('should return empty array and skip API call when user has no cards', async () => {
      mockPrismaService.card.findMany.mockResolvedValue([]);

      const result = await service.findAllUserCards(1);

      expect(result).toEqual([]);
      expect(PokemonTCG.findCardsByQueries).not.toHaveBeenCalled();
    });

    it('should retry on a transient 502/503/504 and still return the result once the API recovers', async () => {
      jest.useFakeTimers();
      const dbCards = [{ id: 10, remoteId: 'xy1-1', userId: 1 }];
      const apiCards = [{ id: 'xy1-1', name: 'Bulbasaur' }];
      mockPrismaService.card.findMany.mockResolvedValue(dbCards);
      (PokemonTCG.findCardsByQueries as jest.Mock)
        .mockRejectedValueOnce({ response: { status: 502 } })
        .mockResolvedValue(apiCards);

      const resultPromise = service.findAllUserCards(1);
      await jest.runAllTimersAsync();
      const result = await resultPromise;

      expect(PokemonTCG.findCardsByQueries).toHaveBeenCalledTimes(2);
      expect(result).toEqual([{ id: 'xy1-1', name: 'Bulbasaur', collectionId: 10 }]);
      jest.useRealTimers();
    });

    it('should throw a clean ServiceUnavailableException once retries are exhausted on a persistent 503', async () => {
      jest.useFakeTimers();
      const dbCards = [{ id: 10, remoteId: 'xy1-1', userId: 1 }];
      mockPrismaService.card.findMany.mockResolvedValue(dbCards);
      (PokemonTCG.findCardsByQueries as jest.Mock).mockRejectedValue({
        response: { status: 503 },
      });

      const resultPromise = service.findAllUserCards(1);
      const assertion = expect(resultPromise).rejects.toThrow(ServiceUnavailableException);
      await jest.runAllTimersAsync();
      await assertion;
      expect(PokemonTCG.findCardsByQueries).toHaveBeenCalledTimes(4); // 1 initial attempt + 3 retries
      jest.useRealTimers();
    });

    it('should not retry and should propagate a non-retryable error as-is', async () => {
      const dbCards = [{ id: 10, remoteId: 'xy1-1', userId: 1 }];
      mockPrismaService.card.findMany.mockResolvedValue(dbCards);
      const error = { response: { status: 400 } };
      (PokemonTCG.findCardsByQueries as jest.Mock).mockRejectedValue(error);

      await expect(service.findAllUserCards(1)).rejects.toBe(error);
      expect(PokemonTCG.findCardsByQueries).toHaveBeenCalledTimes(1);
    });
  });

  describe('create', () => {
    it('should create a card using the authenticated userId, not from the DTO', async () => {
      const dto = { cardId: 'xy7-54' };
      const authenticatedUserId = 42;
      const mockCard = { id: 1, remoteId: 'xy7-54', userId: authenticatedUserId };

      mockPrismaService.card.create.mockResolvedValue(mockCard);

      const result = await service.create(dto, authenticatedUserId);

      expect(result).toEqual(mockCard);
      expect(mockPrismaService.card.create).toHaveBeenCalledWith({
        data: { remoteId: 'xy7-54', userId: authenticatedUserId },
      });
    });

    it('should throw ConflictException when card is already in collection (P2002)', async () => {
      mockPrismaService.card.create.mockRejectedValue({ code: 'P2002' });

      await expect(service.create({ cardId: 'xy7-54' }, 42)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    it('should update using both id and userId to enforce ownership atomically', async () => {
      const mockCard = { id: 1, remoteId: 'xy7-54', userId: 42 };
      mockPrismaService.card.update.mockResolvedValue(mockCard);

      const result = await service.update(1, {}, 42);

      expect(result).toEqual(mockCard);
      expect(mockPrismaService.card.update).toHaveBeenCalledWith({
        where: { id: 1, userId: 42 },
        data: {},
      });
    });
  });

  describe('findOne', () => {
    it('should return a card by id', async () => {
      const mockCard = { id: 1, remoteId: 'xy7-54', userId: 1 };
      mockPrismaService.card.findUnique.mockResolvedValue(mockCard);

      const result = await service.findOne(1);

      expect(result).toEqual(mockCard);
      expect(mockPrismaService.card.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });

  describe('remove', () => {
    it('should delete using the composite remoteId+userId key', async () => {
      const mockCard = { id: 1, remoteId: 'xy7-54', userId: 1 };
      mockPrismaService.card.delete.mockResolvedValue(mockCard);

      await service.remove('xy7-54', 1);

      expect(mockPrismaService.card.delete).toHaveBeenCalledWith({
        where: { remoteId_userId: { remoteId: 'xy7-54', userId: 1 } },
      });
    });
  });
});

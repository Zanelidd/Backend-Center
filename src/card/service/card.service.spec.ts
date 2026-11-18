import { Test, TestingModule } from '@nestjs/testing';
import { CardService } from './card.service';
import { PrismaService } from '../../provider/database/prisma/prisma.service';
import { ExternalApiService } from '../../provider/external_api/external_api.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('CardService', () => {
  let service: CardService;

  const mockPrismaService = {
    card: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockExternalApiService = {
    findManyByQuery: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ExternalApiService, useValue: mockExternalApiService },
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
      mockExternalApiService.findManyByQuery.mockResolvedValue(apiCards);

      const result = await service.findAllUserCards(1);

      expect(mockExternalApiService.findManyByQuery).toHaveBeenCalledTimes(1);
      expect(mockExternalApiService.findManyByQuery).toHaveBeenCalledWith(
        'id:xy1-1 OR id:xy1-2',
        2,
      );
      expect(result).toEqual([
        { id: 'xy1-1', name: 'Bulbasaur', collectionId: 10 },
        { id: 'xy1-2', name: 'Charmander', collectionId: 11 },
      ]);
    });

    it('should return empty array and skip API call when user has no cards', async () => {
      mockPrismaService.card.findMany.mockResolvedValue([]);

      const result = await service.findAllUserCards(1);

      expect(result).toEqual([]);
      expect(mockExternalApiService.findManyByQuery).not.toHaveBeenCalled();
    });

    it('should propagate errors from ExternalApiService as-is (retry/error-mapping lives there)', async () => {
      const dbCards = [{ id: 10, remoteId: 'xy1-1', userId: 1 }];
      mockPrismaService.card.findMany.mockResolvedValue(dbCards);
      const error = new Error('service unavailable');
      mockExternalApiService.findManyByQuery.mockRejectedValue(error);

      await expect(service.findAllUserCards(1)).rejects.toBe(error);
    });
  });

  describe('create', () => {
    it('should create a card using the authenticated userId, not from the DTO', async () => {
      const dto = { cardId: 'xy7-54' };
      const authenticatedUserId = 42;
      const mockCard = {
        id: 1,
        remoteId: 'xy7-54',
        userId: authenticatedUserId,
      };

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
      expect(mockPrismaService.card.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe('remove', () => {
    it('should delete using the composite remoteId+userId key', async () => {
      const mockCard = { id: 1, remoteId: 'xy7-54', userId: 1 };
      mockPrismaService.card.findFirst.mockResolvedValue(mockCard);
      mockPrismaService.card.delete.mockResolvedValue(mockCard);

      await service.remove('xy7-54', 1);

      expect(mockPrismaService.card.findFirst).toHaveBeenCalledWith({
        where: { remoteId: 'xy7-54', userId: 1 },
      });
      expect(mockPrismaService.card.delete).toHaveBeenCalledWith({
        where: { remoteId_userId: { remoteId: 'xy7-54', userId: 1 } },
      });
    });

    it('should throw NotFoundException when the card is not in the collection', async () => {
      mockPrismaService.card.findFirst.mockResolvedValue(null);

      await expect(service.remove('xy7-54', 1)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.card.delete).not.toHaveBeenCalled();
    });
  });
});

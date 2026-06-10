import { Test, TestingModule } from '@nestjs/testing';
import { CardService } from './card.service';
import { PrismaService } from '../../provider/database/prisma/prisma.service';

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

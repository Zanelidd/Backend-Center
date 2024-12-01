import { Injectable, Logger } from '@nestjs/common';
import { UpdateCollectionDto } from '../dto/update-collection.dto';
import { CreateCollectionDto } from '../dto/create-collection.dto';
import { PrismaService } from 'src/provider/database/prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class CollectionService {
  private readonly logger = new Logger(CollectionService.name);
  constructor(
    private prismaService: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  async create(collectionData: CreateCollectionDto) {
    console.log('Card added to the collection');
    return this.prismaService.collection.create({
      data: {
        cardId: collectionData.cardId,
        name: collectionData.name,
        cardImgSmall: collectionData.images.small,
        cardImgLarge: collectionData.images.large,
        userId: collectionData.userId,
      },
    });
  }

  async findAll() {
    try {
      const API_URL = 'https://api.pokemontcg.io/v2/sets';
      const { data } = await firstValueFrom(
        this.httpService.get(API_URL).pipe(
          catchError((error: AxiosError) => {
            this.logger.error(error.response?.data);
            throw new Error('An error happened while fetching Pokemon sets');
          }),
        ),
      );

      console.log(data);
      return this.prismaService.collection.findMany();
    } catch (error) {
      throw error;
    }
  }

  async findManyOneUser(id: number) {
    return this.prismaService.collection.findMany({ where: { userId: id } });
  }

  async update(id: number, updateCollectionDto: UpdateCollectionDto) {
    return this.prismaService.collection.update({
      where: { id: id },
      data: { ...updateCollectionDto },
    });
  }

  async remove(id: number) {
    return this.prismaService.collection.delete({
      where: { id: id },
    });
  }
}

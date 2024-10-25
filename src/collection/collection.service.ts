import { Injectable } from '@nestjs/common';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { PrismaService } from 'src/provider/database/prisma/prisma.service';

@Injectable()
export class CollectionService {
  constructor(private prismaService: PrismaService) {}

  async create(collectionData: CreateCollectionDto) {
    const { cardId, cardImg, cardName } = collectionData;

    console.log('Card added to the collection');
    return this.prismaService.collection.create({
      data: { cardId, cardImg, cardName },
    });
  }

  async findAll() {
    return this.prismaService.collection.findMany();
  }

  async findOne(id: number) {
    return this.prismaService.collection.findFirst({ where: { id: id } });
  }

  async update(id: number, updateCollectionDto: UpdateCollectionDto) {
    return this.prismaService.collection.update({
      where: { id: id },
      data: { ...updateCollectionDto },
    });
  }

  async remove(id: number) {
    console.log(id);
    return this.prismaService.collection.delete({
      where: { id: id },
    });
  }
}

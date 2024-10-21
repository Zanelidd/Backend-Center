import { Injectable } from '@nestjs/common';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { PrismaService } from 'src/provider/database/prisma/prisma.service';

@Injectable()
export class CollectionService {
  constructor(private prismaService: PrismaService) {}

  async create(collectionData: CreateCollectionDto) {
    const { cardId } = collectionData;
    console.log(cardId);

    const existingCard = await this.prismaService.collection.findFirst({
      where: { cardId },
    });
    if (existingCard) {
      console.log('This card already in collection');
      // const id = existingCard.id;
      // console.log('This card has been deleted from collection');
      // return this.prismaService.collection.delete({ where: { id: id } });
    } else {
      console.log('Card added to the collection');
      return this.prismaService.collection.create({ data: { cardId } });
    }
  }

  findAll() {
    return `This action returns all collection`;
  }

  findOne(id: number) {
    return `This action returns a #${id} collection`;
  }

  update(id: number, updateCollectionDto: UpdateCollectionDto) {
    return this.prismaService.collection.update({
      where: { id: id },
      data: { ...updateCollectionDto },
    });
  }

  remove(id: number) {
    return `This action removes a #${id} collection`;
  }
}

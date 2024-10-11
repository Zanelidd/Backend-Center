import { Injectable } from '@nestjs/common';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Collection } from './entities/collection.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CollectionService {
  constructor(
    @InjectRepository(Collection)
    private readonly collectionRepository: Repository<Collection>,
  ) {}
  create(collectionData: Partial<Collection>) {
    return this.collectionRepository.save(collectionData);
  }

  findAll() {
    return `This action returns all collection`;
  }

  findOne(id: number) {
    return `This action returns a #${id} collection`;
  }

  update(id: number, updateCollectionDto: UpdateCollectionDto) {
    return this.collectionRepository.update(id, UpdateCollectionDto);
  }

  remove(id: number) {
    return `This action removes a #${id} collection`;
  }
}

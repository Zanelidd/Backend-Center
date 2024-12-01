import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CollectionService } from '../service/collection.service';
import { UpdateCollectionDto } from '../dto/update-collection.dto';
import { CreateCollectionDto } from '../dto/create-collection.dto';
import { ResponseCollectionDto } from '../dto/response-collection.dto';

@Controller('collection')
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  @Post()
  async create(@Body() createCollectionDto: CreateCollectionDto) {
    const result = await this.collectionService.create(createCollectionDto);
    return new ResponseCollectionDto(result);
  }

  @Get()
  findAll() {
    return this.collectionService.findAll();
  }

  @Get(':id')
  findManyOneUser(@Param('id') id: string) {
    return this.collectionService.findManyOneUser(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCollectionDto: UpdateCollectionDto,
  ) {
    return this.collectionService.update(+id, updateCollectionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.collectionService.remove(+id);
  }
}

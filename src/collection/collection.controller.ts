import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CollectionService } from './collection.service';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { CreateCollectionDto } from './dto/create-collection.dto';

@Controller('collection')
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  @Post()
  async create(@Body() createCollectionDto: CreateCollectionDto) {
    const result = await this.collectionService.create(createCollectionDto);
    console.log('donnée envoyé au front', result);
    return result;
  }

  @Get()
  findAll() {
    return this.collectionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.collectionService.findOne(+id);
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

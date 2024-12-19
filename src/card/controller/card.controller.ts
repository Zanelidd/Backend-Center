import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CardService } from '../service/card.service';
import { UpdateCardDto } from '../dto/update-card.dto';
import { CreateCardDto } from '../dto/create-card.dto';
import { ResponseCardDto } from '../dto/response-card.dto';
import { Card } from 'pokemon-tcg-sdk-typescript/dist/sdk';

@Controller('card')
export class CardController {
  constructor(private readonly cardService: CardService) {}

  @Post()
  async create(@Body() createCardDto: CreateCardDto) {
    const result = await this.cardService.create(createCardDto);
    return new ResponseCardDto(result);
  }

  @Get(':id')
  findAllUserCards(@Param('id') id: string): Promise<Card[]> {
    return this.cardService.findAllUserCards(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCollectionDto: UpdateCardDto) {
    return this.cardService.update(+id, updateCollectionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.cardService.remove(+id);
  }
}

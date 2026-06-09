import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CardService } from '../service/card.service';
import { UpdateCardDto } from '../dto/update-card.dto';
import { CreateCardDto } from '../dto/create-card.dto';
import { ResponseCardDto } from '../dto/response-card.dto';
import { Card } from 'pokemon-tcg-sdk-typescript/dist/sdk';
import { AuthGuard } from '../../auth/guard/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@UseGuards(AuthGuard)
@Controller('card')
export class CardController {
  constructor(private readonly cardService: CardService) {}

  @Post()
  async create(@Body() createCardDto: CreateCardDto) {
    const result = await this.cardService.create(createCardDto);
    return new ResponseCardDto(result);
  }

  @Get(':userId')
  findAllUserCards(
    @Param('userId') userId: string,
    @CurrentUser() user: { sub: number },
  ): Promise<(Card & { collectionId: number })[]> {
    if (user.sub !== +userId) throw new ForbiddenException();
    return this.cardService.findAllUserCards(+userId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCollectionDto: UpdateCardDto,
    @CurrentUser() user: { sub: number },
  ) {
    const card = await this.cardService.findOne(+id);
    if (!card) throw new NotFoundException();
    if (card.userId !== user.sub) throw new ForbiddenException();
    return this.cardService.update(+id, updateCollectionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { sub: number }) {
    return this.cardService.remove(id, user.sub);
  }
}

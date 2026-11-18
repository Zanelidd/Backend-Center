import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
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
  async create(
    @Body() createCardDto: CreateCardDto,
    @CurrentUser() user: { sub: number },
  ) {
    const result = await this.cardService.create(createCardDto, user.sub);
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
    return this.cardService.update(+id, updateCollectionDto, user.sub);
  }

  
  @Delete(':remoteId')
  remove(
    @Param('remoteId') remoteId: string,
    @CurrentUser() user: { sub: number },
  ) {
    return this.cardService.remove(remoteId, user.sub);
  }
}

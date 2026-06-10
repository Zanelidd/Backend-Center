import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ExternalApiService } from './external_api.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { SearchCardDto } from './dto/search-card.dto';
import { SetCardsDto } from './dto/set-cards.dto';

@UseGuards(ThrottlerGuard)
@Controller('external_api')
export class ExternalApiController {
  constructor(private readonly externalApiService: ExternalApiService) {}

  @Get()
  findAll() {
    return this.externalApiService.findAll();
  }

  @Get('/cards/:id')
  findOne(@Param('id') id: string) {
    return this.externalApiService.findOne(id);
  }

  @Get('/searchCard')
  findMany(@Query() query: SearchCardDto) {
    return this.externalApiService.findMany(query.name);
  }

  @Get('/cards')
  findManyBySet(@Query() query: SetCardsDto) {
    return this.externalApiService.findManyBySet(query.setId);
  }
}

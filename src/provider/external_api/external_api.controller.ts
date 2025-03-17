import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ExternalApiService } from './external_api.service';

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

  @Post('/searchCard')
  findMany(@Body('name') name: string) {
    return this.externalApiService.findMany(name);
  }

  @Post('/cards')
  findManyBySet(@Body('setId') setId: string) {
    console.log(setId);
    return this.externalApiService.findManyBySet(setId);
  }
}

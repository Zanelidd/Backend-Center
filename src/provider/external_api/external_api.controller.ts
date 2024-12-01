import { Body, Controller, Get, Post } from '@nestjs/common';
import { ExternalApiService } from './external_api.service';

@Controller('external_api')
export class ExternalApiController {
  constructor(private readonly externalApiService: ExternalApiService) {}

  @Get()
  findAll() {
    return this.externalApiService.findAll();
  }

  //@Get(':id')
  //findOne(@Param('id') id: string) {
  //return this.externalApi.findOne();
  //}

  @Post()
  findMany(@Body('name') name: string) {
    return this.externalApiService.findMany(name);
  }
}

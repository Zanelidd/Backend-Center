import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ExternalApiController } from './external_api.controller';
import { ExternalApiService } from './external_api.service';

@Module({
  imports: [HttpModule.register({ timeout: 10_000 }), ConfigModule],
  controllers: [ExternalApiController],
  providers: [ExternalApiService],
  exports: [ExternalApiService],
})
export class ExternalApiModule {}

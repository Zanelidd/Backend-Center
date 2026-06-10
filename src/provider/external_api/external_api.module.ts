import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ExternalApiController } from './external_api.controller';
import { ExternalApiService } from './external_api.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [HttpModule, ConfigModule, AuthModule],
  controllers: [ExternalApiController],
  providers: [ExternalApiService],
  exports: [ExternalApiService],
})
export class ExternalApiModule {}

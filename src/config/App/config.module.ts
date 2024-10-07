import { ConfigModule } from '@nestjs/config';
import db_configuration from './db_configuration';
import { Module } from '@nestjs/common';
import { AppConfigService } from './config.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [db_configuration],
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}

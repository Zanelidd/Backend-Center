import { ConfigModule } from '@nestjs/config';
import db_configuration from './db_configuration';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [db_configuration],
    }),
  ],
})
export class AppConfigModule {}

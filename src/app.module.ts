import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AppConfigModule } from './config/App/config.module';
import { CollectionModule } from './collection/collection.module';
import { PrismaModule } from './provider/database/prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';
import { ExternalApiModule } from './provider/external_api/external_api.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    AppConfigModule,
    CollectionModule,
    ExternalApiModule,
    PrismaModule,
    HttpModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

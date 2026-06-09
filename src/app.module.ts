import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AppConfigModule } from './config/App/config.module';
import { CardModule } from './card/card.module';
import { PrismaModule } from './provider/database/prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';
import { ExternalApiModule } from './provider/external_api/external_api.module';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    AuthModule,
    UsersModule,
    AppConfigModule,
    CardModule,
    ExternalApiModule,
    PrismaModule,
    HttpModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

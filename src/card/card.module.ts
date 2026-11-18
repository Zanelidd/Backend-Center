import { Module } from '@nestjs/common';
import { CardService } from './service/card.service';
import { CardController } from './controller/card.controller';
import { PrismaModule } from 'src/provider/database/prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [PrismaModule, HttpModule, AuthModule],
  controllers: [CardController],
  providers: [CardService],
  exports: [CardService],
})
export class CardModule {}

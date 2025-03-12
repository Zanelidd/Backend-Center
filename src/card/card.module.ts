import { Module } from '@nestjs/common';
import { CardService } from './service/card.service';
import { CardController } from './controller/card.controller';
import { PrismaModule } from 'src/provider/database/prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [PrismaModule, HttpModule],
  controllers: [CardController],
  providers: [CardService, JwtService],
  exports: [CardService],
})
export class CardModule {}

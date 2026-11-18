import { Module } from '@nestjs/common';
import { CardService } from './service/card.service';
import { CardController } from './controller/card.controller';
import { PrismaModule } from 'src/provider/database/prisma/prisma.module';
import { ExternalApiModule } from 'src/provider/external_api/external_api.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [PrismaModule, ExternalApiModule, AuthModule],
  controllers: [CardController],
  providers: [CardService],
  exports: [CardService],
})
export class CardModule {}

import { Module } from '@nestjs/common';
import { CollectionService } from './service/collection.service';
import { CollectionController } from './controller/collection.controller';
import { PrismaModule } from 'src/provider/database/prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [PrismaModule, HttpModule],
  controllers: [CollectionController],
  providers: [CollectionService],
  exports: [CollectionService],
})
export class CollectionModule {}

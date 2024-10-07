import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AppConfigModule } from './config/App/config.module';
import { TypeOrmProvideModule } from './providers/typeorm.module';

@Module({
  imports: [AuthModule, UsersModule, AppConfigModule, TypeOrmProvideModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

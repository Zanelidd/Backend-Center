import { Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AppConfigModule } from 'src/config/App/config.module';
import { AppConfigService } from 'src/config/App/config.service';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [AppConfigModule],
      useFactory: (
        appConfigService: AppConfigService,
      ): TypeOrmModuleOptions => ({
        type: 'mysql',
        host: appConfigService.dbHost,
        port: appConfigService.dbPort,
        username: appConfigService.dbUsername,
        password: appConfigService.dbPassword,
        database: appConfigService.dbDatabase,
        entities: ['dist/**/*.entity{.ts,.js}'],
        synchronize: false,
        logging: true,
      }),
      inject: [AppConfigService],
    }),
  ],
})
export class TypeOrmProvideModule {}

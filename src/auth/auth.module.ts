import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtService],
  exports: [AuthService],
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        return {
          global: true,
          secret: configService.get<string>('TOKEN_SECRET'),
          signOptions: { expiresIn: '240s' },
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class AuthModule {}

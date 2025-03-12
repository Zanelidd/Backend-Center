import { IsEmail, IsNumber, IsString } from 'class-validator';

export class CreateAuthDto {
  @IsNumber()
  id: number;

  @IsString()
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  hashPass: string;
}

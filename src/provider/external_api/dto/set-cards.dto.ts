import { IsNotEmpty, IsString } from 'class-validator';

export class SetCardsDto {
  @IsString()
  @IsNotEmpty()
  setId: string;
}

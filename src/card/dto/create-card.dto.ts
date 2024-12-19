import { IsNumber, IsString } from 'class-validator';

export class CreateCardDto {
  @IsString()
  cardId: string;
  @IsNumber()
  userId: number;
}

import { IsString } from 'class-validator';

export class CreateCollectionDto {
  @IsString()
  cardId: string;
  @IsString()
  cardImg: string;
  @IsString()
  cardName: string;
}

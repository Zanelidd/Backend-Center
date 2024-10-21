import { IsString } from 'class-validator';

export class CreateCollectionDto {
  @IsString()
  cardId: string;
}

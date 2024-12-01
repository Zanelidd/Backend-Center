import { IsNumber, IsObject, IsString } from 'class-validator';
import { Image } from '../types/collectionType';

export class CreateCollectionDto {
  @IsString()
  cardId: string;
  @IsString()
  name: string;
  @IsObject()
  images: Image;
  @IsNumber()
  userId: number;
}

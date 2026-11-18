import { IsNotEmpty, IsString } from 'class-validator';

export class SearchCardDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

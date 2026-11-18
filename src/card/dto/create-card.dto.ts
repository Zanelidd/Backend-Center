import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateCardDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9-]+$/, {
    message: 'cardId must contain only letters, numbers, and hyphens',
  })
  cardId: string;
}

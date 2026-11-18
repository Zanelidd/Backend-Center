import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CardIdDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9-]+$/, { message: 'id must contain only letters, numbers, and hyphens' })
  id: string;
}

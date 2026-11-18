import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateCardDto } from './create-card.dto';

describe('CreateCardDto', () => {
  it.each(['xy7-54', 'base1-1', 'SM115'])(
    'accepts a valid cardId (%s)',
    async (cardId) => {
      const dto = plainToInstance(CreateCardDto, { cardId });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    },
  );

  it.each(['xy7-54 OR name:*', '', 'a/b', 'a b'])(
    'rejects a cardId with disallowed characters (%j)',
    async (cardId) => {
      const dto = plainToInstance(CreateCardDto, { cardId });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    },
  );
});

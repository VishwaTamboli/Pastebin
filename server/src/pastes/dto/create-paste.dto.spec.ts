import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreatePasteDto,
  PASTE_EXPIRATION_DURATIONS,
  PASTE_VISIBILITIES,
} from './create-paste.dto';

async function constraintMessages(input: object): Promise<string[]> {
  const dto = plainToInstance(CreatePasteDto, input);
  const errors = await validate(dto);
  return errors.flatMap((e) => Object.values(e.constraints ?? {}));
}

describe('CreatePasteDto', () => {
  it('is valid without expiresIn', async () => {
    await expect(constraintMessages({ content: 'hello' })).resolves.toEqual(
      [],
    );
  });

  it.each([...PASTE_EXPIRATION_DURATIONS])(
    'is valid with expiresIn %s',
    async (expiresIn) => {
      await expect(
        constraintMessages({ content: 'hello', expiresIn }),
      ).resolves.toEqual([]);
    },
  );

  it.each(['30s', '2h', '1w', '', 123, null])(
    'is invalid with expiresIn %p',
    async (expiresIn) => {
      const messages = await constraintMessages({
        content: 'hello',
        expiresIn,
      });
      expect(messages.length).toBeGreaterThan(0);
    },
  );

  it('is valid without visibility', async () => {
    await expect(constraintMessages({ content: 'hello' })).resolves.toEqual(
      [],
    );
  });

  it.each([...PASTE_VISIBILITIES])(
    'is valid with visibility %s',
    async (visibility) => {
      await expect(
        constraintMessages({ content: 'hello', visibility }),
      ).resolves.toEqual([]);
    },
  );

  it.each(['private', 'PUBLIC', '', 123, null])(
    'is invalid with visibility %p',
    async (visibility) => {
      const messages = await constraintMessages({
        content: 'hello',
        visibility,
      });
      expect(messages.length).toBeGreaterThan(0);
    },
  );

  it('is valid with exactly MAX_PASTE_CONTENT_LENGTH characters', async () => {
    await expect(
      constraintMessages({ content: 'x'.repeat(100_000) }),
    ).resolves.toEqual([]);
  });

  it('is invalid with more than MAX_PASTE_CONTENT_LENGTH characters', async () => {
    const messages = await constraintMessages({
      content: 'x'.repeat(100_001),
    });
    expect(messages.length).toBeGreaterThan(0);
  });

  it('is invalid with empty content', async () => {
    const messages = await constraintMessages({ content: '   ' });
    expect(messages.length).toBeGreaterThan(0);
  });
});

describe('global ValidationPipe options', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  it('rejects unknown request properties', async () => {
    await expect(
      pipe.transform(
        { content: 'hello', expiry: '1h' },
        { type: 'body', metatype: CreatePasteDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects auth-like properties: no owner fields exist in this phase', async () => {
    await expect(
      pipe.transform(
        { content: 'hello', ownerId: '11111111-1111-4111-8111-111111111111' },
        { type: 'body', metatype: CreatePasteDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts known properties', async () => {
    await expect(
      pipe.transform(
        { content: 'hello', expiresIn: '1h' },
        { type: 'body', metatype: CreatePasteDto },
      ),
    ).resolves.toEqual({ content: 'hello', expiresIn: '1h' });
  });
});

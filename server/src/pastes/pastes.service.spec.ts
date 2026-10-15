import { NotFoundException } from '@nestjs/common';
import {
  PASTE_EXPIRATION_DURATIONS,
  PASTE_VISIBILITIES,
  PasteExpirationDuration,
  PasteVisibility,
} from './dto/create-paste.dto';
import { Paste } from './paste.entity';
import { PastesService } from './pastes.service';

const DURATION_MS: Record<PasteExpirationDuration, number> = {
  '10m': 10 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
};

function makePaste(overrides: Partial<Paste> = {}): Paste {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    content: 'hello',
    visibility: 'public',
    expiresAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('PastesService', () => {
  const create = jest.fn();
  const save = jest.fn();
  const findOne = jest.fn();
  const service = new PastesService({ create, save, findOne } as never);

  beforeEach(() => jest.clearAllMocks());

  describe('create', () => {
    beforeEach(() => {
      create.mockImplementation((value) => value);
      save.mockImplementation(async (paste) => paste);
    });

    it('saves null expiresAt when expiresIn is omitted', async () => {
      const result = await service.create({ content: 'hello' });
      expect(create).toHaveBeenCalledWith({
        content: 'hello',
        visibility: 'public',
        expiresAt: null,
      });
      expect(result.expiresAt).toBeNull();
    });

    it('defaults visibility to public when omitted', async () => {
      await service.create({ content: 'hello' });
      expect(create.mock.calls[0][0].visibility).toBe('public');
    });

    it.each([...PASTE_VISIBILITIES])(
      'saves visibility %s as given',
      async (visibility: PasteVisibility) => {
        await service.create({ content: 'hello', visibility });
        expect(create.mock.calls[0][0].visibility).toBe(visibility);
      },
    );

    it.each([...PASTE_EXPIRATION_DURATIONS])(
      'maps expiresIn %s to now + offset',
      async (expiresIn) => {
        const before = Date.now();
        await service.create({ content: 'hello', expiresIn });
        const expiresAt: Date = create.mock.calls[0][0].expiresAt;
        expect(expiresAt).toBeInstanceOf(Date);
        expect(expiresAt.getTime()).toBeGreaterThanOrEqual(
          before + DURATION_MS[expiresIn],
        );
        expect(expiresAt.getTime()).toBeLessThanOrEqual(
          Date.now() + DURATION_MS[expiresIn],
        );
      },
    );
  });

  describe('findOne', () => {
    it('returns a paste with null expiresAt (never expires)', async () => {
      const paste = makePaste({ expiresAt: null });
      findOne.mockResolvedValue(paste);
      await expect(service.findOne(paste.id)).resolves.toBe(paste);
    });

    it.each([...PASTE_VISIBILITIES])(
      'returns a %s paste by direct URL',
      async (visibility: PasteVisibility) => {
        const paste = makePaste({ visibility });
        findOne.mockResolvedValue(paste);
        await expect(service.findOne(paste.id)).resolves.toBe(paste);
      },
    );

    it('returns a non-expired paste', async () => {
      const paste = makePaste({
        expiresAt: new Date(Date.now() + 60_000),
      });
      findOne.mockResolvedValue(paste);
      await expect(service.findOne(paste.id)).resolves.toBe(paste);
    });

    it('throws NotFoundException for an expired paste without deleting it', async () => {
      const paste = makePaste({
        expiresAt: new Date(Date.now() - 1000),
      });
      findOne.mockResolvedValue(paste);
      await expect(service.findOne(paste.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the paste does not exist', async () => {
      findOne.mockResolvedValue(null);
      await expect(
        service.findOne('11111111-1111-4111-8111-111111111111'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

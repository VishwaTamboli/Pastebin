import { LessThanOrEqual } from 'typeorm';
import { PasteCleanupService } from './paste-cleanup.service';

describe('PasteCleanupService', () => {
  const remove = jest.fn();
  const service = new PasteCleanupService({ delete: remove } as never);

  beforeEach(() => jest.clearAllMocks());

  it('deletes pastes whose expiration has passed', async () => {
    remove.mockResolvedValue({ affected: 2, raw: [] });
    await expect(service.removeExpiredPastes()).resolves.toBe(2);
    expect(remove).toHaveBeenCalledTimes(1);
    const criteria = remove.mock.calls[0][0] as {
      expiresAt: ReturnType<typeof LessThanOrEqual<Date>>;
    };
    // Same <= boundary the read path uses: expired means unreadable already.
    expect(criteria.expiresAt).toEqual(
      LessThanOrEqual(expect.any(Date) as unknown as Date),
    );
  });

  it('returns zero when nothing expired without failing', async () => {
    remove.mockResolvedValue({ affected: 0, raw: [] });
    await expect(service.removeExpiredPastes()).resolves.toBe(0);
  });

  it('treats a missing affected count as zero', async () => {
    remove.mockResolvedValue({ affected: null, raw: [] });
    await expect(service.removeExpiredPastes()).resolves.toBe(0);
  });
});

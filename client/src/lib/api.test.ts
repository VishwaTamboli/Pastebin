import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PasteApiError,
  PasteNotFoundError,
  buildCreatePayload,
  createPaste,
  getPaste,
  isUuid,
} from './api';
import type { Paste } from './api';

const SAMPLE_PASTE: Paste = {
  id: '11111111-1111-4111-8111-111111111111',
  content: 'hello',
  visibility: 'public',
  expiresAt: null,
  createdAt: '2026-10-14T00:00:00.000Z',
};

function mockFetchOnce(handler: () => Promise<Response>) {
  vi.stubGlobal('fetch', vi.fn(handler));
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('buildCreatePayload', () => {
  it('omits expiresIn when Never is selected', () => {
    expect(
      buildCreatePayload({
        content: 'hello',
        expiresIn: 'never',
        visibility: 'public',
      }),
    ).toEqual({ content: 'hello', visibility: 'public' });
  });

  it.each(['10m', '1h', '1d', '7d'] as const)(
    'passes expiresIn %s through',
    (expiresIn) => {
      expect(
        buildCreatePayload({ content: 'hello', expiresIn, visibility: 'unlisted' }),
      ).toEqual({ content: 'hello', expiresIn, visibility: 'unlisted' });
    },
  );
});

describe('createPaste', () => {
  it('returns the created paste on 201', async () => {
    mockFetchOnce(async () => jsonResponse(SAMPLE_PASTE, 201));
    await expect(
      createPaste({ content: 'hello', expiresIn: 'never', visibility: 'public' }),
    ).resolves.toEqual(SAMPLE_PASTE);
  });

  it('throws PasteApiError with the server message on 400', async () => {
    mockFetchOnce(async () =>
      jsonResponse({ message: ['content must contain non-whitespace text'] }, 400),
    );
    const err = await createPaste({
      content: '   ',
      expiresIn: 'never',
      visibility: 'public',
    }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PasteApiError);
    expect((err as PasteApiError).status).toBe(400);
    expect((err as PasteApiError).message).toContain('non-whitespace');
  });

  it('throws PasteApiError on network failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed');
      }),
    );
    const err = await createPaste({
      content: 'hello',
      expiresIn: 'never',
      visibility: 'public',
    }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PasteApiError);
    expect((err as PasteApiError).status).toBe(0);
  });
});

describe('getPaste', () => {
  it('returns the paste on 200', async () => {
    mockFetchOnce(async () => jsonResponse(SAMPLE_PASTE, 200));
    await expect(getPaste(SAMPLE_PASTE.id)).resolves.toEqual(SAMPLE_PASTE);
  });

  it('throws PasteNotFoundError on 404', async () => {
    mockFetchOnce(async () => jsonResponse({ message: 'Paste not found' }, 404));
    await expect(getPaste(SAMPLE_PASTE.id)).rejects.toBeInstanceOf(
      PasteNotFoundError,
    );
  });

  it('throws PasteApiError on other failures', async () => {
    mockFetchOnce(async () => jsonResponse({ message: 'Bad Request' }, 400));
    const err = await getPaste('nope').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PasteApiError);
    expect((err as PasteApiError).status).toBe(400);
  });
});

describe('isUuid', () => {
  it('accepts UUIDs and rejects other strings', () => {
    expect(isUuid('11111111-1111-4111-8111-111111111111')).toBe(true);
    expect(isUuid('not-a-uuid')).toBe(false);
    expect(isUuid('')).toBe(false);
  });
});

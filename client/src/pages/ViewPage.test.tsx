import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ViewPage from './ViewPage';
import type { Paste } from '../lib/api';

const SAMPLE_PASTE: Paste = {
  id: '11111111-1111-4111-8111-111111111111',
  content: 'hello world',
  visibility: 'public',
  expiresAt: null,
  createdAt: '2026-10-14T00:00:00.000Z',
};

function renderAt(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/${id}`]}>
      <Routes>
        <Route path="/:id" element={<ViewPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ViewPage', () => {
  it('shows content and metadata after loading', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify(SAMPLE_PASTE), { status: 200 }),
      ),
    );
    renderAt(SAMPLE_PASTE.id);

    expect(await screen.findByText('hello world')).toBeDefined();
    expect(screen.getByText('public')).toBeDefined();
    expect(screen.getByText('Never')).toBeDefined();
  });

  it('shows the not-found panel for expired or missing pastes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ message: 'Paste not found' }), {
            status: 404,
          }),
      ),
    );
    renderAt(SAMPLE_PASTE.id);

    expect(
      await screen.findByText(/does not exist or has expired/i),
    ).toBeDefined();
  });

  it('shows the not-found panel for a malformed id without calling the API', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderAt('not-a-uuid');

    expect(
      await screen.findByText(/does not exist or has expired/i),
    ).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

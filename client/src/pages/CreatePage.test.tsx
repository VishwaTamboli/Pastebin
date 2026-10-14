import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CreatePage from './CreatePage';
import type { Paste } from '../lib/api';

const SAMPLE_PASTE: Paste = {
  id: '11111111-1111-4111-8111-111111111111',
  content: 'hello',
  visibility: 'unlisted',
  expiresAt: null,
  createdAt: '2026-10-14T00:00:00.000Z',
};

function renderPage() {
  return render(
    <MemoryRouter>
      <CreatePage />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('CreatePage', () => {
  it('blocks empty submission without calling the API', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    await user.click(screen.getByRole('button', { name: /create new paste/i }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect((await screen.findByRole('alert')).textContent).toMatch(
      /must not be empty/i,
    );
  });

  it('shows the paste URL after successful creation', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify(SAMPLE_PASTE), { status: 201 }),
      ),
    );
    renderPage();

    await user.type(screen.getByLabelText(/content/i), 'hello');
    await user.selectOptions(screen.getByLabelText(/expiration/i), '1h');
    await user.click(screen.getByLabelText(/unlisted/i));
    await user.click(screen.getByRole('button', { name: /create new paste/i }));

    const urlField = (await screen.findByLabelText(
      /paste url/i,
    )) as HTMLInputElement;
    expect(urlField.value).toContain(SAMPLE_PASTE.id);
    expect(screen.getByRole('button', { name: /copy link/i })).toBeDefined();
  });

  it('displays server validation errors', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({ message: ['visibility must be one of: public, unlisted'] }),
          { status: 400 },
        ),
      ),
    );
    renderPage();

    await user.type(screen.getByLabelText(/content/i), 'hello');
    await user.click(screen.getByRole('button', { name: /create new paste/i }));

    expect((await screen.findByRole('alert')).textContent).toMatch(
      /must be one of: public, unlisted/i,
    );
  });
});

import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  PasteApiError,
  PasteNotFoundError,
  formatDateTime,
  getPaste,
  isUuid,
} from '../lib/api';
import type { Paste } from '../lib/api';

type ViewState =
  | { status: 'loading' }
  | { status: 'loaded'; paste: Paste }
  | { status: 'not-found' }
  | { status: 'bad-id' }
  | { status: 'error'; message: string };

function ViewPage() {
  const { id = '' } = useParams();
  const [state, setState] = useState<ViewState>({ status: 'loading' });

  const load = useCallback(async () => {
    if (!isUuid(id)) {
      setState({ status: 'bad-id' });
      return;
    }
    setState({ status: 'loading' });
    try {
      const paste = await getPaste(id);
      setState({ status: 'loaded', paste });
    } catch (err) {
      if (err instanceof PasteNotFoundError) {
        setState({ status: 'not-found' });
      } else {
        setState({
          status: 'error',
          message:
            err instanceof PasteApiError
              ? err.message
              : 'Something went wrong. Please try again.',
        });
      }
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.status === 'loading') {
    return (
      <section aria-label="Loading paste" aria-busy="true">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="mt-4 h-64 animate-pulse rounded border bg-gray-100" />
      </section>
    );
  }

  if (state.status === 'not-found' || state.status === 'bad-id') {
    return (
      <section aria-label="Paste not found">
        <h2 className="text-2xl font-bold">Paste not found</h2>
        <p className="mt-2 text-gray-600">
          This paste does not exist or has expired.
        </p>
        <Link
          to="/"
          className="mt-4 inline-block rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Create a new paste
        </Link>
      </section>
    );
  }

  if (state.status === 'error') {
    return (
      <section aria-label="Failed to load paste">
        <h2 className="text-2xl font-bold">Could not load paste</h2>
        <p role="alert" className="mt-2 text-gray-600">
          {state.message}
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Retry
          </button>
          <Link
            to="/"
            className="rounded border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            Home
          </Link>
        </div>
      </section>
    );
  }

  const { paste } = state;
  return (
    <section aria-label="Paste contents">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-2xl font-bold">Paste</h2>
        <span className="rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-semibold capitalize text-gray-700">
          {paste.visibility}
        </span>
      </div>
      <dl className="mt-2 space-y-1 text-sm text-gray-600">
        <div className="flex gap-2">
          <dt className="font-semibold">Created:</dt>
          <dd>{formatDateTime(paste.createdAt)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-semibold">Expires:</dt>
          <dd>
            {paste.expiresAt ? formatDateTime(paste.expiresAt) : 'Never'}
          </dd>
        </div>
      </dl>
      <pre className="mt-4 overflow-auto rounded border bg-white p-4 font-mono text-sm whitespace-pre-wrap break-words">
        {paste.content}
      </pre>
      <Link
        to="/"
        className="mt-4 inline-block text-sm font-semibold text-blue-600 hover:underline"
      >
        Create a new paste
      </Link>
    </section>
  );
}

export default ViewPage;

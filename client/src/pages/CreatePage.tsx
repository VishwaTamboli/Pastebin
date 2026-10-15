import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  EXPIRATION_OPTIONS,
  PasteApiError,
  VISIBILITY_OPTIONS,
  createPaste,
} from '../lib/api';
import type {
  ExpirationOption,
  Paste,
  VisibilityOption,
} from '../lib/api';

const EXPIRATION_LABELS: Record<ExpirationOption, string> = {
  never: 'Never',
  '10m': '10 minutes',
  '1h': '1 hour',
  '1d': '1 day',
  '7d': '7 days',
};

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
}

function CreatePage() {
  const [content, setContent] = useState('');
  const [expiresIn, setExpiresIn] = useState<ExpirationOption>('never');
  const [visibility, setVisibility] = useState<VisibilityOption>('public');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Paste | null>(null);
  const [copied, setCopied] = useState(false);

  const isEmpty = content.trim().length === 0;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isEmpty || submitting) {
      if (isEmpty) {
        setError('Paste content must not be empty.');
      }
      return;
    }
    setSubmitting(true);
    setError(null);
    setCopied(false);
    try {
      const paste = await createPaste({ content, expiresIn, visibility });
      setCreated(paste);
    } catch (err) {
      setError(
        err instanceof PasteApiError
          ? err.message
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleNew() {
    setContent('');
    setExpiresIn('never');
    setVisibility('public');
    setCreated(null);
    setError(null);
    setCopied(false);
  }

  async function handleCopy(url: string) {
    setCopied(await copyToClipboard(url));
  }

  if (created) {
    const url = `${window.location.origin}/${created.id}`;
    return (
      <section aria-label="Paste created">
        <h2 className="text-2xl font-bold">Paste created</h2>
        <p className="mt-2 text-gray-600">
          Share this link to let others view your paste.
        </p>
        <div className="mt-4 flex flex-col gap-2 rounded border bg-white p-4 sm:flex-row">
          <input
            type="text"
            readOnly
            value={url}
            aria-label="Paste URL"
            className="min-w-0 flex-1 rounded border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-sm"
            onFocus={(e) => e.target.select()}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleCopy(url)}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {copied ? 'Copied!' : 'Copy link'}
            </button>
            <Link
              to={`/${created.id}`}
              className="rounded border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
            >
              Open
            </Link>
          </div>
        </div>
        <button
          type="button"
          onClick={handleNew}
          className="mt-4 text-sm font-semibold text-blue-600 hover:underline"
        >
          Create another paste
        </button>
      </section>
    );
  }

  return (
    <section aria-label="Create a new paste">
      <h2 className="text-2xl font-bold">New paste</h2>
      <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-4">
        <div>
          <label
            htmlFor="paste-content"
            className="mb-1 block text-sm font-semibold text-gray-700"
          >
            Content
          </label>
          <textarea
            id="paste-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste your text here..."
            rows={14}
            disabled={submitting}
            className="min-h-[40vh] w-full rounded border border-gray-300 bg-white p-3 font-mono text-sm shadow-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="paste-expiration"
              className="mb-1 block text-sm font-semibold text-gray-700"
            >
              Expiration
            </label>
            <select
              id="paste-expiration"
              value={expiresIn}
              onChange={(e) =>
                setExpiresIn(e.target.value as ExpirationOption)
              }
              disabled={submitting}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm"
            >
              {EXPIRATION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {EXPIRATION_LABELS[option]}
                </option>
              ))}
            </select>
          </div>
          <fieldset>
            <legend className="mb-1 text-sm font-semibold text-gray-700">
              Visibility
            </legend>
            <div className="flex gap-4 pt-2">
              {VISIBILITY_OPTIONS.map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-1.5 text-sm capitalize"
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={option}
                    checked={visibility === option}
                    onChange={() => setVisibility(option)}
                    disabled={submitting}
                  />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        {error && (
          <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Creating...' : 'Create New Paste'}
        </button>
      </form>
    </section>
  );
}

export default CreatePage;

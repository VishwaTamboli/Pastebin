export const API_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const EXPIRATION_OPTIONS = ['never', '10m', '1h', '1d', '7d'] as const;

export type ExpirationOption = (typeof EXPIRATION_OPTIONS)[number];

export const VISIBILITY_OPTIONS = ['public', 'unlisted'] as const;

export type VisibilityOption = (typeof VISIBILITY_OPTIONS)[number];

export interface Paste {
  id: string;
  content: string;
  visibility: VisibilityOption;
  expiresAt: string | null;
  createdAt: string;
}

export interface CreatePasteInput {
  content: string;
  expiresIn: ExpirationOption;
  visibility: VisibilityOption;
}

export class PasteNotFoundError extends Error {
  constructor() {
    super('Paste not found');
    this.name = 'PasteNotFoundError';
  }
}

export class PasteApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'PasteApiError';
    this.status = status;
  }
}

function errorMessage(value: unknown): string {
  if (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof (value as { message: unknown }).message !== 'undefined'
  ) {
    const message = (value as { message: unknown }).message;
    return Array.isArray(message) ? message.join(', ') : String(message);
  }
  return 'Request failed';
}

export function buildCreatePayload(input: CreatePasteInput): {
  content: string;
  expiresIn?: string;
  visibility: VisibilityOption;
} {
  const { content, expiresIn, visibility } = input;
  return {
    content,
    // "Never" maps to an omitted expiresIn field.
    ...(expiresIn === 'never' ? {} : { expiresIn }),
    visibility,
  };
}

export async function createPaste(input: CreatePasteInput): Promise<Paste> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/pastes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildCreatePayload(input)),
    });
  } catch {
    throw new PasteApiError(0, 'Network error: could not reach the server');
  }
  if (res.status === 201 || res.ok) {
    return (await res.json()) as Paste;
  }
  let message = `Request failed with status ${res.status}`;
  try {
    message = errorMessage(await res.json());
  } catch {
    // Keep the default message when the body is not JSON.
  }
  throw new PasteApiError(res.status, message);
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export async function getPaste(id: string): Promise<Paste> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/pastes/${id}`);
  } catch {
    throw new PasteApiError(0, 'Network error: could not reach the server');
  }
  if (res.ok) {
    return (await res.json()) as Paste;
  }
  if (res.status === 404) {
    throw new PasteNotFoundError();
  }
  let message = `Request failed with status ${res.status}`;
  try {
    message = errorMessage(await res.json());
  } catch {
    // Keep the default message when the body is not JSON.
  }
  throw new PasteApiError(res.status, message);
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

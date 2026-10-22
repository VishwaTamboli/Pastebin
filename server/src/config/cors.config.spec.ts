import {
  DEFAULT_CLIENT_URL,
  parseAllowedOrigins,
} from './cors.config';

describe('parseAllowedOrigins', () => {
  it('returns the single configured origin', () => {
    expect(parseAllowedOrigins('http://localhost:5173')).toEqual([
      'http://localhost:5173',
    ]);
  });

  it('splits comma-separated production origins and trims whitespace', () => {
    expect(
      parseAllowedOrigins(
        'https://app.example.com, https://admin.example.com ',
      ),
    ).toEqual(['https://app.example.com', 'https://admin.example.com']);
  });

  it('falls back to localhost outside production', () => {
    expect(parseAllowedOrigins(undefined, 'development')).toEqual([
      DEFAULT_CLIENT_URL,
    ]);
    expect(parseAllowedOrigins('  ', 'test')).toEqual([DEFAULT_CLIENT_URL]);
  });

  it('throws in production when no origin is configured', () => {
    expect(() => parseAllowedOrigins(undefined, 'production')).toThrow(
      /CLIENT_URL/,
    );
    expect(() => parseAllowedOrigins(' , ', 'production')).toThrow(
      /CLIENT_URL/,
    );
  });
});

// Must be imported before any module that reads DATABASE_* at load time
// (notably src/config/data-source.ts). dotenv never overrides existing vars,
// so the real server/.env values for host/user still apply.
process.env.DATABASE_NAME =
  process.env.DATABASE_TEST_NAME ?? 'pastebin_test';
// Generous throttle for the main suite; rate limiting itself is covered by
// throttle.e2e-spec.ts with its own low-limit instance.
process.env.THROTTLE_LIMIT = process.env.THROTTLE_LIMIT ?? '1000';

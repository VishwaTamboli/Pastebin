import './test-env';

// Dedicated low limit so the 429 path is exercised deterministically without
// a large request burst. Jest isolates files, so this cannot leak
// into the main e2e suite.
process.env.THROTTLE_LIMIT = '3';

import './test-env-throttle';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './bootstrap';
import { clearPastes, closeDatabase, setupDatabase } from './database';

/**
 * Isolated low-limit instance (THROTTLE_LIMIT=3) so the 429 path is exercised
 * deterministically without cross-test bucket leakage.
 */
describe('Rate limiting (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    await setupDatabase();
    app = await createTestApp();
  });

  afterEach(async () => {
    await clearPastes();
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  it('returns 429 once the limit is exceeded and keeps health exempt', async () => {
    const server = app.getHttpServer();
    for (let i = 0; i < 3; i += 1) {
      await request(server).post('/pastes').send({ content: 'x' }).expect(201);
    }
    await request(server).post('/pastes').send({ content: 'x' }).expect(429);
    await request(server).get('/health').expect(200);
  });
});

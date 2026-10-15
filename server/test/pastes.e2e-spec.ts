import './test-env';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './bootstrap';
import {
  clearPastes,
  closeDatabase,
  countPastes,
  insertExpiredPaste,
  setupDatabase,
} from './database';

describe('Pastes API (e2e)', () => {
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

  it('GET /health returns ok', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        if (res.body.status !== 'ok') {
          throw new Error(`unexpected body: ${JSON.stringify(res.body)}`);
        }
      });
  });

  it('POST /pastes creates a paste with defaults', async () => {
    const res = await request(app.getHttpServer())
      .post('/pastes')
      .send({ content: 'hello e2e' })
      .expect(201);

    expect(res.body.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(res.body).toMatchObject({
      content: 'hello e2e',
      visibility: 'public',
      expiresAt: null,
    });
    expect(await countPastes()).toBe(1);
  });

  it('POST /pastes honors expiresIn and visibility', async () => {
    const res = await request(app.getHttpServer())
      .post('/pastes')
      .send({ content: 'temporary', expiresIn: '1h', visibility: 'unlisted' })
      .expect(201);

    expect(res.body.visibility).toBe('unlisted');
    expect(new Date(res.body.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it.each([{}, { content: '   ' }, { content: 'x'.repeat(100_001) }])(
    'POST /pastes rejects invalid content %p with 400',
    async (body) => {
      await request(app.getHttpServer()).post('/pastes').send(body).expect(400);
    },
  );

  it.each([
    { expiresIn: '2h' },
    { visibility: 'private' },
    { content: 'x', expiry: '1h' },
    { content: 'x', ownerId: '11111111-1111-4111-8111-111111111111' },
  ])('POST /pastes rejects %p with 400', async (extra) => {
    await request(app.getHttpServer())
      .post('/pastes')
      .send({ content: 'hello', ...extra })
      .expect(400);
  });

  it('GET /pastes/:id round-trips a created paste', async () => {
    const created = await request(app.getHttpServer())
      .post('/pastes')
      .send({ content: 'round trip', visibility: 'unlisted' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get(`/pastes/${created.body.id as string}`)
      .expect(200);
    expect(res.body).toMatchObject({
      id: created.body.id,
      content: 'round trip',
      visibility: 'unlisted',
    });
  });

  it('GET /pastes/:id returns 404 for a missing paste', async () => {
    await request(app.getHttpServer())
      .get('/pastes/11111111-1111-4111-8111-111111111111')
      .expect(404);
  });

  it('GET /pastes/:id returns 404 for an expired paste', async () => {
    const id = await insertExpiredPaste('old paste');
    await request(app.getHttpServer()).get(`/pastes/${id}`).expect(404);
  });

  it('GET /pastes/:id returns 400 for a malformed UUID', async () => {
    await request(app.getHttpServer()).get('/pastes/not-a-uuid').expect(400);
  });
});

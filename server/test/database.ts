import dataSource from '../src/config/data-source';

/** Initializes the test database and applies all migrations. */
export async function setupDatabase(): Promise<void> {
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }
  await dataSource.runMigrations();
}

/** Removes all pastes while keeping migration history intact. */
export async function clearPastes(): Promise<void> {
  await dataSource.query('DELETE FROM pastes');
}

export async function insertExpiredPaste(content: string): Promise<string> {
  const rows = (await dataSource.query(
    `INSERT INTO pastes (content, visibility, expires_at)
     VALUES ($1, 'public', now() - interval '1 hour') RETURNING id`,
    [content],
  )) as Array<{ id: string }>;
  return rows[0].id;
}

export async function countPastes(): Promise<number> {
  const rows = (await dataSource.query(
    'SELECT count(*)::int AS count FROM pastes',
  )) as Array<{ count: number }>;
  return rows[0].count;
}

export async function closeDatabase(): Promise<void> {
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
}

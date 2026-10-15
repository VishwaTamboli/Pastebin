import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Paste } from '../pastes/paste.entity';

// Standalone DataSource for TypeORM CLI operations (migration:generate/run).
// Uses the same DATABASE_* environment variables as the NestJS app.
// Run CLI commands from server/ so server/.env is picked up.
// Note: exactly one DataSource export — the CLI rejects files with more.
export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 5432),
  username: process.env.DATABASE_USER ?? 'postgres',
  password: process.env.DATABASE_PASSWORD ?? 'postgres',
  database: process.env.DATABASE_NAME ?? 'pastebin',
  synchronize: false,
  entities: [Paste],
  // Works both under ts-node (src, .ts) and compiled output (dist, .js).
  migrations: [`${__dirname}/../migrations/*{.ts,.js}`],
});

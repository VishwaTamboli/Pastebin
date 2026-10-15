import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import { AppModule } from '../src/app.module';
import { parseAllowedOrigins } from '../src/config/cors.config';

/** Boots the real application (same wiring as main.ts) without listening. */
export async function createTestApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.use(json({ limit: '1mb' }));
  app.enableCors({
    origin: parseAllowedOrigins(process.env.CLIENT_URL),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  await app.init();
  return app;
}

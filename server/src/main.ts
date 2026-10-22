import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json } from 'express';
import { AppModule } from './app.module';
import { parseAllowedOrigins } from './config/cors.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Bound JSON body size: DTO validation caps content at 100k chars, but the
  // body parser runs first, so it needs headroom for encoding overhead.
  app.use(json({ limit: '1mb' }));

  app.enableCors({
    origin: parseAllowedOrigins(process.env.CLIENT_URL),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Pastebin API')
    .setDescription('Create and retrieve text pastes')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();

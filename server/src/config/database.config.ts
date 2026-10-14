import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';

@Injectable()
export class DatabaseConfig implements TypeOrmOptionsFactory {
  constructor(private readonly config: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      host: this.config.get<string>('DATABASE_HOST', 'localhost'),
      port: this.config.get<number>('DATABASE_PORT', 5432),
      username: this.config.get<string>('DATABASE_USER', 'postgres'),
      password: this.config.get<string>('DATABASE_PASSWORD', 'postgres'),
      database: this.config.get<string>('DATABASE_NAME', 'pastebin'),
      // No application tables yet; never auto-sync schema.
      entities: [],
      synchronize: false,
      autoLoadEntities: true,
    };
  }
}

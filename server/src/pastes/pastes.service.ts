import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreatePasteDto,
  PasteExpirationDuration,
} from './dto/create-paste.dto';
import { Paste } from './paste.entity';

const EXPIRATION_DURATION_MS: Record<PasteExpirationDuration, number> = {
  '10m': 10 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
};

@Injectable()
export class PastesService {
  constructor(
    @InjectRepository(Paste)
    private readonly pastes: Repository<Paste>,
  ) {}

  create(dto: CreatePasteDto): Promise<Paste> {
    const expiresAt = dto.expiresIn
      ? new Date(Date.now() + EXPIRATION_DURATION_MS[dto.expiresIn])
      : null;
    return this.pastes.save(
      this.pastes.create({
        content: dto.content,
        visibility: dto.visibility ?? 'public',
        expiresAt,
      }),
    );
  }

  async findOne(id: string): Promise<Paste> {
    const paste = await this.pastes.findOne({ where: { id } });
    if (!paste || (paste.expiresAt !== null && paste.expiresAt <= new Date())) {
      throw new NotFoundException('Paste not found');
    }
    return paste;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Paste } from './paste.entity';

/**
 * Periodically deletes expired pastes. Only removes rows that are already
 * unreadable through the API (`findOne` returns 404 for them), so cleanup
 * never makes expired pastes accessible. Rows with NULL expiresAt
 * (never-expire) are untouched — SQL comparisons exclude NULLs.
 */
@Injectable()
export class PasteCleanupService {
  private readonly logger = new Logger(PasteCleanupService.name);

  constructor(
    @InjectRepository(Paste)
    private readonly pastes: Repository<Paste>,
  ) {}

  /** Called hourly by PasteCleanupScheduler; also directly testable. */
  async removeExpiredPastes(): Promise<number> {    const result = await this.pastes.delete({
      expiresAt: LessThanOrEqual(new Date()),
    });
    const affected = result.affected ?? 0;
    if (affected > 0) {
      this.logger.log(`Removed ${affected} expired paste(s)`);
    }
    return affected;
  }
}

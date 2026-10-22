import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PasteCleanupService } from './paste-cleanup.service';

/** Thin hourly trigger; all logic lives in PasteCleanupService. */
@Injectable()
export class PasteCleanupScheduler {
  constructor(private readonly cleanup: PasteCleanupService) {}

  @Cron(CronExpression.EVERY_HOUR)
  handleCron(): Promise<number> {
    return this.cleanup.removeExpiredPastes();
  }
}

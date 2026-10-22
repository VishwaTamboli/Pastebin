import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Paste } from './paste.entity';
import { PasteCleanupScheduler } from './paste-cleanup.scheduler';
import { PasteCleanupService } from './paste-cleanup.service';
import { PastesController } from './pastes.controller';
import { PastesService } from './pastes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Paste])],
  controllers: [PastesController],
  providers: [PastesService, PasteCleanupService, PasteCleanupScheduler],
})
export class PastesModule {}

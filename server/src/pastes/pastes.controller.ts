import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CreatePasteDto } from './dto/create-paste.dto';
import { PastesService } from './pastes.service';

@Controller('pastes')
export class PastesController {
  constructor(private readonly pastes: PastesService) {}

  @Post()
  create(@Body() dto: CreatePasteDto) {
    return this.pastes.create(dto);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.pastes.findOne(id);
  }
}

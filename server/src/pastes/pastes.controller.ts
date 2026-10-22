import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { CreatePasteDto } from './dto/create-paste.dto';
import { PastesService } from './pastes.service';

@ApiTags('pastes')
@Controller('pastes')
export class PastesController {
  constructor(private readonly pastes: PastesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'Paste created' })
  @ApiBadRequestResponse({ description: 'Invalid content or options' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  create(@Body() dto: CreatePasteDto) {
    return this.pastes.create(dto);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Paste retrieved' })
  @ApiBadRequestResponse({ description: 'Malformed UUID' })
  @ApiNotFoundResponse({ description: 'Paste does not exist or has expired' })
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.pastes.findOne(id);
  }
}

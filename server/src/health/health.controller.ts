import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('health')
@Controller()
export class HealthController {
  @SkipThrottle()
  @Get('health')
  @ApiOkResponse({ description: 'Backend is running' })
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}

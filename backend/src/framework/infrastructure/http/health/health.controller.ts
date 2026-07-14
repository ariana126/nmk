import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

export interface HealthStatus {
  status: 'ok';
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiOkResponse({
    schema: { properties: { status: { type: 'string', example: 'ok' } } },
  })
  check(): HealthStatus {
    return { status: 'ok' };
  }
}

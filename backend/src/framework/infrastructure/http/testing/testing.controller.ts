import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { TestingService } from './testing.service';

@ApiTags('Testing')
@Controller('testing')
export class TestingController {
  constructor(private readonly testingService: TestingService) {}

  @Post('migrations')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Run pending database migrations' })
  async runMigrations(): Promise<void> {
    await this.testingService.runMigrations();
  }

  @Post('truncate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Truncate all application tables' })
  async truncate(): Promise<void> {
    await this.testingService.truncateAllTables();
  }
}

import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { AdvanceClockDto } from './dto/advance-clock.dto';
import { SetClockDto } from './dto/set-clock.dto';
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

  @Post('clock')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Freeze the clock at a given instant' })
  setClock(@Body() body: SetClockDto): void {
    this.testingService.setClock(body.now);
  }

  @Post('clock/advance')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Advance the clock by a number of milliseconds' })
  advanceClock(@Body() body: AdvanceClockDto): void {
    this.testingService.advanceClock(body.milliseconds);
  }

  @Post('clock/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reset the clock to its default instant' })
  resetClock(): void {
    this.testingService.resetClock();
  }
}

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { AdvanceClockDto } from './dto/advance-clock.dto';
import { ListEmailsDto } from './dto/list-emails.dto';
import { SetClockDto } from './dto/set-clock.dto';
import { SentEmailView } from './sent-email.view';
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
  @ApiOperation({
    summary: 'Truncate all application tables and clear the email outbox',
  })
  async truncate(): Promise<void> {
    await this.testingService.truncateAll();
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

  @Get('emails')
  @ApiOperation({ summary: 'List the emails sent to an address, newest first' })
  emails(@Query() query: ListEmailsDto): SentEmailView[] {
    return this.testingService.emailsSentTo(query.to);
  }
}

import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601 } from 'class-validator';

export class SetClockDto {
  @IsISO8601()
  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  now: string;
}

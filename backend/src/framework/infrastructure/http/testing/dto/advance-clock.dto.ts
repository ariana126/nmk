import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class AdvanceClockDto {
  @IsInt()
  @Min(0)
  @ApiProperty({ example: 3_600_000 })
  milliseconds: number;
}

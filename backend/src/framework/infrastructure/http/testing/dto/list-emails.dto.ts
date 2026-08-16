import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ListEmailsDto {
  @IsEmail()
  @ApiProperty({ example: 'john.doe@example.com' })
  to: string;
}

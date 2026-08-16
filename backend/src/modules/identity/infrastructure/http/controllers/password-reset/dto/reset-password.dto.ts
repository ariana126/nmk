import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  // The same rule sign-up applies: a replacement password is held to the
  // standard a new one would be.
  @IsString()
  @MinLength(12)
  @ApiProperty({ example: 'password12345' })
  password: string;
}

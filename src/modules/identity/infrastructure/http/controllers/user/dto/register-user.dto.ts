import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterUserDto {
  @IsEmail()
  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;

  @IsString()
  @MinLength(8)
  @ApiProperty({ example: 'password123' })
  password: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'John' })
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Doe' })
  lastName: string;
}

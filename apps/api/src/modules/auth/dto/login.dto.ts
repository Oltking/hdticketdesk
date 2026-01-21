import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class LoginDto {
  @ApiProperty({ example: 'john@example.com', description: 'User email address' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  @MaxLength(255, { message: 'Email is too long' })
  email: string;

  @ApiProperty({ example: 'SecurePass123!', description: 'User password' })
  @IsString({ message: 'Password is required' })
  @MinLength(1, { message: 'Password is required' })
  @MaxLength(128, { message: 'Password is too long' })
  password: string;
}

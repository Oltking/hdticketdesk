import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum UserRole {
  BUYER = 'BUYER',
  ORGANIZER = 'ORGANIZER',
  ADMIN = 'ADMIN',
}

export class RegisterDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({ example: 'SecurePass123' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(1, { message: 'First name is required' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(1, { message: 'Last name is required' })
  lastName: string;

  @ApiPropertyOptional({ enum: UserRole, example: 'BUYER' })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Role must be BUYER, ORGANIZER, or ADMIN' })
  role?: UserRole;

  @ApiPropertyOptional({ example: 'My Event Company' })
  @IsOptional()
  @IsString()
  organizerTitle?: string;
}
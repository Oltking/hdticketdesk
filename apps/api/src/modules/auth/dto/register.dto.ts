import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsEnum, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum UserRole {
  BUYER = 'BUYER',
  ORGANIZER = 'ORGANIZER',
  // Note: ADMIN role is intentionally excluded from public registration
  // Admins can only be created via database seed or admin-only endpoints
}

export class RegisterDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  @MaxLength(255, { message: 'Email is too long' })
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password is too long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(1, { message: 'First name is required' })
  @MaxLength(100, { message: 'First name is too long' })
  @Transform(({ value }) => value?.trim())
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(1, { message: 'Last name is required' })
  @MaxLength(100, { message: 'Last name is too long' })
  @Transform(({ value }) => value?.trim())
  lastName: string;

  @ApiPropertyOptional({ enum: UserRole, example: 'BUYER' })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Role must be BUYER or ORGANIZER' })
  role?: UserRole;

  @ApiPropertyOptional({ example: 'My Event Company' })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Organization name must be at least 2 characters' })
  @MaxLength(200, { message: 'Organization name is too long' })
  @Transform(({ value }) => value?.trim())
  organizerTitle?: string;
}
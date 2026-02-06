import { IsString, IsOptional, Length, Matches, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateAgentCodeDto {
  @ApiPropertyOptional({ description: 'Optional label for the agent (e.g., "Gate 1", "John")' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  @Transform(({ value }) => value?.trim())
  label?: string;
}

export class ActivateAgentCodeDto {
  @ApiProperty({ description: 'The 9-character agent access code' })
  @IsString()
  @IsNotEmpty({ message: 'Access code is required' })
  @Transform(({ value }) => value?.toUpperCase().trim())
  @Length(9, 9, { message: 'Access code must be exactly 9 characters' })
  @Matches(/^[A-Z0-9]{9}$/, { message: 'Access code must contain only letters and numbers' })
  code: string;
}

export class AgentCheckInDto {
  @ApiProperty({ description: 'The QR code or ticket number to check in' })
  @IsString()
  @IsNotEmpty({ message: 'QR code or ticket number is required' })
  @Transform(({ value }) => value?.trim())
  @Length(1, 100, { message: 'QR code is too long' })
  qrCode: string;

  @ApiProperty({ description: 'The agent access code for authentication' })
  @IsString()
  @IsNotEmpty({ message: 'Access code is required' })
  @Transform(({ value }) => value?.toUpperCase().trim())
  @Length(9, 9, { message: 'Access code must be exactly 9 characters' })
  accessCode: string;
}

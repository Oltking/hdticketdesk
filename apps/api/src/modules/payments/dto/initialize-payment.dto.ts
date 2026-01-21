import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, IsInt, Min, Max } from 'class-validator';

export class InitializePaymentDto {
  @ApiProperty({ description: 'Event ID to purchase ticket for' })
  @IsString({ message: 'Event ID must be a string' })
  eventId: string;

  @ApiProperty({ description: 'Ticket tier ID' })
  @IsString({ message: 'Tier ID must be a string' })
  tierId: string;

  @ApiPropertyOptional({ description: 'Number of tickets to purchase', default: 1 })
  @IsOptional()
  @IsInt({ message: 'Quantity must be a whole number' })
  @Min(1, { message: 'Quantity must be at least 1' })
  @Max(10, { message: 'Maximum 10 tickets per order' })
  quantity?: number;

  @ApiPropertyOptional({ description: 'Guest email for unauthenticated purchases' })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  guestEmail?: string;
}

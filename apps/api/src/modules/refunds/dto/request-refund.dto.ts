import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class RequestRefundDto {
  @ApiProperty({ description: 'ID of the ticket to refund' })
  @IsString({ message: 'Ticket ID is required' })
  ticketId: string;

  @ApiPropertyOptional({ 
    description: 'Reason for requesting refund',
    example: 'Cannot attend due to schedule conflict',
  })
  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Please provide more detail (at least 10 characters)' })
  @MaxLength(1000, { message: 'Reason must be less than 1000 characters' })
  @Transform(({ value }) => value?.trim())
  reason?: string;
}

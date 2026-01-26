import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min, Max } from 'class-validator';

export class RequestWithdrawalDto {
  @ApiProperty({
    description: 'Amount to withdraw in Naira',
    example: 50000,
    minimum: 1000,
    maximum: 10000000,
  })
  @IsNumber({}, { message: 'Amount must be a valid number' })
  @Min(1000, { message: 'Minimum withdrawal amount is ₦1,000' })
  @Max(10000000, { message: 'Maximum withdrawal amount is ₦10,000,000' })
  amount: number;
}

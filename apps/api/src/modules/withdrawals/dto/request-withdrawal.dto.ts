import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class RequestWithdrawalDto {
  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(1000)
  amount: number;
}

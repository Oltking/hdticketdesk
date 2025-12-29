import { IsNumber, Min } from 'class-validator';

export class RequestWithdrawalDto {
  @IsNumber()
  @Min(1000)
  amount: number;
}
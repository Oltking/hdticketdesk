import { IsString, Length } from 'class-validator';

export class VerifyWithdrawalDto {
  @IsString()
  withdrawalId: string;

  @IsString()
  @Length(6, 6)
  otp: string;
}
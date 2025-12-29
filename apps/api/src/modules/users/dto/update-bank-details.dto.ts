import { IsString, MinLength, MaxLength } from 'class-validator';

export class UpdateBankDetailsDto {
  @IsString()
  bankName: string;

  @IsString()
  @MinLength(10)
  @MaxLength(10)
  accountNumber: string;

  @IsString()
  accountName: string;
}
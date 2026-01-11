import { IsEmail, IsString, IsIn } from 'class-validator';

export class ResendOtpDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsIn(['LOGIN', 'WITHDRAWAL', 'BANK_CHANGE'])
  type: 'LOGIN' | 'WITHDRAWAL' | 'BANK_CHANGE';
}

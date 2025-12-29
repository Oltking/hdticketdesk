import { IsString, Length, IsEnum } from 'class-validator';
import { OtpType } from '@prisma/client';

export class VerifyOtpDto {
  @IsString()
  @Length(6, 6)
  code: string;

  @IsEnum(OtpType)
  type: OtpType;
}
import { IsEnum } from 'class-validator';
import { OtpType } from '@prisma/client';

export class ResendOtpDto {
  @IsEnum(OtpType)
  type: OtpType;
}
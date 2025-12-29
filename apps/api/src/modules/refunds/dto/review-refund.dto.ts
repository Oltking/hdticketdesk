import { IsString, IsOptional } from 'class-validator';

export class ReviewRefundDto {
  @IsString()
  @IsOptional()
  reviewNote?: string;
}
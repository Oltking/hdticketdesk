import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RequestRefundDto {
  @ApiProperty()
  @IsString()
  ticketId: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  reason: string;
}

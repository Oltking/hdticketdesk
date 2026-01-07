import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CheckInDto {
  @ApiProperty()
  @IsString()
  qrCode: string;

  @ApiProperty()
  @IsString()
  eventId: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class InitializePaymentDto {
  @ApiProperty()
  @IsString()
  eventId: string;

  @ApiProperty()
  @IsString()
  tierId: string;
}

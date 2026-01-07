import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class UpdateBankDetailsDto {
  @ApiProperty({ example: 'Access Bank' })
  @IsString()
  bankName: string;

  @ApiProperty({ example: '044' })
  @IsString()
  bankCode: string;

  @ApiProperty({ example: '0123456789' })
  @IsString()
  @Length(10, 10)
  accountNumber: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  accountName: string;
}

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTicketTierDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(1)
  capacity: number;

  @IsBoolean()
  @IsOptional()
  refundEnabled?: boolean;
}

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  location?: string;

  @IsBoolean()
  @IsOptional()
  isLocationPublic?: boolean; // If false, location is only sent via email after ticket purchase

  @IsBoolean()
  @IsOptional()
  isOnline?: boolean;

  @IsString()
  @IsOptional()
  onlineLink?: string;

  @IsString()
  @IsOptional()
  coverImage?: string;

  @IsArray()
  @IsOptional()
  gallery?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTicketTierDto)
  tiers: CreateTicketTierDto[];

  @IsBoolean()
  @IsOptional()
  passFeeTobuyer?: boolean; // If true, 5% service fee is added to buyer's payment at checkout
}

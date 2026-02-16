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
import { Type, Transform } from 'class-transformer';

export class CreateTicketTierDto {
  // Optional on create, required on update for existing tiers
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional() // Made optional for draft saving - validated on publish
  @MaxLength(100, { message: 'Tier name must be less than 100 characters' })
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Tier description must be less than 500 characters' })
  description?: string;

  @IsNumber({}, { message: 'Price must be a valid number' })
  @Min(0, { message: 'Price cannot be negative' })
  @IsOptional() // Made optional for draft saving - defaults to 0
  price?: number;

  @IsNumber({}, { message: 'Capacity must be a valid number' })
  @Min(1, { message: 'Capacity must be at least 1' })
  @IsOptional() // Made optional for draft saving - defaults to 1
  capacity?: number;

  @IsBoolean()
  @IsOptional()
  refundEnabled?: boolean;

  @IsString()
  @IsOptional()
  saleEndDate?: string; // Date and time when ticket sales end for this tier (accepts datetime-local format)
}

export class CreateEventDto {
  @IsString()
  @IsNotEmpty({ message: 'Event title is required' })
  @MaxLength(200, { message: 'Event title must be less than 200 characters' })
  title: string;

  @IsString()
  @IsOptional() // Made optional for draft saving - validated on publish
  @MaxLength(5000, { message: 'Event description must be less than 5000 characters' })
  description?: string;

  @IsString()
  @IsOptional() // Made optional for draft saving - validated on publish
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  location?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

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
  @IsOptional() // Made optional for draft saving - validated on publish
  @ValidateNested({ each: true })
  @Type(() => CreateTicketTierDto)
  tiers?: CreateTicketTierDto[];

  @IsBoolean()
  @IsOptional()
  passFeeTobuyer?: boolean; // If true, 5% service fee is added to buyer's payment at checkout

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === 'on')
  hideTicketSalesProgress?: boolean; // If true, hides ticket sales indicators (quantity left, % sold, progress bars) from public views
}

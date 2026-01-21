import { plainToInstance } from 'class-transformer';
import { IsString, IsNumber, IsOptional, validateSync, IsEnum } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  PORT: number = 3001;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  JWT_REFRESH_SECRET: string;

  @IsString()
  MAILGUN_API_KEY: string;

  @IsString()
  MAILGUN_DOMAIN: string;

  @IsString()
  MONNIFY_API_KEY: string;

  @IsString()
  MONNIFY_SECRET_KEY: string;

  @IsString()
  MONNIFY_CONTRACT_CODE: string;

  @IsString()
  @IsOptional()
  MONNIFY_BASE_URL?: string;

  @IsString()
  @IsOptional()
  MONNIFY_WALLET_ACCOUNT_NUMBER?: string; // Required for disbursements/withdrawals

  @IsString()
  @IsOptional()
  FRONTEND_URL?: string;

  @IsString()
  @IsOptional()
  CLOUDINARY_CLOUD_NAME: string;

  @IsString()
  @IsOptional()
  CLOUDINARY_API_KEY: string;

  @IsString()
  @IsOptional()
  CLOUDINARY_API_SECRET: string;

  // Admin seed credentials (for initial admin setup via prisma seed)
  @IsString()
  @IsOptional()
  ADMIN_SEED_EMAIL?: string;

  @IsString()
  @IsOptional()
  ADMIN_SEED_PASSWORD?: string;

  @IsString()
  @IsOptional()
  ADMIN_SEED_FIRST_NAME?: string;

  @IsString()
  @IsOptional()
  ADMIN_SEED_LAST_NAME?: string;

  // Test user password (for development seed only)
  @IsString()
  @IsOptional()
  TEST_SEED_PASSWORD?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const configService = app.get(ConfigService);

  // Security
  app.use(helmet());

  // CORS
  const corsOrigins = configService.get('CORS_ORIGINS')?.split(',') || [
    'http://localhost:3000',
  ];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api/v1');

  const port = configService.get('PORT') || 4000;
  await app.listen(port);

  console.log(`\n🚀 hdticketdesk API running on: http://localhost:${port}`);
  console.log(`📚 Environment: ${configService.get('NODE_ENV')}`);
}

bootstrap();
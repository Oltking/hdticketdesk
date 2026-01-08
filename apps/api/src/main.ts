// ===========================================
// HD TICKET DESK - MAIN ENTRY POINT
// ===========================================

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);
  const apiPrefix = configService.get<string>('API_PREFIX', 'api');
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3000');

  // Security
  app.use(helmet());

  // CORS
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
  });

  // API Prefix
  app.setGlobalPrefix(apiPrefix);

  // API Versioning
  /*app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });*/

  // Global Pipes
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

  // Global Filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global Interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // Swagger Documentation
  if (configService.get('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('HD Ticket Desk API')
      .setDescription('Africa-first ticketing & paid appointments platform API')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('Auth', 'Authentication endpoints')
      .addTag('Users', 'User management endpoints')
      .addTag('Events', 'Event management endpoints')
      .addTag('Tickets', 'Ticket purchase and management')
      .addTag('Payments', 'Payment processing')
      .addTag('Refunds', 'Refund handling')
      .addTag('Withdrawals', 'Organizer withdrawals')
      .addTag('QR', 'QR code generation and scanning')
      .addTag('Media', 'Media upload endpoints')
      .addTag('Admin', 'Admin dashboard endpoints')
      .addTag('Health', 'Health check endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  await app.listen(port);

  console.log('');
  console.log('🎫 ================================');
  console.log('   HD TICKET DESK API');
  console.log('================================');
  console.log(`🚀 Server running on: http://localhost:${port}`);
  console.log(`📚 API Docs: http://localhost:${port}/docs`);
  console.log(`🔧 Environment: ${configService.get('NODE_ENV', 'development')}`);
  console.log('================================');
  console.log('');
}

bootstrap();

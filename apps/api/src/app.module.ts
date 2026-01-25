// ===========================================
// HD TICKET DESK - ROOT MODULE
// ===========================================

import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// Config
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import emailConfig from './config/email.config';
import monnifyConfig from './config/monnify.config';
import cloudinaryConfig from './config/cloudinary.config';
import googleConfig from './config/google.config';

// Database
import { PrismaModule } from './database/prisma.module';

// Common
import { LoggerMiddleware } from './common/middleware/logger.middleware';

// Feature Modules
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { EventsModule } from './modules/events/events.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { RefundsModule } from './modules/refunds/refunds.module';
import { WithdrawalsModule } from './modules/withdrawals/withdrawals.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { QrModule } from './modules/qr/qr.module';
import { MediaModule } from './modules/media/media.module';
import { EmailModule } from './modules/emails/email.module';
import { AdminModule } from './modules/admin/admin.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { ReconciliationModule } from './modules/reconciliation/reconciliation.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        jwtConfig,
        emailConfig,
        monnifyConfig,
        cloudinaryConfig,
        googleConfig,
      ],
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate Limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL', 60) * 1000,
          limit: config.get<number>('THROTTLE_LIMIT', 100),
        },
      ],
    }),

    // Database
    PrismaModule,

    // Feature Modules
    HealthModule,
    AuthModule,
    UsersModule,
    EventsModule,
    TicketsModule,
    PaymentsModule,
    RefundsModule,
    WithdrawalsModule,
    LedgerModule,
    QrModule,
    MediaModule,
    EmailModule,
    AdminModule,
    TasksModule,
    ReconciliationModule,
  ],
  providers: [
    // Global Rate Limiting Guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}

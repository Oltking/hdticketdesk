import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { EmailModule } from '../emails/email.module';

// Conditionally import Google Strategy to prevent module crash if it fails
let GoogleOAuthStrategy: any = null;
try {
  GoogleOAuthStrategy = require('./strategies/google.strategy').GoogleOAuthStrategy;
} catch (error) {
  console.warn('[AuthModule] Google OAuth disabled:', error.message);
}

// Build providers array - only include Google if it loaded
const providers: any[] = [AuthService, JwtStrategy, LocalStrategy];
if (GoogleOAuthStrategy) {
  providers.push(GoogleOAuthStrategy);
}

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt', session: false }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.accessExpiresIn', '15m'),
        },
      }),
    }),
    EmailModule,
  ],
  controllers: [AuthController],
  providers: providers,
  exports: [AuthService, JwtModule],
})
export class AuthModule {}

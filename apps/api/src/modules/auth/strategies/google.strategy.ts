import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

export interface GoogleUser {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  accessToken: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('google.clientId') || configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('google.clientSecret') || configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get<string>('google.callbackUrl') || configService.get<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    this.logger.debug(`Google OAuth validate called for: ${profile.emails?.[0]?.value}`);

    const { id, name, emails, photos } = profile;

    const user: GoogleUser = {
      googleId: id,
      email: emails?.[0]?.value || '',
      firstName: name?.givenName || '',
      lastName: name?.familyName || '',
      avatarUrl: photos?.[0]?.value || '',
      accessToken,
    };

    done(null, user);
  }
}

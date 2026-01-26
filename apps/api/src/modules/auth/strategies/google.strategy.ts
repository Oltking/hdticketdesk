import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// GoogleUser interface is defined in auth.service.ts to avoid circular imports
interface GoogleUser {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  accessToken: string;
}

@Injectable()
export class GoogleOAuthStrategy extends PassportStrategy(GoogleStrategy, 'google') {
  private readonly logger = new Logger(GoogleOAuthStrategy.name);

  constructor(private configService: ConfigService) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL');

    if (!clientID || !clientSecret || !callbackURL) {
      const missingVars = [];
      if (!clientID) missingVars.push('GOOGLE_CLIENT_ID');
      if (!clientSecret) missingVars.push('GOOGLE_CLIENT_SECRET');
      if (!callbackURL) missingVars.push('GOOGLE_CALLBACK_URL');

      throw new Error(`Missing Google OAuth config: ${missingVars.join(', ')}`);
    }

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any): Promise<GoogleUser> {
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

    return user;
  }
}

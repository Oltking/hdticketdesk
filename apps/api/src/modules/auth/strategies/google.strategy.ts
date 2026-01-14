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

    // Log configuration for debugging
    console.log('🔍 Google OAuth Strategy Initialization:');
    console.log('- Client ID:', clientID ? `${clientID.substring(0, 10)}...` : 'MISSING');
    console.log('- Client Secret:', clientSecret ? 'SET' : 'MISSING');
    console.log('- Callback URL:', callbackURL || 'MISSING');

    if (!clientID || !clientSecret || !callbackURL) {
      const missingVars = [];
      if (!clientID) missingVars.push('GOOGLE_CLIENT_ID');
      if (!clientSecret) missingVars.push('GOOGLE_CLIENT_SECRET');
      if (!callbackURL) missingVars.push('GOOGLE_CALLBACK_URL');
      
      const errorMsg = `Missing required Google OAuth environment variables: ${missingVars.join(', ')}`;
      console.error('❌ Google OAuth Strategy Failed:', errorMsg);
      throw new Error(errorMsg);
    }

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
    });

    console.log('✅ Google OAuth Strategy initialized successfully');
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
  ): Promise<GoogleUser> {
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

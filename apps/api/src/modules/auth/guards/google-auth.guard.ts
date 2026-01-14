import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  private readonly logger = new Logger(GoogleAuthGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const result = (await super.canActivate(context)) as boolean;
      return result;
    } catch (error) {
      this.logger.error('Google OAuth authentication error:', error.message);
      throw error;
    }
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      this.logger.error('Google OAuth failed:', err?.message || 'No user data returned');
      throw err || new Error('Google authentication failed');
    }
    return user;
  }
}

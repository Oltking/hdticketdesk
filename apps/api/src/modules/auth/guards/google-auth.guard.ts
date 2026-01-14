import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  private readonly logger = new Logger(GoogleAuthGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    this.logger.log('GoogleAuthGuard.canActivate called');
    try {
      const result = (await super.canActivate(context)) as boolean;
      this.logger.log(`GoogleAuthGuard.canActivate result: ${result}`);
      return result;
    } catch (error) {
      this.logger.error('GoogleAuthGuard.canActivate error:', error);
      throw error;
    }
  }

  handleRequest(err: any, user: any, info: any) {
    this.logger.log(`GoogleAuthGuard.handleRequest - user: ${user?.email || 'none'}, err: ${err?.message || 'none'}`);
    if (err || !user) {
      this.logger.error('GoogleAuthGuard authentication failed:', err || 'No user returned');
      throw err || new Error('Google authentication failed');
    }
    return user;
  }
}

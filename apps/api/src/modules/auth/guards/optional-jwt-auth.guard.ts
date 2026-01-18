import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Override handleRequest to allow unauthenticated requests
  handleRequest(err: any, user: any) {
    // If there's no user (unauthenticated), just return null instead of throwing
    // If there's an error but it's just "No auth token", allow it through
    if (!user && !err) {
      return null;
    }

    if (err) {
      // Only throw if it's an actual error (not just missing token)
      if (err.message && err.message !== 'No auth token') {
        throw err;
      }
      return null;
    }

    return user;
  }

  // Override canActivate to not throw on missing token
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const result = await super.canActivate(context);
      return result as boolean;
    } catch (err) {
      // If authentication fails, just return true to allow the request through
      return true;
    }
  }
}

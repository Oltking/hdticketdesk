import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  // ==================== REGISTER ====================
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    const ip = req.ip || req.connection.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    return this.authService.register(dto, ip, userAgent);
  }

  // ==================== LOGIN ====================
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Email not verified' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip = req.ip || req.connection.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    return this.authService.login(dto, ip, userAgent);
  }

  // ==================== VERIFY OTP (Generic) ====================
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP (email verification or login)' })
  @ApiResponse({ status: 200, description: 'OTP verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  async verifyOtp(
    @Body() body: { userId?: string; email?: string; code: string; type: string },
    @Req() req: Request,
  ) {
    const ip = req.ip || req.connection.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    let userId = body.userId;
    let triedEmail: string | undefined;

    // If a userId is provided, verify it resolves. If it doesn't and an email is provided, try email lookup as a fallback.
    if (userId) {
      const userById = await this.authService.getUserById(userId);
      if (!userById && body.email) {
        triedEmail = body.email.trim().toLowerCase();
        const userByEmail = await this.authService.getUserByEmail(triedEmail);
        if (userByEmail) {
          userId = userByEmail.id;
        }
      }
    } else if (body.email) {
      triedEmail = body.email.trim().toLowerCase();
      const user = await this.authService.getUserByEmail(triedEmail);
      if (user) userId = user.id;
    }

    // Extra fallback: if we still don't have a userId but this is an email verification,
    // try to resolve the user by the verification token (code). This helps cases where
    // the frontend lost the query params or localStorage state.
    if (!userId && body.type === 'EMAIL_VERIFICATION' && body.code) {
      const byToken = await this.authService.getUserByVerificationToken(body.code);
      if (byToken) {
        userId = byToken.id;
      }
    }

    if (!userId) {
      const mask = (e?: string) => (e ? `${e.slice(0, 3)}***${e.slice(-3)}` : undefined);
      throw new (await import('@nestjs/common')).BadRequestException({
        message: 'User not found',
        attempted: { userId: userId ?? null, email: mask(triedEmail ?? body.email) },
      });
    }

    return this.authService.verifyOtp(userId, body.code, body.type, ip, userAgent);
  }

  // ==================== RESEND OTP ====================
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend OTP for email verification or new device login' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  async resendOtp(@Body() body: { userId?: string; email?: string; type: string }) {
    // EMAIL_VERIFICATION can accept either userId or email
    if (body.type === 'EMAIL_VERIFICATION') {
      if (body.userId) {
        return this.authService.resendVerificationOtp(body.userId);
      }
      if (body.email) {
        return this.authService.resendVerificationEmail(body.email);
      }
      return { message: 'OTP sent if user exists' };
    }

    // NEW_DEVICE_LOGIN supports userId or email to locate the user
    if (body.type === 'NEW_DEVICE_LOGIN') {
      let user = null;
      if (body.userId) user = await this.authService.getUserById(body.userId);
      else if (body.email) user = await this.authService.getUserByEmail(body.email);

      if (user) {
        await this.authService.sendLoginOtp(user.id, user.email);
        return { message: 'OTP sent to your email' };
      }
    }

    return { message: 'OTP sent if user exists' };
  }

  // ==================== VERIFY EMAIL (Token Link) ====================
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email with token link' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(@Body() body: { token: string }) {
    return this.authService.verifyEmail(body.token);
  }

  // ==================== RESEND VERIFICATION EMAIL ====================
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend verification email' })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  async resendVerification(@Body() body: { email: string }) {
    return this.authService.resendVerificationEmail(body.email);
  }

  // ==================== REFRESH TOKEN ====================
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(@Body() body: { refreshToken: string }) {
    return this.authService.refreshAccessToken(body.refreshToken);
  }

  // ==================== FORGOT PASSWORD ====================
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Reset email sent if user exists' })
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  // ==================== RESET PASSWORD ====================
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() body: { token: string; password: string }) {
    return this.authService.resetPassword(body.token, body.password);
  }

  // ==================== GET CURRENT USER ====================
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user' })
  @ApiResponse({ status: 200, description: 'Current user data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@Req() req: Request) {
    const userId = (req as any).user?.sub || (req as any).user?.id;
    const user = await this.authService.getUserById(userId);
    if (!user) {
      return null;
    }
    const { password, verificationToken, verificationTokenExpiry, loginOtp, loginOtpExpiry, passwordResetToken, passwordResetExp, ...userWithoutSensitive } = user;
    return userWithoutSensitive;
  }

  // ==================== LOGOUT ====================
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@Req() req: Request, @Body() body: { refreshToken: string }) {
    const userId = (req as any).user?.sub || (req as any).user?.id;
    return this.authService.logout(userId, body.refreshToken);
  }

  // ==================== CHECK EMAIL EXISTS ====================
  @Post('check-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if email is already registered' })
  @ApiResponse({ status: 200, description: 'Returns whether email exists' })
  async checkEmail(@Body() body: { email: string }) {
    return this.authService.checkEmailExists(body.email);
  }

  // ==================== GOOGLE OAUTH ====================
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  @ApiResponse({ status: 302, description: 'Redirects to Google OAuth consent screen' })
  async googleAuth() {
    // GoogleAuthGuard handles the redirect to Google automatically
    // This method body is never reached
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiExcludeEndpoint() // Hide from Swagger as it's a callback
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    this.logger.log('Google OAuth callback received');
    
    const ip = req.ip || req.connection.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    try {
      const googleUser = req.user as any;
      
      if (!googleUser) {
        this.logger.error('No Google user data received');
        return res.redirect(`${frontendUrl}/login?error=no_user_data`);
      }

      this.logger.log(`Google user received: ${googleUser.email}`);
      
      const result = await this.authService.googleLogin(googleUser, ip, userAgent, null);

      // Check if this is a new organizer who needs to complete profile
      if (result.needsOrganizerSetup) {
        const params = new URLSearchParams({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          userId: result.user.id,
          setupRequired: 'organizer',
        });
        this.logger.log(`Google OAuth: New organizer needs setup: ${result.user.email}`);
        return res.redirect(`${frontendUrl}/auth/callback?${params.toString()}`);
      }

      // Normal login - redirect with tokens
      const params = new URLSearchParams({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        userId: result.user.id,
      });

      this.logger.log(`Google OAuth successful for: ${result.user.email}`);
      return res.redirect(`${frontendUrl}/auth/callback?${params.toString()}`);
    } catch (error) {
      this.logger.error('Google OAuth callback error:', error);
      return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }
  }

  @Post('complete-organizer-setup')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete organizer profile setup after OAuth signup' })
  @ApiResponse({ status: 200, description: 'Organizer profile created successfully' })
  async completeOrganizerSetup(
    @Req() req: Request,
    @Body() body: { organizationName: string },
  ) {
    const userId = (req.user as any)?.sub || (req.user as any)?.id;
    if (!userId) {
      throw new BadRequestException('User ID not found in token');
    }
    return this.authService.completeOrganizerSetup(userId, body.organizationName);
  }
}
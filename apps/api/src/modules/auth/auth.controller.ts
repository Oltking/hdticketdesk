import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
    @Body() body: { userId: string; code: string; type: string },
    @Req() req: Request,
  ) {
    const ip = req.ip || req.connection.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    return this.authService.verifyOtp(body.userId, body.code, body.type, ip, userAgent);
  }

  // ==================== RESEND OTP ====================
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend OTP for email verification' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  async resendOtp(@Body() body: { userId: string; type: string }) {
    if (body.type === 'EMAIL_VERIFICATION') {
      return this.authService.resendVerificationOtp(body.userId);
    } else if (body.type === 'NEW_DEVICE_LOGIN') {
      const user = await this.authService.getUserById(body.userId);
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
}
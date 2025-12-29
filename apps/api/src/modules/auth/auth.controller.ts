import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // ============================================
  // REGISTRATION
  // ============================================

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // ============================================
  // LOGIN
  // ============================================

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Request() req, @Body() dto: LoginDto) {
    return this.authService.login(req.user);
  }

  // ============================================
  // OTP VERIFICATION
  // ============================================

  @UseGuards(JwtAuthGuard)
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Request() req, @Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(req.user.id, dto.code, dto.type);
  }

  @UseGuards(JwtAuthGuard)
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  async resendOtp(@Request() req, @Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(req.user.id, dto.type);
  }

  // ============================================
  // TOKEN REFRESH
  // ============================================

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Request() req) {
    return this.authService.refreshTokens(req.user.id);
  }

  // ============================================
  // CURRENT USER
  // ============================================

  @UseGuards(JwtAuthGuard)
  @Post('me')
  @HttpCode(HttpStatus.OK)
  async getCurrentUser(@Request() req) {
    return { user: req.user };
  }
}
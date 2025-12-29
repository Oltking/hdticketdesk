import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';
import { UsersService } from '../users/users.service';
import { EmailService } from '../emails/email.service';
import { UserRole, OtpType } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  // ============================================
  // REGISTRATION
  // ============================================

  async register(data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    role: UserRole;
  }) {
    // Check if user exists
    const existing = await this.usersService.findByEmail(data.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(
      data.password,
      Number(this.configService.get('BCRYPT_ROUNDS', 10)),
    );

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        // Create organizer profile if role is ORGANIZER
        ...(data.role === UserRole.ORGANIZER && {
          organizerProfile: {
            create: {},
          },
        }),
      },
      include: {
        organizerProfile: true,
      },
    });

    // Generate OTP for email verification
    const otp = await this.generateOtp(user.id, OtpType.EMAIL_VERIFICATION);

    // Send verification email
    await this.emailService.sendVerificationEmail(user.email, otp);

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
      message: 'Registration successful. Please verify your email.',
    };
  }

  // ============================================
  // LOGIN
  // ============================================

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async login(user: any) {
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  // ============================================
  // OTP MANAGEMENT
  // ============================================

  async generateOtp(userId: string, type: OtpType): Promise<string> {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Calculate expiry
    const expiryMinutes = Number(
      this.configService.get('OTP_EXPIRY_MINUTES', 10),
    );
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);

    // Store OTP
    await this.prisma.otpVerification.create({
      data: {
        userId,
        code: otp,
        type,
        expiresAt,
      },
    });

    return otp;
  }

  async verifyOtp(userId: string, code: string, type: OtpType) {
    const otpRecord = await this.prisma.otpVerification.findFirst({
      where: {
        userId,
        code,
        type,
        verified: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!otpRecord) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // Mark as verified
    await this.prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    // Handle different OTP types
    if (type === OtpType.EMAIL_VERIFICATION) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });
    }

    return { verified: true };
  }

  async resendOtp(userId: string, type: OtpType) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Generate new OTP
    const otp = await this.generateOtp(userId, type);

    // Send email based on type
    if (type === OtpType.EMAIL_VERIFICATION) {
      await this.emailService.sendVerificationEmail(user.email, otp);
    } else if (type === OtpType.NEW_DEVICE_LOGIN) {
      await this.emailService.sendOtpEmail(user.email, otp, 'Login Verification');
    } else if (type === OtpType.WITHDRAWAL) {
      await this.emailService.sendOtpEmail(user.email, otp, 'Withdrawal Verification');
    }

    return { message: 'OTP sent successfully' };
  }

  // ============================================
  // TOKEN MANAGEMENT
  // ============================================

  async generateTokens(userId: string, email: string, role: UserRole) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '30d'),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    return this.generateTokens(user.id, user.email, user.role);
  }

  // ============================================
  // HELPERS
  // ============================================

  private sanitizeUser(user: any) {
    const { password, ...sanitized } = user;
    return sanitized;
  }
}
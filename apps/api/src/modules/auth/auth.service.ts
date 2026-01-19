import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../emails/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
// GoogleUser interface defined here to avoid circular dependency issues
export interface GoogleUser {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  accessToken: string;
}
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

// Custom exception for unverified email that includes userId
export class EmailNotVerifiedException extends ForbiddenException {
  constructor(userId: string, email: string) {
    super({
      statusCode: 403,
      code: 'EMAIL_NOT_VERIFIED',
      error: 'Email Not Verified',
      message: 'Please verify your email before logging in',
      userId,
      email,
    });
  }
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  // ==================== REGISTER ====================
  async register(dto: RegisterDto, ip: string, userAgent: string) {
    // 🔒 SECURITY: Prevent ADMIN role assignment via public registration
    // Admins can only be created via:
    // 1. Database seed with ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD env vars
    // 2. Admin-only endpoint: POST /admin/users/create-admin
    if (dto.role === 'ADMIN') {
      throw new ForbiddenException(
        'Admin accounts cannot be created through registration. Please contact system administrator.'
      );
    }

    // Check if email exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    // Generate OTP for email verification (6 digits) - cryptographically secure
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role || 'BUYER',
        verificationToken: otp,
        verificationTokenExpiry: otpExpiry,
        organizerProfile:
          dto.role === 'ORGANIZER'
            ? {
                create: {
                  title: dto.organizerTitle || `${dto.firstName} ${dto.lastName}`,
                },
              }
            : undefined,
      },
      include: {
        organizerProfile: true,
      },
    });

    // Send verification OTP email
    const emailResult = await this.emailService.sendVerificationOtp(user.email, otp, user.firstName ?? undefined);
    if (!emailResult.success) {
      this.logger.error(`Failed to send verification OTP during registration: ${emailResult.error}`);
    }

    this.logger.log(`Registered user: ${user.email} (role=${user.role})`);

    // Return userId and role so frontend can redirect to verify page and confirm role
    // Don't generate tokens yet - user must verify first
    return {
      message: 'Account created! Please check your email for verification code.',
      userId: user.id,
      email: user.email,
      role: user.role,
      organizerProfile: user.organizerProfile ? { id: user.organizerProfile.id } : undefined,
    };
  }

  // ==================== LOGIN ====================
  async login(dto: LoginDto, ip: string, userAgent: string) {
    // First, find the user
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { organizerProfile: true },
    });

    if (!user) {
      throw new UnauthorizedException('No account found with this email. Please sign up first.');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesRemaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new ForbiddenException(
        `Account temporarily locked due to too many failed login attempts. Please try again in ${minutesRemaining} minute${minutesRemaining > 1 ? 's' : ''}.`
      );
    }

    // Check if user has a password (social-only accounts don't)
    if (!user.password) {
      throw new BadRequestException(
        'This account uses Google sign-in. Please click "Continue with Google" to log in.'
      );
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      // Increment failed login attempts
      const newFailedAttempts = (user.failedLoginAttempts || 0) + 1;
      const maxAttempts = 5;
      
      const updateData: any = { failedLoginAttempts: newFailedAttempts };
      
      // Lock account after max attempts (30 minutes lockout)
      if (newFailedAttempts >= maxAttempts) {
        updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
        this.logger.warn(`Account locked due to failed attempts: ${user.email}`);
      }
      
      await this.prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });
      
      throw new UnauthorizedException('Invalid email or password');
    }

    // Reset failed attempts on successful login
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    // ⚠️ CHECK IF EMAIL IS VERIFIED - This is the key check!
    if (!user.emailVerified) {
      // Resend verification OTP - cryptographically secure
      const otp = crypto.randomInt(100000, 999999).toString();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          verificationToken: otp,
          verificationTokenExpiry: otpExpiry,
        },
      });

      // Send new verification OTP
      const emailResult = await this.emailService.sendVerificationOtp(user.email, otp, user.firstName ?? undefined);
      if (!emailResult.success) {
        this.logger.error(`Failed to send verification OTP during login: ${emailResult.error}`);
      }

      // Throw custom exception with userId so frontend can redirect to verify page
      throw new EmailNotVerifiedException(user.id, user.email);
    }

    // Check if this is a new device
    // TEMPORARILY DISABLED for local development (Mailgun not reachable)
    // const isNewDevice = await this.isNewDevice(user.id, ip, userAgent);
    // if (isNewDevice) {
    //   // Send OTP for new device
    //   await this.sendLoginOtp(user.id, user.email);
    //   return {
    //     requiresOtp: true,
    //     userId: user.id,
    //     message: 'New device detected. Please enter the OTP sent to your email.',
    //   };
    // }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.storeRefreshToken(user.id, tokens.refreshToken, ip, userAgent);

    // Update last login info
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip },
    });

    const { password, verificationToken, verificationTokenExpiry, loginOtp, loginOtpExpiry, passwordResetToken, passwordResetExp, ...userWithoutSensitive } = user;

    return {
      user: userWithoutSensitive,
      ...tokens,
    };
  }

  // ==================== VERIFY EMAIL OTP ====================
  async verifyEmailOtp(userId: string, otp: string, ip: string, userAgent: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organizerProfile: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    if (!user.verificationToken || !user.verificationTokenExpiry) {
      throw new BadRequestException('No verification code found. Please request a new one.');
    }

    if (user.verificationTokenExpiry < new Date()) {
      throw new BadRequestException('Verification code has expired. Please request a new one.');
    }

    if (user.verificationToken !== otp) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Mark email as verified
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        verificationToken: null,
        verificationTokenExpiry: null,
      },
    });

    // Send welcome email (best-effort)
    try {
      const welcomeResult = await this.emailService.sendWelcomeEmail(user.email, user.firstName ?? '', user.role as any);
      if (!welcomeResult.success) {
        this.logger.error(`Failed to send welcome email: ${welcomeResult.error}`);
      }
    } catch (e) {
      this.logger.error('Error sending welcome email', e);
    }

    // Generate tokens and log user in
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.storeRefreshToken(user.id, tokens.refreshToken, ip, userAgent);

    const { password, verificationToken, verificationTokenExpiry, loginOtp, loginOtpExpiry, passwordResetToken, passwordResetExp, ...userWithoutSensitive } = user;

    return {
      message: 'Email verified successfully',
      user: { ...userWithoutSensitive, emailVerified: true },
      ...tokens,
    };
  }

  // ==================== RESEND VERIFICATION OTP ====================
  async resendVerificationOtp(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken: otp,
        verificationTokenExpiry: otpExpiry,
      },
    });

    const emailResult = await this.emailService.sendVerificationOtp(user.email, otp, user.firstName ?? undefined);
    if (!emailResult.success) {
      this.logger.error(`Failed to send verification OTP (resend): ${emailResult.error}`);
      throw new BadRequestException('Failed to send verification code. Please try again.');
    }

    return { message: 'Verification code sent to your email', userId: user.id };
  }

  // ==================== VALIDATE USER ====================
  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { organizerProfile: true },
    });

    if (!user) {
      return null;
    }

    // Social-only accounts don't have a password
    if (!user.password) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  // ==================== VERIFY EMAIL (Token Link Version) ====================
  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        verificationToken: token,
        verificationTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        verificationToken: null,
        verificationTokenExpiry: null,
      },
    });

    return { message: 'Email verified successfully' };
  }

  // ==================== RESEND VERIFICATION EMAIL ====================
  async resendVerificationEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if email exists
      return { message: 'If your email exists, a verification code will be sent' };
    }

    if (user.emailVerified) {
      return { message: 'Email is already verified' };
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken: otp,
        verificationTokenExpiry: otpExpiry,
      },
    });

    const emailResult = await this.emailService.sendVerificationOtp(user.email, otp, user.firstName ?? undefined);
    if (!emailResult.success) {
      this.logger.error(`Failed to send verification OTP (resend email): ${emailResult.error}`);
      throw new BadRequestException('Failed to send verification code. Please try again.');
    }

    return { 
      message: 'Verification code sent',
      userId: user.id, // Return userId so frontend can redirect to verify page
    };
  }

  // ==================== LOGIN OTP ====================
  async sendLoginOtp(userId: string, email: string) {
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiry = new Date(
      Date.now() +
        (this.configService.get<number>('otpExpiryMinutes') || 10) * 60 * 1000,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        loginOtp: otp,
        loginOtpExpiry: otpExpiry,
      },
    });

    const emailResult = await this.emailService.sendOtpEmail(email, otp);
    if (!emailResult.success) {
      this.logger.error(`Failed to send login OTP: ${emailResult.error}`);
      throw new BadRequestException('Failed to send OTP. Please try again.');
    }
  }

  async verifyLoginOtp(userId: string, otp: string, ip: string, userAgent: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organizerProfile: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.loginOtp || !user.loginOtpExpiry) {
      throw new BadRequestException('No OTP requested');
    }

    if (user.loginOtpExpiry < new Date()) {
      throw new BadRequestException('OTP has expired');
    }

    if (user.loginOtp !== otp) {
      throw new UnauthorizedException('Invalid OTP');
    }

    // Clear OTP
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        loginOtp: null,
        loginOtpExpiry: null,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.storeRefreshToken(user.id, tokens.refreshToken, ip, userAgent);

    const { password, loginOtp: lo, loginOtpExpiry: loe, verificationToken, verificationTokenExpiry, passwordResetToken, passwordResetExp, ...userWithoutSensitive } = user;

    return {
      user: userWithoutSensitive,
      ...tokens,
    };
  }

  // ==================== VERIFY OTP (Generic - handles both email and login) ====================
  async verifyOtp(userId: string, code: string, type: string, ip: string, userAgent: string) {
    if (type === 'EMAIL_VERIFICATION') {
      return this.verifyEmailOtp(userId, code, ip, userAgent);
    } else if (type === 'NEW_DEVICE_LOGIN') {
      return this.verifyLoginOtp(userId, code, ip, userAgent);
    } else {
      throw new BadRequestException('Invalid verification type');
    }
  }

  // ==================== NEW DEVICE CHECK ====================
  async isNewDevice(userId: string, ip: string, userAgent: string): Promise<boolean> {
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        userId,
        OR: [{ ipAddress: ip }, { userAgent: userAgent }],
      },
    });

    if (!storedToken) {
      return true;
    }

    // Check if IP or user agent matches
    const ipMatch = storedToken.ipAddress === ip;
    const uaMatch = storedToken.userAgent === userAgent;

    return !ipMatch && !uaMatch;
  }

  // ==================== TOKEN MANAGEMENT ====================
  async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.secret') || this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('jwt.accessExpiresIn') || this.configService.get<string>('JWT_EXPIRY') || '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret') || this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiresIn') || this.configService.get<string>('JWT_REFRESH_EXPIRY') || '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  async storeRefreshToken(
    userId: string,
    token: string,
    ip: string,
    userAgent: string,
  ) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        token,
        userId,
        ipAddress: ip,
        userAgent,
        expiresAt,
      },
    });
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret') || this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const storedToken = await this.prisma.refreshToken.findFirst({
        where: {
          token: refreshToken,
          userId: payload.sub,
          expiresAt: { gt: new Date() },
        },
      });

      if (!storedToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { organizerProfile: true },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const tokens = await this.generateTokens(user.id, user.email, user.role);
      await this.storeRefreshToken(
        user.id,
        tokens.refreshToken,
        storedToken.ipAddress || '',
        storedToken.userAgent || '',
      );

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          emailVerified: user.emailVerified,
          organizerProfile: user.organizerProfile,
        },
        ...tokens,
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // ==================== PASSWORD RESET ====================
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if email exists
      return { message: 'If your email exists, a reset link will be sent' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExp: resetExpiry,
      },
    });

    const emailResult = await this.emailService.sendPasswordResetEmail(user.email, resetToken);
    if (!emailResult.success) {
      this.logger.error(`Failed to send password reset email: ${emailResult.error}`);
    }

    return { message: 'Password reset email sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExp: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExp: null,
      },
    });

    // Invalidate all refresh tokens
    await this.prisma.refreshToken.deleteMany({
      where: { userId: user.id },
    });

    return { message: 'Password reset successfully' };
  }

  // ==================== LOGOUT ====================
  async logout(userId: string, refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({
      where: {
        userId,
        token: refreshToken,
      },
    });

    return { message: 'Logged out successfully' };
  }

  // ==================== GOOGLE OAUTH ====================
  async googleLogin(googleUser: GoogleUser, ip: string, userAgent: string, intendedRole?: string | null) {
    this.logger.log(`Google login attempt for: ${googleUser.email}, intended role: ${intendedRole || 'none'}`);

    let isNewUser = false;
    let needsOrganizerSetup = false;

    // First, try to find user by Google ID
    let user = await this.prisma.user.findFirst({
      where: { googleId: googleUser.googleId },
      include: { organizerProfile: true },
    });

    if (!user) {
      // Try to find by email (auto-link existing accounts)
      user = await this.prisma.user.findUnique({
        where: { email: googleUser.email.toLowerCase() },
        include: { organizerProfile: true },
      });

      if (user) {
        // Link Google ID to existing account
        this.logger.log(`Linking Google account to existing user: ${user.email}`);
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: googleUser.googleId,
            avatarUrl: user.avatarUrl || googleUser.avatarUrl,
            // If email wasn't verified before, verify it now (Google verified it)
            emailVerified: true,
            emailVerifiedAt: user.emailVerifiedAt || new Date(),
          },
          include: { organizerProfile: true },
        });
      } else {
        // Create new user from Google data
        isNewUser = true;
        const isOrganizer = intendedRole === 'organizer';

        this.logger.log(`Creating new user from Google: ${googleUser.email}, role: ${isOrganizer ? 'ORGANIZER' : 'BUYER'}`);
        user = await this.prisma.user.create({
          data: {
            email: googleUser.email.toLowerCase(),
            googleId: googleUser.googleId,
            firstName: googleUser.firstName,
            lastName: googleUser.lastName,
            avatarUrl: googleUser.avatarUrl,
            emailVerified: true, // Google has already verified the email
            emailVerifiedAt: new Date(),
            role: isOrganizer ? 'ORGANIZER' : 'BUYER',
          },
          include: { organizerProfile: true },
        });

        // If organizer, they need to complete setup (provide organization name)
        if (isOrganizer) {
          needsOrganizerSetup = true;
        }

        // Send welcome email (best-effort)
        try {
          const welcomeResult = await this.emailService.sendWelcomeEmail(
            user.email,
            user.firstName ?? '',
            user.role as any,
          );
          if (!welcomeResult.success) {
            this.logger.error(`Failed to send welcome email: ${welcomeResult.error}`);
          }
        } catch (e) {
          this.logger.error('Error sending welcome email', e);
        }
      }
    } else {
      // User found by Google ID - update profile pic if changed
      if (googleUser.avatarUrl && googleUser.avatarUrl !== user.avatarUrl) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { avatarUrl: googleUser.avatarUrl },
          include: { organizerProfile: true },
        });
      }
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.storeRefreshToken(user.id, tokens.refreshToken, ip, userAgent);

    // Update last login info
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip },
    });

    const {
      password,
      verificationToken,
      verificationTokenExpiry,
      loginOtp,
      loginOtpExpiry,
      passwordResetToken,
      passwordResetExp,
      ...userWithoutSensitive
    } = user;

    return {
      user: userWithoutSensitive,
      needsOrganizerSetup,
      ...tokens,
    };
  }

  // Complete organizer profile setup after OAuth signup
  async completeOrganizerSetup(userId: string, organizationName: string) {
    this.logger.log(`Completing organizer setup for user: ${userId}`);

    if (!organizationName || organizationName.trim().length < 2) {
      throw new BadRequestException('Organization name must be at least 2 characters');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organizerProfile: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.role !== 'ORGANIZER') {
      throw new BadRequestException('User is not an organizer');
    }

    if (user.organizerProfile) {
      throw new BadRequestException('Organizer profile already exists');
    }

    // Create organizer profile
    const organizerProfile = await this.prisma.organizerProfile.create({
      data: {
        userId: user.id,
        title: organizationName.trim(),
      },
    });

    // Return updated user
    const updatedUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organizerProfile: true },
    });

    const {
      password,
      verificationToken,
      verificationTokenExpiry,
      loginOtp,
      loginOtpExpiry,
      passwordResetToken,
      passwordResetExp,
      ...userWithoutSensitive
    } = updatedUser!;

    return {
      message: 'Organizer profile created successfully',
      user: userWithoutSensitive,
    };
  }

  // ==================== HELPERS ====================
  async getUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { organizerProfile: true },
    });
  }

  // Helper: find user by email (returns full user with organizerProfile)
  async getUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { organizerProfile: true },
    });
  }

  // Find user by active verification token (not expired)
  async getUserByVerificationToken(token: string) {
    return this.prisma.user.findFirst({
      where: {
        verificationToken: token,
        verificationTokenExpiry: { gt: new Date() },
      },
      include: { organizerProfile: true },
    });
  }

  async checkEmailExists(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    return { exists: !!user };
  }
}
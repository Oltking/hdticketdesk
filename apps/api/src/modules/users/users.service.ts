import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateProfileDto, UpdateBankDetailsDto } from './dto';
import { ERROR_MESSAGES } from '../../common/constants/error-messages';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { organizerProfile: true },
    });
    if (!user) throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    const { password: _, ...result } = user;
    return result;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  /**
   * Update user role (for new OAuth users who need to select their role)
   * Only allows updating from BUYER to ORGANIZER for new users
   */
  async updateUserRole(userId: string, role: 'BUYER' | 'ORGANIZER') {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organizerProfile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent role change if user already has an organizer profile
    if (user.organizerProfile) {
      throw new BadRequestException('Role cannot be changed once organizer profile is set up');
    }

    // Update user role
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
      include: { organizerProfile: true },
    });

    const { password: _, ...userWithoutPassword } = updatedUser;

    return {
      message: `Role updated to ${role}`,
      user: userWithoutPassword,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { firstName: dto.firstName, lastName: dto.lastName, phone: dto.phone },
    });
    return { message: 'Profile updated successfully' };
  }

  async updateBankDetails(userId: string, dto: UpdateBankDetailsDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organizerProfile: true },
    });
    if (!user?.organizerProfile) throw new BadRequestException('Organizer profile not found');

    await this.prisma.organizerProfile.update({
      where: { id: user.organizerProfile.id },
      data: {
        bankName: dto.bankName,
        bankCode: dto.bankCode,
        accountNumber: dto.accountNumber,
        accountName: dto.accountName,
        bankVerified: false,
      },
    });
    return { message: 'Bank details updated. Verification pending.' };
  }

  async getOrganizerBalance(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organizerProfile: true },
    });
    if (!user?.organizerProfile) throw new NotFoundException('Organizer profile not found');

    const profile = user.organizerProfile;
    const pending = Number(profile.pendingBalance) || 0;
    const available = Number(profile.availableBalance) || 0;
    const withdrawn = Number(profile.withdrawnBalance) || 0;

    return {
      pending,
      available,
      withdrawn,
      withdrawable: available, // Same as available for now
    };
  }

  async updateOrganizerProfile(userId: string, dto: { title?: string; description?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organizerProfile: true },
    });
    if (!user?.organizerProfile) throw new BadRequestException('Organizer profile not found');

    const updatedProfile = await this.prisma.organizerProfile.update({
      where: { id: user.organizerProfile.id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });

    return {
      message: 'Organizer profile updated successfully',
      organizerProfile: updatedProfile,
    };
  }

  /**
   * Get organizer's virtual account details
   * This is the reserved account used for receiving payments
   */
  async getOrganizerVirtualAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizerProfile: {
          include: {
            virtualAccount: true,
          },
        },
      },
    });

    if (!user?.organizerProfile) {
      throw new NotFoundException('Organizer profile not found');
    }

    const virtualAccount = user.organizerProfile.virtualAccount;

    if (!virtualAccount) {
      return {
        hasVirtualAccount: false,
        message: 'Virtual account will be created when you publish your first event.',
      };
    }

    return {
      hasVirtualAccount: true,
      virtualAccount: {
        accountNumber: virtualAccount.accountNumber,
        accountName: virtualAccount.accountName,
        bankName: virtualAccount.bankName,
        bankCode: virtualAccount.bankCode,
        isActive: virtualAccount.isActive,
        createdAt: virtualAccount.createdAt,
      },
    };
  }

  /**
   * Get full organizer dashboard data including balances, virtual account, and bank details
   */
  async getOrganizerDashboard(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizerProfile: {
          include: {
            virtualAccount: true,
            events: {
              where: { status: 'PUBLISHED' },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!user?.organizerProfile) {
      throw new NotFoundException('Organizer profile not found');
    }

    const profile = user.organizerProfile;
    const pending = Number(profile.pendingBalance) || 0;
    const available = Number(profile.availableBalance) || 0;
    const withdrawn = Number(profile.withdrawnBalance) || 0;

    return {
      balances: {
        pending,
        available,
        withdrawn,
        total: pending + available,
        withdrawable: available,
      },
      virtualAccount: profile.virtualAccount
        ? {
            accountNumber: profile.virtualAccount.accountNumber,
            accountName: profile.virtualAccount.accountName,
            bankName: profile.virtualAccount.bankName,
            isActive: profile.virtualAccount.isActive,
          }
        : null,
      bankDetails: {
        bankName: profile.bankName,
        accountNumber: profile.accountNumber ? `****${profile.accountNumber.slice(-4)}` : null,
        accountName: profile.accountName,
        isVerified: profile.bankVerified,
      },
      stats: {
        publishedEvents: profile.events.length,
      },
    };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        organizerProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        organizerProfile: true,
      },
    });
  }

  async updateProfile(userId: string, data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  }) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      include: {
        organizerProfile: true,
      },
    });
  }

  async updateOrganizerBankDetails(userId: string, data: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  }) {
    const user = await this.findById(userId);
    
    if (!user.organizerProfile) {
      throw new NotFoundException('Organizer profile not found');
    }

    return this.prisma.organizerProfile.update({
      where: { id: user.organizerProfile.id },
      data: {
        ...data,
        bankVerified: true,
        bankVerifiedAt: new Date(),
      },
    });
  }

  async getOrganizerBalance(userId: string) {
    const user = await this.findById(userId);
    
    if (!user.organizerProfile) {
      throw new NotFoundException('Organizer profile not found');
    }

    return {
      pendingBalance: user.organizerProfile.pendingBalance,
      availableBalance: user.organizerProfile.availableBalance,
      withdrawnBalance: user.organizerProfile.withdrawnBalance,
    };
  }
}
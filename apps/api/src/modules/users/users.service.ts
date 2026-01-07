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
    return {
      pendingBalance: Number(profile.pendingBalance),
      availableBalance: Number(profile.availableBalance),
      withdrawnBalance: Number(profile.withdrawnBalance),
    };
  }
}

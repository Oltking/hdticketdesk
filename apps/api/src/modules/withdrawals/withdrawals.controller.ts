import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WithdrawalsService } from './withdrawals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../common/types/prisma-enums';

@ApiTags('Withdrawals')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ORGANIZER)
@ApiBearerAuth('JWT-auth')
@Controller('withdrawals')
export class WithdrawalsController {
  constructor(private readonly withdrawalsService: WithdrawalsService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Get withdrawable amount' })
  async getWithdrawableAmount(@CurrentUser('organizerProfileId') organizerId: string) {
    return this.withdrawalsService.getWithdrawableAmount(organizerId);
  }

  @Post('request')
  @ApiOperation({ summary: 'Request withdrawal' })
  async requestWithdrawal(@CurrentUser('organizerProfileId') organizerId: string, @Body('amount') amount: number) {
    return this.withdrawalsService.requestWithdrawal(organizerId, amount);
  }

  @Post(':id/verify')
  @ApiOperation({ summary: 'Verify withdrawal OTP' })
  async verifyOtp(
    @CurrentUser('organizerProfileId') organizerId: string,
    @Param('id') withdrawalId: string,
    @Body('otp') otp: string,
  ) {
    return this.withdrawalsService.verifyWithdrawalOtp(organizerId, withdrawalId, otp);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get withdrawal history' })
  async getHistory(@CurrentUser('organizerProfileId') organizerId: string) {
    return this.withdrawalsService.getWithdrawalHistory(organizerId);
  }
}

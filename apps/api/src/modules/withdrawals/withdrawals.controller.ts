import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { WithdrawalsService } from './withdrawals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { RequestWithdrawalDto } from './dto/request-withdrawal.dto';
import { VerifyWithdrawalDto } from './dto/verify-withdrawal.dto';

@Controller('withdrawals')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ORGANIZER)
export class WithdrawalsController {
  constructor(private withdrawalsService: WithdrawalsService) {}

  @Post('request')
  async request(@Request() req, @Body() dto: RequestWithdrawalDto) {
    return this.withdrawalsService.requestWithdrawal(req.user.id, dto.amount);
  }

  @Post('verify')
  async verify(@Request() req, @Body() dto: VerifyWithdrawalDto) {
    return this.withdrawalsService.verifyAndProcess(
      req.user.id,
      dto.withdrawalId,
      dto.otp,
    );
  }

  @Get('history')
  async getHistory(@Request() req) {
    return this.withdrawalsService.getHistory(req.user.id);
  }
}
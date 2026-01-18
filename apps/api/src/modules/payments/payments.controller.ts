import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { PaystackService } from './paystack.service';
import { LedgerService } from '../ledger/ledger.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly paystackService: PaystackService,
    private readonly ledgerService: LedgerService,
  ) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Post('initialize')
  @ApiOperation({ summary: 'Initialize payment (supports guest checkout with email)' })
  async initialize(
    @Request() req: any,
    @Body('eventId') eventId: string,
    @Body('tierId') tierId: string,
    @Body('guestEmail') guestEmail?: string,
  ) {
    // For authenticated users, use their ID and email
    // For guests, use the provided guestEmail
    const userId = req.user?.id || req.user?.sub || null;
    const email = req.user?.email || guestEmail;

    if (!email) {
      throw new BadRequestException('Email is required for payment initialization');
    }

    // Service expects: (eventId, tierId, userId, email)
    return this.paymentsService.initializePayment(eventId, tierId, userId, email);
  }

  @UseGuards(JwtAuthGuard)
  @Get('check-pending')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Check and verify pending payments for current user' })
  async checkPending(@CurrentUser('id') userId: string) {
    return this.paymentsService.checkPendingPayments(userId);
  }

  @Public()
  @Get('verify/:reference')
  @ApiOperation({ summary: 'Verify payment' })
  async verify(@Param('reference') reference: string) {
    return this.paymentsService.verifyPayment(reference);
  }

  @Public()
  @Get('banks')
  @ApiOperation({ summary: 'Get list of banks' })
  async getBanks() {
    return this.paystackService.getBanks();
  }

  @UseGuards(JwtAuthGuard)
  @Post('resolve-account')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Resolve bank account' })
  async resolveAccount(@Body('accountNumber') accountNumber: string, @Body('bankCode') bankCode: string) {
    return this.paystackService.resolveAccountNumber(accountNumber, bankCode);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER)
  @Get('history')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get payment history for organizer' })
  async getPaymentHistory(@CurrentUser('organizerProfile') organizerProfile: { id: string }) {
    if (!organizerProfile?.id) {
      return { entries: [] };
    }
    const entries = await this.ledgerService.getOrganizerLedger(organizerProfile.id);
    return { entries };
  }
}

import { Controller, Post, Get, Body, Param, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { PaystackService } from './paystack.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly paystackService: PaystackService,
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
}

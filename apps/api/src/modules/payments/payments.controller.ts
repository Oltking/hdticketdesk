import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { PaystackService } from './paystack.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly paystackService: PaystackService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('initialize')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Initialize payment' })
  async initialize(
    @CurrentUser('id') userId: string,
    @CurrentUser('email') email: string,
    @Body('eventId') eventId: string,
    @Body('tierId') tierId: string,
  ) {
    return this.paymentsService.initializePayment(userId, email, eventId, tierId);
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

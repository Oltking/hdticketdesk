import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  RawBodyRequest,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { PaystackService } from './paystack.service';
import { TicketsService } from '../tickets/tickets.service';

@Controller('webhooks/paystack')
export class WebhooksController {
  constructor(
    private paystackService: PaystackService,
    private ticketsService: TicketsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature: string,
    @Body() payload: any,
  ) {
    // Verify webhook signature
    const rawBody = req.rawBody?.toString() || JSON.stringify(payload);
    const isValid = this.paystackService.verifyWebhookSignature(
      rawBody,
      signature,
    );

    if (!isValid) {
      throw new BadRequestException('Invalid webhook signature');
    }

    // Handle different event types
    const event = payload.event;
    const data = payload.data;

    console.log(`📥 Paystack webhook: ${event}`);

    switch (event) {
      case 'charge.success':
        await this.handleChargeSuccess(data);
        break;

      case 'transfer.success':
        await this.handleTransferSuccess(data);
        break;

      case 'transfer.failed':
        await this.handleTransferFailed(data);
        break;

      default:
        console.log(`Unhandled webhook event: ${event}`);
    }

    return { status: 'success' };
  }

  // ============================================
  // HANDLE CHARGE SUCCESS (TICKET PURCHASE)
  // ============================================

  private async handleChargeSuccess(data: any) {
    const reference = data.reference;
    const metadata = data.metadata;

    // Check if already processed
    const existingTicket = await this.ticketsService.findByPaymentId(reference);
    if (existingTicket) {
      console.log(`⚠️ Payment already processed: ${reference}`);
      return;
    }

    // Create ticket
    await this.ticketsService.createTicketFromPayment({
      paymentId: reference,
      eventId: metadata.eventId,
      tierId: metadata.tierId,
      buyerEmail: data.customer.email,
      amountPaid: data.amount / 100, // Convert from kobo
      platformFee: metadata.platformFee,
    });

    console.log(`✅ Ticket created for payment: ${reference}`);
  }

  // ============================================
  // HANDLE TRANSFER SUCCESS (WITHDRAWAL)
  // ============================================

  private async handleTransferSuccess(data: any) {
    // Update withdrawal status
    // This will be handled in withdrawals module
    console.log(`✅ Transfer successful: ${data.reference}`);
  }

  // ============================================
  // HANDLE TRANSFER FAILED
  // ============================================

  private async handleTransferFailed(data: any) {
    console.log(`❌ Transfer failed: ${data.reference}`);
  }
}
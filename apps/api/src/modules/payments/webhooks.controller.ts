import { Controller, Post, Req, Res, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { PaymentsService } from './payments.service';
import { MonnifyService } from './monnify.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly monnifyService: MonnifyService,
  ) {}

  /**
   * Monnify webhook handler
   * Handles: SUCCESSFUL_TRANSACTION, FAILED_TRANSACTION, SUCCESSFUL_DISBURSEMENT, FAILED_DISBURSEMENT
   */
  @Post('monnify')
  @ApiExcludeEndpoint()
  async handleMonnifyWebhook(@Req() req: Request, @Res() res: Response) {
    const { eventType, eventData } = req.body;
    this.logger.log(`Monnify webhook received: ${eventType}`);

    // Verify webhook using transaction hash (for payment events)
    if (eventType === 'SUCCESSFUL_TRANSACTION' || eventType === 'FAILED_TRANSACTION') {
      const { paymentReference, amountPaid, paidOn, transactionReference, transactionHash } = eventData;
      
      if (!this.monnifyService.verifyWebhookPayload(
        paymentReference,
        amountPaid,
        paidOn,
        transactionReference,
        transactionHash,
      )) {
        this.logger.warn('Invalid Monnify webhook transaction hash');
        return res.status(HttpStatus.UNAUTHORIZED).send('Invalid transaction hash');
      }
    }
    // For disbursement events, we verify by checking the reference exists in our system
    // since Monnify doesn't provide transaction hash for these events

    try {
      switch (eventType) {
        case 'SUCCESSFUL_TRANSACTION':
          // Payment was successful
          await this.paymentsService.handleMonnifyPaymentSuccess(eventData);
          break;

        case 'FAILED_TRANSACTION':
          // Payment failed
          await this.paymentsService.handleMonnifyPaymentFailed(eventData);
          break;

        case 'SUCCESSFUL_DISBURSEMENT':
          // Withdrawal/transfer was successful
          await this.paymentsService.handleMonnifyTransferSuccess(eventData);
          break;

        case 'FAILED_DISBURSEMENT':
          // Withdrawal/transfer failed
          await this.paymentsService.handleMonnifyTransferFailed(eventData);
          break;

        case 'REVERSED_DISBURSEMENT':
          // Transfer was reversed
          await this.paymentsService.handleMonnifyTransferReversed(eventData);
          break;

        default:
          this.logger.log(`Unhandled Monnify event type: ${eventType}`);
      }

      return res.status(HttpStatus.OK).send('OK');
    } catch (error) {
      this.logger.error('Monnify webhook error:', error);
      // Always return 200 to Monnify to prevent retries for handled errors
      return res.status(HttpStatus.OK).send('OK');
    }
  }
}

import { Controller, Post, Req, Res, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { PaymentsService } from './payments.service';
import { MonnifyService } from './monnify.service';

// SECURITY: Monnify IP whitelist for webhook validation
// These are Monnify's official webhook IP addresses
// Update this list if Monnify adds new IPs
const MONNIFY_WEBHOOK_IPS = [
  '35.242.133.146',  // Monnify production
  '34.89.50.88',     // Monnify production
  '34.141.78.93',    // Monnify production  
  '35.246.66.244',   // Monnify sandbox
  '127.0.0.1',       // Localhost for development
  '::1',             // IPv6 localhost
];

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly monnifyService: MonnifyService,
  ) {}

  /**
   * Extract real IP from request, handling proxies
   */
  private getClientIp(req: Request): string {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor).split(',');
      return ips[0].trim();
    }
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }
    return req.socket?.remoteAddress || req.ip || 'unknown';
  }

  /**
   * Monnify webhook handler
   * Handles: SUCCESSFUL_TRANSACTION, FAILED_TRANSACTION, SUCCESSFUL_DISBURSEMENT, FAILED_DISBURSEMENT
   * 
   * IMPORTANT: Always return 200 OK to Monnify to prevent infinite retries
   * Log all webhook data for debugging payment issues
   * 
   * SECURITY: Validates webhook source IP and transaction hash
   */
  @Post('monnify')
  @ApiExcludeEndpoint()
  async handleMonnifyWebhook(@Req() req: Request, @Res() res: Response) {
    const clientIp = this.getClientIp(req);
    const { eventType, eventData } = req.body;
    
    // SECURITY: Validate webhook source IP in production
    if (process.env.NODE_ENV === 'production') {
      if (!MONNIFY_WEBHOOK_IPS.includes(clientIp)) {
        this.logger.warn(`SECURITY: Webhook rejected from unauthorized IP: ${clientIp}`);
        // Return 200 to avoid revealing IP validation exists
        return res.status(HttpStatus.OK).send('OK');
      }
    }
    
    // Log full webhook payload for debugging (sanitize sensitive data in production)
    this.logger.log(`Monnify webhook received: ${eventType} from IP: ${clientIp}`);
    this.logger.debug(`Webhook payload: ${JSON.stringify(eventData)}`);

    // Validate webhook has required fields
    if (!eventType || !eventData) {
      this.logger.warn('Invalid webhook payload - missing eventType or eventData');
      return res.status(HttpStatus.OK).send('OK'); // Still return 200 to prevent retries
    }

    // Verify webhook using transaction hash (for payment events)
    if (eventType === 'SUCCESSFUL_TRANSACTION' || eventType === 'FAILED_TRANSACTION') {
      const { paymentReference, amountPaid, paidOn, transactionReference, transactionHash } = eventData;
      
      // Log payment details for debugging
      this.logger.log(`Payment webhook: ref=${paymentReference}, txRef=${transactionReference}, amount=${amountPaid}`);
      
      if (!this.monnifyService.verifyWebhookPayload(
        paymentReference,
        amountPaid,
        paidOn,
        transactionReference,
        transactionHash,
      )) {
        this.logger.warn(`Invalid transaction hash for payment ${paymentReference}`);
        // Return 200 but don't process - prevents replay attacks
        return res.status(HttpStatus.OK).send('Invalid hash');
      }
    }

    // For disbursement events, log the details
    if (eventType.includes('DISBURSEMENT')) {
      this.logger.log(`Disbursement webhook: ref=${eventData.reference}, status=${eventData.status}`);
    }

    try {
      switch (eventType) {
        case 'SUCCESSFUL_TRANSACTION':
          await this.paymentsService.handleMonnifyPaymentSuccess(eventData);
          this.logger.log(`Successfully processed payment: ${eventData.paymentReference}`);
          break;

        case 'FAILED_TRANSACTION':
          await this.paymentsService.handleMonnifyPaymentFailed(eventData);
          this.logger.log(`Processed failed payment: ${eventData.paymentReference}`);
          break;

        case 'SUCCESSFUL_DISBURSEMENT':
          await this.paymentsService.handleMonnifyTransferSuccess(eventData);
          this.logger.log(`Successfully processed transfer: ${eventData.reference}`);
          break;

        case 'FAILED_DISBURSEMENT':
          await this.paymentsService.handleMonnifyTransferFailed(eventData);
          this.logger.log(`Processed failed transfer: ${eventData.reference}`);
          break;

        case 'REVERSED_DISBURSEMENT':
          await this.paymentsService.handleMonnifyTransferReversed(eventData);
          this.logger.log(`Processed reversed transfer: ${eventData.reference}`);
          break;

        case 'SUCCESSFUL_REFUND':
          // Handle refund success if needed
          this.logger.log(`Refund successful: ${eventData.refundReference}`);
          break;

        case 'FAILED_REFUND':
          // Handle refund failure if needed
          this.logger.warn(`Refund failed: ${eventData.refundReference}`);
          break;

        default:
          this.logger.log(`Unhandled Monnify event type: ${eventType}`);
      }

      return res.status(HttpStatus.OK).send('OK');
    } catch (error: any) {
      // Log error but still return 200 to prevent Monnify retries
      this.logger.error(`Monnify webhook processing error for ${eventType}:`, error.message);
      this.logger.error(error.stack);
      return res.status(HttpStatus.OK).send('OK');
    }
  }
}

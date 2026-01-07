import { Controller, Post, Req, Res, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { PaymentsService } from './payments.service';
import { PaystackService } from './paystack.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly paystackService: PaystackService,
  ) {}

  @Post('paystack')
  @ApiExcludeEndpoint()
  async handlePaystackWebhook(@Req() req: Request, @Res() res: Response) {
    const signature = req.headers['x-paystack-signature'] as string;
    const payload = JSON.stringify(req.body);

    if (!this.paystackService.verifyWebhookSignature(payload, signature)) {
      this.logger.warn('Invalid Paystack webhook signature');
      return res.status(HttpStatus.UNAUTHORIZED).send('Invalid signature');
    }

    const { event, data } = req.body;
    this.logger.log(`Paystack webhook: ${event}`);

    try {
      await this.paymentsService.handleWebhook(event, data);
      return res.status(HttpStatus.OK).send('OK');
    } catch (error) {
      this.logger.error('Webhook error:', error);
      return res.status(HttpStatus.OK).send('OK'); // Always return 200 to Paystack
    }
  }
}

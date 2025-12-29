import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaystackService } from './paystack.service';
import { WebhooksController } from './webhooks.controller';
import { TicketsModule } from '../tickets/tickets.module';
import { LedgerModule } from '../ledger/ledger.module';
import { EmailModule } from '../emails/email.module';

@Module({
  imports: [TicketsModule, LedgerModule, EmailModule],
  controllers: [WebhooksController],
  providers: [PaymentsService, PaystackService],
  exports: [PaymentsService, PaystackService],
})
export class PaymentsModule {}
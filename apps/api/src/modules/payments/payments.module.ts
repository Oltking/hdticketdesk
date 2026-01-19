import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MonnifyService } from './monnify.service';
import { WebhooksController } from './webhooks.controller';
import { TicketsModule } from '../tickets/tickets.module';
import { LedgerModule } from '../ledger/ledger.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [TicketsModule, LedgerModule, TasksModule],
  controllers: [PaymentsController, WebhooksController],
  providers: [PaymentsService, MonnifyService],
  exports: [PaymentsService, MonnifyService],
})
export class PaymentsModule {}

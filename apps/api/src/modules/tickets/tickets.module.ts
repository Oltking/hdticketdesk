import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { QrModule } from '../qr/qr.module';
import { LedgerModule } from '../ledger/ledger.module';
import { EmailModule } from '../emails/email.module';

@Module({
  imports: [QrModule, LedgerModule, EmailModule],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}

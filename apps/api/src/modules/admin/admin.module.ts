import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { MonnifyService } from '../payments/monnify.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, MonnifyService],
  exports: [AdminService],
})
export class AdminModule {}

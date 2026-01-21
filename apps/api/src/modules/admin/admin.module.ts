import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { MonnifyService } from '../payments/monnify.service';

@Module({
  imports: [ConfigModule],
  controllers: [AdminController],
  providers: [AdminService, MonnifyService],
  exports: [AdminService],
})
export class AdminModule {}

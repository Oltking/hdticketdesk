import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('dashboard')
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  async getUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getAllUsers(page, limit);
  }

  @Get('events')
  async getEvents(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getAllEvents(page, limit);
  }

  @Get('ledger')
  async getLedger(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getLedger(page, limit);
  }

  @Get('refunds')
  async getRefunds(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getAllRefundRequests(page, limit);
  }

  @Get('withdrawals')
  async getWithdrawals(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getAllWithdrawals(page, limit);
  }
}
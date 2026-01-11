import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth('JWT-auth')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard stats' })
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users' })
  async getUsers(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.adminService.getAllUsers(+page, +limit);
  }

  @Get('events')
  @ApiOperation({ summary: 'Get all events' })
  async getEvents(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.adminService.getAllEvents(+page, +limit);
  }

  @Get('ledger')
  @ApiOperation({ summary: 'Get ledger audit' })
  async getLedger(@Query('page') page = 1, @Query('limit') limit = 50) {
    return this.adminService.getLedgerAudit(+page, +limit);
  }
}

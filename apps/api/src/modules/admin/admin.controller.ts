import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiProperty } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../common/types/prisma-enums';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

// DTO for creating admin users
export class CreateAdminDto {
  @ApiProperty({ example: 'newadmin@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @MinLength(12, { message: 'Admin password must be at least 12 characters long' })
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(1, { message: 'First name is required' })
  firstName: string;

  @ApiProperty({ example: 'Admin' })
  @IsString()
  @MinLength(1, { message: 'Last name is required' })
  lastName: string;
}

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

  @Post('events/:id/unpublish')
  @ApiOperation({ summary: 'Admin force unpublish an event (even with sales)' })
  async adminUnpublishEvent(@Param('id') id: string) {
    return this.adminService.adminUnpublishEvent(id);
  }

  @Post('events/:id/delete')
  @ApiOperation({ summary: 'Admin force delete an event (use with caution - deletes all related records)' })
  async adminDeleteEvent(@Param('id') id: string) {
    return this.adminService.adminDeleteEvent(id);
  }

  @Post('users/create-admin')
  @ApiOperation({ summary: 'Create a new admin user (admin only)' })
  async createAdminUser(@Body() dto: CreateAdminDto) {
    return this.adminService.createAdminUser(dto);
  }

  @Get('refunds')
  @ApiOperation({ summary: 'Get all refund requests' })
  async getRefunds(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.adminService.getAllRefunds(+page, +limit);
  }

  @Post('refunds/:id/process')
  @ApiOperation({ summary: 'Process an approved refund' })
  async processRefund(@Param('id') id: string) {
    return this.adminService.processRefund(id);
  }

  @Get('organizers/earnings')
  @ApiOperation({ summary: 'Get all organizers with earnings summary' })
  async getAllOrganizersEarnings(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.adminService.getAllOrganizersEarnings(+page, +limit);
  }

  @Get('organizers/:id/earnings')
  @ApiOperation({ summary: 'Get detailed earnings for a specific organizer' })
  async getOrganizerEarnings(@Param('id') id: string) {
    return this.adminService.getOrganizerEarnings(id);
  }

  @Get('organizers/no-virtual-account')
  @ApiOperation({ summary: 'Get all organizers without virtual accounts' })
  async getOrganizersWithoutVirtualAccount() {
    return this.adminService.getOrganizersWithoutVirtualAccount();
  }

  @Post('organizers/:id/create-virtual-account')
  @ApiOperation({ summary: 'Create virtual account for an organizer (admin only)' })
  async createVirtualAccountForOrganizer(@Param('id') id: string) {
    return this.adminService.createVirtualAccountForOrganizer(id);
  }

  @Post('organizers/create-all-virtual-accounts')
  @ApiOperation({ summary: 'Create virtual accounts for all organizers without one (bulk operation)' })
  async createAllVirtualAccounts() {
    return this.adminService.createVirtualAccountsForAllOrganizers();
  }

  @Get('payments/pending')
  @ApiOperation({ summary: 'Get all pending payments (admin view)' })
  async getAllPendingPayments(@Query('page') page = 1, @Query('limit') limit = 50) {
    return this.adminService.getAllPendingPayments(+page, +limit);
  }

  @Post('payments/:reference/verify')
  @ApiOperation({ summary: 'Manually verify a payment by reference (force verification)' })
  async manuallyVerifyPayment(@Param('reference') reference: string) {
    return this.adminService.manuallyVerifyPayment(reference);
  }

  @Post('payments/verify-all-pending')
  @ApiOperation({ summary: 'Bulk verify all pending payments (recovery operation)' })
  async verifyAllPendingPayments() {
    return this.adminService.verifyAllPendingPayments();
  }

  @Get('payments/:reference/debug')
  @ApiOperation({ summary: 'Debug payment verification - shows detailed Monnify API calls' })
  async debugPaymentVerification(@Param('reference') reference: string) {
    return this.adminService.debugPaymentVerification(reference);
  }
}

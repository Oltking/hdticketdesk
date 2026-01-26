import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ReconciliationService } from './reconciliation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../../common/types/prisma-enums';

@ApiTags('Reconciliation')
@Controller('reconciliation')
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  /**
   * Get reconciliation report for the current organizer
   */
  @Get('report')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get reconciliation report for organizer' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getOrganizerReport(
    @CurrentUser('organizerProfileId') organizerId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.reconciliationService.generateOrganizerReport(organizerId, start, end);
  }

  /**
   * Get virtual account details for the current organizer
   */
  @Get('virtual-account')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get organizer virtual account details' })
  async getVirtualAccount(@CurrentUser('organizerProfileId') organizerId: string) {
    return this.reconciliationService.getOrganizerVirtualAccount(organizerId);
  }

  /**
   * Get daily transaction summary for the current organizer
   */
  @Get('daily-summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get daily transaction summary' })
  @ApiQuery({
    name: 'date',
    required: false,
    type: String,
    description: 'Date in YYYY-MM-DD format',
  })
  async getDailySummary(
    @CurrentUser('organizerProfileId') organizerId: string,
    @Query('date') date?: string,
  ) {
    const targetDate = date ? new Date(date) : new Date();
    return this.reconciliationService.getDailyTransactionSummary(organizerId, targetDate);
  }

  /**
   * Admin: Check all balance discrepancies
   */
  @Get('admin/discrepancies')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Check all organizer balance discrepancies (Admin only)' })
  async checkDiscrepancies() {
    return this.reconciliationService.checkAllBalanceDiscrepancies();
  }

  /**
   * Admin: Get reconciliation report for any organizer
   */
  @Get('admin/report/:organizerId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get reconciliation report for any organizer (Admin only)' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getAdminReport(
    @Query('organizerId') organizerId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.reconciliationService.generateOrganizerReport(organizerId, start, end);
  }
}

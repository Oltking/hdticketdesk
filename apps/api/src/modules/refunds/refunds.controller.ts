import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RefundsService } from './refunds.service';
import { UserRole } from '@prisma/client';

interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
    role: string;
    organizerProfileId?: string;
  };
}

@Controller('refunds')
@UseGuards(JwtAuthGuard)
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  /**
   * POST /refunds/request
   * Buyer requests a refund for a ticket
   */
  @Post('request')
  async requestRefund(
    @Request() req: AuthenticatedRequest,
    @Body() body: { ticketId: string; reason?: string },
  ) {
    return this.refundsService.requestRefund(body.ticketId, req.user.id, body.reason);
  }

  /**
   * POST /refunds/:id/approve
   * Organizer approves a refund request
   */
  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ORGANIZER)
  async approveRefund(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.refundsService.approveRefund(id, req.user.organizerProfileId || '');
  }

  /**
   * POST /refunds/:id/reject
   * Organizer rejects a refund request
   */
  @Post(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ORGANIZER)
  async rejectRefund(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body('reason') reason: string,
  ) {
    return this.refundsService.rejectRefund(id, req.user.organizerProfileId || '', reason);
  }

  /**
   * GET /refunds/my
   * Get refunds for the current user (buyer)
   */
  @Get('my')
  async getMyRefunds(@Request() req: AuthenticatedRequest) {
    return this.refundsService.getRefundsByUser(req.user.id);
  }

  /**
   * GET /refunds/organizer
   * Get refunds for the organizer's events
   */
  @Get('organizer')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ORGANIZER)
  async getOrganizerRefunds(@Request() req: AuthenticatedRequest) {
    return this.refundsService.getRefundsByOrganizer(req.user.organizerProfileId || '');
  }
}

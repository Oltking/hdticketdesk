import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('my-tickets')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get buyer tickets' })
  async getMyTickets(@CurrentUser('id') userId: string) {
    return this.ticketsService.getBuyerTickets(userId);
  }

  // Backwards-compatible alias: GET /tickets/my
  @UseGuards(JwtAuthGuard)
  @Get('my')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get buyer tickets (alias)' })
  async getMyTicketsAlias(@CurrentUser('id') userId: string) {
    return this.ticketsService.getBuyerTickets(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER)
  @Post(':ticketId/check-in')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Check in ticket (Organizer)' })
  async checkIn(@Param('ticketId') ticketId: string, @CurrentUser('id') userId: string) {
    return this.ticketsService.checkIn(ticketId, userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER)
  @Post('validate-qr')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Validate QR code' })
  async validateQr(@Body('qrCode') qrCode: string, @Body('eventId') eventId: string) {
    return this.ticketsService.validateQr(qrCode, eventId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER)
  @Get('event/:eventId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get event tickets (Organizer)' })
  async getEventTickets(@Param('eventId') eventId: string, @CurrentUser('organizerProfile') profile: any) {
    return this.ticketsService.getEventTickets(eventId, profile?.id);
  }
}

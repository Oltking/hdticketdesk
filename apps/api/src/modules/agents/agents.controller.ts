import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AgentsService } from './agents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CreateAgentCodeDto, ActivateAgentCodeDto, AgentCheckInDto } from './dto';
import { UserRole } from '../../common/types/prisma-enums';

@ApiTags('Agents')
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  // ==================== ORGANIZER ENDPOINTS ====================

  @Post('events/:eventId/codes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new agent access code for an event' })
  @ApiResponse({ status: 201, description: 'Agent code created successfully' })
  async createCode(
    @Param('eventId') eventId: string,
    @Body() dto: CreateAgentCodeDto,
    @Request() req: any,
  ) {
    return this.agentsService.createAccessCode(
      eventId,
      req.user.organizerProfile.id,
      dto.label,
    );
  }

  @Get('events/:eventId/codes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all agent access codes for an event' })
  async getEventCodes(@Param('eventId') eventId: string, @Request() req: any) {
    return this.agentsService.getEventAgentCodes(eventId, req.user.organizerProfile.id);
  }

  @Patch('codes/:codeId/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate an agent access code' })
  async deactivateCode(@Param('codeId') codeId: string, @Request() req: any) {
    return this.agentsService.deactivateCode(codeId, req.user.organizerProfile.id);
  }

  @Patch('codes/:codeId/reactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reactivate an agent access code' })
  async reactivateCode(@Param('codeId') codeId: string, @Request() req: any) {
    return this.agentsService.reactivateCode(codeId, req.user.organizerProfile.id);
  }

  @Delete('codes/:codeId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an agent access code' })
  async deleteCode(@Param('codeId') codeId: string, @Request() req: any) {
    return this.agentsService.deleteCode(codeId, req.user.organizerProfile.id);
  }

  // ==================== PUBLIC AGENT ENDPOINTS ====================

  @Post('activate')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 attempts per minute to prevent brute force
  @ApiOperation({ summary: 'Activate/verify an agent access code (no login required)' })
  @ApiResponse({ status: 200, description: 'Code validated successfully, returns event details' })
  @ApiResponse({ status: 404, description: 'Invalid access code' })
  @ApiResponse({ status: 429, description: 'Too many attempts, please try again later' })
  async activateCode(@Body() dto: ActivateAgentCodeDto) {
    return this.agentsService.activateCode(dto.code);
  }

  @Post('check-in')
  @Public()
  @Throttle({ default: { limit: 120, ttl: 60000 } }) // 120 check-ins per minute (2 per second for busy events)
  @ApiOperation({ summary: 'Check in a ticket using agent access code (no login required)' })
  @ApiResponse({ status: 200, description: 'Check-in result' })
  async agentCheckIn(@Body() dto: AgentCheckInDto) {
    return this.agentsService.agentCheckIn(dto.qrCode, dto.accessCode);
  }
}

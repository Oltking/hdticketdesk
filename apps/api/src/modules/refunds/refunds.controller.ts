import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { RefundsService } from './refunds.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestRefundDto } from './dto/request-refund.dto';
import { ReviewRefundDto } from './dto/review-refund.dto';

@Controller('refunds')
@UseGuards(JwtAuthGuard)
export class RefundsController {
  constructor(private refundsService: RefundsService) {}

  @Post('request')
  async requestRefund(@Request() req, @Body() dto: RequestRefundDto) {
    return this.refundsService.requestRefund(
      req.user.id,
      dto.ticketId,
      dto.reason,
    );
  }

  @Post(':id/approve')
  async approveRefund(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: ReviewRefundDto,
  ) {
    return this.refundsService.approveRefund(id, req.user.id, dto.reviewNote);
  }

  @Post(':id/reject')
  async rejectRefund(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: ReviewRefundDto,
  ) {
    return this.refundsService.rejectRefund(id, req.user.id, dto.reviewNote);
  }

  @Get('organizer')
  async getOrganizerRefunds(@Request() req) {
    return this.refundsService.getOrganizerRefundRequests(req.user.id);
  }

  @Get('my-requests')
  async getMyRefunds(@Request() req) {
    return this.refundsService.getMyRefundRequests(req.user.id);
  }
}
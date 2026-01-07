import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { QrService } from './qr.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('QR')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
@Controller('qr')
export class QrController {
  constructor(private readonly qrService: QrService) {}

  @Post('verify')
  @ApiOperation({ summary: 'Verify QR code' })
  async verify(@Body('code') code: string) {
    return this.qrService.verifyQrCode(code);
  }
}

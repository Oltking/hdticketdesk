import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class QrService {
  async generateQrCode(ticketNumber: string): Promise<{ code: string; url: string }> {
    const code = `${ticketNumber}-${uuidv4().slice(0, 8)}`;
    const url = await QRCode.toDataURL(code, {
      errorCorrectionLevel: 'H',
      width: 300,
      margin: 2,
    });
    return { code, url };
  }

  async verifyQrCode(code: string): Promise<{ valid: boolean; ticketNumber?: string }> {
    const parts = code.split('-');
    if (parts.length < 3) return { valid: false };
    const ticketNumber = parts.slice(0, -1).join('-');
    return { valid: true, ticketNumber };
  }
}

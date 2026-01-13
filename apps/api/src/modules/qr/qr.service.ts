import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { MediaService } from '../media/media.service';

@Injectable()
export class QrService {
  constructor(private mediaService: MediaService) {}

  async generateQrCode(ticketNumber: string): Promise<{ code: string; url: string; hostedUrl: string }> {
    const code = `${ticketNumber}-${uuidv4().slice(0, 8)}`;
    const dataUrl = await QRCode.toDataURL(code, {
      errorCorrectionLevel: 'H',
      width: 300,
      margin: 2,
    });
    
    // Upload to Cloudinary for email compatibility
    const hostedUrl = await this.mediaService.uploadBase64Image(dataUrl, 'hdticketdesk/qrcodes');
    
    return { code, url: dataUrl, hostedUrl };
  }

  async verifyQrCode(code: string): Promise<{ valid: boolean; ticketNumber?: string }> {
    const parts = code.split('-');
    if (parts.length < 3) return { valid: false };
    const ticketNumber = parts.slice(0, -1).join('-');
    return { valid: true, ticketNumber };
  }
}

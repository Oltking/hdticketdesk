import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

// Since we don't have a MediaUpload model in the schema,
// we'll handle media uploads directly with Cloudinary
// and return the URLs for storage in other models (like Event.coverImage)

export interface UploadedMedia {
  url: string;
  publicId: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

@Injectable()
export class MediaService {
  constructor(private configService: ConfigService) {
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'hdticketdesk',
  ): Promise<UploadedMedia> {
    // Validate file
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Allowed: JPG, PNG, WebP, GIF');
    }

    // Max 5MB
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File too large. Max size: 5MB');
    }

    try {
      // Upload to Cloudinary
      const result = await new Promise<UploadApiResponse>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder,
              resource_type: 'image',
              transformation: [
                { width: 1200, height: 1200, crop: 'limit' },
                { quality: 'auto' },
                { fetch_format: 'auto' },
              ],
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result!);
            },
          )
          .end(file.buffer);
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
      };
    } catch (error: any) {
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
  }

  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error: any) {
      console.error(`Failed to delete image ${publicId}:`, error.message);
      // Don't throw - deletion failure shouldn't break the flow
    }
  }

  async uploadMultipleImages(
    files: Express.Multer.File[],
    folder: string = 'hdticketdesk',
  ): Promise<UploadedMedia[]> {
    const uploads = files.map((file) => this.uploadImage(file, folder));
    return Promise.all(uploads);
  }

  // Extract public ID from Cloudinary URL
  getPublicIdFromUrl(url: string): string | null {
    try {
      const regex = /\/v\d+\/(.+)\.\w+$/;
      const match = url.match(regex);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Upload a base64 data URL image to Cloudinary
   * Used for QR codes that need to be emailed (email clients don't support data URLs)
   */
  async uploadBase64Image(
    dataUrl: string,
    folder: string = 'hdticketdesk/qrcodes',
  ): Promise<string> {
    try {
      const result = await cloudinary.uploader.upload(dataUrl, {
        folder,
        resource_type: 'image',
      });
      return result.secure_url;
    } catch (error: any) {
      console.error('Failed to upload base64 image:', error.message);
      // Return the original data URL as fallback (won't work in emails but better than nothing)
      return dataUrl;
    }
  }
}

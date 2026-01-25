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
    // Validate file exists
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // SECURITY: Validate MIME type
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Allowed: JPG, PNG, WebP, GIF');
    }

    // SECURITY: Validate file extension matches MIME type
    const mimeToExt: Record<string, string[]> = {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/gif': ['.gif'],
    };
    const originalName = file.originalname?.toLowerCase() || '';
    const allowedExts = mimeToExt[file.mimetype] || [];
    const hasValidExt = allowedExts.some((ext) => originalName.endsWith(ext));
    if (!hasValidExt && originalName) {
      throw new BadRequestException('File extension does not match file type');
    }

    // SECURITY: Check magic bytes to verify actual file type
    const magicBytes: Record<string, number[][]> = {
      'image/jpeg': [[0xff, 0xd8, 0xff]],
      'image/png': [[0x89, 0x50, 0x4e, 0x47]],
      'image/gif': [[0x47, 0x49, 0x46, 0x38]],
      'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header
    };
    const expectedMagic = magicBytes[file.mimetype];
    if (expectedMagic && file.buffer) {
      const fileHeader = Array.from(file.buffer.slice(0, 12));
      const isValidMagic = expectedMagic.some((magic) =>
        magic.every((byte, index) => fileHeader[index] === byte),
      );
      if (!isValidMagic) {
        throw new BadRequestException('File content does not match declared type');
      }
    }

    // SECURITY: Max 5MB file size
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File too large. Max size: 5MB');
    }

    // SECURITY: Sanitize folder name to prevent path traversal
    const sanitizedFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, '').substring(0, 100);

    try {
      // Upload to Cloudinary
      const result = await new Promise<UploadApiResponse>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: sanitizedFolder,
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

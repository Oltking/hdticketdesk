import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { v2 as cloudinary } from 'cloudinary';
import * as sharp from 'sharp';

@Injectable()
export class MediaService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
    });
  }

  // ============================================
  // UPLOAD IMAGE
  // ============================================

  async uploadImage(
    file: Express.Multer.File,
    userId: string,
    altText?: string,
  ) {
    // Validate file
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Allowed: JPG, PNG, WebP',
      );
    }

    // Check file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 2MB limit');
    }

    try {
      // Optimize image with Sharp
      const optimized = await sharp(file.buffer)
        .resize(1200, 1200, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 85 })
        .toBuffer();

      // Upload to Cloudinary
      const uploadResult = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: this.configService.get('CLOUDINARY_FOLDER', 'hdticketdesk'),
            resource_type: 'image',
            format: 'webp',
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          },
        );

        uploadStream.end(optimized);
      });

      // Save to database
      const media = await this.prisma.mediaUpload.create({
        data: {
          userId,
          filename: file.originalname,
          url: uploadResult.secure_url,
          cdnUrl: uploadResult.secure_url,
          mimeType: 'image/webp',
          sizeBytes: optimized.length,
          altText,
        },
      });

      return {
        id: media.id,
        url: media.url,
        cdnUrl: media.cdnUrl,
      };
    } catch (error) {
      console.error('Upload error:', error);
      throw new BadRequestException('Image upload failed');
    }
  }

  // ============================================
  // DELETE IMAGE
  // ============================================

  async deleteImage(mediaId: string, userId: string) {
    const media = await this.prisma.mediaUpload.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new BadRequestException('Media not found');
    }

    if (media.userId !== userId) {
      throw new BadRequestException('Unauthorized');
    }

    // Extract public ID from Cloudinary URL
    const urlParts = media.url.split('/');
    const publicId = urlParts[urlParts.length - 1].split('.')[0];
    const folder = this.configService.get('CLOUDINARY_FOLDER', 'hdticketdesk');
    const fullPublicId = `${folder}/${publicId}`;

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(fullPublicId);

    // Delete from database
    await this.prisma.mediaUpload.delete({
      where: { id: mediaId },
    });

    return { message: 'Media deleted successfully' };
  }

  // ============================================
  // GET USER MEDIA
  // ============================================

  async getUserMedia(userId: string) {
    return this.prisma.mediaUpload.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
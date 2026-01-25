import {
  Controller,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MediaService } from './media.service';

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  /**
   * POST /media/upload
   * Upload an image to Cloudinary
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Upload to Cloudinary with default folder
    return this.mediaService.uploadImage(file);
  }

  /**
   * POST /media/upload/:folder
   * Upload an image to a specific folder
   */
  @Post('upload/:folder')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImageToFolder(
    @UploadedFile() file: Express.Multer.File,
    @Param('folder') folder: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return this.mediaService.uploadImage(file, folder);
  }

  /**
   * DELETE /media/:publicId
   * Delete an image from Cloudinary
   */
  @Delete(':publicId')
  async deleteImage(@Param('publicId') publicId: string) {
    await this.mediaService.deleteImage(publicId);
    return { message: 'Image deleted successfully' };
  }
}

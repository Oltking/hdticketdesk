import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private mediaService: MediaService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body('altText') altText?: string,
  ) {
    return this.mediaService.uploadImage(file, req.user.id, altText);
  }

  @Delete(':id')
  async deleteImage(@Request() req, @Param('id') id: string) {
    return this.mediaService.deleteImage(id, req.user.id);
  }

  @Get()
  async getMyMedia(@Request() req) {
    return this.mediaService.getUserMedia(req.user.id);
  }
}
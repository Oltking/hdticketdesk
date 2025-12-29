import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateBankDetailsDto } from './dto/update-bank-details.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  async getProfile(@Request() req) {
    return this.usersService.findById(req.user.id);
  }

  @Patch('profile')
  async updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, dto);
  }

  @Patch('bank-details')
  async updateBankDetails(@Request() req, @Body() dto: UpdateBankDetailsDto) {
    return this.usersService.updateOrganizerBankDetails(req.user.id, dto);
  }

  @Get('balance')
  async getBalance(@Request() req) {
    return this.usersService.getOrganizerBalance(req.user.id);
  }
}
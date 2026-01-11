import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto, UpdateBankDetailsDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.findById(userId);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Put('bank-details')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ORGANIZER)
  @ApiOperation({ summary: 'Update bank details (Organizer only)' })
  async updateBankDetails(@CurrentUser('id') userId: string, @Body() dto: UpdateBankDetailsDto) {
    return this.usersService.updateBankDetails(userId, dto);
  }

  @Get('balance')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ORGANIZER)
  @ApiOperation({ summary: 'Get organizer balance' })
  async getBalance(@CurrentUser('id') userId: string) {
    return this.usersService.getOrganizerBalance(userId);
  }
}

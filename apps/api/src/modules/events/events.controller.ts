import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { UserRole } from '../../common/types/prisma-enums';

interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
    role: string;
    organizerProfileId?: string;
  };
}

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // ==================== HOMEPAGE ENDPOINTS ====================

  /**
   * GET /events/carousel
   * Returns up to 6 nearest upcoming events for the homepage carousel
   */
  @Get('carousel')
  async getCarouselEvents() {
    return this.eventsService.getCarouselEvents();
  }

  /**
   * GET /events/live
   * Returns events that are currently happening
   */
  @Get('live')
  async getLiveEvents() {
    return this.eventsService.getLiveEvents();
  }

  /**
   * GET /events/trending
   * Returns events with most ticket sales in last 7 days
   */
  @Get('trending')
  async getTrendingEvents() {
    return this.eventsService.getTrendingEvents();
  }

  /**
   * GET /events/upcoming
   * Returns future events sorted by start date
   */
  @Get('upcoming')
  async getUpcomingEvents(@Query('limit') limit?: string) {
    return this.eventsService.getUpcomingEvents(limit ? parseInt(limit, 10) : 8);
  }

  /**
   * GET /events/featured
   * Returns featured/promoted events
   */
  @Get('featured')
  async getFeaturedEvents() {
    return this.eventsService.getFeaturedEvents();
  }

  // ==================== STANDARD CRUD ENDPOINTS ====================

  /**
   * GET /events
   * Returns paginated list of all published events
   */
  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('filter') filter?: string,
  ) {
    return this.eventsService.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 12,
      search,
      sort,
      filter,
    });
  }

  /**
   * GET /events/my
   * Returns events owned by the authenticated organizer
   * NOTE: This route MUST come before :slug to avoid "my" being treated as a slug
   */
  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER)
  async getMyEvents(@Request() req: AuthenticatedRequest) {
    if (!req.user.organizerProfileId) {
      // Return empty array instead of error for organizers without profile
      return [];
    }
    return this.eventsService.findByOrganizer(req.user.organizerProfileId);
  }

  /**
   * GET /events/:slug
   * Returns a single event by slug or ID
   * NOTE: This route MUST come after all static routes (carousel, live, trending, upcoming, featured, my)
   * Query param ?includeUnpublished=true allows fetching draft events (for organizer edit pages)
   */
  @Get(':slug')
  async findOne(@Param('slug') slug: string, @Query('includeUnpublished') includeUnpublished?: string) {
    // Allow fetching unpublished events when explicitly requested (for organizer edit pages)
    const includeUnpublishedBool = includeUnpublished === 'true';
    return this.eventsService.findBySlug(slug, includeUnpublishedBool);
  }

  /**
   * POST /events
   * Creates a new event (organizer only)
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER)
  async create(@Request() req: AuthenticatedRequest, @Body() createEventDto: CreateEventDto) {
    if (!req.user.organizerProfileId) {
      throw new ForbiddenException(
        'Organizer profile not found. Please complete your organizer profile setup first.',
      );
    }
    return this.eventsService.create(req.user.organizerProfileId, createEventDto);
  }

  /**
   * PATCH /events/:id
   * Updates an event (organizer only, must own the event)
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER)
  async update(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!req.user.organizerProfileId) {
      throw new ForbiddenException(
        'Organizer profile not found. Please complete your organizer profile setup first.',
      );
    }
    return this.eventsService.update(id, req.user.organizerProfileId, updateEventDto);
  }

  /**
   * POST /events/:id/publish
   * Publishes a draft event (organizer only)
   */
  @Post(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER)
  async publish(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    if (!req.user.organizerProfileId) {
      throw new ForbiddenException(
        'Organizer profile not found. Please complete your organizer profile setup first.',
      );
    }
    return this.eventsService.publish(id, req.user.organizerProfileId);
  }

  /**
   * POST /events/:id/unpublish
   * Unpublishes a published event (organizer only, only if no sales)
   */
  @Post(':id/unpublish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER)
  async unpublish(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    if (!req.user.organizerProfileId) {
      throw new ForbiddenException(
        'Organizer profile not found. Please complete your organizer profile setup first.',
      );
    }
    return this.eventsService.unpublish(id, req.user.organizerProfileId);
  }

  /**
   * GET /events/:id/analytics
   * Returns analytics for an event (organizer only)
   */
  @Get(':id/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER)
  async getAnalytics(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    if (!req.user.organizerProfileId) {
      throw new ForbiddenException(
        'Organizer profile not found. Please complete your organizer profile setup first.',
      );
    }
    return this.eventsService.getAnalytics(id, req.user.organizerProfileId);
  }

  /**
   * DELETE /events/:id
   * Deletes an event (organizer only, must own the event)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER)
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    if (!req.user.organizerProfileId) {
      throw new ForbiddenException(
        'Organizer profile not found. Please complete your organizer profile setup first.',
      );
    }
    return this.eventsService.remove(id, req.user.organizerProfileId);
  }
}

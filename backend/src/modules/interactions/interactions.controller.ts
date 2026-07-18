import { Controller, Post, Body, Delete, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { InteractionsService } from './interactions.service';
import { CreateCommentDto, CreateRatingDto } from './dto';

@Controller('api/interactions')
export class InteractionsController {
  constructor(private readonly service: InteractionsService) {}

  // Limit anonymous comments to 5 per minute per IP
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('comments')
  async addComment(@Body() dto: CreateCommentDto) {
    return this.service.createComment(dto);
  }

  // Limit anonymous ratings to 10 per minute per IP
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('ratings')
  async addRating(@Body() dto: CreateRatingDto) {
    return this.service.createRating(dto);
  }

  // Delete a rating/vote
  @Delete('ratings/:entityId/:voterId')
  async deleteRating(
    @Param('entityId') entityId: string,
    @Param('voterId') voterId: string,
  ) {
    return this.service.deleteRating(entityId, voterId);
  }
}

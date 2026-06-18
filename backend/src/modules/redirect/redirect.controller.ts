import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { RedirectService } from './redirect.service';

@Controller('api/redirect')
export class RedirectController {
  constructor(private readonly redirectService: RedirectService) {}

  @Get()
  async redirect(
    @Query('id') id: string,
    @Query('type') type: string,
    @Query('url') url: string,
    @Res() res: Response,
  ) {
    if (!url) {
      return res.status(400).send('Missing destination URL');
    }

    if (id && type) {
      // Register click asynchronously
      this.redirectService.registerClick(id, type);
    }

    // Redirect to the target URL
    return res.redirect(302, url);
  }
}

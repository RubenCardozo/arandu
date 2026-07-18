import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from './db/db.module';
import { CommonModule } from './common/common.module';
import { RedirectModule } from './modules/redirect/redirect.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Rate Limiting (Denial of Service mitigation)
    ThrottlerModule.forRoot([{
      ttl: 60000, // Time to live in milliseconds (1 minute)
      limit: 120, // Max number of requests within the ttl duration
    }]),
    DbModule,
    CommonModule,
    RedirectModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Enable rate limit protection globally on all endpoints
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

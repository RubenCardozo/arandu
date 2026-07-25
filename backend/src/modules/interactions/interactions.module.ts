import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { InteractionsController } from './interactions.controller';
import { InteractionsService } from './interactions.service';

@Module({
  imports: [DatabaseModule],
  controllers: [InteractionsController],
  providers: [InteractionsService],
  exports: [InteractionsService],
})
export class InteractionsModule {}

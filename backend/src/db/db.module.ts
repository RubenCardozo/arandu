import { Module, Global } from '@nestjs/common';
import { dbConnectionProvider } from './index';

@Global()
@Module({
  providers: [dbConnectionProvider],
  exports: [dbConnectionProvider],
})
export class DbModule {}

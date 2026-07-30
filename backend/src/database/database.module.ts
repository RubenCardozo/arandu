import { Module, Global } from '@nestjs/common';
import { dbConnectionProvider, drizzleDbProvider } from './index';

@Global()
@Module({
  providers: [dbConnectionProvider, drizzleDbProvider],
  exports: [dbConnectionProvider, drizzleDbProvider],
})
export class DatabaseModule {}

import { Clock } from '@framework/domain';
import { Global, Module } from '@nestjs/common';

import { SystemClock } from './system-clock';

@Global()
@Module({
  providers: [{ provide: Clock, useClass: SystemClock }],
  exports: [Clock],
})
export class ClockModule {}

import { Clock } from '@framework/domain';
import { Global, Module, Provider } from '@nestjs/common';

import { SystemClock } from './system-clock';
import { TunableClock } from './tunable-clock';

const isTest = process.env.NODE_ENV === 'test';

// In the test environment the clock is settable so scenarios can control time. `useExisting` makes
// `Clock` and `TunableClock` the same singleton: every consumer keeps injecting `Clock`, while the
// testing endpoints inject the concrete `TunableClock` to move it.
const providers: Provider[] = isTest
  ? [TunableClock, { provide: Clock, useExisting: TunableClock }]
  : [{ provide: Clock, useClass: SystemClock }];

@Global()
@Module({
  providers,
  exports: isTest ? [Clock, TunableClock] : [Clock],
})
export class ClockModule {}

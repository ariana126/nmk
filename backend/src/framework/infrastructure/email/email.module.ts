import { EmailSender } from '@framework/application';
import { Global, Module } from '@nestjs/common';

import { InMemoryEmailOutbox } from './in-memory-email-outbox';

// `useExisting` makes `EmailSender` and `InMemoryEmailOutbox` the same singleton: every
// consumer keeps injecting the `EmailSender` port, while the testing endpoints inject the
// concrete outbox to read back what was sent. Choosing a real provider later means changing
// the `EmailSender` binding here and nothing else.
@Global()
@Module({
  providers: [
    InMemoryEmailOutbox,
    { provide: EmailSender, useExisting: InMemoryEmailOutbox },
  ],
  exports: [EmailSender, InMemoryEmailOutbox],
})
export class EmailModule {}

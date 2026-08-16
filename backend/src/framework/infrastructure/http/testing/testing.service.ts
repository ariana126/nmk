import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { Email } from '@framework/domain';
import { Injectable } from '@nestjs/common';

import { TunableClock } from '../../clock/tunable-clock';
import { InMemoryEmailOutbox } from '../../email/in-memory-email-outbox';
import { PrismaService } from '../../persistence/prisma.service';
import { SentEmailView } from './sent-email.view';

const execFileAsync = promisify(execFile);

@Injectable()
export class TestingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: TunableClock,
    private readonly outbox: InMemoryEmailOutbox,
  ) {}

  async runMigrations(): Promise<void> {
    await execFileAsync('npx', ['prisma', 'migrate', 'deploy']);
  }

  /**
   * Hands a test runner a clean slate: every application table, and the in-memory
   * outbox. Sent mail is state a scenario left behind like any other, so clearing it
   * belongs here rather than crossing into the next run.
   */
  async truncateAll(): Promise<void> {
    await this.truncateAllTables();
    this.outbox.clear();
  }

  private async truncateAllTables(): Promise<void> {
    const tables = await this.prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename != '_prisma_migrations'
    `;

    if (tables.length === 0) return;

    const tableList = tables.map((t) => `"${t.tablename}"`).join(', ');
    await this.prisma.$executeRawUnsafe(
      `TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE;`,
    );
  }

  setClock(now: string): void {
    this.clock.set(new Date(now));
  }

  advanceClock(milliseconds: number): void {
    this.clock.advanceBy(milliseconds);
  }

  resetClock(): void {
    this.clock.reset();
  }

  /** Everything the outbox holds for an address, most recently sent first. */
  emailsSentTo(recipient: string): SentEmailView[] {
    return this.outbox.sentTo(Email.fromString(recipient)).map((email) => ({
      to: email.recipient.asString(),
      subject: email.subject,
      body: email.body,
      sentAt: email.sentAt.toISOString(),
    }));
  }
}

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { Injectable } from '@nestjs/common';

import { TunableClock } from '../../clock/tunable-clock';
import { PrismaService } from '../../persistence/prisma.service';

const execFileAsync = promisify(execFile);

@Injectable()
export class TestingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: TunableClock,
  ) {}

  async runMigrations(): Promise<void> {
    await execFileAsync('npx', ['prisma', 'migrate', 'deploy']);
  }

  async truncateAllTables(): Promise<void> {
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
}

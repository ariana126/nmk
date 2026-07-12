import { Before, BeforeAll, AfterAll } from '@cucumber/cucumber';
import { Client } from 'pg';
import supertest from 'supertest';
import { AppWorld } from './world';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const PRISMA_MIGRATIONS_TABLE = '_prisma_migrations';

let db: Client;

BeforeAll(async function () {
  try {
    await fetch(BASE_URL);
  } catch {
    throw new Error(
      `Could not reach the backend at ${BASE_URL}. Start it first with "npm run start:dev" in backend/.`,
    );
  }

  db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
});

AfterAll(async function () {
  await db.end();
});

Before(async function (this: AppWorld) {
  const { rows } = await db.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
  );
  for (const { tablename } of rows) {
    if (tablename === PRISMA_MIGRATIONS_TABLE) {
      continue;
    }
    await db.query(`TRUNCATE TABLE "${tablename}" CASCADE`);
  }

  this.client = supertest(BASE_URL);
});

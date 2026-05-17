import { Before, After, BeforeAll } from '@cucumber/cucumber';
import { execSync } from 'child_process';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '@framework/infrastructure';
import supertest from 'supertest';
import { configureApp } from '../../src/configure-app';
import { AppWorld } from './world';

BeforeAll(function () {
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
});

Before(async function (this: AppWorld) {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  this.app = moduleRef.createNestApplication();
  configureApp(this.app);
  await this.app.init();
  this.client = supertest(this.app.getHttpServer());

  const prisma = moduleRef.get(PrismaService);
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;
  const prismaMigrationsTableName = '_prisma_migrations';
  for (const { tablename } of tables) {
    if (prismaMigrationsTableName === tablename) {
      continue;
    }
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE`);
  }
});

After(async function (this: AppWorld) {
  await this.app.close();
});

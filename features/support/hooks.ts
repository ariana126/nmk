import { Before, After } from '@cucumber/cucumber';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import supertest from 'supertest';
import { AppWorld } from './world';

Before(async function (this: AppWorld) {
    const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
    }).compile();

    this.app = moduleRef.createNestApplication();
    await this.app.init();
    this.client = supertest(this.app.getHttpServer());

    // TODO: Cleanup (database for example)
});

After(async function (this: AppWorld) {
    await this.app.close();
});
import { Before, BeforeAll } from '@cucumber/cucumber';
import supertest from 'supertest';
import { AppWorld } from './world';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

BeforeAll(async function () {
  await supertest(BASE_URL).post('/api/testing/migrations').expect(204);
});

Before(async function (this: AppWorld) {
  await supertest(BASE_URL).post('/api/testing/truncate').expect(204);

  this.client = supertest(BASE_URL);
});

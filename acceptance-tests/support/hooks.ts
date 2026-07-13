import { Before, BeforeAll } from '@cucumber/cucumber';
import supertest from 'supertest';
import { AppWorld } from './world';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

BeforeAll(async function () {
 // TODO: Call an API to run migrations.
});

Before(async function (this: AppWorld) {
  // TODO: Call an API to truncate all tables.

  this.client = supertest(BASE_URL);
});

import { setWorldConstructor, World } from '@cucumber/cucumber';
import supertest from 'supertest';

export class AppWorld extends World {
  client!: ReturnType<typeof supertest>;
  response!: supertest.Response;
  accessToken: string | null = null;
}

setWorldConstructor(AppWorld);

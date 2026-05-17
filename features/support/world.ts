import { setWorldConstructor, World } from '@cucumber/cucumber';
import supertest from 'supertest';
import { INestApplication } from '@nestjs/common';

export class AppWorld extends World {
  app: INestApplication;
  client: ReturnType<typeof supertest>;
  response: supertest.Response;
}

setWorldConstructor(AppWorld);

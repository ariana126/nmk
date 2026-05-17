import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';
import { AppModule } from './app.module';
import { buildSwaggerConfig, configureApp } from './configure-app';

async function generate() {
  const app = await NestFactory.create(AppModule, { logger: false });
  configureApp(app);
  await app.init();

  const document = SwaggerModule.createDocument(app, buildSwaggerConfig());

  const outDir = path.resolve(process.cwd(), 'docs');
  fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(
    path.join(outDir, 'openapi.json'),
    JSON.stringify(document, null, 2),
  );
  fs.writeFileSync(
    path.join(outDir, 'openapi.yaml'),
    yaml.dump(document, { noRefs: true }),
  );

  console.log('docs/openapi.json and docs/openapi.yaml written');
  await app.close();
}

void generate();

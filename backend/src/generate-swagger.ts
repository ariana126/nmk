import * as fs from 'node:fs';
import path from 'node:path';

import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import * as yaml from 'js-yaml';

import { AppModule } from './app.module';
import { buildSwaggerConfig, configureApp } from './configure-app';

const OUT_DIR = path.resolve(process.cwd(), 'docs');
const JSON_FILE = path.join(OUT_DIR, 'openapi.json');
const YAML_FILE = path.join(OUT_DIR, 'openapi.yaml');

async function buildDocument(): Promise<{
  app: INestApplication;
  document: OpenAPIObject;
}> {
  const app = await NestFactory.create(AppModule, { logger: false });
  configureApp(app);
  await app.init();

  return {
    app,
    document: SwaggerModule.createDocument(app, buildSwaggerConfig()),
  };
}

// The single source of truth for how the spec is serialised: writing and checking must never
// disagree about formatting, or the check would fail on a spec that is actually up to date.
function render(document: OpenAPIObject): { json: string; yaml: string } {
  return {
    json: JSON.stringify(document, null, 2),
    yaml: yaml.dump(document, { noRefs: true }),
  };
}

function write(document: OpenAPIObject): void {
  const rendered = render(document);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(JSON_FILE, rendered.json);
  fs.writeFileSync(YAML_FILE, rendered.yaml);

  console.log('docs/openapi.json and docs/openapi.yaml written');
}

function isStale(file: string, expected: string): boolean {
  return !fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== expected;
}

function check(document: OpenAPIObject): void {
  const rendered = render(document);

  const stale = [
    ...(isStale(JSON_FILE, rendered.json) ? ['docs/openapi.json'] : []),
    ...(isStale(YAML_FILE, rendered.yaml) ? ['docs/openapi.yaml'] : []),
  ];

  if (stale.length === 0) {
    console.log('docs/openapi.json and docs/openapi.yaml are up to date');
    return;
  }

  const verb = stale.length === 1 ? 'does' : 'do';
  console.error(`${stale.join(' and ')} ${verb} not match the code.`);
  console.error('Regenerate with: make generate-swagger');
  process.exitCode = 1;
}

async function main(): Promise<void> {
  const { app, document } = await buildDocument();

  try {
    if (process.argv.includes('--check')) {
      check(document);
    } else {
      write(document);
    }
  } finally {
    await app.close();
  }
}

void main();

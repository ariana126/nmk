import {
  After,
  AfterAll,
  Before,
  BeforeAll,
  setDefaultTimeout,
} from '@cucumber/cucumber';
import { configure, engage, serenity } from '@serenity-js/core';
import { Photographer, TakePhotosOfFailures } from '@serenity-js/web';
import * as playwright from 'playwright';
import { Actors } from './actors';
import { apiBaseUrl, appBaseUrl } from './config';

// Generous, because nine of the examples drive a browser. The frontend test stack is
// `ng serve`, so the first navigation of a run also waits out Vite's on-demand
// compilation of the identity chunk.
setDefaultTimeout(60_000);

let browser: playwright.Browser;

const callTestingEndpoint = async (endpoint: string): Promise<void> => {
  const url = `${apiBaseUrl}testing/${endpoint}`;
  const response = await fetch(url, { method: 'POST' });
  if (!response.ok) {
    throw new Error(`Failed to call ${url}: HTTP ${response.status}`);
  }
};

BeforeAll(async function () {
  configure({
    crew: [
      '@serenity-js/console-reporter',
      '@serenity-js/serenity-bdd',
      [
        '@serenity-js/core:ArtifactArchiver',
        { outputDirectory: 'target/site/serenity' },
      ],
      // A failed UI step can only name the element it was looking for; the screenshot shows the
      // page it was looking at. Failures only — a photo per step would swamp the report.
      Photographer.whoWill(TakePhotosOfFailures),
    ],
  });

  // One browser for the whole run; each actor still gets their own context (support/actors.ts).
  browser = await playwright.chromium.launch();

  await callTestingEndpoint('migrations');
});

Before(async function () {
  await callTestingEndpoint('truncate');

  // Back to the default frozen instant, so every scenario starts from the same
  // point in time and scenario order never matters.
  await callTestingEndpoint('clock/reset');

  // A new cast per scenario, so every actor starts with a fresh, empty notepad and a fresh
  // browser context — the database is truncated between scenarios, but a browser would otherwise
  // carry the previous scenario's access token in localStorage.
  engage(new Actors(apiBaseUrl, appBaseUrl, browser));
});

After(async function () {
  // Screenshots are written asynchronously; give Serenity the chance to finish before Cucumber
  // tears the scenario down, or a failure's photo never reaches the living documentation.
  await serenity.waitForNextCue();
});

AfterAll(async function () {
  await browser?.close();
});

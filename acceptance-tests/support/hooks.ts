import { Before, BeforeAll, setDefaultTimeout } from '@cucumber/cucumber';
import { configure, engage } from '@serenity-js/core';
import { Actors } from './actors';
import { apiBaseUrl } from './config';

setDefaultTimeout(10_000);

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
    ],
  });

  await callTestingEndpoint('migrations');
});

Before(async function () {
  await callTestingEndpoint('truncate');

  // A new cast per scenario, so every actor starts with a fresh, empty notepad.
  engage(new Actors(apiBaseUrl));
});

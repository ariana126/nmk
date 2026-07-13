import { When, Then } from '@cucumber/cucumber';
import * as assert from 'node:assert/strict';
import { AppWorld } from '../../support/world';

// ---------------------------------------------------------------------------
// Action steps
// ---------------------------------------------------------------------------

When('I refresh my access token', async function (this: AppWorld) {
  const { refreshToken } = this.response.body as { refreshToken?: string };
  assert.ok(
    refreshToken,
    'Expected a refreshToken in the login response body before refreshing',
  );

  this.response = await this.client
    .post('/api/auth/refresh')
    .send({ refreshToken });
});

// ---------------------------------------------------------------------------
// Assertion steps — tokens
// ---------------------------------------------------------------------------

Then(
  'the response body should contain an access token',
  function (this: AppWorld) {
    const { accessToken } = this.response.body as { accessToken?: string };
    assert.ok(
      typeof accessToken === 'string' && accessToken.length > 0,
      `Expected "accessToken" to be a non-empty string in the response body. Body: ${JSON.stringify(this.response.body)}`,
    );
  },
);

Then(
  'the response body should contain a refresh token',
  function (this: AppWorld) {
    const { refreshToken } = this.response.body as { refreshToken?: string };
    assert.ok(
      typeof refreshToken === 'string' && refreshToken.length > 0,
      `Expected "refreshToken" to be a non-empty string in the response body. Body: ${JSON.stringify(this.response.body)}`,
    );
  },
);

Then('I should get a new access token', function (this: AppWorld) {
  const { accessToken } = this.response.body as { accessToken?: string };
  assert.ok(
    typeof accessToken === 'string' && accessToken.length > 0,
    `Expected "accessToken" to be a non-empty string after refresh. Body: ${JSON.stringify(this.response.body)}`,
  );
  this.accessToken = accessToken;
});

// ---------------------------------------------------------------------------
// Assertion steps — invalid credentials error
// ---------------------------------------------------------------------------

Then(
  'the response body should contain an error indicating the credential is invalid',
  function (this: AppWorld) {
    const body = this.response.body as { type?: string };
    assert.equal(
      String(body.type ?? ''),
      'https://my-api-doc.dev/problems/invalid-credentials',
      `Expected "type" to be "https://my-api-doc.dev/problems/invalid-credentials". Body: ${JSON.stringify(body)}`,
    );
  },
);

import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import * as assert from 'node:assert/strict';
import { AppWorld } from '../../support/world';

// ---------------------------------------------------------------------------
// Background steps
// ---------------------------------------------------------------------------

Given(
  'no user with email {string} exists',
  function (this: AppWorld, _email: string) {
    // No-op: black-box testing means we cannot delete records directly.
    // Database cleanup between scenarios must be handled in the Before hook
    // (see the TODO comment in features/support/hooks.ts).
  },
);

// ---------------------------------------------------------------------------
// Precondition steps
// ---------------------------------------------------------------------------

Given(
  'a user with email {string} already exists',
  async function (this: AppWorld, email: string) {
    await this.client.post('/api/users').send({
      firstName: 'Seed',
      lastName: 'User',
      email,
      password: 'SeedPass999!',
    });
  },
);

// ---------------------------------------------------------------------------
// Action steps
// ---------------------------------------------------------------------------

When(
  'I register with the following details:',
  async function (this: AppWorld, dataTable: DataTable) {
    const fields = dataTable.rowsHash();
    this.response = await this.client.post('/api/users').send(fields);
  },
);

// ---------------------------------------------------------------------------
// Assertion steps — login verification
// ---------------------------------------------------------------------------

Then(
  'I should be able to log in with email {string} and password {string}',
  async function (this: AppWorld, email: string, password: string) {
    const loginResponse = await this.client
      .post('/api/auth/login')
      .send({ email, password });

    assert.equal(
      loginResponse.status,
      200,
      `Expected login to succeed (HTTP 200) but got ${loginResponse.status}. Body: ${JSON.stringify(loginResponse.body)}`,
    );

    this.accessToken = (
      loginResponse.body as { accessToken: string }
    ).accessToken;
  },
);

Then(
  'I should see my profile with the following details:',
  async function (this: AppWorld, dataTable: DataTable) {
    assert.ok(
      this.accessToken,
      'Expected accessToken to be set (run the login step first)',
    );

    const profileResponse = await this.client
      .get('/api/users/me')
      .set('Authorization', `Bearer ${this.accessToken}`);

    assert.equal(
      profileResponse.status,
      200,
      `Expected 200 but got ${profileResponse.status}. Body: ${JSON.stringify(profileResponse.body)}`,
    );

    const expected = dataTable.rowsHash();
    const body = profileResponse.body as Record<string, unknown>;

    assert.deepEqual(
      Object.keys(body).sort(),
      Object.keys(expected).sort(),
      `Expected profile to contain exactly [${Object.keys(expected).sort().join(', ')}] but got [${Object.keys(body).sort().join(', ')}]`,
    );

    for (const [field, value] of Object.entries(expected)) {
      if (value === '<present>') {
        assert.ok(
          body[field] !== undefined &&
            body[field] !== null &&
            body[field] !== '',
          `Expected profile.${field} to be present but got "${body[field]}"`,
        );
      } else {
        assert.equal(
          body[field],
          value,
          `Expected profile.${field} to be "${value}" but got "${body[field]}"`,
        );
      }
    }
  },
);

Then(
  'I should not be able to log in with email {string} and password {string}',
  async function (this: AppWorld, email: string, password: string) {
    const loginResponse = await this.client
      .post('/api/auth/login')
      .send({ email, password });

    assert.equal(
      loginResponse.status,
      401,
      `Expected login to fail (HTTP 401) but got ${loginResponse.status}. Body: ${JSON.stringify(loginResponse.body)}`,
    );
  },
);

// ---------------------------------------------------------------------------
// Assertion steps — conflict error
// ---------------------------------------------------------------------------

Then(
  'the response body should contain an error indicating the email is taken',
  function (this: AppWorld) {
    const body = this.response.body as { type?: unknown };

    assert.equal(
      String(body.type ?? ''),
      'https://my-api-doc.dev/problems/user-already-exists',
      `Expected "type" to be "https://my-api-doc.dev/problems/user-already-exists". Body: ${JSON.stringify(body)}`,
    );
  },
);

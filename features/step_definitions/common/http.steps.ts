import { Given, Then, DataTable } from '@cucumber/cucumber';
import * as assert from 'node:assert/strict';
import { AppWorld } from '../../support/world';

// ---------------------------------------------------------------------------
// Background steps
// ---------------------------------------------------------------------------

Given('the application is running', function (this: AppWorld) {
  // No-op: the app is started in the Before hook (features/support/hooks.ts).
});

// ---------------------------------------------------------------------------
// Assertion steps — status
// ---------------------------------------------------------------------------

Then(
  'the response status should be {int}',
  function (this: AppWorld, expectedStatus: number) {
    assert.equal(
      this.response.status,
      expectedStatus,
      `Expected HTTP ${expectedStatus} but got ${this.response.status}. Body: ${JSON.stringify(this.response.body)}`,
    );
  },
);

Then(
  'the response should be a valid problem detail',
  function (this: AppWorld) {
    const contentType = String(this.response.headers['content-type'] ?? '');
    assert.ok(
      contentType.includes('application/problem+json'),
      `Expected Content-Type to include "application/problem+json" but got "${contentType}"`,
    );

    const body = this.response.body as Record<string, unknown>;

    const type = String(body['type'] ?? '');
    const prefix = 'https://my-api-doc.dev/problems/';
    assert.ok(
      type === 'about:blank' || (type.startsWith(prefix) && type.length > prefix.length),
      `Expected "type" to be "about:blank" or "https://my-api-doc.dev/problems/<uri>". Body: ${JSON.stringify(body)}`,
    );
    assert.ok(
      typeof body['title'] === 'string' && body['title'].length > 0,
      `Expected "title" to be a non-empty string. Body: ${JSON.stringify(body)}`,
    );
    assert.equal(
      body['status'],
      this.response.status,
      `Expected body "status" to match HTTP status ${this.response.status}. Body: ${JSON.stringify(body)}`,
    );
  },
);

// ---------------------------------------------------------------------------
// Assertion steps — validation errors
// ---------------------------------------------------------------------------

Then(
  'the response body should contain validation errors for:',
  function (this: AppWorld, table: DataTable) {
    const fields = table.raw().map(([field]) => field);

    const body = this.response.body as {
      type?: unknown;
      errors?: Array<{ field: string; message: string }>;
    };

    assert.equal(
      String(body.type ?? ''),
      'https://my-api-doc.dev/problems/validation-error',
      `Expected "type" to be "https://my-api-doc.dev/problems/validation-error". Body: ${JSON.stringify(body)}`,
    );
    assert.ok(
      Array.isArray(body.errors),
      `Expected "errors" to be an array. Body: ${JSON.stringify(body)}`,
    );

    for (const fieldName of fields) {
      const fieldPresent = body.errors.some((err) => err.field === fieldName);
      assert.ok(
        fieldPresent,
        `Expected a validation error for field "${fieldName}" but got: ${JSON.stringify(body.errors)}`,
      );
    }
  },
);

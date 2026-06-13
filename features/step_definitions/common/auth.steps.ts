import { When, Then, DataTable } from '@cucumber/cucumber';
import * as assert from 'node:assert/strict';
import { AppWorld } from '../../support/world';

Then(
  'the response body should contain an error indicating access is denied',
  function (this: AppWorld) {
    const body = this.response.body as { type?: string };
    assert.equal(
      String(body.type ?? ''),
      'https://my-api-doc.dev/problems/access-denied',
      `Expected "type" to be "https://my-api-doc.dev/problems/access-denied". Body: ${JSON.stringify(body)}`,
    );
  },
);

When(
  'I register with the following details:',
  async function (this: AppWorld, dataTable: DataTable) {
    const fields = dataTable.rowsHash();
    this.response = await this.client.post('/api/users').send(fields);
  },
);

When(
  'I log in with email {string} and password {string}',
  async function (this: AppWorld, email: string, password: string) {
    this.response = await this.client
      .post('/api/auth/login')
      .send({ email, password });

    if (this.response.status === 200) {
      this.accessToken = (
        this.response.body as { accessToken: string }
      ).accessToken;
    }
  },
);

When('I log out', function (this: AppWorld) {
  this.accessToken = null;
});

import { When, Then, DataTable } from '@cucumber/cucumber';
import * as assert from 'node:assert/strict';
import { AppWorld } from '../../support/world';

When('I open my profile', async function (this: AppWorld) {
  const req = this.client.get('/api/users/me');
  if (this.accessToken) req.set('Authorization', `Bearer ${this.accessToken}`);
  this.response = await req;
});

Then(
  'I should not see the following details:',
  function (this: AppWorld, dataTable: DataTable) {
    const fields = Object.keys(dataTable.rowsHash());
    const body = this.response.body as Record<string, unknown>;
    for (const field of fields) {
      assert.ok(
        !(field in body),
        `Expected "${field}" to be absent from the response body but it was present. Body: ${JSON.stringify(body)}`,
      );
    }
  },
);

When(
  'I update my profile with the following details:',
  async function (this: AppWorld, dataTable: DataTable) {
    const fields = dataTable.rowsHash();
    this.response = await this.client
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${this.accessToken}`)
      .send(fields);
  },
);

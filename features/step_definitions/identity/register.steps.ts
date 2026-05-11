import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import * as assert from 'node:assert/strict';
import { AppWorld } from '../../support/world';

// ---------------------------------------------------------------------------
// Background steps
// ---------------------------------------------------------------------------

Given('the application is running', function (this: AppWorld) {
    // No-op: the app is started in the Before hook (features/support/hooks.ts).
});

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
        await this.client.post('/auth/register').send({
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
        this.response = await this.client.post('/auth/register').send(fields);
    },
);

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

// ---------------------------------------------------------------------------
// Assertion steps — login verification
// ---------------------------------------------------------------------------

Then(
    'I should be able to log in with email {string} and password {string}',
    async function (this: AppWorld, email: string, password: string) {
        const loginResponse = await this.client
            .post('/auth/login')
            .send({ email, password });

        assert.equal(
            loginResponse.status,
            200,
            `Expected login to succeed (HTTP 200) but got ${loginResponse.status}. Body: ${JSON.stringify(loginResponse.body)}`,
        );
    },
);

// ---------------------------------------------------------------------------
// Assertion steps — conflict error
// ---------------------------------------------------------------------------

Then(
    'the response body should contain an error indicating the email is taken',
    function (this: AppWorld) {
        const body = this.response.body as {
            statusCode?: number;
            message?: string | string[];
            error?: string;
        };

        assert.ok(
            body.message,
            `Expected response body to contain a "message" field. Body: ${JSON.stringify(body)}`,
        );

        const messageText = Array.isArray(body.message)
            ? body.message.join(' ')
            : body.message;

        assert.ok(
            messageText.length > 0,
            `Expected a non-empty conflict message. Body: ${JSON.stringify(body)}`,
        );
    },
);

// ---------------------------------------------------------------------------
// Assertion steps — validation errors
// ---------------------------------------------------------------------------

Then(
    'the response body should contain a validation error for {string}',
    function (this: AppWorld, fieldName: string) {
        const body = this.response.body as {
            statusCode?: number;
            message?: string | string[];
            error?: string;
        };

        assert.ok(
            Array.isArray(body.message),
            `Expected "message" to be an array of validation errors. Body: ${JSON.stringify(body)}`,
        );

        const messages = body.message as string[];
        const fieldMentioned = messages.some((msg) =>
            msg.toLowerCase().includes(fieldName.toLowerCase()),
        );

        assert.ok(
            fieldMentioned,
            `Expected a validation error mentioning "${fieldName}" but got: ${JSON.stringify(messages)}`,
        );
    },
);

Then(
    'the response body should contain validation errors for {string}, {string} and {string}',
    function (this: AppWorld, field1: string, field2: string, field3: string) {
        const body = this.response.body as {
            statusCode?: number;
            message?: string | string[];
            error?: string;
        };

        assert.ok(
            Array.isArray(body.message),
            `Expected "message" to be an array of validation errors. Body: ${JSON.stringify(body)}`,
        );

        const messages = body.message as string[];

        for (const fieldName of [field1, field2, field3]) {
            const fieldMentioned = messages.some((msg) =>
                msg.toLowerCase().includes(fieldName.toLowerCase()),
            );
            assert.ok(
                fieldMentioned,
                `Expected a validation error mentioning "${fieldName}" but got: ${JSON.stringify(messages)}`,
            );
        }
    },
);

import { defineConfig } from 'orval';

// The API client under src/app/api is generated from api/openapi.json and is not committed.
// npm's pre* hooks regenerate it before every start, build, test and lint, so the client on
// disk always matches the contract. `api/openapi.json` is a copy of the backend's spec kept
// fresh by `make sync-api-contract` — nothing here reaches outside this project.
export default defineConfig({
  nmk: {
    input: { target: './api/openapi.json' },
    output: {
      // A directory per OpenAPI tag, so a lazily loaded feature route pulls in only its own
      // slice of the client rather than the whole API.
      mode: 'tags-split',
      target: 'src/app/api/api.ts',
      schemas: 'src/app/api/model',
      client: 'angular',
      // Reuses the project's .prettierrc, so the output passes `make format` untouched.
      formatter: 'prettier',
      override: {
        angular: {
          provideIn: 'root',
          // Not 'httpResource': it is still experimental in v21 and GET-only, so it cannot
          // express the two POSTs in this spec. HttpClient covers every verb, and a component
          // that wants a signal can wrap the Observable in rxResource().
          retrievalClient: 'httpClient',
        },
      },
      // No baseUrl on purpose: routes stay relative (/api/users), which is what a same-origin
      // deployment or a dev-server proxy wants, and keeps the deployment target out of
      // generated code.
    },
  },
});

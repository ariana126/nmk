// The dev server's only link to the API, and the one place the backend's address is named.
//
// The generated client emits relative routes (`/api/users`) on purpose — see the comment in
// orval.config.ts — so something has to forward them. Doing it here rather than through
// `environment.apiUrl` + fileReplacements keeps the two Compose stacks a single image with a
// different env file, exactly like the backend's dev/test split, and keeps every request
// same-origin so the backend needs no CORS.
//
// `.mjs` rather than the usual proxy.conf.json because a JSON file cannot read the environment:
// the target is what distinguishes nmk-frontend (backend :3000) from nmk-frontend-test
// (backend :3001). @angular/build imports any non-.json proxy config as a module.
//
// host.docker.internal, not a service name: the backend is a separate Compose project with its
// own network, reachable only through the ports it publishes on the host. docker-compose.yml
// maps that name to the host gateway.
const target = process.env['API_PROXY_TARGET'] ?? 'http://localhost:3000';

export default {
  // changeOrigin, because the target's host differs from the browser's localhost:4200.
  '/api/**': { target, changeOrigin: true },
};

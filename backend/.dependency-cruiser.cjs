/**
 * dependency-cruiser configuration — enforces the DDD + CQRS layer boundaries
 * described in CLAUDE.md. Run with `make npm depcruise`.
 *
 * Layer direction (per module and in `framework/`):
 *   domain  <-  application  <-  infrastructure
 * Dependencies point inward: domain is pure, application may use domain,
 * infrastructure may use both. Nothing points outward.
 */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      comment:
        'Circular dependencies make the graph impossible to reason about. ' +
        'Cycles routed through a package `index.ts` barrel are ignored: internal ' +
        'files import the barrel for convenience and the barrel re-exports them, a ' +
        'benign artifact of the re-export pattern rather than a real logic cycle.',
      severity: 'error',
      from: {},
      to: { circular: true, viaNot: '(^|/)index\\.ts$' },
    },
    {
      name: 'domain-not-application-or-infra',
      comment:
        'The domain layer is the innermost ring: it must not depend on the ' +
        'application or infrastructure layers.',
      severity: 'error',
      from: { path: '(^|/)domain/' },
      to: { path: '(^|/)(application|infrastructure)/' },
    },
    {
      name: 'domain-no-framework-libs',
      comment:
        'The domain layer is framework-agnostic business logic — no NestJS or Prisma.',
      severity: 'error',
      from: { path: '(^|/)domain/' },
      to: { path: 'node_modules/(@nestjs|@prisma|prisma)' },
    },
    {
      name: 'application-not-infrastructure',
      comment:
        'The application layer orchestrates the domain; it must not reach into ' +
        'the infrastructure layer.',
      severity: 'error',
      from: { path: '(^|/)application/' },
      to: { path: '(^|/)infrastructure/' },
    },
    {
      name: 'framework-independent-of-modules',
      comment:
        'The shared framework must not depend on feature modules. The single ' +
        'exception is HttpExceptionFilter, which composes the module exception ' +
        'mappers (framework first, then module-specific) — a documented coupling ' +
        'in src/framework/CLAUDE.md.',
      severity: 'error',
      from: { path: '^src/framework/', pathNot: 'exception\\.filter\\.ts$' },
      to: { path: '^src/modules/' },
    },
    {
      name: 'no-own-package-barrel',
      comment:
        'A file must not import its own package barrel (index.ts): it creates an ' +
        'index-routed re-export cycle whose load order is fragile and breaks under import ' +
        'sorting (see the FrameworkExceptionMapper crash). Import sibling files directly.',
      severity: 'error',
      from: {
        path: '^src/framework/(domain|application|infrastructure)/.+',
        pathNot: '/index\\.ts$',
      },
      to: { path: '^src/framework/$1/index\\.ts$' },
    },
    {
      name: 'modules-isolated',
      comment:
        'A feature module must not import another module internally. Cross-module ' +
        'interaction goes over HTTP, not by importing code.',
      severity: 'error',
      from: { path: '^src/modules/([^/]+)/' },
      to: { path: '^src/modules/([^/]+)/', pathNot: '^src/modules/$1/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    // Include type-only imports so an `import type` can't smuggle a layer break past the check.
    tsPreCompilationDeps: true,
    // Resolve the @framework/* and @identity/* path aliases.
    tsConfig: { fileName: 'tsconfig.json' },
    // Co-located unit tests are not part of the layer graph.
    exclude: { path: '\\.spec\\.ts$' },
  },
};

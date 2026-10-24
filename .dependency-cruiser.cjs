/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "app-code-never-ships-test-helpers",
      comment:
        "@scout/testing holds fixtures and mocks; the planner reaches it only from tests.",
      severity: "error",
      from: { path: "^apps/web/app/", pathNot: "[.]test[.]tsx?$" },
      to: { path: "^packages/testing/" },
    },
    {
      name: "analysis-is-pure",
      comment:
        "@scout/analysis is the deterministic core and may depend only on @scout/contracts.",
      severity: "error",
      from: { path: "^packages/analysis/" },
      to: { path: "^packages/(?!analysis|contracts)/" },
    },
    {
      name: "contracts-are-leaves",
      severity: "error",
      from: { path: "^packages/contracts/" },
      to: { path: "^packages/(?!contracts)/|^apps/" },
    },
    {
      name: "packages-never-import-apps",
      severity: "error",
      from: { path: "^packages/" },
      to: { path: "^apps/" },
    },
    {
      name: "no-orphans",
      severity: "warn",
      from: {
        orphan: true,
        pathNot: [
          "\\.d\\.ts$",
          "(^|/)tsconfig",
          "\\.config\\.(js|cjs|mjs|ts)$",
          "^e2e/",
          "^apps/web/test/",
          "^packages/testing/src/vitest-commands\\.ts$",
          "\\.server\\.tsx?$",
        ],
      },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: {
      path: "node_modules|\\.next|/dist/|/out/|test-results|playwright-report|coverage",
    },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      mainFields: ["module", "main", "types", "typings"],
    },
    reporterOptions: { text: { highlightFocused: true } },
  },
};

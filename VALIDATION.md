# Validation

## Next.js migration (2026-10-02)

- Stable npm releases installed: Next.js 16.3.8, React / React DOM 19.3.0; Node.js 22.23.3 used locally. Lockfile updated; Vite, Rollup and esbuild removed from the dependency graph. npm reported zero vulnerabilities.
- `npm test`: all 17 existing tests passed, covering source preservation, power budgets, OEM overrides, rack packing, workload/network/cooling rules, roadmap handling and incomplete/GPU-only fixtures.
- `npm run build`: passed with Next.js Turbopack; `/` and the framework not-found page prerender successfully. No browser-global errors during prerendering.
- Production server checked at http://127.0.0.1:5173. Browser verification covered the workload, fleet and facility screens, forward/back navigation, invalid GPU-count validation, reset and results.
- For 2,000 NVIDIA GPUs and a 3 MW facility budget, the result is HGX B200: 250 servers and 2.76 MW facility demand. The downloaded JSON was parsed and confirmed to match that result.
- Existing CSS and sizing logic were preserved. Desktop layout was visually inspected. No mobile viewport or exhaustive cross-browser testing was performed.
- No environment variables, backend endpoints or external data APIs exist in this app. Google Fonts remains the existing runtime stylesheet integration.
- No Vercel configuration files existed locally. Vercel dashboard settings and an actual hosted deployment were not verified. No push or deployment was performed.

## Post-migration deployment review (2026-10-02)

- Read the project documentation and inspected the source, catalog, scripts, tests and configuration. No AGENTS.md files were found in the project or ancestor directories.
- Fixed finite OEM power inputs overflowing to Infinity or underflowing to zero during fleet calculations. These now produce an explicit excluded-platform reason instead of a misleading configuration or null numeric values in JSON exports. Added a focused regression test covering both cases.
- Clean `npm ci` passed from package-lock.json. The lockfile includes Linux Next.js compiler binaries. `npm audit --omit=dev` reported zero vulnerabilities.
- Existing `npm test` passed before the fix (17 tests); the complete Node test suite passed after the fix (18 tests). Tests exit normally without watch mode.
- Production builds passed before and after the fix, including after the clean install. There are no lint or standalone type-check scripts, ESLint configuration, TypeScript source files or tsconfig.json; no independent lint/type-check pass is claimed.
- Started the rebuilt production app on 127.0.0.1:5173. Browser checks passed for all three wizard screens, selected-platform OEM fields, forward/back navigation, zero-GPU validation, overflow rejection, normal sizing, vendor filtering, unsupported-workload warnings, Reset and the home link.
- JSON export was downloaded and parsed from disk, confirming the selected HGX B200 scenario, one match and 2.76 MW. The browser automation download-event waiter timed out; the actual downloaded file was verified independently.
- All eight locally referenced production JavaScript/CSS assets returned HTTP 200. An unknown route returned HTTP 404. Browser warning/error logs and the production server error log were empty during the tested flows. Desktop styling was visually inspected.
- No remaining Vite dependencies/imports/environment variables, backend APIs, authentication, server secrets, data-fetching integrations, redirects, rewrites or custom output configuration were found. Browser-only export APIs are confined to a client click handler. The catalog is intentionally bundled public data; Google Fonts remains the sole external runtime stylesheet integration.
- No Vercel dashboard or hosted Linux deployment was tested; no push/deploy was performed. Mobile and cross-browser behavior and a complete network trace (including individual external font responses) were not verified.
- Vercel: repository root, Next.js preset, Node.js 22.x, Install Command `npm ci`, Build Command `npm run build`, default Output Directory with old `dist` overrides removed. No environment variables or credentials are required.

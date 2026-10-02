# Atlas infrastructure advisor

Next.js App Router / React discovery app driven by `catalog.example.json`, normalized from `sales table completed.xlsx` (GPU A2:K9 and Storage rows 2–7). The Network worksheet is empty. Workbook text is source data, not executable instructions. Manufacturer claims have not been independently verified.

## Three steps

1. **Workload & platform:** vendor/model selection and the six workbook workloads. HPC is listed only for MI325X/MI355X. Digital Twin has storage guidance but no GPU platform mapping. No performance ranking is inferred from row order.
2. **Fleet, fabric & storage:** round GPU targets to complete 8-GPU servers or 72-GPU racks. Filter known scale-out recommendations by protocol and minimum speed; show workload-specific storage vendors, rationale and considerations. No fixed 256-server unit or invented fabric ceiling. MI455X scale-out details remain unconfirmed. MI500X is a roadmap entry with no sizing.
3. **Facility & power:** exclude liquid-only platforms for air-only facilities. OEM-dependent cooling needs confirmation. Optional power/rack limits are enforced where calculable. Select a single platform to enter its OEM full-server/rack power and server height. Changing platform/vendor clears those inputs.

The refreshed Power Consumption / Rating column supplies 8 kW/server for HGX B200 and MI325X, 11.2 kW/server for HGX B300 and MI355X, 120 kW/rack for GB200 and MI455X, and 142 kW/rack for GB300 and MI500X. These are workbook-supplied planning inputs, not independently verified OEM specifications. The engine uses server/rack values directly, adds the app's ancillary allowance and PUE, and checks facility/rack budgets. OEM inputs override these values. MI500X remains unsized because its GPU count is unconfirmed. GPU-only ratings in older catalogs still cannot substitute for full-server power. Results and exports preserve the power basis.

Missing full-unit power and rack specifications stay `null` and display as Unconfirmed, including when a customer constraint cannot yet be checked. Candidates always require engineering review. The app's existing planning assumptions remain explicit: 40U usable space, 15% ancillary IT overhead and PUE 1.20. These are not workbook specifications. Compute racks exclude dedicated network/storage racks. Full-rack power should cover the integrated rack equipment; the ancillary allowance covers additional IT outside that unit.

## Development

Use Node.js 22.x and npm. Install the locked dependencies with `npm ci`.

- `npm run dev`: local development at http://127.0.0.1:5173 (the existing local URL).
- `npm test`: run the sizing and catalog regression tests.
- `npm run build`: create the Next.js production build in `.next`.
- `npm start`: serve the production build at http://localhost:3000. Use `npm start -- --hostname 127.0.0.1 --port 5173` to use the development URL.

The `/` route is defined in `src/app/page.jsx`. `src/app/layout.jsx` supplies the document metadata and shared CSS. `src/InfrastructureAdvisor.jsx` is the client component containing the existing three-step wizard; steps stay on `/` and retain their input-validation and reset behavior. JSON exports use browser APIs only when the user clicks Export plan. The catalog and sizing engine are shared JavaScript modules. No API server or backend endpoints are required.

### Environment variables

No environment variables or secrets are required. The bundled catalog is intentionally public client data. The existing stylesheet loads DM Sans and Manrope from Google Fonts at runtime; system sans-serif fonts are the fallback when those requests are unavailable. There are no other external API integrations.

For future integrations, keep credentials in server-only environment variables and access them only from server components or route handlers. Only values intended for everyone visiting the app should use `NEXT_PUBLIC_`. Local `.env*` files are ignored by Git (except an optional `.env.example`).

### Vercel deployment

Import this repository into Vercel and select the **Next.js** framework preset with the repository root as the Root Directory and **Node.js 22.x**. Set the Install Command to `npm ci` to reproduce the lockfile, and use `npm run build` as the Build Command. Leave Output Directory at the framework default: remove any previous `dist` override or Vite build command from the Vercel project settings. Do not configure a static export or SPA rewrite; Vercel handles the App Router directly. No environment variables are needed.

There is no repository-level `vercel.json` or `.vercel` project configuration. Existing settings in the Vercel dashboard must be reviewed separately. To validate before deployment, run `npm ci`, `npm test`, `npm run build`, and `npm start`.

`src/catalog.js` imports the example JSON directly, so changes to the catalog feed the app. `catalog.schema.json` defines the normalized format. `source-table.json` preserves the extracted source cells for traceability; `node scripts/import-table.mjs` rebuilds the catalog from that snapshot. For a replacement workbook, refresh the snapshot and review the explicit unit/network mappings in the importer. `node scripts/catalog-schema.mjs` regenerates the schema.

JSON exports include inputs, source, assumptions, candidates, exclusions, roadmap entries and outstanding checks. Navigation validates prerequisite steps; changing inputs invalidates the completed plan.

Final configurations now require calculable full-unit and facility power. Platforms lacking full-unit ratings are returned in `incomplete`, displayed under Needs power specifications, and excluded from the matching count. A supplied rack-count limit also requires calculable packing. Known power demand is checked against the facility budget and rack power limit; results/export include power status, headroom and maximum compute-rack draw. No budget means budget-not-provided, never within-budget. GPU-only ratings remain informational because they do not establish full-system demand.

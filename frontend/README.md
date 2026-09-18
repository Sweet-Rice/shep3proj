# Traceback frontend — Student B

React, TypeScript, and Vite investigation workspace for B1–B3. Shows incident summaries, a UTC event timeline, an interactive relationship graph, and raw evidence. The API contract and synthetic response fixture are maintained by Student A.

## Run locally

Use Node.js 22.12+ within version 22, or Node.js 24+, with npm 11.6.2 or newer. Node 23 is unsupported by the test runner, and npm 11.3 can crash while resolving its optional peers. From this directory:

```bash
npm ci
npm run dev
```

Open http://localhost:5173. The port is strict because the existing backend permits this origin. Start the backend separately using [its instructions](../backend/README.md).

The app defaults to **API** mode and requests the bundled compromise sample. If the backend is unavailable, choose **Use demo data** or **Demo** to load the shared synthetic fixture without API access. Fallback is explicit; it never substitutes demo data automatically. A persistent banner identifies demo results. Switching modes cancels pending work and replaces the previous analysis.

To configure another backend, copy `.env.example` to `.env.local`, set `VITE_API_BASE_URL`, and restart Vite. It defaults to `http://localhost:8000`. Vite embeds this URL at build time; it is not a secret. Alternate frontend origins require coordination with Student A for CORS.

```bash
npm run build
npm run preview
```

The static build is in `dist/`. Preview also uses port 5173; stop the development server first. Student C owns deployment, Docker, CI, and root integration infrastructure.

## Analyze and investigate

1. In API mode, use **Analyze sample**, or choose a synthetic JSON file and click **Analyze upload**.
2. Uploads accept a JSON array of source-specific/normalized record objects, or an object containing only `records`. Empty arrays are valid. The client sends `{ "records": [...] }` to `POST /api/analyze`, not multipart data. Raw logs, CSV, and completed analysis-response files are not upload formats.
3. The first incident is selected initially. Use **Investigation scope** to switch incidents or view **All events**. Counts and entity groups come from the response.
4. Select a timeline event to read normalized fields, raw evidence, and metadata. Times are UTC; event severity is a numeric 1–5 value, distinct from incident severity.
5. Pan/zoom the graph or use its fit-view control. Click a node or connection, or focus it and press Enter/Space, to inspect evidence. Event selection highlights supporting edges; selecting a node or edge highlights its timeline evidence. Following evidence outside the current incident reveals All events.

Demo mode uses the bundled sample only; uploads require API mode. Data is held in memory and is not saved to browser storage. Cancellation and mode switching ignore late responses. Invalid analysis responses are rejected in full with an error and retry action.

## Contract and implementation boundaries

- `../docs/api-contract.json` is the canonical schema bundle. There is no separate `analysis.json` in this checkout.
- `../docs/sample-analysis.json` is imported directly for demo mode and tests; no fixture copy needs manual synchronization.
- `src/api/generated.ts` is generated from the nested analysis response schema. Preserve its optional fields and uppercase `LOW`/`MEDIUM`/`HIGH` values.
- The injectable `AnalysisClient.analyze(request, signal)` returns a validated `AnalysisResponse`. Its request union enforces exactly one of `sample_id` and `records`; the exported JSON Schema does not encode that backend model validator.
- Validation also checks unique IDs, timestamps, and evidence references. Schema-permitted missing optional values are supported, including the documented default event severity of 1.
- Graph nodes come from relationship endpoints; edges keep backend IDs and direction. In particular, `preceded_by` currently points from the earlier stage to the later one. Details expose the supplied type and explanation without reversing it.
- Incident graph scope is based on overlapping supporting event IDs, since relationships have no incident-ID field. All events includes every relationship, including those without supplied evidence IDs.
- Endpoint IDs remain opaque; splitting the first colon only preserves IPv6 and stage identifiers. Unknown endpoint kinds use a generic node. Parallel relationships remain separate selectable paths.

After an intentional Student A contract update:

```bash
npm run types:generate
npm run types:check
```

Generation only changes frontend types. `types:check` compares in memory and never rewrites files. Backend schema export remains Student A's task.

## Verification

```bash
npm run types:check
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Vitest, React Testing Library, and MSW cover schema validation, API payloads/errors, cancellation, stale responses, scope, sorting, and evidence details. Playwright runs the real graph and upload UI at desktop (1440px) and mobile (390px) widths, with synthetic API interception. Playwright starts its own Vite instance, so port 5173 must be free. Failure traces and layout screenshots are written to ignored `test-results/`.

For the live API check, start the existing backend on port 8000 in another terminal, then run:

```bash
npm run test:live
```

This test uses no mocked routes. It verifies sample analysis and uploads `../backend/app/samples/compromise.json`, expecting eight events, one HIGH incident, and 15 relationships. Set `LIVE_API_BASE_URL` when the backend uses a different address; the browser must be able to reach it and its CORS rules must allow port 5173.

See the repository coordination log for exact verification results. Trello movement and deployment are separate from these local checks.

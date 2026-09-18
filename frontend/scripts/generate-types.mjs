import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { compile } from 'json-schema-to-typescript';

const contract = JSON.parse(await readFile(new URL('../../docs/api-contract.json', import.meta.url), 'utf8'));
const output = new URL('../src/api/generated.ts', import.meta.url);
const source = await compile(contract.endpoints['POST /api/analyze'].response_schema, 'AnalysisResponse', {
  bannerComment: '/* Generated from docs/api-contract.json. Run npm run types:generate; do not edit. */',
  unknownAny: true,
});
if (process.argv.includes('--check')) {
  const current = await readFile(output, 'utf8').catch(() => '');
  if (current !== source) {
    console.error('Contract types are stale. Run npm run types:generate.');
    process.exitCode = 1;
  } else {
    console.log('Contract types match docs/api-contract.json.');
  }
} else {
  await mkdir(new URL('../src/api/', import.meta.url), { recursive: true });
  await writeFile(output, source);
}

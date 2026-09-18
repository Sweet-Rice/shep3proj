import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import contract from '../../../docs/api-contract.json';
import type { AnalysisResponse } from './generated';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile<AnalysisResponse>(contract.endpoints['POST /api/analyze'].response_schema);

export class InvalidAnalysisError extends Error {
  constructor(detail: string) {
    super(`Invalid analysis data: ${detail}`);
    this.name = 'InvalidAnalysisError';
  }
}

export function parseAnalysis(value: unknown): AnalysisResponse {
  if (!validate(value)) {
    const first = validate.errors?.[0];
    throw new InvalidAnalysisError(`${first?.instancePath || '/'} ${first?.message || 'does not match the contract'}`);
  }
  for (const [name, records] of [
    ['event', value.events], ['incident', value.incidents], ['relationship', value.relationships],
  ] as const) {
    if (new Set(records.map((record) => record.id)).size !== records.length) {
      throw new InvalidAnalysisError(`duplicate ${name} IDs`);
    }
  }
  const eventIds = new Set(value.events.map((event) => event.id));
  const incidentIds = new Set(value.incidents.map((incident) => incident.id));
  for (const event of value.events) {
    if (!Number.isFinite(Date.parse(event.timestamp))) {
      throw new InvalidAnalysisError(`event ${event.id} has an invalid timestamp`);
    }
  }
  for (const record of [...value.incidents, ...value.relationships]) {
    for (const id of record.event_ids ?? []) {
      if (!eventIds.has(id)) throw new InvalidAnalysisError(`${record.id} references missing event ${id}`);
    }
  }
  for (const relationship of value.relationships) {
    for (const endpoint of [relationship.source, relationship.target]) {
      if (endpoint.startsWith('event:') && !eventIds.has(endpoint.slice(6))) {
        throw new InvalidAnalysisError(`${relationship.id} references missing ${endpoint}`);
      }
      if (endpoint.startsWith('incident:') && !incidentIds.has(endpoint.slice(9))) {
        throw new InvalidAnalysisError(`${relationship.id} references missing ${endpoint}`);
      }
    }
  }
  return value;
}

export function parseUpload(text: string): Record<string, unknown>[] {
  let value: unknown;
  try { value = JSON.parse(text); }
  catch { throw new Error('The file is not valid JSON. Choose a JSON array of synthetic records.'); }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    if (Object.keys(value).length !== 1 || !('records' in value)) {
      throw new Error('Use a record array or an object containing only "records".');
    }
    value = value.records;
  }
  if (!Array.isArray(value) || !value.every((item) => item !== null && typeof item === 'object' && !Array.isArray(item))) {
    throw new Error('Records must be a JSON array of objects.');
  }
  return value;
}

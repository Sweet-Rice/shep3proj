/* Generated from docs/api-contract.json. Run npm run types:generate; do not edit. */

export type Id = string;
export type Timestamp = string;
export type EventSource = "auth" | "process" | "network";
export type EventType = string;
export type User = string | null;
export type SrcIp = string | null;
export type DstIp = string | null;
export type Host = string | null;
export type Process = string | null;
export type BytesOut = number | null;
export type Severity = number;
export type Raw = string;
export type Events = NormalizedEvent[];
export type Id1 = string;
export type Title = string;
export type IncidentSeverity = "LOW" | "MEDIUM" | "HIGH";
export type Score = number;
export type SourceIps = string[];
export type Users = string[];
export type Hosts = string[];
export type Processes = string[];
export type DestinationIps = string[];
export type DetectionStage = "brute_force" | "account_compromise" | "suspicious_execution" | "possible_exfiltration";
export type Stages = DetectionStage[];
export type EventIds = string[];
export type Incidents = Incident[];
export type Id2 = string;
export type Source = string;
export type Target = string;
export type RelationshipType =
  "authenticated_as" | "authenticated_on" | "executed_on" | "connected_to" | "preceded_by" | "correlated_with";
export type Reason = string;
export type EventIds1 = string[];
export type Relationships = Relationship[];

export interface AnalysisResponse {
  events: Events;
  incidents: Incidents;
  relationships: Relationships;
}
/**
 * Common event shape consumed by all deterministic detection rules.
 */
export interface NormalizedEvent {
  id: Id;
  timestamp: Timestamp;
  source: EventSource;
  event_type: EventType;
  user?: User;
  src_ip?: SrcIp;
  dst_ip?: DstIp;
  host?: Host;
  process?: Process;
  bytes_out?: BytesOut;
  severity?: Severity;
  raw: Raw;
  metadata?: Metadata;
}
export interface Metadata {
  [k: string]: unknown;
}
export interface Incident {
  id: Id1;
  title: Title;
  severity: IncidentSeverity;
  score: Score;
  entities: IncidentEntities;
  stages: Stages;
  event_ids: EventIds;
}
export interface IncidentEntities {
  source_ips?: SourceIps;
  users?: Users;
  hosts?: Hosts;
  processes?: Processes;
  destination_ips?: DestinationIps;
}
export interface Relationship {
  id: Id2;
  source: Source;
  target: Target;
  relationship_type: RelationshipType;
  reason: Reason;
  event_ids?: EventIds1;
}

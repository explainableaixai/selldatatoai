export declare const VERSION: string;
export declare const BATCH_MAX: number;

export interface History {
  first_seen_year: number | null;
  years_online: number | null;
  founded_year: number | null;
  pre_ai_years: number | null;
}

export interface DataSystem {
  system: string;
  data_type: string;
  type: string;
}

export interface DataAsset {
  type: string;
  label: string;
}

export type Status = 'active' | 'winding_down_or_acquired' | 'parked' | 'unreachable' | 'error';

export interface ScoreResult {
  domain: string;
  data_asset_score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'E';
  status: Status;
  verified_active: boolean;
  iab_category: string | null;
  country: string | null;
  history: History;
  pre_ai_archive_likely: boolean;
  data_systems: DataSystem[];
  likely_data_assets: DataAsset[];
  strengths: string[];
  data_coverage: 'full' | 'partial' | 'limited';
  in_index: boolean;
  index_size: number;
  checked_at: string;
  cached: boolean;
}

export interface BatchItem {
  input: string;
  domain: string | null;
  status: 'done' | 'pending' | 'invalid_domain' | 'error';
  result?: ScoreResult;
}

export interface Batch {
  id: string;
  status: 'processing' | 'done';
  total: number;
  pending: number;
  poll: string;
  results: BatchItem[];
  lookups_charged?: number;
}

export interface Usage {
  plan: string;
  month: string;
  used: number;
  limit: number;
  remaining: number;
}

export interface WaitOptions {
  interval?: number;
  maxWait?: number;
  onBatch?: (batch: Batch) => void;
}

export declare class SellDataToAIError extends Error {
  status: number;
  code: string | null;
  body: unknown;
}

export declare class DataAssetScoreClient {
  constructor(apiKey: string, options?: { baseUrl?: string; timeout?: number });
  score(domain: string): Promise<ScoreResult>;
  submitBatch(domains: string[]): Promise<Batch>;
  getBatch(id: string): Promise<Batch>;
  waitForBatch(id: string, options?: WaitOptions): Promise<Batch>;
  scoreMany(domains: string[], options?: WaitOptions): Promise<BatchItem[]>;
  usage(): Promise<Usage>;
}

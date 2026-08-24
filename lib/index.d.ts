/**
 * Type declarations for dsh-usage-openrouter.
 */

/** Normalized /api/v1/credits payload. `null` = endpoint unavailable. */
export interface OpenRouterCredits {
  total_credits: number | null;
  total_usage: number | null;
}

/** Normalized /api/v1/auth/key payload. `null` = endpoint unavailable/absent. */
export interface OpenRouterKeyInfo {
  label: string | null;
  is_free_tier: boolean | null;
  usage: number | null;
  usage_daily: number | null;
  usage_weekly: number | null;
  usage_monthly: number | null;
  byok_usage: number | null;
  limit: number | null;
  limit_remaining: number | null;
}

/** Wire shape served to the browser composer readout. */
export interface OpenRouterUsageSnapshot {
  credits: OpenRouterCredits;
  key: OpenRouterKeyInfo;
  warnings: string[];
  fetched_at: string;
}

export declare class OpenRouterUsageGateway {
  constructor(ctx: unknown);
  snapshot(): Promise<OpenRouterUsageSnapshot>;
}

export declare function fetchOpenRouterUsageSnapshot(
  credentials: { resolve(ref: string): Promise<{ value?: string } | undefined> },
): Promise<OpenRouterUsageSnapshot>;
export declare function fetchOpenRouterUsage(
  ctx: { credentials: { resolve(ref: string): Promise<{ value?: string } | undefined> } },
): Promise<{ ok: true; snapshot: OpenRouterUsageSnapshot } | { ok: false; error: string }>;
export declare function formatMoney(value: number): string;
export declare function formatOpenRouterUsage(snapshot: OpenRouterUsageSnapshot): string;

export declare const name: string;
export declare const inject: string[];
export declare const API_KEY_REF: "OPENROUTER_API_KEY";
export declare const ACTIVITY_URL: string;
export declare const CREDITS_URL: string;
export declare const KEYS_URL: string;
export declare const apply: (ctx: unknown) => Promise<void>;

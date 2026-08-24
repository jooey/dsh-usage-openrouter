/**
 * Dependency-free core logic for dsh-usage-openrouter.
 *
 * OpenRouter exposes two account surfaces that together form the provider
 * visible "usage" readout:
 *
 *   GET /api/v1/credits
 *     { data: { total_credits: number, total_usage: number } }
 *     — purchased credits and lifetime spend across ALL keys.
 *
 *   GET /api/v1/auth/key
 *     { data: { label, is_free_tier, usage, usage_daily, usage_weekly,
 *               usage_monthly, byok_usage, limit, limit_remaining } }
 *     — the calling key's own usage meters. `usage*` track spend against the
 *       key limit (they read 0 on unlimited/free-tier keys even when credits
 *       show activity), so lifetime figures come from /credits while the
 *       daily/weekly/monthly windows come from /auth/key.
 *
 * Everything here resolves only against Web/Node platform globals (fetch,
 * AbortSignal), so it can be imported from plain Node tooling and smoke tests
 * without the DSH packages.
 */

/** Official OpenRouter API base URL. */
export const DEFAULT_BASE_URL = "https://openrouter.ai";
/** OpenRouter per-generation activity log (the readout's click target). */
export const ACTIVITY_URL = "https://openrouter.ai/activity";
/** OpenRouter credits page (balance / top-up). */
export const CREDITS_URL = "https://openrouter.ai/credits";
/** OpenRouter API key management page. */
export const KEYS_URL = "https://openrouter.ai/settings/keys";
/** Credential reference resolved through the harness credentials seam. */
export const API_KEY_REF = "OPENROUTER_API_KEY";
/** Hard network ceiling so an unresponsive endpoint cannot hang a turn. */
export const TIMEOUT_MS = 20000;

/**
 * Resolve the OpenRouter API base URL. The official public base URL is the
 * default; `OPENROUTER_BASE_URL` overrides it for gateways/proxies.
 */
export function resolveBaseUrl() {
  const env = globalThis.process?.env?.OPENROUTER_BASE_URL;
  if (typeof env === "string" && env.length > 0) return env.replace(/\/+$/, "");
  return DEFAULT_BASE_URL;
}

function authHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json"
  };
}

/** GET one OpenRouter JSON endpoint; throws a descriptive error on failure. */
async function getJson(path, apiKey) {
  let response;
  try {
    response = await fetch(`${resolveBaseUrl()}${path}`, {
      headers: authHeaders(apiKey),
      // AbortSignal.timeout is available on the Node version dsh runs on.
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
  } catch (error) {
    throw new Error(`OpenRouter API ${path} request failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!response.ok) {
    throw new Error(`OpenRouter API ${path} returned HTTP ${response.status}`);
  }
  try {
    return await response.json();
  } catch (error) {
    throw new Error(`OpenRouter API ${path} returned a non-JSON response: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/** Pass through finite numbers only; everything else becomes null. */
function num(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Normalize the /api/v1/credits payload for the wire. */
export function normalizeCredits(body) {
  const data = body && typeof body === "object" ? body.data : null;
  return {
    total_credits: num(data?.total_credits),
    total_usage: num(data?.total_usage)
  };
}

const EMPTY_KEY_INFO = () => ({
  label: null,
  is_free_tier: null,
  usage: null,
  usage_daily: null,
  usage_weekly: null,
  usage_monthly: null,
  byok_usage: null,
  limit: null,
  limit_remaining: null
});

/** Normalize the /api/v1/auth/key payload for the wire. */
export function normalizeKeyInfo(body) {
  const data = body && typeof body === "object" ? body.data : null;
  if (!data) return EMPTY_KEY_INFO();
  return {
    label: typeof data.label === "string" && data.label.length > 0 ? data.label : null,
    is_free_tier: typeof data.is_free_tier === "boolean" ? data.is_free_tier : null,
    usage: num(data.usage),
    usage_daily: num(data.usage_daily),
    usage_weekly: num(data.usage_weekly),
    usage_monthly: num(data.usage_monthly),
    byok_usage: num(data.byok_usage),
    limit: num(data.limit),
    limit_remaining: num(data.limit_remaining)
  };
}

/** Resolve the OPENROUTER_API_KEY credential or throw with setup guidance. */
async function requireApiKey(credentials) {
  const credential = await credentials.resolve(API_KEY_REF);
  if (!credential || typeof credential.value !== "string" || credential.value.length === 0) {
    throw new Error(`${API_KEY_REF} is not configured. Store it in ~/.dsh/.credentials.yaml or set it as an environment variable.`);
  }
  return credential.value;
}

/**
 * Fetch and normalize both endpoints in parallel. Each endpoint fails
 * independently: as long as one succeeds the snapshot carries what arrived
 * plus `warnings`; only when BOTH fail does this throw.
 */
export async function fetchOpenRouterUsageSnapshot(credentials) {
  const apiKey = await requireApiKey(credentials);
  const [creditsResult, keyResult] = await Promise.allSettled([
    getJson("/api/v1/credits", apiKey),
    getJson("/api/v1/auth/key", apiKey)
  ]);
  const warnings = [];
  let credits = null;
  if (creditsResult.status === "fulfilled") {
    credits = normalizeCredits(creditsResult.value);
  } else {
    warnings.push(creditsResult.reason instanceof Error ? creditsResult.reason.message : String(creditsResult.reason));
  }
  let key = null;
  if (keyResult.status === "fulfilled") {
    key = normalizeKeyInfo(keyResult.value);
  } else {
    warnings.push(keyResult.reason instanceof Error ? keyResult.reason.message : String(keyResult.reason));
  }
  if (!credits && !key) {
    throw new Error(warnings.join("; "));
  }
  return {
    credits: credits ?? { total_credits: null, total_usage: null },
    key: key ?? EMPTY_KEY_INFO(),
    warnings,
    fetched_at: new Date().toISOString()
  };
}

/** `{ ok, snapshot }` / `{ ok: false, error }` wrapper for command handlers. */
export async function fetchOpenRouterUsage(ctx) {
  try {
    return { ok: true, snapshot: await fetchOpenRouterUsageSnapshot(ctx.credentials) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/** Format a dollar amount; keeps up to 4 decimals under $100, sign outside $. */
export function formatMoney(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "n/a";
  const abs = Math.abs(value);
  const body = abs >= 100 ? abs.toFixed(2) : String(parseFloat(abs.toFixed(4)));
  return `${value < 0 ? "-" : ""}$${body}`;
}

/** Render the normalized snapshot as text for the /usage-openrouter command. */
export function formatOpenRouterUsage(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return "No usage data returned.";
  const lines = [];
  const credits = snapshot.credits ?? {};
  const key = snapshot.key ?? {};

  const meta = [];
  if (key.label) meta.push(key.label);
  if (key.is_free_tier === true) meta.push("free tier");
  lines.push(`Key: ${meta.length > 0 ? meta.join(" · ") : "(unlabeled)"}`);

  const usageParts = [];
  if (credits.total_usage !== null) usageParts.push(`lifetime used ${formatMoney(credits.total_usage)} (all keys)`);
  if (key.usage !== null) usageParts.push(`this key ${formatMoney(key.usage)}`);
  lines.push(usageParts.length > 0 ? `Usage: ${usageParts.join(" · ")}` : "Usage: n/a");

  const windows = [];
  if (key.usage_daily !== null) windows.push(`today ${formatMoney(key.usage_daily)}`);
  if (key.usage_weekly !== null) windows.push(`week ${formatMoney(key.usage_weekly)}`);
  if (key.usage_monthly !== null) windows.push(`month ${formatMoney(key.usage_monthly)}`);
  if (windows.length > 0) lines.push(`Windows: ${windows.join(" · ")}`);

  if (key.byok_usage !== null && key.byok_usage !== 0) lines.push(`BYOK usage: ${formatMoney(key.byok_usage)}`);

  if (key.limit !== null) {
    const left = key.limit_remaining !== null ? ` · remaining ${formatMoney(key.limit_remaining)}` : "";
    lines.push(`Key limit: ${formatMoney(key.limit)}${left}`);
  } else {
    lines.push("Key limit: none");
  }

  if (credits.total_credits !== null) {
    if (credits.total_credits > 0) {
      const remaining = credits.total_credits - (credits.total_usage ?? 0);
      lines.push(`Credits: purchased ${formatMoney(credits.total_credits)} · remaining ${formatMoney(remaining)}`);
    } else {
      lines.push("Credits purchased: none (free-tier / BYOK account)");
    }
  }

  if (Array.isArray(snapshot.warnings) && snapshot.warnings.length > 0) {
    lines.push(`Warnings: ${snapshot.warnings.join("; ")}`);
  }
  return lines.join("\n");
}

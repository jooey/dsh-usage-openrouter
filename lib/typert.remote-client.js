/* Client-face Typert remote manifest for dsh-usage-openrouter (hand-written).
   The schema is a minimal strict codec: the host already zod-validated its
   result, so the client only enforces the strict codec contract shape. */
const openrouterUsageSnapshotResult$schema = {
  parse(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("expected an openrouter usage snapshot object");
    }
    const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    const credits = value.credits && typeof value.credits === "object" ? value.credits : {};
    const key = value.key && typeof value.key === "object" ? value.key : {};
    return {
      credits: {
        total_credits: num(credits.total_credits),
        total_usage: num(credits.total_usage)
      },
      key: {
        label: typeof key.label === "string" ? key.label : null,
        is_free_tier: typeof key.is_free_tier === "boolean" ? key.is_free_tier : null,
        usage: num(key.usage),
        usage_daily: num(key.usage_daily),
        usage_weekly: num(key.usage_weekly),
        usage_monthly: num(key.usage_monthly),
        byok_usage: num(key.byok_usage),
        limit: num(key.limit),
        limit_remaining: num(key.limit_remaining)
      },
      warnings: Array.isArray(value.warnings) ? value.warnings.filter((w) => typeof w === "string") : [],
      fetched_at: typeof value.fetched_at === "string" ? value.fetched_at : null
    };
  }
};

export const TYPERT_REMOTE = {
  package: "dsh-usage-openrouter",
  descriptors: [
    {
      id: "dsh-usage-openrouter#openrouterUsage/snapshot",
      service: "openrouterUsage",
      namespace: "openrouterUsage",
      method: "snapshot",
      invocation: { kind: "direct" },
      parameters: [],
      result: {
        mode: "strict",
        typeSymbol: "dsh-usage-openrouter/types#OpenRouterUsageSnapshot",
        schema: openrouterUsageSnapshotResult$schema
      },
      sourceLocation: { file: "lib/index.js", line: 1, column: 1 }
    }
  ]
};

export default TYPERT_REMOTE;

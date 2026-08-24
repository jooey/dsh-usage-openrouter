/* Host-face Typert manifest for dsh-usage-openrouter (hand-written). */
import z from "zod";

const openrouterUsageSnapshotResult$schema = z.object({
  credits: z.object({
    total_credits: z.number().nullable(),
    total_usage: z.number().nullable()
  }),
  key: z.object({
    label: z.string().nullable(),
    is_free_tier: z.boolean().nullable(),
    usage: z.number().nullable(),
    usage_daily: z.number().nullable(),
    usage_weekly: z.number().nullable(),
    usage_monthly: z.number().nullable(),
    byok_usage: z.number().nullable(),
    limit: z.number().nullable(),
    limit_remaining: z.number().nullable()
  }),
  warnings: z.array(z.string()),
  fetched_at: z.string()
});

export const TYPERT = {
  package: "dsh-usage-openrouter",
  face: "host",
  schemas: [],
  invocations: [
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
  ],
  model: {
    services: [],
    events: [],
    objects: []
  }
};

export default TYPERT;

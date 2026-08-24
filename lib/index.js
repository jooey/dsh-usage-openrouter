/**
 * dsh-usage-openrouter
 *
 * Human-facing `/usage-openrouter` command for the OpenRouter account, plus a
 * browser composer readout (bottom-right tool row) fed by a Typert remote
 * service.
 *
 * The OPENROUTER_API_KEY credential is resolved through the harness credentials
 * seam on the HOST (kept server-side; never inlined into the browser), the
 * official usage APIs `GET https://openrouter.ai/api/v1/credits` and
 * `GET https://openrouter.ai/api/v1/auth/key` are queried, and the lifetime /
 * windowed spend plus credit balance are rendered inline. The composer readout
 * only renders while the selected model provider is `openrouter`.
 */

import { TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import {
  ACTIVITY_URL,
  API_KEY_REF,
  CREDITS_URL,
  KEYS_URL,
  fetchOpenRouterUsage,
  fetchOpenRouterUsageSnapshot,
  formatMoney,
  formatOpenRouterUsage
} from "./logic.js";

const name = "dsh-usage-openrouter";
const inject = ["commands", "credentials"];

/**
 * Host-side remote service exposing the latest usage snapshot to the browser.
 *
 * Mounted as a Typert remote service; the `./typert` manifest registers the
 * `openrouterUsage/snapshot` endpoint, and the client mounts it via `ctx.remote`.
 */
class OpenRouterUsageGateway extends TypertRemoteService {
  static inject = ["credentials"];

  constructor(ctx) {
    super(ctx, "openrouterUsage");
  }

  /** Latest normalized usage snapshot; throws on credential/network/API failure. */
  async snapshot() {
    return fetchOpenRouterUsageSnapshot(this.ctx.credentials);
  }
}

/** Register the `/usage-openrouter` command and mount the browser remote gateway. */
async function apply(ctx) {
  await ctx.plugin(OpenRouterUsageGateway);
  ctx.commands.register({
    name: "usage-openrouter",
    description: "Show OpenRouter account usage",
    handler: async () => {
      try {
        const result = await fetchOpenRouterUsage(ctx);
        if (!result.ok) return { kind: "error", text: `OpenRouter usage: ${result.error}` };
        return { kind: "success", text: `OpenRouter (openrouter) usage\n\n${formatOpenRouterUsage(result.snapshot)}\n\nActivity log: ${ACTIVITY_URL}\nCredits: ${CREDITS_URL}\nAPI keys: ${KEYS_URL}` };
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        return { kind: "error", text: `OpenRouter usage failed: ${detail}` };
      }
    }
  });
}

// fetchOpenRouterUsage / formatOpenRouterUsage / fetchOpenRouterUsageSnapshot
// are re-exported for standalone smoke tests; the loader only consumes the
// Cordis plugin contract ({ name, inject, apply }).
export { apply, inject, name, fetchOpenRouterUsage, formatMoney, formatOpenRouterUsage, fetchOpenRouterUsageSnapshot, OpenRouterUsageGateway, API_KEY_REF, ACTIVITY_URL };

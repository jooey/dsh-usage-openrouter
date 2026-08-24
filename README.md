# dsh-usage-openrouter

DSH usage plugin for [OpenRouter](https://openrouter.ai) — a sibling of
`dsh-usage-deepseek` / `dsh-usage-opencode-go` / `dsh-usage-minimax-cn`.

- **`/usage-openrouter` command** — lifetime spend (credits API), this key's
  daily/weekly/monthly meters, BYOK usage, key limit, and remaining credit
  balance.
- **Composer readout** — a compact chip in the bottom-right tool row that only
  renders while the selected model provider is `openrouter`, refreshed every
  60 s:
  - prepaid accounts → `Balance $x · Used $y`
  - key with a hard limit → `Left $x · Used $y`
  - otherwise → `Used $y`
  Clicking opens the [activity log](https://openrouter.ai/activity).

## Data sources

| Endpoint | Used for |
| --- | --- |
| `GET https://openrouter.ai/api/v1/credits` | `total_credits`, `total_usage` (lifetime, all keys) |
| `GET https://openrouter.ai/api/v1/auth/key` | key label, free-tier flag, `usage` / `usage_daily` / `usage_weekly` / `usage_monthly`, `byok_usage`, `limit`, `limit_remaining` |

The two endpoints fail independently: the readout shows whatever arrived plus
warnings; it errors only when both fail.

## Credential

`OPENROUTER_API_KEY` — resolved through the harness credentials seam
(`~/.dsh/.credentials.yaml`) on the HOST; the key never reaches the browser.
`OPENROUTER_BASE_URL` overrides the API base for gateways/proxies.

## Install

```sh
# from npm
dsh plugin --profile web add dsh-usage-openrouter

# or from a local checkout / tarball
dsh plugin --profile web add /path/to/dsh-usage-openrouter
dsh plugin --profile web add ./dsh-usage-openrouter-1.0.0.tgz

# then mount the Cordis contract in ~/.dsh/profiles/web/cordis.patch.yml
- insert:
    - id: usage-openrouter
      name: dsh-usage-openrouter

# and restart the profile
```

## Layout

| File | Role |
| --- | --- |
| `lib/logic.js` | dependency-free fetch + format core (Node-testable) |
| `lib/index.js` | host plugin: `/usage-openrouter` command + Typert gateway |
| `lib/client.js` | browser composer chip (`conversation.input.right`) |
| `lib/typert.host.js` | host Typert manifest (zod) |
| `lib/typert.remote-client.js` | client Typert manifest (strict codec) |

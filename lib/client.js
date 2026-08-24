window.__ModuleLoader__.load({
id: "dsh-usage-openrouter",
factory: (require) => {
var module = { exports: {} };
var exports = module.exports;
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

let React = require("react");

/* Client-face Typert remote manifest (hand-written, no build step). */
const openrouterUsageSnapshotResult$schema = {
parse(value) {
if (!value || typeof value !== "object" || Array.isArray(value)) {
throw new TypeError("expected an openrouter usage snapshot object");
}
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const credits = value.credits && typeof value.credits === "object" ? value.credits : {};
const key = value.key && typeof value.key === "object" ? value.key : {};
return {
credits: { total_credits: num(credits.total_credits), total_usage: num(credits.total_usage) },
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

/** OpenRouter activity log (kept in sync with lib/logic.js). */
const ACTIVITY_URL = "https://openrouter.ai/activity";
/** Provider id registered by the llm-pi-ai OpenRouter provider row. */
const OPENROUTER_PROVIDER = "openrouter";

const TYPERT_REMOTE = {
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

/** Format one dollar amount for the compact composer readout. */
function formatMoney(value) {
if (typeof value !== "number" || !Number.isFinite(value)) return "n/a";
const body = Math.abs(value) >= 100
? Math.abs(value).toFixed(2)
: String(parseFloat(Math.abs(value).toFixed(4)));
return (value < 0 ? "-$" : "$") + body;
}

/** Small orbit glyph drawn inline so it follows the active theme. */
function OrbitIcon(props) {
return React.createElement("svg", Object.assign({
width: 14,
height: 14,
viewBox: "0 0 24 24",
"aria-hidden": true,
focusable: false,
fill: "none"
}, props), [
React.createElement("circle", {
key: "ring",
cx: 12,
cy: 12,
r: 7.5,
stroke: "currentColor",
strokeWidth: 2.2
}),
React.createElement("circle", {
key: "satellite",
cx: 18,
cy: 6,
r: 2.8,
fill: "currentColor"
})
]);
}

/** Upper bound for the chip at wide row widths (matches the sibling chips). */
const CHIP_MAX_WIDTH = 320;
/** Below this measured width the text is useless — keep the icon only. */
const CHIP_TEXT_MIN_WIDTH = 80;

/**
 * Fit the chip to the space the composer row actually leaves over.
 * Same measurement approach as the sibling usage chips: cap at the row's
 * leftover width so the chip shrinks smoothly and never overlaps.
 */
function fitChipWidth(chip, onCap) {
  const slotWrapper = chip.closest("[data-slot]");
  const trailing = slotWrapper ? slotWrapper.parentElement : null;
  const row = trailing ? trailing.parentElement : null;
  if (!trailing || !row) return null;
  const tools = row.firstElementChild !== trailing ? row.firstElementChild : null;

  const fit = () => {
    if (!chip.isConnected) return;
    const cs = getComputedStyle(row);
    const inner = row.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
    const gap = parseFloat(cs.gap) || 0;
    const toolsWidth = tools ? tools.scrollWidth : 0;
    const othersWidth = trailing.scrollWidth - chip.offsetWidth;
    const target = inner - gap - toolsWidth - othersWidth;
    onCap(Math.max(0, Math.min(CHIP_MAX_WIDTH, target)));
  };

  fit();
  const observer = new ResizeObserver(fit);
  observer.observe(row);
  observer.observe(trailing);
  return () => observer.disconnect();
}

/** Compact one-line summary; prefers credits balance, then key limit, then usage. */
function chipSummary(data) {
  const credits = data && data.credits;
  if (credits && typeof credits.total_credits === "number" && credits.total_credits > 0) {
    const used = typeof credits.total_usage === "number" ? credits.total_usage : 0;
    return "Balance " + formatMoney(credits.total_credits - used) + " · Used " + formatMoney(used);
  }
  const key = data && data.key;
  if (key && typeof key.limit === "number" && typeof key.limit_remaining === "number") {
    return "Left " + formatMoney(key.limit_remaining) + " · Used " + formatMoney(key.usage);
  }
  const used = credits && typeof credits.total_usage === "number" ? credits.total_usage
    : key && typeof key.usage === "number" ? key.usage : null;
  return used === null ? "Usage n/a" : "Used " + formatMoney(used);
}

/** Longer hover tooltip with every meter the snapshot carries. */
function chipTitle(data) {
  if (!data) return "OpenRouter usage unavailable · open activity log";
  const parts = [];
  const credits = data.credits || {};
  const key = data.key || {};
  if (typeof credits.total_usage === "number") parts.push("lifetime used " + formatMoney(credits.total_usage));
  if (typeof key.usage_daily === "number") parts.push("today " + formatMoney(key.usage_daily));
  if (typeof key.usage_weekly === "number") parts.push("week " + formatMoney(key.usage_weekly));
  if (typeof key.usage_monthly === "number") parts.push("month " + formatMoney(key.usage_monthly));
  if (typeof credits.total_credits === "number" && credits.total_credits > 0) {
    parts.push("credits left " + formatMoney(credits.total_credits - (credits.total_usage || 0)));
  }
  return "OpenRouter usage (" + parts.join(", ") + ") · open activity log";
}

/** Outer gate: never mount the hook-using chip unless a model directory store is available. */
function OpenRouterUsageChip(props) {
if (!props.directory) return null;
return React.createElement(OpenRouterSpendChip, props);
}

/**
 * Composer bottom-right readout. Mounts only while the session's selected
 * provider is `openrouter`; any other provider renders null so the readout
 * disappears. While visible it shows:
 *   [orbit] Used $0.10            (free-tier / unlimited-key accounts)
 *   [orbit] Balance $x · Used $y  (prepaid credit balance)
 *   [orbit] Left $x · Used $y     (key with a hard limit)
 * refreshed every 60 seconds, and links to the OpenRouter activity log.
 */
function OpenRouterSpendChip(props) {
const directory = props.directory;
const snapshot = props.snapshot;

const state = React.useSyncExternalStore(
(fn) => directory.subscribe(fn),
() => directory.getSnapshot()
);
const isOpenRouter = !!(state && state.current && state.current.provider === OPENROUTER_PROVIDER);

const [data, setData] = React.useState(null);
const [failed, setFailed] = React.useState(false);
const chipRef = React.useRef(null);
const [chipCap, setChipCap] = React.useState(CHIP_MAX_WIDTH);

// Measure the row once the chip mounts and re-fit on every layout change.
React.useLayoutEffect(() => {
  if (!isOpenRouter) return;
  const chip = chipRef.current;
  if (!chip) return;
  return fitChipWidth(chip, setChipCap);
}, [isOpenRouter]);

React.useEffect(() => {
if (!isOpenRouter) return;
let alive = true;
const load = async () => {
try {
const result = await snapshot();
if (!alive) return;
if (result && result.ok) {
setData(result.value);
setFailed(false);
} else {
setData(null);
setFailed(true);
}
} catch {
if (alive) {
setData(null);
setFailed(true);
}
}
};
load();
const timer = setInterval(load, 60000);
return () => {
alive = false;
clearInterval(timer);
};
}, [snapshot, isOpenRouter]);

if (!isOpenRouter) return null;

const loaded = data !== null;
const text = loaded && !failed ? chipSummary(data) : (failed ? "Usage n/a" : "Usage …");

return React.createElement(
"a",
{
ref: chipRef,
href: ACTIVITY_URL,
target: "_blank",
rel: "noreferrer noopener",
title: failed ? "OpenRouter usage unavailable" : chipTitle(data),
style: {
display: "inline-flex",
alignItems: "center",
gap: "6px",
height: "100%",
fontSize: "12px",
fontWeight: 500,
lineHeight: 1,
color: "var(--dsw-alias-label-tertiary)",
textDecoration: "none",
cursor: "pointer",
whiteSpace: "nowrap",
minWidth: "0",
maxWidth: chipCap + "px",
overflow: "hidden"
}
},
React.createElement(OrbitIcon, {
style: { flex: "none", color: failed ? "var(--dsw-alias-status-danger, currentColor)" : "inherit" }
}),
React.createElement("span", {
key: "text",
style: {
  display: chipCap < CHIP_TEXT_MIN_WIDTH ? "none" : "inline-flex",
  alignItems: "center",
  minWidth: "0",
  overflow: "hidden",
  whiteSpace: "nowrap"
}
},
React.createElement("span", {
  key: "summary",
  style: { whiteSpace: "nowrap", opacity: loaded && !failed ? 1 : 0.6 }
}, text))
);
}

/**
 * Client body: mount the remote capability, then register the composer readout
 * through a scoped injection that exposes the session's model directory so the
 * chip can subscribe to the currently selected provider and hide itself for
 * non-OpenRouter models.
 */
async function apply(ctx) {
await ctx.remote.$mount(TYPERT_REMOTE);
// ctx.get() reads the mounted namespace service without requiring a declared
// inject edge, which would deadlock a self-mounting plugin.
const openrouterUsage = ctx.get("remote.openrouterUsage");

ctx.slots.inject("conversation.input.right", () => ctx.slots.register({
name: "conversation.input.right",
id: "openrouter-usage",
order: 0,
inject: (sessionId) => {
let directory = null;
try {
directory = ctx.modelDirectories.directoryFor(sessionId).store;
} catch {
directory = null;
}
return {
directory,
snapshot: () => openrouterUsage.snapshot()
};
}
}, OpenRouterUsageChip));
}

const inject = ["slots", "remote", "modelDirectories"];

exports.apply = apply;
exports.inject = inject;
return module.exports;
}
});

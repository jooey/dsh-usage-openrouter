// Standalone smoke test for the dsh-usage-openrouter client icon.
// Runs WITHOUT DSH and WITHOUT npm deps: stubs window.__ModuleLoader__, loads
// lib/client.js through a fake require with a minimal React shim, renders
// OpenRouterIcon with a tiny serializer, and asserts the official brand glyph,
// the light/dark theme-fill CSS, and the failure coloring.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url)); // .../dsh-usage-openrouter/test
const pluginDir = dirname(here); // .../dsh-usage-openrouter

let failures = 0;
function check(label, ok) {
  console.log((ok ? "  ok  " : " FAIL ") + label);
  if (!ok) failures += 1;
}

// ---- minimal React shim: createElement builds plain element objects ----
const ReactShim = {
  createElement(type, props, ...children) {
    return { type, props: props || {}, children: children.flat() };
  }
};

// ---- tiny serializer for the element tree (strings, arrays, components) ----
function styleToString(style) {
  return Object.entries(style)
    .map(([k, v]) => `${k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}:${v}`)
    .join(";");
}
function render(node) {
  if (node === null || node === undefined || node === false || node === true) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(render).join("");
  if (typeof node.type === "function") return render(node.type(node.props));
  const attrs = Object.entries(node.props)
    .filter(([k, v]) => k !== "children" && v !== undefined && v !== null && v !== false)
    .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${String(v).replace(/"/g, "'")}"`))
    .join("");
  const style = node.props.style
    ? ` style="${styleToString(node.props.style).replace(/"/g, "'")}"`
    : "";
  const inner = render(node.children);
  return `<${node.type}${attrs}${style}>${inner}</${node.type}>`;
}

// ---- load lib/client.js the way the browser module loader does ----
const source = readFileSync(join(pluginDir, "lib", "client.js"), "utf8");
let definition = null;
const fakeWindow = { __ModuleLoader__: { load(def) { definition = def; } } };
new Function("window", source)(fakeWindow);

check("module registers with window.__ModuleLoader__", definition !== null);
check("module id is dsh-usage-openrouter", definition?.id === "dsh-usage-openrouter");

const exports = definition.factory((id) => {
  if (id === "react") return ReactShim;
  throw new Error("unexpected require: " + id);
});

check("factory exports apply()", typeof exports.apply === "function");
check("factory exports inject list", Array.isArray(exports.inject) && exports.inject.length >= 3);
check("factory exports OpenRouterIcon", typeof exports.OpenRouterIcon === "function");

// ---- render the icon and assert the brand glyph wiring ----
const html = render({ type: exports.OpenRouterIcon, props: {}, children: [] });
console.log("\nrendered:\n  " + html + "\n");

check("svg viewBox is the official glyph box", html.includes('viewBox="0 0 401.4 293.7"'));
check("carries the official OpenRouter glyph path", html.includes('d="M303.9475,17.19926c42.79734'));
check("light-theme fill is brand purple #7624F4", html.includes("fill:#7624F4"));
check("dark-theme fill is brand lime #C8FF00", html.includes("fill:#C8FF00"));
check(
  "dark fill keys off the DSW dark-theme body selector",
  html.includes("body[data-ds-dark-theme] .dsh-usage-openrouter-glyph")
);
check("glyph is inline — no network URL inside the svg", !/https?:\/\//.test(html));
check("no stale OrbitIcon circles remain", !html.includes("<circle"));

// ---- failure state colors the glyph with the danger token ----
const failedHtml = render({ type: exports.OpenRouterIcon, props: { failed: true }, children: [] });
check(
  "failed state overrides fill with the danger token",
  failedHtml.includes("fill:var(--dsw-alias-status-danger")
);
check("failed flag never leaks onto the DOM svg element", !failedHtml.includes('failed="'));

console.log(
  failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED.`
);
process.exit(failures === 0 ? 0 : 1);

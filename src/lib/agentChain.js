/**
 * Build a context-aware prompt for an agent in a chain.
 * Previous agents' outputs are included as context.
 */
export function buildChainedPrompt(agentId, task, previousOutputs = []) {
  if (!previousOutputs.length) return task;

  const contextLines = previousOutputs.map(p =>
    `${p.agentName} completed: ${p.output?.slice(0, 300)}`
  ).join("\n\n");

  return `Previous agents have completed the following work:\n\n${contextLines}\n\nBased on this context, your task is: ${task}`;
}

const URL_RE = /\bhttps?:\/\/[^\s<>"')]+/i;

// Agents that act directly on the connected site/brand and benefit from having
// the URL injected into their task (so real audits target the right page).
const SITE_TARGETING = ["seo", "geo", "webdev"];

/**
 * Inject the connected project's context into an agent's task.
 *
 * - For site-targeting agents (SEO / GEO / Website Dev), if the task doesn't
 *   already name a URL, the connected site's URL is added so the real audit
 *   runs against the user's own site.
 * - Every agent gets a one-line "[Connected project: …]" header so its output
 *   stays on-brand.
 *
 * Pure + null-safe: with no connected site it returns the task unchanged.
 */
export function applySiteContext(agentId, task, site) {
  if (!site || !site.url) return task;
  const url = String(site.url).trim();
  const brand = (site.brand || "").trim();
  const label = brand ? `${brand} (${url})` : url;

  let t = (task || "").trim();
  if (SITE_TARGETING.includes(agentId) && !URL_RE.test(t)) {
    t = t ? `${t} — target site: ${url}` : `Audit ${url}`;
  }
  return `[Connected project: ${label}]\n${t}`;
}

/**
 * Extract key findings from an agent's output for the chain context.
 * Returns a condensed summary suitable for passing to the next agent.
 */
export function extractChainContext(output = "") {
  // Take first 300 chars or up to the 3rd bullet point
  const lines = output.split("\n").filter(l => l.trim());
  const bullets = lines.filter(l => l.match(/^[•\-\*\d]/));
  if (bullets.length >= 2) return bullets.slice(0, 3).join("\n");
  return output.slice(0, 300);
}

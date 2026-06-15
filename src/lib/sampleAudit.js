// Sample SEO/GEO audit results for the client/simulation path.
//
// The real audits run server-side (api/worker -> lib/server/agents/*) because a
// browser can't cross-origin scrape arbitrary sites. When the app runs without
// a backend (the public demo), these generators produce realistic, clearly
// labelled SAMPLE data so the DataPanel score cards are still demoable.
//
// Every object carries `sample: true` so the UI can badge it as illustrative.

function hostFrom(site) {
  const url = site?.url || "https://yourbrand.com";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "yourbrand.com";
  }
}

function urlFrom(site) {
  return site?.url || "https://yourbrand.com";
}

export function sampleSeoData(site) {
  const url = urlFrom(site);
  const host = hostFrom(site);
  const signals = {
    title: { text: `${site?.brand || host} — Home`, length: 38 },
    metaDescription: { text: "Sample meta description for the demo audit.", length: 142 },
    metaRobots: "index, follow",
    canonical: url,
    viewport: true,
    headings: { h1Count: 1, h2Count: 5, h3Count: 9, h1: ["Welcome"], h2: ["Features", "Pricing", "FAQ"] },
    wordCount: 742,
    images: { total: 12, missingAlt: 3 },
    links: { internal: 28, external: 6 },
    structuredData: { ldJson: true, microdataOrSchema: false },
    openGraphTags: 5,
  };
  return {
    kind: "seo",
    mode: "audit",
    sample: true,
    url,
    score: 78,
    siteScore: 74,
    signals,
    pages: [
      { url, score: 78, signals },
      { url: `${url.replace(/\/$/, "")}/pricing`, score: 71, signals },
      { url: `${url.replace(/\/$/, "")}/blog`, score: 73, signals },
    ],
    technical: {
      https: true,
      robotsTxt: { present: true, allowsAll: true },
      sitemapXml: { present: true, urlCount: 34 },
      langAttr: "en",
      hreflangCount: 0,
      favicon: true,
      htmlBytes: 96000,
      renderBlocking: { scripts: 6, stylesheets: 3 },
      schemaTypes: ["Organization", "WebSite"],
    },
    brokenLinks: [{ url: `${url.replace(/\/$/, "")}/old-offer`, status: 404 }],
    recommendations: [
      { priority: "high", issue: "3 images missing alt text", fix: "Add descriptive alt attributes for accessibility + image SEO." },
      { priority: "medium", issue: "No hreflang tags", fix: "Add hreflang if you target multiple languages/regions." },
      { priority: "low", issue: "6 render-blocking scripts", fix: "Defer non-critical JS to improve LCP." },
    ],
  };
}

export function sampleGeoData(site) {
  const host = hostFrom(site);
  const brand = site?.brand || host.split(".")[0];
  return {
    kind: "geo",
    sample: true,
    brand,
    domain: host,
    score: 42,
    engines: ["claude", "perplexity", "openai"],
    checks: [
      { query: `best ${brand} alternatives`, engines: [{ engine: "claude", mentioned: true, snippet: `${brand} is often recommended…` }] },
      { query: `what is ${brand}`, engines: [{ engine: "perplexity", mentioned: true, snippet: `${brand} is a…` }] },
      { query: `top tools like ${brand}`, engines: [{ engine: "openai", mentioned: false, snippet: "" }] },
    ],
    engineBreakdown: [
      { engine: "claude", checks: 3, mentions: 2, rate: 67 },
      { engine: "perplexity", checks: 3, mentions: 1, rate: 33 },
      { engine: "openai", checks: 3, mentions: 1, rate: 33 },
    ],
    competitors: [
      { name: "Competitor A", mentions: 4 },
      { name: "Competitor B", mentions: 3 },
      { name: "Competitor C", mentions: 2 },
    ],
    factors: null,
    recommendations: [
      { priority: "high", action: "Add an FAQ section with schema", why: "AI engines quote concise Q&A answers." },
      { priority: "medium", action: "Publish quotable statistics", why: "Stats get cited as authoritative sources." },
      { priority: "low", action: "Strengthen entity definitions", why: "Clear 'X is a…' lines improve entity clarity." },
    ],
  };
}

// Returns sample outputData for a given agent id, or null if not seo/geo.
export function sampleOutputFor(agentId, site) {
  if (agentId === "seo") return sampleSeoData(site);
  if (agentId === "geo") return sampleGeoData(site);
  return null;
}

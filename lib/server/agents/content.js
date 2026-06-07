// Content agent — REAL work: generates real content with Claude (using upstream
// agent outputs as context when chained) and persists to `content_assets`.

import { callClaudeJSON } from "../claudeServer.js";
import { getAdmin } from "../supabaseAdmin.js";

export async function content({
  task,
  userApiKey,
  clerkUserId,
  runId,
  previousOutputs,
}) {
  const context = formatPrevious(previousOutputs);

  let asset = { kind: "post", platform: "blog", title: "", body: "" };
  try {
    asset = await callClaudeJSON({
      apiKey: userApiKey,
      maxTokens: 1500,
      system:
        "You are a senior content creator. Produce ready-to-publish content " +
        "for the requested task. Output ONLY JSON: " +
        '{"kind": "<post|email|ad|article|caption|thread>", ' +
        '"platform": "<blog|linkedin|x|instagram|email|facebook>", ' +
        '"title": "<headline/subject>", "body": "<the full finished content>"}',
      userMsg:
        `Task: ${task}` +
        (context ? `\n\nContext from prior agents:\n${context}` : ""),
    });
  } catch {
    asset = {
      kind: "post",
      platform: "blog",
      title: (task || "Untitled").slice(0, 120),
      body: `Content generation failed for task: ${task}`,
    };
  }

  const admin = getAdmin();
  if (admin) {
    await admin
      .from("content_assets")
      .insert({
        clerk_user_id: clerkUserId,
        run_id: runId,
        kind: asset.kind || "post",
        platform: asset.platform || "blog",
        title: asset.title || null,
        body: asset.body || "",
        meta: { task, usedContext: !!context },
      })
      .then(({ error }) => {
        if (error) console.error("[content] insert error:", error.message);
      });
  }

  return {
    output: asset.body || "",
    outputData: {
      kind: asset.kind,
      platform: asset.platform,
      title: asset.title,
      body: asset.body,
    },
  };
}

function formatPrevious(previousOutputs) {
  if (!previousOutputs) return "";
  if (typeof previousOutputs === "string")
    return previousOutputs.slice(0, 3000);
  try {
    if (Array.isArray(previousOutputs)) {
      return previousOutputs
        .map((p) =>
          typeof p === "string" ? p : p?.output || JSON.stringify(p)
        )
        .join("\n\n")
        .slice(0, 3000);
    }
    return JSON.stringify(previousOutputs).slice(0, 3000);
  } catch {
    return "";
  }
}

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

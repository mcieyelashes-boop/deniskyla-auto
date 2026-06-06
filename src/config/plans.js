export const PLANS = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    color: "#94A3B8",
    limits: {
      workspaces: 1,
      customAgents: 2,
      flowsPerDay: 10,
      scheduledFlows: 0,
      templates: false,
      integrations: false,
      webhooks: false,
      batchRunner: false,
      apiAccess: false,
      flowVersioning: false,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 29,
    color: "#F0C040",
    popular: true,
    limits: {
      workspaces: Infinity,
      customAgents: Infinity,
      flowsPerDay: 500,
      scheduledFlows: 20,
      templates: true,
      integrations: true,
      webhooks: true,
      batchRunner: true,
      apiAccess: false,
      flowVersioning: true,
    },
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    price: 99,
    color: "#A78BFA",
    limits: {
      workspaces: Infinity,
      customAgents: Infinity,
      flowsPerDay: Infinity,
      scheduledFlows: Infinity,
      templates: true,
      integrations: true,
      webhooks: true,
      batchRunner: true,
      apiAccess: true,
      flowVersioning: true,
    },
  },
};

// Feature -> friendly label + minimum plan that unlocks it
export const FEATURE_META = {
  templates: { label: "Agent Templates", minPlan: "pro" },
  integrations: { label: "Integrations (Slack, Notion, Sheets)", minPlan: "pro" },
  webhooks: { label: "Webhooks", minPlan: "pro" },
  batchRunner: { label: "Batch Runner", minPlan: "pro" },
  flowVersioning: { label: "Flow Versioning", minPlan: "pro" },
  scheduledFlows: { label: "Scheduled Flows", minPlan: "pro" },
  apiAccess: { label: "API Access", minPlan: "enterprise" },
};

export function getPlan(planId) {
  return PLANS[planId] || PLANS.free;
}

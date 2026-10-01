// Progress numbers for one agent (or everyone), from their demo records

export interface DemoStats {
  total: number;
  active: number;
  reported: number;
  successful: number;
  unsuccessful: number;
  satisfied: number;
  likelyToClose: number; // close chance "high" or "medium"
  converted: number;
  conversionRate: number; // % of demos that became paying customers
  last30Days: number;
}

export function computeDemoStats(demos: any[]): DemoStats {
  const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const total = demos.length;
  const converted = demos.filter((d) => d.converted).length;
  return {
    total,
    active: demos.filter((d) => d.status === "active").length,
    reported: demos.filter((d) => d.outcome !== "pending").length,
    successful: demos.filter((d) => d.outcome === "successful").length,
    unsuccessful: demos.filter((d) => d.outcome === "unsuccessful").length,
    satisfied: demos.filter((d) => d.satisfaction === "satisfied").length,
    likelyToClose: demos.filter((d) => !d.converted && (d.closeChance === "high" || d.closeChance === "medium")).length,
    converted,
    conversionRate: total ? Math.round((converted / total) * 1000) / 10 : 0,
    last30Days: demos.filter((d) => new Date(d.createdAt).getTime() >= monthAgo).length,
  };
}

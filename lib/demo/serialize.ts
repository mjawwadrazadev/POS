// Shapes sent to the platform UI for staff accounts and demo records

export function serializePlatformUser(u: any) {
  return {
    id: String(u._id),
    fullName: u.fullName,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    phone: u.phone || "",
    territory: u.territory || "",
    commissionRate: u.commissionRate ?? null,
    createdAt: u.createdAt,
  };
}

/** Login details are only included while the demo store still exists. */
export function serializeDemo(d: any, opts: { withCredentials?: boolean } = {}) {
  const active = d.status === "active";
  return {
    id: String(d._id),
    agentId: String(d.agentId),
    agentName: d.agentName,
    businessType: d.businessType,
    clientName: d.clientName,
    clientBusinessName: d.clientBusinessName,
    clientPhone: d.clientPhone || "",
    clientCity: d.clientCity || "",
    notes: d.notes || "",
    storeCode: d.storeCode,
    status: d.status,
    expiresAt: d.expiresAt,
    endedAt: d.endedAt || null,
    endedReason: d.endedReason || null,
    activity: d.activity || null,
    outcome: d.outcome,
    satisfaction: d.satisfaction || null,
    closeChance: d.closeChance || null,
    converted: !!d.converted,
    feedback: d.feedback || "",
    followUpDate: d.followUpDate || null,
    reportedAt: d.reportedAt || null,
    createdAt: d.createdAt,
    credentials:
      opts.withCredentials && active
        ? { storeCode: d.storeCode, email: d.demoEmail, password: d.demoPassword, pin: d.demoPin }
        : null,
  };
}

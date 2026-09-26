import { dbConnect } from "@/lib/db/mongoose";
import { Organization } from "@/models/Organization";
import { JournalEntry } from "@/models/JournalEntry";
import { logAudit } from "@/lib/audit/logger";

export interface DataRetentionPurgeSummary {
  orgId: string;
  orgName: string;
  retentionMonths: number;
  cutoffDate: Date;
  archivedCount: number;
}

/**
 * Enforces each organization's data-retention window on the general ledger.
 *
 * Financial records are ARCHIVED (flagged with `archivedAt` and hidden from the in-app ledger),
 * never deleted — businesses are legally required to keep books for years, and the data stays
 * available through the tenant export. `dataRetentionMonths = 0` means lifetime visibility.
 */
export async function runDataRetentionJob(triggeredBy?: { userId: string; name: string; role: string }): Promise<DataRetentionPurgeSummary[]> {
  await dbConnect();

  const orgs = await Organization.find({ dataRetentionMonths: { $gt: 0 } });
  const summaries: DataRetentionPurgeSummary[] = [];

  for (const org of orgs) {
    const months = org.dataRetentionMonths;
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);

    const result = await JournalEntry.updateMany(
      { organizationId: org._id, createdAt: { $lt: cutoffDate }, archivedAt: { $exists: false } },
      { $set: { archivedAt: new Date() } }
    );

    if (result.modifiedCount > 0) {
      await logAudit({
        organizationId: org._id as any,
        actorId: triggeredBy?.userId,
        actorName: triggeredBy?.name || "System (Data Retention Job)",
        actorRole: triggeredBy?.role || "system",
        action: "data_retention.archive",
        targetCollection: "JournalEntry",
        after: { archivedCount: result.modifiedCount, retentionMonths: months, cutoffDate },
      });
    }

    summaries.push({
      orgId: (org._id as any).toString(),
      orgName: org.name,
      retentionMonths: months,
      cutoffDate,
      archivedCount: result.modifiedCount,
    });
  }

  return summaries;
}

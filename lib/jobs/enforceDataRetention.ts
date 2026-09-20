import { dbConnect } from "@/lib/db/mongoose";
import { Organization } from "@/models/Organization";
import { JournalEntry } from "@/models/JournalEntry";
import { AuditLog } from "@/models/AuditLog";

export interface DataRetentionPurgeSummary {
  orgId: string;
  orgName: string;
  retentionMonths: number;
  cutoffDate: Date;
  archivedCount: number;
}

/**
 * Enforces organizational data retention policy by archiving and purging old accounting ledger records.
 */
export async function runDataRetentionJob(): Promise<DataRetentionPurgeSummary[]> {
  await dbConnect();

  const orgs = await Organization.find({
    dataRetentionMonths: { $gt: 0 },
  });

  const summaries: DataRetentionPurgeSummary[] = [];

  for (const org of orgs) {
    const months = org.dataRetentionMonths || 6;
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);

    const oldEntries = await JournalEntry.find({
      organizationId: org._id,
      createdAt: { $lt: cutoffDate },
    });

    if (oldEntries.length > 0) {
      // Archive to Audit Log before removing
      await AuditLog.create({
        organizationId: org._id,
        action: "data_retention.purge",
        targetCollection: "JournalEntry",
        details: {
          purgedCount: oldEntries.length,
          retentionMonths: months,
          cutoffDate,
        },
      });

      await JournalEntry.deleteMany({
        organizationId: org._id,
        createdAt: { $lt: cutoffDate },
      });
    }

    summaries.push({
      orgId: (org._id as any).toString(),
      orgName: org.name,
      retentionMonths: months,
      cutoffDate,
      archivedCount: oldEntries.length,
    });
  }

  return summaries;
}

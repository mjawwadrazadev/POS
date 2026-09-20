import { JournalEntry } from "@/models/JournalEntry";

export interface AuditBalanceResult {
  totalAudited: number;
  balancedCount: number;
  unbalancedCount: number;
  unbalancedEntries: {
    entryId: string;
    entryNumber: string;
    totalDebit: number;
    totalCredit: number;
    difference: number;
    reference: string;
    date: Date;
  }[];
}

/**
 * Scans all JournalEntry records and verifies double-entry debit = credit equality.
 */
export async function auditLedgerBalance(organizationId?: string): Promise<AuditBalanceResult> {
  const query: any = {};
  if (organizationId) {
    query.organizationId = organizationId;
  }

  const entries = await JournalEntry.find(query);
  const unbalancedEntries: AuditBalanceResult["unbalancedEntries"] = [];
  let balancedCount = 0;

  for (const entry of entries) {
    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of entry.lines) {
      if (line.type === "debit") {
        totalDebit += line.amount || 0;
      } else if (line.type === "credit") {
        totalCredit += line.amount || 0;
      }
    }

    const diff = Math.abs(totalDebit - totalCredit);
    if (diff > 0.01) {
      unbalancedEntries.push({
        entryId: (entry._id as any).toString(),
        entryNumber: entry.entryNumber,
        totalDebit,
        totalCredit,
        difference: diff,
        reference: entry.referenceId || "N/A",
        date: entry.createdAt,
      });
    } else {
      balancedCount++;
    }
  }

  return {
    totalAudited: entries.length,
    balancedCount,
    unbalancedCount: unbalancedEntries.length,
    unbalancedEntries,
  };
}

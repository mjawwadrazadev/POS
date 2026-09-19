import { dbConnect } from "@/lib/db/mongoose";
import { JournalEntry, IJournalLine } from "@/models/JournalEntry";
import mongoose from "mongoose";

export interface PostOrderLedgerParams {
  organizationId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  orderNumber: string;
  grandTotal: number;
  subtotal: number;
  taxAmount: number;
  paymentMethod: string;
}

export async function postSalesOrderToLedger(params: PostOrderLedgerParams) {
  await dbConnect();

  const { organizationId, branchId, orderNumber, grandTotal, subtotal, taxAmount, paymentMethod } = params;

  // Account mappings
  const assetAccountCode = paymentMethod === "cash" ? "1010-CASH" : "1020-BANK";
  const assetAccountName = paymentMethod === "cash" ? "Cash on Hand" : "Bank Merchant Account";

  const lines: IJournalLine[] = [
    // 1. Debit Cash/Bank Asset for Full Amount Received
    {
      accountCode: assetAccountCode,
      accountName: assetAccountName,
      type: "debit",
      amount: grandTotal,
    },
    // 2. Credit Sales Revenue Account for Subtotal
    {
      accountCode: "4010-SALES",
      accountName: "Sales Revenue",
      type: "credit",
      amount: subtotal,
    },
  ];

  // 3. Credit Sales Tax Payable Liability
  if (taxAmount > 0) {
    lines.push({
      accountCode: "2020-TAX-PAYABLE",
      accountName: "FBR Sales Tax Liability",
      type: "credit",
      amount: taxAmount,
    });
  }

  const totalDebit = lines.filter((l) => l.type === "debit").reduce((sum, l) => sum + l.amount, 0);
  const totalCredit = lines.filter((l) => l.type === "credit").reduce((sum, l) => sum + l.amount, 0);

  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  if (!isBalanced) {
    throw new Error(`Accounting entry imbalance detected! Debit: ${totalDebit}, Credit: ${totalCredit}`);
  }

  const entryNumber = `JE-${Date.now().toString().slice(-6)}`;

  const journalEntry = await JournalEntry.create({
    organizationId,
    branchId,
    entryNumber,
    referenceId: orderNumber,
    description: `Automated POS Sale Entry for ${orderNumber}`,
    lines,
    totalDebit,
    totalCredit,
    isBalanced,
  });

  return journalEntry;
}

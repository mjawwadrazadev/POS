import mongoose from "mongoose";
import { dbConnect } from "@/lib/db/mongoose";
import { JournalEntry, IJournalLine } from "@/models/JournalEntry";
import { Organization } from "@/models/Organization";
import { generateDocNumber, roundMoney } from "@/lib/utils/server";

type Id = string | mongoose.Types.ObjectId;

export const ACCOUNTS = {
  CASH: { accountCode: "1010-CASH", accountName: "Cash on Hand" },
  BANK: { accountCode: "1020-BANK", accountName: "Bank Merchant Account" },
  TAX_PAYABLE: { accountCode: "2020-TAX-PAYABLE", accountName: "Sales Tax Payable" },
  DOCTOR_PAYABLE: { accountCode: "2030-DOCTOR-PAYABLE", accountName: "Payable to Doctors" },
  STORE_CREDIT: { accountCode: "2040-STORE-CREDIT", accountName: "Customer Store Credit Liability" },
  SALES: { accountCode: "4010-SALES", accountName: "Sales Revenue" },
  CONSULTATION: { accountCode: "4020-CONSULTATION-REVENUE", accountName: "Hospital Consultation Revenue" },
  SALARIES: { accountCode: "5010-SALARIES", accountName: "Salaries & Wages Expense" },
};

/** Maps a payment / refund method to the asset (or liability) account that moves. */
export function accountForMethod(method: string) {
  if (method === "cash") return ACCOUNTS.CASH;
  if (method === "store_credit") return ACCOUNTS.STORE_CREDIT;
  return ACCOUNTS.BANK; // card, card_reversal, wallet
}

export async function isAccountingEnabled(organizationId: Id): Promise<boolean> {
  await dbConnect();
  const org = await Organization.findById(organizationId).select("planTier").lean();
  return org?.planTier === "billing_accounting";
}

export interface PostJournalParams {
  organizationId: Id;
  branchId: Id;
  prefix: string;
  referenceId: string;
  description: string;
  lines: IJournalLine[];
}

/**
 * Creates a double-entry journal entry. Zero lines are dropped and the entry is rejected
 * (never stored) when debits do not equal credits.
 */
export async function postJournalEntry(params: PostJournalParams) {
  await dbConnect();

  const lines = params.lines
    .map((l) => ({ ...l, amount: roundMoney(l.amount) }))
    .filter((l) => l.amount > 0);

  const totalDebit = roundMoney(lines.filter((l) => l.type === "debit").reduce((s, l) => s + l.amount, 0));
  const totalCredit = roundMoney(lines.filter((l) => l.type === "credit").reduce((s, l) => s + l.amount, 0));

  if (Math.abs(totalDebit - totalCredit) >= 0.01) {
    throw new Error(`Accounting entry imbalance detected! Debit: ${totalDebit}, Credit: ${totalCredit}`);
  }

  return JournalEntry.create({
    organizationId: params.organizationId,
    branchId: params.branchId,
    entryNumber: generateDocNumber(params.prefix),
    referenceId: params.referenceId,
    description: params.description,
    lines,
    totalDebit,
    totalCredit,
    isBalanced: true,
  });
}

export interface PostOrderLedgerParams {
  organizationId: Id;
  branchId: Id;
  orderNumber: string;
  grandTotal: number;
  taxAmount: number;
  paymentMethod: string;
  payments?: { method: string; amount: number }[];
}

/** Dr Cash/Bank (per payment) = Cr Sales (net of discount) + Cr Sales Tax Payable */
export async function postSalesOrderToLedger(params: PostOrderLedgerParams) {
  const { grandTotal, taxAmount, paymentMethod, payments } = params;

  const receipts =
    paymentMethod === "split" && payments && payments.length > 0
      ? payments
      : [{ method: paymentMethod, amount: grandTotal }];

  // Merge receipts that land in the same account
  const debitByAccount = new Map<string, IJournalLine>();
  for (const p of receipts) {
    const account = accountForMethod(p.method);
    const existing = debitByAccount.get(account.accountCode);
    if (existing) existing.amount += Number(p.amount) || 0;
    else debitByAccount.set(account.accountCode, { ...account, type: "debit", amount: Number(p.amount) || 0 });
  }

  // Split payments may be off by rounding (validated to ±1) — absorb into sales so the entry balances
  const totalReceived = roundMoney(receipts.reduce((s, p) => s + (Number(p.amount) || 0), 0));

  return postJournalEntry({
    organizationId: params.organizationId,
    branchId: params.branchId,
    prefix: "JE-SALE",
    referenceId: params.orderNumber,
    description: `Automated POS Sale Entry for ${params.orderNumber}`,
    lines: [
      ...debitByAccount.values(),
      { ...ACCOUNTS.SALES, type: "credit", amount: totalReceived - taxAmount },
      { ...ACCOUNTS.TAX_PAYABLE, type: "credit", amount: taxAmount },
    ],
  });
}

"use client";

import { useEffect, useState } from "react";
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Search,
} from "lucide-react";

export default function AccountingLedgerPage() {
  const [entries, setEntries] = useState<any[]>([]);

  useEffect(() => {
    // Sample initial ledger entries
    setEntries([
      {
        id: "JE-99812",
        reference: "ORD-99812",
        date: "2026-09-19 10:42 AM",
        description: "Automated POS Sale Entry for ORD-99812",
        debit: 3450,
        credit: 3450,
        lines: [
          { code: "1010-CASH", name: "Cash on Hand", type: "debit", amount: 3450 },
          { code: "4010-SALES", name: "Sales Revenue", type: "credit", amount: 2974 },
          { code: "2020-TAX-PAYABLE", name: "FBR Sales Tax Liability", type: "credit", amount: 476 },
        ],
        isBalanced: true,
      },
      {
        id: "JE-99811",
        reference: "ORD-99811",
        date: "2026-09-19 10:28 AM",
        description: "Automated POS Sale Entry for ORD-99811",
        debit: 8920,
        credit: 8920,
        lines: [
          { code: "1020-BANK", name: "Bank Merchant Account", type: "debit", amount: 8920 },
          { code: "4010-SALES", name: "Sales Revenue", type: "credit", amount: 7690 },
          { code: "2020-TAX-PAYABLE", name: "FBR Sales Tax Liability", type: "credit", amount: 1230 },
        ],
        isBalanced: true,
      },
    ]);
  }, []);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-base-tint border border-stroke-muted p-6">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-accent" />
            <h2 className="font-extrabold text-[2.2rem] text-bright">
              Double-Entry General Ledger
            </h2>
          </div>
          <p className="text-medium text-[1.4rem] mt-1">
            Automated double-entry journal entries for terminal sales, liabilities & cash reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 text-emerald-400 font-accent px-4 py-2.5 border border-emerald-500/30 text-[1.2rem] font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Ledger Integrity 100% Balanced</span>
          </div>
        </div>
      </div>

      {/* Accounting Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="stat-card">
          <span className="stat-card__label">Total Cash Assets (1010)</span>
          <div className="stat-card__value">PKR 142,500</div>
          <div className="flex items-center gap-1 text-success text-[1.2rem] font-accent">
            <ArrowDownLeft className="w-4 h-4" />
            <span>Debit Balance</span>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-card__label">Total Sales Income (4010)</span>
          <div className="stat-card__value">PKR 184,570</div>
          <div className="flex items-center gap-1 text-accent text-[1.2rem] font-accent">
            <ArrowUpRight className="w-4 h-4" />
            <span>Credit Balance</span>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-card__label">Sales Tax Payable (2020)</span>
          <div className="stat-card__value">PKR 29,531</div>
          <div className="flex items-center gap-1 text-amber-500 text-[1.2rem] font-accent">
            <span>Liability</span>
          </div>
        </div>
      </div>

      {/* Journal Entries List */}
      <div className="space-y-4">
        <h3 className="font-accent text-[1.4rem] font-bold text-bright uppercase tracking-wider">
          General Journal Transactions
        </h3>

        <div className="space-y-4">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-base-bright border border-stroke-muted p-5 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stroke-muted pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-accent font-bold text-accent text-[1.4rem]">
                    {entry.id}
                  </span>
                  <span className="font-accent text-muted text-[1.2rem]">
                    Ref: {entry.reference}
                  </span>
                  <span className="text-medium text-[1.3rem]">• {entry.description}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-accent text-[1.2rem] text-muted">
                    {entry.date}
                  </span>
                  <span className="badge badge-success font-accent">BALANCED</span>
                </div>
              </div>

              {/* Entry Lines */}
              <div className="space-y-2">
                {entry.lines.map((line: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-[1.3rem] font-accent py-1 px-3 bg-base-tint"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-accent w-28">{line.code}</span>
                      <span className="text-bright">{line.name}</span>
                    </div>
                    <div className="flex items-center gap-6">
                      {line.type === "debit" ? (
                        <span className="text-emerald-500 font-bold w-32 text-right">
                          DR PKR {line.amount}
                        </span>
                      ) : (
                        <span className="text-blue-500 font-bold w-32 text-right">
                          CR PKR {line.amount}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

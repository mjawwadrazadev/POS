"use client";

import { useEffect, useState } from "react";
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

interface LedgerLine {
  accountCode: string;
  accountName: string;
  type: "debit" | "credit";
  amount: number;
}

interface LedgerEntry {
  _id: string;
  entryNumber: string;
  referenceId: string;
  description: string;
  lines: LedgerLine[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  createdAt: string;
}

interface AccountBalance {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

interface AuditResult {
  totalAudited: number;
  unbalancedCount: number;
  unbalancedEntries: { entryNumber: string; difference: number; reference: string }[];
}

const fmt = (n: number) => `PKR ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function AccountingLedgerPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [auditing, setAuditing] = useState(false);

  async function loadLedger() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/accounting/ledger");
      const data = await res.json();
      if (!res.ok) {
        setUpgradeRequired(!!data.upgradeRequired);
        throw new Error(data.error || "Failed to load ledger");
      }
      setEntries(data.entries || []);
      setBalances(data.balances || []);
    } catch (err: any) {
      setError(err.message);
      setEntries([]);
      setBalances([]);
    } finally {
      setLoading(false);
    }
  }

  async function runAudit() {
    setAuditing(true);
    try {
      const res = await fetch("/api/accounting/audit");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Audit failed");
      setAudit(data.audit);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAuditing(false);
    }
  }

  useEffect(() => {
    loadLedger();
  }, []);

  const balanceOf = (code: string) => {
    const b = balances.find((x) => x.accountCode === code);
    return b ? { debit: b.debit, credit: b.credit } : { debit: 0, credit: 0 };
  };
  const cash = balanceOf("1010-CASH");
  const sales = balanceOf("4010-SALES");
  const tax = balanceOf("2020-TAX-PAYABLE");

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-base-tint border border-stroke-muted p-6">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-accent" />
            <h2 className="font-extrabold text-[2.2rem] text-bright">Double-Entry General Ledger</h2>
          </div>
          <p className="text-medium text-[1.4rem] mt-1">
            Journal entries posted automatically by sales, refunds, consultations and payroll.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadLedger}
            className="btn btn-secondary py-2.5 px-4 text-[1.2rem] flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={runAudit}
            className="btn btn-primary py-2.5 px-4 text-[1.2rem] flex items-center gap-2"
            disabled={auditing || !!error}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{auditing ? "Auditing..." : "Run Balance Audit"}</span>
          </button>
        </div>
      </div>

      {audit && (
        <div
          className={`p-4 border font-accent text-[1.3rem] flex items-start gap-2 ${
            audit.unbalancedCount === 0
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-red-500/10 text-red-400 border-red-500/30"
          }`}
        >
          {audit.unbalancedCount === 0 ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
          <div>
            {audit.unbalancedCount === 0
              ? `All ${audit.totalAudited} journal entries are balanced (Debit = Credit).`
              : `${audit.unbalancedCount} of ${audit.totalAudited} entries are unbalanced: ` +
                audit.unbalancedEntries.map((e) => `${e.entryNumber} (diff ${e.difference})`).join(", ")}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-4 font-accent text-[1.3rem]">
          {upgradeRequired
            ? "The General Ledger is part of the Billing + Accounting plan. Contact the platform administrator to upgrade."
            : error}
        </div>
      )}

      {!error && (
        <>
          {/* Accounting Stats (from real balances) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="stat-card">
              <span className="stat-card__label">Cash on Hand (1010)</span>
              <div className="stat-card__value">{fmt(cash.debit - cash.credit)}</div>
              <div className="flex items-center gap-1 text-success text-[1.2rem] font-accent">
                <ArrowDownLeft className="w-4 h-4" />
                <span>Debit Balance</span>
              </div>
            </div>

            <div className="stat-card">
              <span className="stat-card__label">Net Sales Revenue (4010)</span>
              <div className="stat-card__value">{fmt(sales.credit - sales.debit)}</div>
              <div className="flex items-center gap-1 text-accent text-[1.2rem] font-accent">
                <ArrowUpRight className="w-4 h-4" />
                <span>Credit Balance</span>
              </div>
            </div>

            <div className="stat-card">
              <span className="stat-card__label">Sales Tax Payable (2020)</span>
              <div className="stat-card__value">{fmt(tax.credit - tax.debit)}</div>
              <div className="flex items-center gap-1 text-amber-500 text-[1.2rem] font-accent">
                <span>Liability</span>
              </div>
            </div>
          </div>

          {/* Journal Entries List */}
          <div className="space-y-4">
            <h3 className="font-accent text-[1.4rem] font-bold text-bright uppercase tracking-wider">
              General Journal Transactions ({entries.length})
            </h3>

            {!loading && entries.length === 0 && (
              <div className="bg-base-bright border border-stroke-muted p-8 text-center text-muted font-accent text-[1.3rem]">
                No journal entries yet. Completed sales will appear here automatically.
              </div>
            )}

            <div className="space-y-4">
              {entries.map((entry) => (
                <div key={entry._id} className="bg-base-bright border border-stroke-muted p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stroke-muted pb-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-accent font-bold text-accent text-[1.4rem]">{entry.entryNumber}</span>
                      <span className="font-accent text-muted text-[1.2rem]">Ref: {entry.referenceId}</span>
                      <span className="text-medium text-[1.3rem]">• {entry.description}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-accent text-[1.2rem] text-muted">
                        {new Date(entry.createdAt).toLocaleString("en-PK")}
                      </span>
                      {Math.abs(entry.totalDebit - entry.totalCredit) < 0.01 ? (
                        <span className="badge badge-success font-accent">BALANCED</span>
                      ) : (
                        <span className="badge badge-error font-accent">UNBALANCED</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {entry.lines.map((line, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-[1.3rem] font-accent py-1 px-3 bg-base-tint"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-accent w-40">{line.accountCode}</span>
                          <span className="text-bright">{line.accountName}</span>
                        </div>
                        <span className={`font-bold w-40 text-right ${line.type === "debit" ? "text-emerald-500" : "text-blue-500"}`}>
                          {line.type === "debit" ? "DR" : "CR"} {fmt(line.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

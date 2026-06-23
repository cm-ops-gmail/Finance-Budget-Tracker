import React, { useState, useMemo } from "react";
import { X, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { User, SpreadsheetData } from "../types.ts";

interface BudgetLineInfo {
  name: string;
  description: string;
  budget: number;
  actual: number;
  remaining: number;
}

interface BudgetOverview {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
}

interface Props {
  token: string;
  user: User;
  data: SpreadsheetData;
  onClose: () => void;
  onSuccess: () => void;
}

const MONTHS = ["April", "May", "June", "July", "August", "September"];

const normTeam = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/operations?/g, "ops");

function teamsMatch(a: string, b: string): boolean {
  const an = normTeam(a), bn = normTeam(b);
  if (an === bn) return true;
  const min = Math.min(an.length, bn.length);
  if (min >= 5 && (an.startsWith(bn) || bn.startsWith(an))) return true;
  return false;
}

function getBudgetOverview(
  data: SpreadsheetData,
  department: string,
  month: string
): BudgetOverview | null {
  if (!department || !month) return null;
  let totalBudget = 0, totalSpent = 0, totalRemaining = 0;

  if (["April", "May", "June"].includes(month)) {
    [...data.ltdQ2, ...data.lcQ2]
      .filter(i => !i.isSubtotal && !i.isHeader && teamsMatch(i.department, department))
      .forEach(i => {
        if (month === "April")  { totalBudget += i.aprBudget; totalRemaining += i.aprBudget; }
        else if (month === "May") { totalBudget += i.mayBudget; totalSpent += i.mayActual; totalRemaining += i.mayRemaining; }
        else                      { totalBudget += i.junBudget; totalSpent += i.junActual; totalRemaining += i.junRemaining; }
      });
  } else if (["July", "August", "September"].includes(month)) {
    [...data.ltdQ3, ...data.lcQ3]
      .filter(i => !i.isSubtotal && teamsMatch(i.team, department))
      .forEach(i => {
        if (month === "July")          { totalBudget += i.julBudget; totalSpent += i.julActual; totalRemaining += i.julRem; }
        else if (month === "August")   { totalBudget += i.augBudget; totalSpent += i.augActual; totalRemaining += i.augRem; }
        else                           { totalBudget += i.sepBudget; totalSpent += i.sepActual; totalRemaining += i.sepRem; }
      });
  }

  if (totalBudget === 0) return null;
  return { totalBudget, totalSpent, totalRemaining };
}

function getBudgetLines(
  data: SpreadsheetData,
  department: string,
  month: string
): BudgetLineInfo[] {
  if (!department || !month) return [];

  if (["April", "May", "June"].includes(month)) {
    return [...data.ltdQ2, ...data.lcQ2]
      .filter(i => !i.isSubtotal && !i.isHeader && teamsMatch(i.department, department) && i.costHeading)
      .map(i => {
        let budget = 0, actual = 0, remaining = 0;
        if (month === "April")  { budget = i.aprBudget; remaining = i.aprBudget; }
        else if (month === "May") { budget = i.mayBudget; actual = i.mayActual; remaining = i.mayRemaining; }
        else                      { budget = i.junBudget; actual = i.junActual; remaining = i.junRemaining; }
        return { name: i.costHeading, description: i.description, budget, actual, remaining };
      })
      .filter(i => i.name && i.budget !== 0);
  }

  if (["July", "August", "September"].includes(month)) {
    return [...data.ltdQ3, ...data.lcQ3]
      .filter(i => !i.isSubtotal && teamsMatch(i.team, department) && i.costType)
      .map(i => {
        let budget = 0, actual = 0, remaining = 0;
        if (month === "July")          { budget = i.julBudget; actual = i.julActual; remaining = i.julRem; }
        else if (month === "August")   { budget = i.augBudget; actual = i.augActual; remaining = i.augRem; }
        else                           { budget = i.sepBudget; actual = i.sepActual; remaining = i.sepRem; }
        return { name: i.costType, description: i.purpose, budget, actual, remaining };
      })
      .filter(i => i.name && i.budget !== 0);
  }

  return [];
}

const fmt = (n: number) => new Intl.NumberFormat("en-BD").format(Math.round(n));
const today = new Date().toISOString().slice(0, 10);

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-800 placeholder-gray-400 bg-white";
const labelCls = "block text-xs font-semibold text-gray-600 mb-1";

export default function RequisitionModal({ token, user, data, onClose, onSuccess }: Props) {
  const departments = useMemo(() => {
    if (user.role === "admin") {
      const set = new Set<string>();
      [...data.ltdQ2, ...data.lcQ2].forEach(i => { if (!i.isSubtotal && i.department) set.add(i.department); });
      [...data.ltdQ3, ...data.lcQ3].forEach(i => { if (!i.isSubtotal && i.team) set.add(i.team); });
      return [...set].sort();
    }
    return user.teams;
  }, [user, data]);

  const [form, setForm] = useState({
    submittedBy: "",
    designation: "",
    contact: "",
    email: "",
    dateOfSubmission: today,
    department: departments[0] || "",
    month: "",
    budgetLine: "",
    costHeading: "",
    amount: "",
    projectName: "",
    vendorName: "",
    purpose: "",
    description: "",
    invoiceLink: "",
  });

  const [selectedLine, setSelectedLine] = useState<BudgetLineInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const budgetOverview = useMemo(
    () => getBudgetOverview(data, form.department, form.month),
    [data, form.department, form.month]
  );

  const budgetLines = useMemo(
    () => getBudgetLines(data, form.department, form.month),
    [data, form.department, form.month]
  );

  const set = (k: string, v: string) => {
    setForm(prev => ({ ...prev, [k]: v }));
    setError(null);
  };

  const handleDeptChange = (dept: string) => {
    setForm(prev => ({ ...prev, department: dept, budgetLine: "", costHeading: "" }));
    setSelectedLine(null);
    setError(null);
  };

  const handleMonthChange = (month: string) => {
    setForm(prev => ({ ...prev, month, budgetLine: "", costHeading: "" }));
    setSelectedLine(null);
    setError(null);
  };

  const handleBudgetLineChange = (name: string) => {
    const line = budgetLines.find(l => l.name === name);
    setForm(prev => ({
      ...prev,
      budgetLine: name,
      costHeading: name,
      description: line?.description || prev.description,
    }));
    setSelectedLine(line || null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.budgetLine) { setError("Please select a budget line."); return; }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/requisitions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setSubmitted(true);
        setTimeout(() => { onSuccess(); onClose(); }, 1800);
      } else {
        setError(json.error || "Failed to submit requisition.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-12 text-center shadow-2xl max-w-sm w-full">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9 text-emerald-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Requisition Submitted!</h3>
          <p className="text-sm text-gray-500 mt-1">Your request has been recorded successfully.</p>
        </div>
      </div>
    );
  }

  const spentPct = budgetOverview && budgetOverview.totalBudget > 0
    ? Math.min(100, (budgetOverview.totalSpent / budgetOverview.totalBudget) * 100)
    : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-6">

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">New Requisition</h2>
            <p className="text-xs text-red-500 font-semibold mt-0.5">All fields are required.</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors mt-0.5">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-5 space-y-4">

          {/* Submitted By + Designation */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Submitted By *</label>
              <input type="text" required value={form.submittedBy} onChange={e => set("submittedBy", e.target.value)} placeholder="Your full name" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Designation *</label>
              <input type="text" required value={form.designation} onChange={e => set("designation", e.target.value)} placeholder="e.g. Manager, Executive" className={inputCls} />
            </div>
          </div>

          {/* Contact + Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Contact *</label>
              <input type="tel" required value={form.contact} onChange={e => set("contact", e.target.value)} placeholder="Phone number" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Email *</label>
              <input type="email" required value={form.email} onChange={e => set("email", e.target.value)} placeholder="name@example.com" className={inputCls} />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className={labelCls}>Date of Submission *</label>
            <input type="date" required value={form.dateOfSubmission} onChange={e => set("dateOfSubmission", e.target.value)} className={inputCls} />
          </div>

          {/* Department */}
          <div>
            <label className={labelCls}>Department *</label>
            <select required value={form.department} onChange={e => handleDeptChange(e.target.value)} className={inputCls}>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Month + Budget Line */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Month *</label>
              <select required value={form.month} onChange={e => handleMonthChange(e.target.value)} className={inputCls}>
                <option value="">Select month</option>
                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Budget line *</label>
              <select
                value={form.budgetLine}
                onChange={e => handleBudgetLineChange(e.target.value)}
                className={inputCls}
                disabled={!form.month}
              >
                <option value="">
                  {!form.month ? "Select month first" : budgetLines.length === 0 ? "No budget lines found" : "Select budget line"}
                </option>
                {budgetLines.map(l => <option key={l.name} value={l.name}>{l.name}</option>)}
              </select>
            </div>
          </div>

          {/* ── Budget Overview (appears when dept + month selected) ── */}
          {budgetOverview && (
            <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-blue-50 overflow-hidden">
              <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider">
                  {form.department} — {form.month} Budget
                </p>
                <p className="text-[10px] text-indigo-400 font-medium">
                  {spentPct.toFixed(0)}% spent
                </p>
              </div>

              {/* Progress bar */}
              <div className="mx-4 mb-3 h-1.5 rounded-full bg-indigo-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${spentPct >= 90 ? "bg-red-400" : spentPct >= 70 ? "bg-amber-400" : "bg-indigo-400"}`}
                  style={{ width: `${spentPct}%` }}
                />
              </div>

              <div className="grid grid-cols-3 divide-x divide-indigo-100 border-t border-indigo-100">
                <div className="px-4 py-2.5 text-center">
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">Allocated</p>
                  <p className="text-sm font-bold text-indigo-900 mt-0.5">৳{fmt(budgetOverview.totalBudget)}</p>
                </div>
                <div className="px-4 py-2.5 text-center">
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">Spent</p>
                  <p className="text-sm font-bold text-indigo-900 mt-0.5">৳{fmt(budgetOverview.totalSpent)}</p>
                </div>
                <div className="px-4 py-2.5 text-center">
                  <p className={`text-[10px] font-bold uppercase tracking-wide ${budgetOverview.totalRemaining < 0 ? "text-red-400" : "text-emerald-500"}`}>
                    Remaining
                  </p>
                  <p className={`text-sm font-bold mt-0.5 ${budgetOverview.totalRemaining < 0 ? "text-red-600" : "text-emerald-700"}`}>
                    ৳{fmt(budgetOverview.totalRemaining)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Per-line budget info (appears when a specific line is selected) ── */}
          {selectedLine && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-2">
                Selected Line: {selectedLine.name}
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-blue-400">Line Budget</p>
                  <p className="text-sm font-bold text-blue-900 mt-0.5">৳{fmt(selectedLine.budget)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-blue-400">Spent</p>
                  <p className="text-sm font-bold text-blue-900 mt-0.5">৳{fmt(selectedLine.actual)}</p>
                </div>
                <div>
                  <p className={`text-[10px] font-bold uppercase tracking-wide ${selectedLine.remaining < 0 ? "text-red-400" : "text-emerald-500"}`}>
                    Remaining
                  </p>
                  <p className={`text-sm font-bold mt-0.5 ${selectedLine.remaining < 0 ? "text-red-600" : "text-emerald-700"}`}>
                    ৳{fmt(selectedLine.remaining)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className={labelCls}>Amount (৳) *</label>
            <input
              type="number" required min="0" step="any" value={form.amount}
              onChange={e => set("amount", e.target.value)}
              placeholder="0" className={inputCls}
            />
          </div>

          {/* Cost Heading (auto-filled) */}
          <div>
            <label className={labelCls}>
              Cost Heading *{" "}
              <span className="text-[10px] font-normal text-blue-500">(auto-filled from budget line)</span>
            </label>
            <input
              type="text" readOnly value={form.costHeading}
              placeholder="Select a budget line above"
              className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-blue-50 text-blue-800 font-medium focus:outline-none cursor-default"
            />
          </div>

          {/* Project Name + Vendor Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                Project Name{" "}
                <span className="font-normal text-gray-400">(if applicable)</span>
              </label>
              <input type="text" value={form.projectName} onChange={e => set("projectName", e.target.value)} placeholder="Project name" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Vendor Name *</label>
              <input type="text" required value={form.vendorName} onChange={e => set("vendorName", e.target.value)} placeholder="Vendor / supplier" className={inputCls} />
            </div>
          </div>

          {/* Purpose */}
          <div>
            <label className={labelCls}>Purpose *</label>
            <input type="text" required value={form.purpose} onChange={e => set("purpose", e.target.value)} placeholder="Short purpose of this requisition" className={inputCls} />
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description *</label>
            <textarea required rows={3} value={form.description} onChange={e => set("description", e.target.value)} className={`${inputCls} resize-none`} />
          </div>

          {/* Invoice Link */}
          <div>
            <label className={labelCls}>Invoice link (Google Drive / Dropbox URL) *</label>
            <input type="url" required value={form.invoiceLink} onChange={e => set("invoiceLink", e.target.value)} placeholder="https://... (required)" className={inputCls} />
            <p className="text-[10px] text-gray-400 mt-1">An invoice or drive link is mandatory to submit.</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors">
              Cancel
            </button>
            <button
              type="submit" disabled={submitting}
              className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit Requisition
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

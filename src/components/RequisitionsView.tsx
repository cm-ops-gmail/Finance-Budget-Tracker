import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FileText, ExternalLink, Loader2, AlertCircle,
  Clock, CheckCircle2, XCircle, RefreshCw, Filter,
} from "lucide-react";
import { Requisition, User } from "../types.ts";

interface Props {
  token: string;
  user: User;
  refreshKey: number;
}

const STATUS_CLS: Record<string, string> = {
  Pending:  "bg-amber-50 text-amber-700 border-amber-200",
  Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Rejected: "bg-red-50 text-red-600 border-red-200",
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  Pending:  Clock,
  Approved: CheckCircle2,
  Rejected: XCircle,
};

const fmt = (n: number) => new Intl.NumberFormat("en-BD").format(Math.round(n));

export default function RequisitionsView({ token, user, refreshKey }: Props) {
  const [rows, setRows] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamFilter, setTeamFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const isAdmin = user.role === "admin";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/requisitions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setRows(json.requisitions);
      else setError(json.error || "Failed to load requisitions.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load, refreshKey]);

  // Unique teams extracted from all requisition records (admin only)
  const uniqueTeams = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r =>
      r.team.split(",").forEach(t => { const v = t.trim(); if (v) set.add(v); })
    );
    return [...set].sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (!isAdmin || teamFilter === "all") return rows;
    return rows.filter(r =>
      r.team.split(",").map(t => t.trim()).includes(teamFilter)
    );
  }, [rows, teamFilter, isAdmin]);

  const handleStatusChange = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/requisitions/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (json.success) {
        setRows(prev =>
          prev.map(r => r.id === id ? { ...r, status: status as Requisition["status"] } : r)
        );
      }
    } catch {
      // silently ignore — row reverts
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-4">
        <AlertCircle className="w-4 h-4 shrink-0" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Title + filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {isAdmin ? "All Requisitions" : "My Requisitions"}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {filteredRows.length} submission{filteredRows.length !== 1 ? "s" : ""}
            {isAdmin && teamFilter !== "all" && ` · filtered by ${teamFilter}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Team filter — admin only */}
          {isAdmin && uniqueTeams.length > 0 && (
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
              <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <select
                value={teamFilter}
                onChange={e => setTeamFilter(e.target.value)}
                className="text-xs font-medium text-gray-700 bg-transparent focus:outline-none cursor-pointer pr-1"
              >
                <option value="all">All Teams</option>
                {uniqueTeams.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={load}
            className="w-8 h-8 flex items-center justify-center bg-white hover:bg-gray-50 border border-gray-200 rounded-full text-gray-500 transition-all shadow-sm"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Empty state */}
      {filteredRows.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-500">No requisitions found</p>
          <p className="text-xs text-gray-400 mt-1">
            {isAdmin
              ? teamFilter !== "all"
                ? `No requisitions for team "${teamFilter}".`
                : "Requisitions from all teams will appear here."
              : 'Click "New Requisition" to submit your first request.'}
          </p>
        </div>
      )}

      {/* Table */}
      {filteredRows.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[960px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">ID</th>
                  {isAdmin && (
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Team</th>
                  )}
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Submitted By</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Dept / Month</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Budget Line</th>
                  <th className="text-right px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Vendor</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Invoice</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    {isAdmin ? "Status (editable)" : "Status"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredRows.map(r => {
                  const cls = STATUS_CLS[r.status] ?? STATUS_CLS.Pending;
                  const SIcon = STATUS_ICONS[r.status] ?? Clock;
                  const dateStr = r.dateOfSubmission
                    ? new Date(r.dateOfSubmission).toLocaleDateString("en-GB", {
                        day: "2-digit", month: "short", year: "numeric",
                      })
                    : "—";

                  return (
                    <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3 font-mono text-[10px] text-gray-400 whitespace-nowrap">{r.id}</td>

                      {isAdmin && (
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap max-w-[120px] truncate" title={r.team}>
                          {r.team}
                        </td>
                      )}

                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-xs font-semibold text-gray-800">{r.submittedBy}</p>
                        <p className="text-[10px] text-gray-400">{r.designation}</p>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-xs font-medium text-gray-700">{r.department}</p>
                        <p className="text-[10px] text-gray-400">{r.month} · {dateStr}</p>
                      </td>

                      <td className="px-4 py-3 max-w-[180px]">
                        <p className="text-xs text-gray-700 truncate" title={r.budgetLine}>{r.budgetLine}</p>
                        {r.purpose && (
                          <p className="text-[10px] text-gray-400 truncate" title={r.purpose}>{r.purpose}</p>
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs font-bold text-gray-800 text-right tabular-nums whitespace-nowrap">
                        ৳{fmt(r.amount)}
                      </td>

                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{r.vendorName}</td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.invoiceLink ? (
                          <a
                            href={r.invoiceLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-700 font-semibold"
                          >
                            View <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-[11px] text-gray-300">—</span>
                        )}
                      </td>

                      {/* Status — badge for team users, editable select for admin */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isAdmin ? (
                          <div className="relative inline-flex items-center">
                            <select
                              value={r.status}
                              onChange={e => handleStatusChange(r.id, e.target.value)}
                              disabled={updatingId === r.id}
                              className={`text-[11px] font-bold pl-2.5 pr-6 py-1.5 rounded-full border appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all disabled:opacity-50 ${cls}`}
                            >
                              <option value="Pending">Pending</option>
                              <option value="Approved">Approved</option>
                              <option value="Rejected">Rejected</option>
                            </select>
                            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
                              {updatingId === r.id
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <span className="text-[8px]">▼</span>
                              }
                            </span>
                          </div>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold ${cls}`}>
                            <SIcon className="w-3 h-3" />
                            {r.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

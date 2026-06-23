import React, { useState, useEffect, useCallback } from "react";
import { SpreadsheetData, APIResponse, User } from "./types.ts";
import OverviewDashboard from "./components/OverviewDashboard.tsx";
import Q2BudgetTable from "./components/Q2BudgetTable.tsx";
import Q3BudgetGrid from "./components/Q3BudgetGrid.tsx";
import LoginPage from "./components/LoginPage.tsx";
import RequisitionModal from "./components/RequisitionModal.tsx";
import RequisitionsView from "./components/RequisitionsView.tsx";
import {
  Building2,
  BarChart3,
  RefreshCw,
  AlertTriangle,
  Layers2,
  Grid2X2,
  Layers,
  ChevronRight,
  Database,
  Info,
  LogOut,
  ShieldCheck,
  Users,
  FilePlus2,
  ClipboardList,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const TOKEN_KEY = "bd_auth_token";
const USER_KEY = "bd_auth_user";

export default function App() {
  const [data, setData] = useState<SpreadsheetData | null>(null);
  const [sheetTitle, setSheetTitle] = useState("Budget Tracker");
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "LTD_Q2" | "LTD_Q3" | "LTD_Q4" | "LC_Q2" | "LC_Q3" | "LC_Q4" | "REQUISITIONS">("OVERVIEW");
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showRequisitionModal, setShowRequisitionModal] = useState(false);
  const [requisitionsKey, setRequisitionsKey] = useState(0);

  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Restore session from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
    setAuthReady(true);
  }, []);

  const handleLogout = useCallback(async (currentToken?: string) => {
    const t = currentToken || token;
    if (t) {
      fetch("/api/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${t}` },
      }).catch(() => {});
    }
    setToken(null);
    setUser(null);
    setData(null);
    setError(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, [token]);

  const fetchSheetData = useCallback(async (silent: boolean = false, authToken?: string) => {
    const t = authToken || localStorage.getItem(TOKEN_KEY);
    if (!t) return;

    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const response = await fetch("/api/sheets-data", {
        headers: { Authorization: `Bearer ${t}` },
      });

      if (response.status === 401) {
        handleLogout(t);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP Error: Failed to fetch with response status ${response.status}`);
      }

      const result: APIResponse = await response.json();
      if (result.success) {
        setData(result.data);
        setSheetTitle(result.title);
        setSpreadsheetId(result.spreadsheetId);
        setLastRefreshed(new Date());
      } else {
        throw new Error(result.error || "Unable to load spreadsheet values.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred while communicating with the backend.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [handleLogout]);

  // Fetch data when auth is ready and token exists
  useEffect(() => {
    if (authReady && token) {
      fetchSheetData(false, token);
    } else if (authReady && !token) {
      setLoading(false);
    }
  }, [authReady, token]);

  const handleLogin = useCallback((newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    fetchSheetData(false, newToken);
  }, [fetchSheetData]);

  // ── Auth gate ───────────────────────────────────────────────────────────────
  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-slate-700 border-t-blue-500 animate-spin" />
      </div>
    );
  }

  if (!token || !user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div id="loading-container" className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-8">
        <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin mb-4" />
        <h2 className="text-sm font-bold text-slate-700 animate-pulse uppercase tracking-wider">Syncing Ledger Streams</h2>
        <p className="text-xs text-slate-400 mt-1">Connecting to Google Spreadsheet via server service account...</p>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div id="error-container" className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6">
        <div className="max-w-xl w-full bg-white rounded-2xl border border-red-100 p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-4 text-rose-600">
            <div className="p-3 bg-rose-50 rounded-xl">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-800">Connection Interrupted</h1>
              <p className="text-xs text-rose-500 font-medium">Failed to synchronize sheet ledger</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-xs text-slate-600 space-y-2 font-mono break-all">
            <p className="font-bold text-slate-800">Diagnostic Details:</p>
            <p className="text-slate-500">{error}</p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Ledger Setup Resolution Checklist</h3>
            <div className="space-y-3 pt-1">
              {[
                `Confirm the spreadsheet is shared with the Google service account email: requisition-dashboard-edit@pelagic-range-466218-p1.iam.gserviceaccount.com`,
                "Verify that your Google Sheets API is enabled under GCP APIs Console.",
                "Confirm the Google spreadsheet id hasn't been changed or deleted.",
              ].map((msg, idx) => (
                <div key={idx} className="flex gap-3 text-xs text-slate-600">
                  <div className="shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-[10px]">{idx + 1}</div>
                  <p>{msg}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
            <button
              onClick={() => handleLogout()}
              className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700 font-medium flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
            <button
              onClick={() => fetchSheetData()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 font-bold text-white text-xs rounded-lg shadow-xs hover:shadow-md cursor-pointer transition-all flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = user.role === "admin";
  const primaryTeam = user.teams[0] ?? "";
  const userInitials = primaryTeam.slice(0, 2).toUpperCase();
  const displayName = isAdmin
    ? "Administrator"
    : user.teams.length === 1
      ? user.teams[0]
      : `${user.teams[0]} +${user.teams.length - 1}`;

  // ── Dashboard ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50 text-gray-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 flex flex-col border-r border-slate-800 shrink-0 h-full">
        {/* Brand */}
        <div className="px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="10MS Logo"
              className="w-9 h-9 rounded-lg object-contain bg-white p-0.5 shrink-0"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <div>
              <h1 className="text-[13px] font-bold text-slate-100 tracking-tight leading-tight">
                10MS Finance
              </h1>
              <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                Budget Tracker
              </p>
            </div>
          </div>
        </div>

        {/* Logged-in user badge */}
        <div className="px-4 pt-4 pb-2">
          <div className="px-3 py-2.5 bg-slate-800/60 rounded-lg border border-slate-700/50">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-[10px] font-bold text-blue-400 shrink-0">
                {userInitials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">{displayName}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {isAdmin
                    ? <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                    : <Users className="w-2.5 h-2.5 text-slate-500" />
                  }
                  <p className="text-[10px] text-slate-500">{isAdmin ? "Administrator" : "Team Member"}</p>
                </div>
              </div>
            </div>
            {/* Show all selected teams as small badges */}
            {!isAdmin && user.teams.length > 1 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {user.teams.map(t => (
                  <span key={t} className="text-[9px] px-1.5 py-0.5 bg-blue-600/20 text-blue-400 rounded border border-blue-500/20 font-medium">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-grow p-4 space-y-4 overflow-y-auto">
          <div>
            <div className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              DASHBOARD VIEW
            </div>
            <div className="space-y-1 mt-1">
              <button
                onClick={() => setActiveTab("OVERVIEW")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-all text-xs font-semibold cursor-pointer ${
                  activeTab === "OVERVIEW"
                    ? "bg-blue-600/10 text-blue-400 border-l-4 border-blue-500 rounded-r-md"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                }`}
              >
                <Grid2X2 className="w-4 h-4 shrink-0" />
                {isAdmin ? "Executive Summary" : "My Summary"}
              </button>
            </div>
          </div>

          <div>
            <div className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              10MS Limited (LTD)
            </div>
            <div className="space-y-1 mt-1">
              <button
                onClick={() => setActiveTab("LTD_Q2")}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-md transition-all text-xs cursor-pointer ${
                  activeTab === "LTD_Q2"
                    ? "bg-blue-600/10 text-blue-400 border-l-4 border-blue-500 rounded-r-md font-semibold"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                }`}
              >
                <span className="truncate">Q2 Budget Tracking</span>
                <span className="text-[9px] font-bold bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">Q2</span>
              </button>
              <button
                onClick={() => setActiveTab("LTD_Q3")}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-md transition-all text-xs cursor-pointer ${
                  activeTab === "LTD_Q3"
                    ? "bg-blue-600/10 text-blue-400 border-l-4 border-blue-500 rounded-r-md font-semibold"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                }`}
              >
                <span className="truncate">Q3 Budget Summary</span>
                <span className="text-[9px] font-bold bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">Q3</span>
              </button>
              {data?.ltdQ4?.length ? (
                <button
                  onClick={() => setActiveTab("LTD_Q4")}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-md transition-all text-xs cursor-pointer ${
                    activeTab === "LTD_Q4"
                      ? "bg-blue-600/10 text-blue-400 border-l-4 border-blue-500 rounded-r-md font-semibold"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                  }`}
                >
                  <span className="truncate">Q4 Budget Summary</span>
                  <span className="text-[9px] font-bold bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">Q4</span>
                </button>
              ) : null}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/60">
            <div className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Learning Center (LC)
            </div>
            <div className="space-y-1 mt-1">
              <button
                onClick={() => setActiveTab("LC_Q2")}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-md transition-all text-xs cursor-pointer ${
                  activeTab === "LC_Q2"
                    ? "bg-blue-600/10 text-blue-400 border-l-4 border-blue-500 rounded-r-md font-semibold"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                }`}
              >
                <span className="truncate">Q2 Budget Tracking</span>
                <span className="text-[9px] font-bold bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">Q2</span>
              </button>
              <button
                onClick={() => setActiveTab("LC_Q3")}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-md transition-all text-xs cursor-pointer ${
                  activeTab === "LC_Q3"
                    ? "bg-blue-600/10 text-blue-400 border-l-4 border-blue-500 rounded-r-md font-semibold"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                }`}
              >
                <span className="truncate">Q3 LC Budget</span>
                <span className="text-[9px] font-bold bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">Q3</span>
              </button>
              {data?.lcQ4?.length ? (
                <button
                  onClick={() => setActiveTab("LC_Q4")}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-md transition-all text-xs cursor-pointer ${
                    activeTab === "LC_Q4"
                      ? "bg-blue-600/10 text-blue-400 border-l-4 border-blue-500 rounded-r-md font-semibold"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                  }`}
                >
                  <span className="truncate">Q4 LC Budget</span>
                  <span className="text-[9px] font-bold bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">Q4</span>
                </button>
              ) : null}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/60">
            <div className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Requisitions
            </div>
            <div className="space-y-1 mt-1">
              <button
                onClick={() => setActiveTab("REQUISITIONS")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-all text-xs font-semibold cursor-pointer ${
                  activeTab === "REQUISITIONS"
                    ? "bg-blue-600/10 text-blue-400 border-l-4 border-blue-500 rounded-r-md"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                }`}
              >
                <ClipboardList className="w-4 h-4 shrink-0" />
                {isAdmin ? "All Requisitions" : "My Requisitions"}
              </button>
            </div>
          </div>
        </nav>

        {/* Sign out */}
        <div className="p-4 mt-auto border-t border-slate-800 shrink-0">
          <button
            onClick={() => handleLogout()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all border border-transparent hover:border-rose-500/20"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top header */}
        <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="10MS"
              className="h-8 w-auto object-contain"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
            <h2 className="text-base font-bold text-gray-800 tracking-tight">
              {sheetTitle}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* New Requisition button */}
            <button
              onClick={() => setShowRequisitionModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
            >
              <FilePlus2 className="w-3.5 h-3.5" />
              New Requisition
            </button>

            <div className="text-right hidden sm:block">
              {lastRefreshed && (
                <p className="text-[10px] text-gray-400 font-medium leading-none">
                  Last synced {lastRefreshed.toLocaleTimeString()}
                </p>
              )}
              <div className="flex items-center justify-end gap-1.5 mt-1">
                {isAdmin
                  ? <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  : <Users className="w-3 h-3 text-slate-400" />
                }
                <p className="text-xs font-semibold text-gray-700 leading-none">
                  {displayName}
                </p>
              </div>
            </div>
            <button
              onClick={() => fetchSheetData(true)}
              disabled={isRefreshing}
              title="Synchronize Live Ledger Data"
              className={`w-9 h-9 flex items-center justify-center bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full text-gray-600 transition-all ${
                isRefreshing ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-500" : ""}`} />
            </button>
            <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 text-white flex items-center justify-center text-xs font-bold font-mono">
              {userInitials}
            </div>
          </div>
        </header>

        {/* Tab content */}
        <main className="flex-1 p-8 overflow-y-auto bg-gray-50">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="max-w-7xl mx-auto space-y-8"
            >
              {activeTab === "OVERVIEW" && (
                <OverviewDashboard id="ov-board" data={data} />
              )}
              {activeTab === "LTD_Q2" && (
                <Q2BudgetTable
                  id="tab-ltd-q2"
                  items={data.ltdQ2}
                  title={isAdmin
                    ? "10MS Limited (LTD) — Q2 Budget Tracking Ledger"
                    : `${displayName} — LTD Q2 Budget Tracking`}
                />
              )}
              {activeTab === "LTD_Q3" && (
                <Q3BudgetGrid
                  id="grid-ltd-q3"
                  items={data.ltdQ3}
                  title={isAdmin
                    ? "10MS Limited (LTD) — Summary: Q3 Budget (July - September)"
                    : `${displayName} — LTD Q3 Budget Summary`}
                />
              )}
              {activeTab === "LC_Q2" && (
                <Q2BudgetTable
                  id="tab-lc-q2"
                  items={data.lcQ2}
                  title={isAdmin
                    ? "Learning Center (LC) — Q2 Budget Tracking Ledger"
                    : `${displayName} — LC Q2 Budget Tracking`}
                />
              )}
              {activeTab === "LC_Q3" && (
                <Q3BudgetGrid
                  id="grid-lc-q3"
                  items={data.lcQ3}
                  title={isAdmin
                    ? "Learning Center (LC) — Summary: Q3 LC Budget (July - September)"
                    : `${displayName} — LC Q3 Budget Summary`}
                />
              )}
              {activeTab === "LTD_Q4" && data.ltdQ4 && (
                <Q3BudgetGrid
                  id="grid-ltd-q4"
                  items={data.ltdQ4}
                  title={isAdmin
                    ? "10MS Limited (LTD) — Summary: Q4 Budget (October - December)"
                    : `${displayName} — LTD Q4 Budget Summary`}
                  quarterConfig={{
                    quarter: "Q4",
                    m1: "OCT", m2: "NOV", m3: "DEC",
                    m1Short: "Oct", m2Short: "Nov", m3Short: "Dec",
                    m1Full: "October", m2Full: "November", m3Full: "December",
                  }}
                />
              )}
              {activeTab === "LC_Q4" && data.lcQ4 && (
                <Q3BudgetGrid
                  id="grid-lc-q4"
                  items={data.lcQ4}
                  title={isAdmin
                    ? "Learning Center (LC) — Summary: Q4 LC Budget (October - December)"
                    : `${displayName} — LC Q4 Budget Summary`}
                  quarterConfig={{
                    quarter: "Q4",
                    m1: "OCT", m2: "NOV", m3: "DEC",
                    m1Short: "Oct", m2Short: "Nov", m3Short: "Dec",
                    m1Full: "October", m2Full: "November", m3Full: "December",
                  }}
                />
              )}
              {activeTab === "REQUISITIONS" && (
                <RequisitionsView
                  token={token}
                  user={user}
                  refreshKey={requisitionsKey}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* New Requisition Modal */}
      {showRequisitionModal && (
        <RequisitionModal
          token={token}
          user={user}
          data={data}
          onClose={() => setShowRequisitionModal(false)}
          onSuccess={() => {
            setRequisitionsKey(k => k + 1);
            setActiveTab("REQUISITIONS");
          }}
        />
      )}
    </div>
  );
}

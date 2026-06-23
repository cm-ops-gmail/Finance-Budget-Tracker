import React, { useState, useEffect, useRef } from "react";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  X, 
  Table, 
  Layers, 
  ExternalLink,
  ChevronDown,
  Info 
} from "lucide-react";
import { Q2Item, Q3Item } from "../types";

interface MetricCardProps {
  id: string;
  title: string;
  value: string;
  subtext?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  icon?: React.ReactNode;
  progress?: {
    value: number;
    color: string;
  };
  // Underlying spreadsheet records for drilldown
  sheetItemsQ2?: Q2Item[];
  sheetItemsQ3?: Q3Item[];
  defaultOpenSection?: "Q2" | "Q3";
  selectedMonth?: string;
}

export default function MetricCard({
  id,
  title,
  value,
  subtext,
  trend,
  icon,
  progress,
  sheetItemsQ2,
  sheetItemsQ3,
  defaultOpenSection,
  selectedMonth
}: MetricCardProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [entityFilter, setEntityFilter] = useState<"ALL" | "LTD" | "LC">("ALL");
  const [activeTab, setActiveTab] = useState<"Q2" | "Q3">("Q2");
  const [tableExpanded, setTableExpanded] = useState(false);

  // Auto-set the active tab based on which items are provided or default section/selectedMonth
  useEffect(() => {
    if (selectedMonth && selectedMonth !== "ALL" && selectedMonth !== "Q2" && selectedMonth !== "Q3") {
      if (["APR", "MAY", "JUN"].includes(selectedMonth)) {
        setActiveTab("Q2");
      } else if (["JUL", "AUG", "SEP"].includes(selectedMonth)) {
        setActiveTab("Q3");
      }
    } else if (defaultOpenSection) {
      setActiveTab(defaultOpenSection === "Q2" ? "Q2" : "Q3");
    } else if (sheetItemsQ3 && sheetItemsQ3.length > 0 && (!sheetItemsQ2 || sheetItemsQ2.length === 0)) {
      setActiveTab("Q3");
    } else {
      setActiveTab("Q2");
    }
  }, [sheetItemsQ2, sheetItemsQ3, defaultOpenSection, selectedMonth]);

  // Handle escape key to close popover
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsPopoverOpen(false);
      }
    };
    if (isPopoverOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPopoverOpen]);

  const formatBDT = (num: number): string => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num).replace("BDT", "৳");
  };

  const formatPercentage = (num: number): string => {
    if (!num || isNaN(num)) return "0%";
    const sign = num > 0 ? "+" : "";
    return `${sign}${num.toFixed(1)}%`;
  };

  const getTargetMonth = () => {
    const m = selectedMonth || "ALL";
    if (m === "Q2" || m === "Q3") return "ALL";
    if (activeTab === "Q2") {
      return ["APR", "MAY", "JUN"].includes(m) ? m : "ALL";
    } else {
      return ["JUL", "AUG", "SEP"].includes(m) ? m : "ALL";
    }
  };

  const targetMonth = getTargetMonth();

  // Filter Q2 items
  const filteredQ2Items = (sheetItemsQ2 || []).filter(item => {
    // Skip general subtotal rows in the drilldown unless requested
    if (item.isHeader) return false;
    
    // Entity Filter
    if (entityFilter !== "ALL" && item.entity !== entityFilter) return false;

    // Month filter - only show rows that have actual data for that specific month if selected
    if (targetMonth !== "ALL") {
      if (targetMonth === "APR" && item.aprBudget === 0) return false;
      if (targetMonth === "MAY" && item.mayBudget === 0 && item.mayActual === 0) return false;
      if (targetMonth === "JUN" && item.junBudget === 0 && item.junActual === 0) return false;
    }

    // Search Query
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const matchDept = (item.department || "").toLowerCase().includes(q);
      const matchHeading = (item.costHeading || "").toLowerCase().includes(q);
      const matchDesc = (item.description || "").toLowerCase().includes(q);
      return matchDept || matchHeading || matchDesc;
    }
    return true;
  });

  // Filter Q3 items
  const filteredQ3Items = (sheetItemsQ3 || []).filter(item => {
    // Entity Filter
    if (entityFilter !== "ALL" && item.entity !== entityFilter) return false;

    // Month filter - only show rows that have actual data for that specific month if selected
    if (targetMonth !== "ALL") {
      if (targetMonth === "JUL" && item.julBudget === 0 && item.julActual === 0) return false;
      if (targetMonth === "AUG" && item.augBudget === 0 && item.augActual === 0) return false;
      if (targetMonth === "SEP" && item.sepBudget === 0 && item.sepActual === 0) return false;
    }

    // Search Query
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const matchTeam = (item.team || "").toLowerCase().includes(q);
      const matchSubTeam = (item.subTeam || "").toLowerCase().includes(q);
      const matchCostType = (item.costType || "").toLowerCase().includes(q);
      const matchPurpose = (item.purpose || "").toLowerCase().includes(q);
      return matchTeam || matchSubTeam || matchCostType || matchPurpose;
    }
    return true;
  });

  const hasQ2 = sheetItemsQ2 && sheetItemsQ2.length > 0;
  const hasQ3 = sheetItemsQ3 && sheetItemsQ3.length > 0;
  const hasMultiple = hasQ2 && hasQ3;

  return (
    <div
      id={id}
      className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between relative group"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 select-none">
            {title}
          </p>
          <h3 className="text-2xl font-black text-gray-950 mt-1 font-sans">
            {value}
          </h3>
        </div>
        {icon && (
          <div className="p-2 bg-slate-50 border border-gray-100 rounded-lg text-slate-500 hover:bg-slate-100 transition-all select-none">
            {icon}
          </div>
        )}
      </div>

      <div>
        {progress && (
          <div className="mb-3">
            <div className="flex justify-between text-[11px] font-bold text-gray-500 mb-1">
              <span>Spent Progress</span>
              <span>{progress.value.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${progress.color}`}
                style={{ width: `${Math.min(progress.value, 100)}%` }}
              />
            </div>
          </div>
        )}

        {trend && (
          <div className="flex items-center gap-1.5 mt-2">
            <span
              className={`flex items-center text-[10px] font-black px-1.5 py-0.5 rounded ${
                trend.isPositive
                  ? "bg-rose-50 text-rose-600"
                  : "bg-emerald-50 text-emerald-600"
              }`}
            >
              {trend.isPositive ? (
                <ArrowUpRight className="w-3 h-3 mr-0.5" />
              ) : (
                <ArrowDownRight className="w-3 h-3 mr-0.5" />
              )}
              {trend.value}%
            </span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              {trend.label}
            </span>
          </div>
        )}

        {!trend && subtext && (
          <p className="text-xs text-gray-400 font-medium">{subtext}</p>
        )}

        {/* Dynamic Spreadsheet Popover Trigger */}
        {(hasQ2 || hasQ3) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setIsPopoverOpen(true);
            }}
            id={`${id}-popover-trigger`}
            className="mt-3.5 w-full flex items-center justify-center gap-1.5 py-2 bg-indigo-50/50 hover:bg-indigo-600 hover:text-white text-indigo-700 rounded-lg text-[10px] font-black border border-indigo-100/80 hover:border-indigo-600 hover:shadow-xs transition-all cursor-pointer uppercase tracking-wider"
          >
            <Table className="w-3.5 h-3.5" />
            View Source Rows (
              {activeTab === "Q2" 
                ? (filteredQ2Items.filter(i => !i.isHeader).length) 
                : (filteredQ3Items.length)}
            )
            <span className="relative flex h-1.5 w-1.5 ml-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
            </span>
          </button>
        )}
      </div>

      {/* FULL HD FLOATING MODAL POPOVER DIALOG */}
      {isPopoverOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setIsPopoverOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden animate-zoom-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Popover Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 text-white rounded-xl">
                  <Table className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider select-none">
                    Spreadsheet Source Ledger
                  </h3>
                  <p className="text-[11px] text-slate-400 font-bold mt-0.5">
                    Drilldown data for: {title} ({value}) 
                    {targetMonth !== "ALL" && (
                      <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px] font-black uppercase tracking-wider">
                        {targetMonth} Only
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono select-none px-2 py-1 bg-gray-100 text-gray-500 rounded border border-gray-200">
                  ESC to close
                </span>
                <button
                  onClick={() => setIsPopoverOpen(false)}
                  className="p-2 hover:bg-slate-200 rounded-full text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Popover Filter Bar */}
            <div className="px-6 py-4 border-b border-gray-100 bg-white flex flex-col md:flex-row gap-4 items-center justify-between shrink-0">
              {/* Tabs for Q2 / Q3 Split */}
              <div className="flex gap-1.5 bg-slate-100 p-1.5 rounded-xl self-start md:self-auto">
                {hasQ2 && (
                  <button
                    onClick={() => setActiveTab("Q2")}
                    className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                      activeTab === "Q2" 
                        ? "bg-white text-slate-900 shadow-xs" 
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Q2 Sheets (Apr - Jun)
                  </button>
                )}
                {hasQ3 && (
                  <button
                    onClick={() => setActiveTab("Q3")}
                    className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                      activeTab === "Q3" 
                        ? "bg-white text-slate-900 shadow-xs" 
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Q3 Sheets (Jul - Sep)
                  </button>
                )}
              </div>

              {/* Entity Fast Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1 md:justify-end">
                {/* Entity Selector */}
                <div className="flex rounded-xl bg-gray-100 p-1 text-xs font-bold shrink-0">
                  <button
                    onClick={() => setEntityFilter("ALL")}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      entityFilter === "ALL" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    All Entities
                  </button>
                  <button
                    onClick={() => setEntityFilter("LTD")}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      entityFilter === "LTD" ? "bg-slate-900 text-white shadow-xs" : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    10MS LTD
                  </button>
                  <button
                    onClick={() => setEntityFilter("LC")}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      entityFilter === "LC" ? "bg-blue-600 text-white shadow-xs" : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    LC Center
                  </button>
                </div>

                {/* Instant Search Row */}
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder={
                      activeTab === "Q2" 
                        ? "Search department, description..." 
                        : "Search team, cost type, details..."
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 border border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs font-medium outline-none transition-all placeholder:text-gray-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-2.5 p-0.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Popover Table Grid Area */}
            <div className="flex-1 overflow-auto bg-slate-50/50 p-6">
              {activeTab === "Q2" ? (
                // --- Q2 TABLE RENDER ---
                filteredQ2Items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <Table className="w-10 h-10 text-slate-300 stroke-1 mb-3" />
                    <p className="text-xs font-bold text-gray-500">No matching spreadsheet rows found</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Try altering your search filters or active tabs</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs flex flex-col">
                    <div className={`overflow-x-auto ${tableExpanded ? 'max-h-[500px] overflow-y-auto' : ''}`}>
                      <table className="w-full text-left border-collapse bg-white">
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black uppercase tracking-wider text-gray-500 select-none shadow-sm">
                            <th className="py-3 px-4 bg-gray-50">Entity</th>
                            <th className="py-3 px-4 bg-gray-50">Dept</th>
                            <th className="py-3 px-4 min-w-[150px] bg-gray-50">Cost Heading</th>
                            <th className="py-3 px-4 min-w-[180px] bg-gray-50">Description</th>
                            {(targetMonth === "ALL" || targetMonth === "APR") && (
                              <th className="py-3 px-3 text-right bg-gray-50">April</th>
                            )}
                            {(targetMonth === "ALL" || targetMonth === "MAY") && (
                              <>
                                <th className="py-3 px-3 text-right bg-gray-50">May</th>
                                <th className="py-3 px-3 text-right bg-gray-50">May Actual</th>
                                <th className="py-3 px-3 text-right bg-gray-50">May Variance</th>
                                <th className="py-3 px-3 text-right bg-gray-50">May Remaining</th>
                              </>
                            )}
                            {(targetMonth === "ALL" || targetMonth === "JUN") && (
                              <>
                                <th className="py-3 px-3 text-right bg-gray-50">June</th>
                                <th className="py-3 px-3 text-right bg-gray-50">June Actual</th>
                                <th className="py-3 px-3 text-right bg-gray-50">June Variance</th>
                                <th className="py-3 px-3 text-right bg-gray-50">June Remaining</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-[11px] text-gray-700">
                          {(tableExpanded ? filteredQ2Items : filteredQ2Items.slice(0, 10)).map((item, idx) => (
                            <tr 
                            key={item.id || idx} 
                            className={`hover:bg-gray-50/80 transition-colors ${
                              item.isSubtotal ? "bg-indigo-50/20 font-bold text-indigo-950" : ""
                            }`}
                          >
                            <td className="py-2.5 px-4">
                              <span className={`px-1.5 py-0.5 font-bold rounded text-[9px] ${
                                item.entity === "LTD" ? "bg-slate-900 text-white" : "bg-blue-100 text-blue-700"
                              }`}>
                                {item.entity}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 font-semibold text-gray-900">{item.department}</td>
                            <td className="py-2.5 px-4 font-medium">{item.costHeading}</td>
                            <td className="py-2.5 px-4 text-gray-500 max-w-xs truncate" title={item.description}>
                              {item.description || "-"}
                            </td>
                            {(targetMonth === "ALL" || targetMonth === "APR") && (
                              <td className="py-2.5 px-3 text-right font-mono text-gray-600">{formatBDT(item.aprBudget)}</td>
                            )}
                            {(targetMonth === "ALL" || targetMonth === "MAY") && (
                              <>
                                <td className="py-2.5 px-3 text-right font-mono text-gray-600">{formatBDT(item.mayBudget)}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-blue-600">{formatBDT(item.mayActual)}</td>
                                <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                                  item.mayVariance < 0 ? "text-rose-500" : "text-emerald-600"
                                }`}>
                                  {formatPercentage(item.mayVariance)}
                                </td>
                                <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                                  item.mayRemaining < 0 ? "text-rose-600" : "text-slate-700"
                                }`}>
                                  {formatBDT(item.mayRemaining)}
                                </td>
                              </>
                            )}
                            {(targetMonth === "ALL" || targetMonth === "JUN") && (
                              <>
                                <td className="py-2.5 px-3 text-right font-mono text-gray-600">{formatBDT(item.junBudget)}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-blue-600">{formatBDT(item.junActual)}</td>
                                <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                                  item.junVariance < 0 ? "text-rose-500" : "text-emerald-600"
                                }`}>
                                  {formatPercentage(item.junVariance)}
                                </td>
                                <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                                  item.junRemaining < 0 ? "text-rose-600" : "text-slate-700"
                                }`}>
                                  {formatBDT(item.junRemaining)}
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {filteredQ2Items.length > 10 && (
                    <div className="bg-gray-50 border-t border-gray-100 p-2 text-center">
                      <button
                        onClick={() => setTableExpanded(!tableExpanded)}
                        className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors rounded-lg w-full flex items-center justify-center gap-2 outline-none"
                      >
                        {tableExpanded ? "View Less" : `View More (${filteredQ2Items.length - 10} hidden rows)`}
                      </button>
                    </div>
                  )}
                  </div>
                )
              ) : (
                // --- Q3 TABLE RENDER ---
                filteredQ3Items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <Table className="w-10 h-10 text-slate-300 stroke-1 mb-3" />
                    <p className="text-xs font-bold text-gray-500">No matching spreadsheet rows found</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Try altering your search filters or active tabs</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs flex flex-col">
                    <div className={`overflow-x-auto ${tableExpanded ? 'max-h-[500px] overflow-y-auto' : ''}`}>
                      <table className="w-full text-left border-collapse bg-white">
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black uppercase tracking-wider text-gray-500 select-none shadow-sm">
                            <th className="py-3 px-4 bg-gray-50">Entity</th>
                            <th className="py-3 px-4 bg-gray-50">Team</th>
                            <th className="py-3 px-4 min-w-[150px] bg-gray-50">Sub-Team / Vertical / Project</th>
                            <th className="py-3 px-4 min-w-[120px] bg-gray-50">Cost Type</th>
                            <th className="py-3 px-4 min-w-[160px] bg-gray-50">Purpose / Details</th>
                            {(targetMonth === "ALL" || targetMonth === "JUL") && (
                              <>
                                <th className="py-3 px-3 text-right bg-gray-50">Jul 2026</th>
                                <th className="py-3 px-3 text-right bg-gray-50">July Actual</th>
                                <th className="py-3 px-3 text-right bg-gray-50">July Variance</th>
                                <th className="py-3 px-3 text-right bg-gray-50">July Remaining</th>
                              </>
                            )}
                            {(targetMonth === "ALL" || targetMonth === "AUG") && (
                              <>
                                <th className="py-3 px-3 text-right bg-gray-50">Aug 2026</th>
                                <th className="py-3 px-3 text-right bg-gray-50">Aug Actual</th>
                                <th className="py-3 px-3 text-right bg-gray-50">Aug Variance</th>
                                <th className="py-3 px-3 text-right bg-gray-50">Aug Remaining</th>
                              </>
                            )}
                            {(targetMonth === "ALL" || targetMonth === "SEP") && (
                              <>
                                <th className="py-3 px-3 text-right bg-gray-50">Sep 2026</th>
                                <th className="py-3 px-3 text-right bg-gray-50">Sep Actual</th>
                                <th className="py-3 px-3 text-right bg-gray-50">Sep Variance</th>
                                <th className="py-3 px-3 text-right bg-gray-50">Sep Remaining</th>
                              </>
                            )}
                            {targetMonth === "ALL" && (
                              <th className="py-3 px-4 text-right font-black bg-gray-50">Q3 Total</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-[11px] text-gray-700">
                          {(tableExpanded ? filteredQ3Items : filteredQ3Items.slice(0, 10)).map((item, idx) => (
                            <tr 
                            key={item.id || idx} 
                            className={`hover:bg-gray-50/80 transition-colors ${
                              item.isSubtotal ? "bg-indigo-50/20 font-bold text-indigo-950" : ""
                            }`}
                          >
                            <td className="py-2.5 px-4">
                              <span className={`px-1.5 py-0.5 font-bold rounded text-[9px] ${
                                item.entity === "LTD" ? "bg-slate-900 text-white" : "bg-blue-100 text-blue-700"
                              }`}>
                                {item.entity}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 font-semibold text-gray-900">{item.team}</td>
                            <td className="py-2.5 px-4 font-medium">{item.subTeam}</td>
                            <td className="py-2.5 px-4 text-gray-600">{item.costType || "-"}</td>
                            <td className="py-2.5 px-4 text-gray-500 max-w-xs truncate" title={item.purpose}>
                              {item.purpose || "-"}
                            </td>
                            {(targetMonth === "ALL" || targetMonth === "JUL") && (
                              <>
                                <td className="py-2.5 px-3 text-right font-mono text-gray-600">{formatBDT(item.julBudget)}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-blue-600">{formatBDT(item.julActual)}</td>
                                <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                                  item.julVar < 0 ? "text-rose-500" : "text-emerald-600"
                                }`}>
                                  {formatPercentage(item.julVar)}
                                </td>
                                <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                                  item.julRem < 0 ? "text-rose-600" : "text-slate-700"
                                }`}>
                                  {formatBDT(item.julRem)}
                                </td>
                              </>
                            )}
                            {(targetMonth === "ALL" || targetMonth === "AUG") && (
                              <>
                                <td className="py-2.5 px-3 text-right font-mono text-gray-600">{formatBDT(item.augBudget)}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-blue-600">{formatBDT(item.augActual)}</td>
                                <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                                  item.augVar < 0 ? "text-rose-500" : "text-emerald-600"
                                }`}>
                                  {formatPercentage(item.augVar)}
                                </td>
                                <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                                  item.augRem < 0 ? "text-rose-600" : "text-slate-700"
                                }`}>
                                  {formatBDT(item.augRem)}
                                </td>
                              </>
                            )}
                            {(targetMonth === "ALL" || targetMonth === "SEP") && (
                              <>
                                <td className="py-2.5 px-3 text-right font-mono text-gray-600">{formatBDT(item.sepBudget)}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-blue-600">{formatBDT(item.sepActual)}</td>
                                <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                                  item.sepVar < 0 ? "text-rose-500" : "text-emerald-600"
                                }`}>
                                  {formatPercentage(item.sepVar)}
                                </td>
                                <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                                  item.sepRem < 0 ? "text-rose-600" : "text-slate-700"
                                }`}>
                                  {formatBDT(item.sepRem)}
                                </td>
                              </>
                            )}
                            {targetMonth === "ALL" && (
                              <td className="py-2.5 px-4 text-right font-mono font-extrabold text-indigo-950 bg-slate-50/30">
                                {formatBDT(item.q3Total)}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {filteredQ3Items.length > 10 && (
                    <div className="bg-gray-50 border-t border-gray-100 p-2 text-center">
                      <button
                        onClick={() => setTableExpanded(!tableExpanded)}
                        className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors rounded-lg w-full flex items-center justify-center gap-2 outline-none"
                      >
                        {tableExpanded ? "View Less" : `View More (${filteredQ3Items.length - 10} hidden rows)`}
                      </button>
                    </div>
                  )}
                  </div>
                )
              )}
            </div>

            {/* Popover Footer Summary Status */}
            <div className="px-6 py-4 border-t border-gray-200 bg-slate-50 flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0 select-none">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-600" />
                <span className="text-xs text-gray-500 font-medium">
                  {activeTab === "Q2" 
                    ? `Showing ${filteredQ2Items.length} of ${sheetItemsQ2?.length || 0} items from standard Q2 ledger.`
                    : `Showing ${filteredQ3Items.length} of ${sheetItemsQ3?.length || 0} items from standard Q3 ledger.`}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsPopoverOpen(false)}
                  className="px-4 py-2 hover:bg-gray-200 font-bold text-gray-600 text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Close View
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useMemo } from "react";
import { Q2Item } from "../types.ts";
import MetricCard from "./MetricCard.tsx";
import SearchableSelect from "./SearchableSelect.tsx";
import BudgetAttentionCards from "./BudgetAttentionCards.tsx";
import { Search, Filter, AlertCircle, TrendingDown, ArrowDownWideNarrow, ChartBar, XCircle, Wallet, Calendar, CheckCircle2, DollarSign, Activity, Percent, Compass, ArrowRightLeft, Download } from "lucide-react";
import { exportPDF } from "../utils/exportPDF";
import { motion, AnimatePresence } from "motion/react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend
} from "recharts";

interface Q2BudgetTableProps {
  id: string;
  items: Q2Item[];
  title: string;
}

export default function Q2BudgetTable({ id, items, title }: Q2BudgetTableProps) {
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState<string[]>(["ALL"]);
  const [selectedCostHeading, setSelectedCostHeading] = useState<string[]>(["ALL"]);
  const [selectedProject, setSelectedProject] = useState<string[]>(["ALL"]);
  const [showOverBudgetOnly, setShowOverBudgetOnly] = useState(false);
  const [activeMonthFilter, setActiveMonthFilter] = useState<"ALL" | "APR" | "MAY" | "JUN">("ALL");
  const [tableExpanded, setTableExpanded] = useState(false);

  const isAnyFilterActive = 
    search !== "" || 
    selectedDept.length > 0 && !(selectedDept.length === 1 && selectedDept[0] === "ALL") || 
    selectedCostHeading.length > 0 && !(selectedCostHeading.length === 1 && selectedCostHeading[0] === "ALL") || 
    selectedProject.length > 0 && !(selectedProject.length === 1 && selectedProject[0] === "ALL") || 
    showOverBudgetOnly === true ||
    activeMonthFilter !== "ALL";

  const handleClearFilters = () => {
    setSearch("");
    setSelectedDept(["ALL"]);
    setSelectedCostHeading(["ALL"]);
    setSelectedProject(["ALL"]);
    setShowOverBudgetOnly(false);
    setActiveMonthFilter("ALL");
  };

  // Formatter utilities
  const formatBDT = (num: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatPct = (num: number): string => {
    if (isNaN(num)) return "0%";
    return num.toFixed(0) + "%";
  };

  const formatVar = (num: number): string => {
    if (num === 0) return "—";
    const abs = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(num));
    return num > 0 ? `+${abs}` : `-${abs}`;
  };

  const [hoveredCell, setHoveredCell] = useState<{ rowIdx: number; col: string } | null>(null);

  const handleExportPDF = () => {
    const fmtNum = (n: number) =>
      new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
    const rows = filteredItems
      .filter(item => !item.isSubtotal && !item.isHeader)
      .map(item => [
        item.department,
        item.costHeading,
        item.description,
        fmtNum(item.aprBudget),
        fmtNum(item.mayBudget),
        fmtNum(item.mayActual),
        fmtNum(item.mayVariance),
        fmtNum(item.junBudget),
        fmtNum(item.junActual),
        fmtNum(item.junVariance),
      ]);
    const totB = q2Totals.aprBudget + q2Totals.mayBudget + q2Totals.junBudget;
    const totA = q2Totals.mayActual + q2Totals.junActual;
    const totV = q2Totals.mayVariance + q2Totals.junVariance;
    const varPct = totB > 0 ? ((totV / totB) * 100).toFixed(1) + "%" : "—";
    exportPDF({
      title,
      subtitle: `Q2 Budget Report  ·  Period: ${activeMonthFilter === "ALL" ? "All Months (Apr – Jun)" : activeMonthFilter}`,
      filters: [
        { label: "Department", value: selectedDept.includes("ALL") ? "All" : selectedDept.join(", ") },
        { label: "Cost Heading", value: selectedCostHeading.includes("ALL") ? "All" : selectedCostHeading.join(", ") },
        { label: "Over Budget Only", value: showOverBudgetOnly ? "Yes" : "No" },
      ],
      summary: [
        { label: "Total Budget", value: "BDT " + fmtNum(totB) },
        { label: "Total Actual", value: "BDT " + fmtNum(totA) },
        { label: "Total Variance", value: "BDT " + fmtNum(totV) },
        { label: "Variance %", value: varPct },
        { label: "Rows Exported", value: String(rows.length) },
      ],
      columns: ["Dept", "Cost Heading", "Description", "Apr Budget", "May Budget", "May Actual", "May Variance", "Jun Budget", "Jun Actual", "Jun Variance"],
      rows,
      filename: `Q2-Budget-Report-${new Date().toISOString().slice(0, 10)}.pdf`,
    });
  };

  // Get list of unique departments
  const uniqueDepts = useMemo(() => {
    const set = new Set<string>();
    items.forEach(item => {
      if (item.department && !item.isSubtotal) {
        set.add(item.department);
      }
    });
    return Array.from(set).sort();
  }, [items]);

  // Get list of unique cost headings
  const uniqueCostHeadings = useMemo(() => {
    const set = new Set<string>();
    items.forEach(item => {
      if (item.costHeading && !item.isSubtotal) {
        set.add(item.costHeading);
      }
    });
    return Array.from(set).sort();
  }, [items]);

  // Get list of unique projects (using descriptions)
  const uniqueProjects = useMemo(() => {
    const set = new Set<string>();
    items.forEach(item => {
      if (item.description && !item.isSubtotal && !item.isHeader) {
        const desc = item.description.trim();
        if (desc) {
          set.add(desc);
        }
      }
    });
    return Array.from(set).sort();
  }, [items]);

  // Main list filtering
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // 1. Text Search
      const textMatch = 
        item.costHeading.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase()) ||
        item.department.toLowerCase().includes(search.toLowerCase());

      // 2. Department selection
      const deptMatch = selectedDept.includes("ALL") || selectedDept.includes(item.department);

      // 3. Cost Heading selection
      const costHeadingMatch = selectedCostHeading.includes("ALL") || selectedCostHeading.includes(item.costHeading);

      // 4. Project selection
      const projectMatch = selectedProject.includes("ALL") || selectedProject.includes(item.description);

      // 5. Overbudget flag
      // Detect if May or June variance is negative / remaining budget is negative, indicating overspending
      const isOverBudget = item.mayRemaining < 0 || item.junRemaining < 0;
      const budgetMatch = !showOverBudgetOnly || isOverBudget;

      return textMatch && deptMatch && costHeadingMatch && projectMatch && budgetMatch;
    });
  }, [items, search, selectedDept, selectedCostHeading, selectedProject, showOverBudgetOnly]);

  // Compute top spend items for chart visualization (excluding subtotals)
  const topSpendChartData = useMemo(() => {
    return filteredItems
      .filter(item => !item.isSubtotal && !item.isHeader && item.totalBudget > 0)
      .map(item => ({
        name: item.costHeading.length > 25 ? item.costHeading.slice(0, 22) + "..." : item.costHeading,
        Budget: item.totalBudget,
        Spent: item.totalActual
      }))
      .sort((a, b) => b.Budget - a.Budget)
      .slice(0, 7);
  }, [filteredItems]);

  // Aggregate department-wise budget, actual spent, and consumption rate
  const departmentPieChartData = useMemo(() => {
    const rawItems = filteredItems.filter(item => !item.isSubtotal && !item.isHeader);
    const aggregated: { [dept: string]: { budget: number; spent: number } } = {};

    rawItems.forEach(item => {
      const dept = item.department || "Other";
      if (!aggregated[dept]) {
        aggregated[dept] = { budget: 0, spent: 0 };
      }

      let budget = 0;
      let spent = 0;

      if (activeMonthFilter === "ALL") {
        budget = item.totalBudget || (item.aprBudget + item.mayBudget + item.junBudget);
        spent = item.totalActual || (item.mayActual + item.junActual);
      } else if (activeMonthFilter === "APR") {
        budget = item.aprBudget;
        spent = 0;
      } else if (activeMonthFilter === "MAY") {
        budget = item.mayBudget;
        spent = item.mayActual;
      } else if (activeMonthFilter === "JUN") {
        budget = item.junBudget;
        spent = item.junActual;
      }

      aggregated[dept].budget += budget;
      aggregated[dept].spent += spent;
    });

    const COLORS_PALETTE = [
      "#3b82f6", // blue
      "#10b981", // emerald
      "#f59e0b", // amber
      "#ec4899", // pink
      "#8b5cf6", // violet
      "#06b6d4", // cyan
      "#ef4444", // red
      "#14b8a6", // teal
      "#eab308", // yellow
      "#a855f7"  // purple
    ];

    const budgetData = Object.entries(aggregated)
      .map(([name, val], index) => ({
        name,
        value: Math.max(0, val.budget),
        color: COLORS_PALETTE[index % COLORS_PALETTE.length]
      }))
      .filter(d => d.value > 0);

    const spentData = Object.entries(aggregated)
      .map(([name, val], index) => ({
        name,
        value: Math.max(0, val.spent),
        color: COLORS_PALETTE[index % COLORS_PALETTE.length]
      }))
      .filter(d => d.value > 0);

    const consumptionData = Object.entries(aggregated)
      .map(([name, val], index) => {
        const rate = val.budget > 0 ? (val.spent / val.budget) * 100 : 0;
        return {
          name,
          value: Math.round(rate),
          budget: val.budget,
          spent: val.spent,
          color: COLORS_PALETTE[index % COLORS_PALETTE.length]
        };
      })
      .filter(d => d.value > 0);

    const totalBudgetSum = budgetData.reduce((acc, curr) => acc + curr.value, 0);
    const totalSpentSum = spentData.reduce((acc, curr) => acc + curr.value, 0);
    const overallRate = totalBudgetSum > 0 ? Math.round((totalSpentSum / totalBudgetSum) * 100) : 0;

    return {
      budgetData,
      spentData,
      consumptionData,
      totalBudgetSum,
      totalSpentSum,
      overallRate
    };
  }, [filteredItems, activeMonthFilter]);

  // Data for month-wise comparison per team
  const departmentMonthWiseData = useMemo(() => {
    const rawItems = filteredItems.filter(item => !item.isSubtotal && !item.isHeader);
    const aggregated: { [dept: string]: { apr: number, may: number, jun: number } } = {};

    rawItems.forEach(item => {
      const dept = item.department || "Other";
      if (!aggregated[dept]) {
        aggregated[dept] = { apr: 0, may: 0, jun: 0 };
      }
      aggregated[dept].apr += item.aprActual || 0;
      aggregated[dept].may += item.mayActual || 0;
      aggregated[dept].jun += item.junActual || 0;
    });

    return Object.entries(aggregated).map(([name, val]) => ({
      name,
      Apr: val.apr,
      May: val.may,
      Jun: val.jun
    })).filter(d => d.Apr > 0 || d.May > 0 || d.Jun > 0);
  }, [filteredItems]);

  const q2Totals = useMemo(() => {
    let aprBudget = 0;
    let mayBudget = 0, mayActual = 0, mayVariance = 0, mayRemaining = 0;
    let junBudget = 0, junActual = 0, junVariance = 0, junRemaining = 0;

    filteredItems.forEach(item => {
      if (!item.isSubtotal && !item.isHeader) {
        aprBudget    += item.aprBudget    || 0;
        mayBudget    += item.mayBudget    || 0;
        mayActual    += item.mayActual    || 0;
        mayVariance  += item.mayVariance  || 0;
        mayRemaining += item.mayRemaining || 0;
        junBudget    += item.junBudget    || 0;
        junActual    += item.junActual    || 0;
        junVariance  += item.junVariance  || 0;
        junRemaining += item.junRemaining || 0;
      }
    });

    return { aprBudget, mayBudget, mayActual, mayVariance, mayRemaining, junBudget, junActual, junVariance, junRemaining };
  }, [filteredItems]);

  const deptChartData = useMemo(() => {
    const deptTotals: { [key: string]: { budget: number; actual: number } } = {};
    filteredItems.forEach(item => {
      if (!item.isSubtotal && !item.isHeader) {
        const d = item.department || "Other";
        if (!deptTotals[d]) deptTotals[d] = { budget: 0, actual: 0 };
        
        let budget = 0;
        let actual = 0;
        
        if (activeMonthFilter === "ALL") {
          budget = (item.aprBudget || 0) + (item.mayBudget || 0) + (item.junBudget || 0);
          actual = (item.aprBudget || 0) + (item.mayActual || 0) + (item.junActual || 0); // Assuming Apr Actual ~ Apr Budget for context
        } else if (activeMonthFilter === "APR") {
          budget = item.aprBudget || 0;
          actual = 0;
        } else if (activeMonthFilter === "MAY") {
          budget = item.mayBudget || 0;
          actual = item.mayActual || 0;
        } else if (activeMonthFilter === "JUN") {
          budget = item.junBudget || 0;
          actual = item.junActual || 0;
        }
        
        deptTotals[d].budget += budget;
        deptTotals[d].actual += actual;
      }
    });

    return Object.entries(deptTotals)
      .map(([name, val]) => ({ name, budget: val.budget, actual: val.actual }))
      .filter(d => d.budget > 0 || d.actual > 0);
  }, [filteredItems, activeMonthFilter]);

  return (
    <div id={id} className="space-y-6">
      {/* Title & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 border border-gray-200 rounded-xl shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-400 mt-1">
            April - June 2026 detailed expenditures, variance indicators, and unspent balances.
          </p>
        </div>
        <div className="flex gap-4">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-gray-400">Total Records</span>
            <p className="text-md font-extrabold text-gray-950 mt-0.5">{filteredItems.length}</p>
          </div>
          <div className="border-l border-gray-200 pl-4 text-right">
            <span className="text-[10px] uppercase font-bold text-gray-400">Section Subtotals</span>
            <p className="text-md font-extrabold text-blue-600 mt-0.5">
              {filteredItems.filter(i => i.isSubtotal).length}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="flex flex-col md:flex-row flex-wrap gap-4 items-stretch md:items-center bg-white p-4 border border-gray-100 rounded-xl shadow-xs">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search headings or descriptions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50/50 border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-xs text-gray-700 outline-none focus:bg-white focus:border-blue-500 hover:border-gray-300 transition-all font-medium"
          />
        </div>

        {/* Department Filter */}
        <div className="relative min-w-[150px] flex-1 md:flex-initial">
          <SearchableSelect
            value={selectedDept}
            onChange={setSelectedDept}
            options={uniqueDepts}
            allOptionLabel="All Departments"
            multiple
          />
        </div>

        {/* Cost Heading Filter */}
        <div className="relative min-w-[150px] flex-1 md:flex-initial">
          <SearchableSelect
            value={selectedCostHeading}
            onChange={setSelectedCostHeading}
            options={uniqueCostHeadings}
            allOptionLabel="All Cost Headings"
            multiple
          />
        </div>

        {/* Project Filter */}
        <div className="relative min-w-[180px] flex-1 md:flex-initial max-w-full md:max-w-xs">
          <SearchableSelect
            value={selectedProject}
            onChange={setSelectedProject}
            options={uniqueProjects.map(proj => ({
              value: proj,
              label: proj.length > 50 ? proj.substring(0, 47) + "..." : proj
            }))}
            allOptionLabel="All Projects / Descriptions"
            multiple
          />
        </div>

        {/* Exceeded Budget Switcher */}
        <div className="flex items-center gap-2 bg-slate-50/50 px-3.5 py-2 rounded-lg border border-gray-200 shrink-0 select-none">
          <input
            type="checkbox"
            id={`budget-checkbox-${title.replace(/\s+/g, '')}`}
            checked={showOverBudgetOnly}
            onChange={(e) => setShowOverBudgetOnly(e.target.checked)}
            className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
          />
          <label 
            htmlFor={`budget-checkbox-${title.replace(/\s+/g, '')}`}
            className="text-[11px] font-bold text-gray-600 select-none cursor-pointer flex items-center gap-1.5"
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            Over Budget Limit
          </label>
        </div>

        {/* Clear Filters Button */}
        {isAnyFilterActive && (
          <button
            onClick={handleClearFilters}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50/80 hover:bg-rose-100/90 text-rose-600 hover:text-rose-700 border border-rose-150 transition-all rounded-lg text-xs font-bold shrink-0 cursor-pointer select-none animate-fade-in"
          >
            <XCircle className="w-3.5 h-3.5" />
            Clear Filters
          </button>
        )}

        {/* Export PDF */}
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-700 transition-all rounded-lg text-xs font-bold shrink-0 cursor-pointer select-none shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
          Export PDF
        </button>
      </div>

      {/* Month Perspective Selector & Beautiful Header */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 px-2.5 bg-indigo-500/20 text-indigo-300 font-mono text-[9px] font-bold rounded-full uppercase tracking-wider">
              Ledger Switcher
            </span>
            <span className="text-white/40 text-xs font-semibold">•</span>
            <span className="text-[10px] text-indigo-200 uppercase font-black tracking-wider">
              {activeMonthFilter === "ALL" ? "All Months Combined" : `${activeMonthFilter === "APR" ? "April" : activeMonthFilter === "MAY" ? "May" : "June"} Focused`}
            </span>
          </div>
          <h3 className="text-lg font-extrabold tracking-tight text-white mt-1">
            Q2 Fiscal Perspective Selector
          </h3>
          <p className="text-xs text-indigo-200/70 mt-0.5">
            Click any month to instantly isolate and query its budget thresholds, audited actuals, and remaining balance.
          </p>
        </div>

        {/* Month Tabs */}
        <div className="flex bg-white/10 backdrop-blur-xs rounded-xl p-1 border border-white/10 shrink-0 self-stretch md:self-auto justify-stretch md:justify-start">
          <button
            onClick={() => setActiveMonthFilter("ALL")}
            className={`flex-1 md:flex-none cursor-pointer px-4.5 py-2 rounded-lg text-xs font-extrabold transition-all duration-200 flex items-center justify-center gap-2 select-none ${
              activeMonthFilter === "ALL"
                ? "bg-white text-indigo-950 shadow-sm"
                : "text-white/80 hover:text-white hover:bg-white/5"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            All Q2
          </button>
          <button
            onClick={() => setActiveMonthFilter("APR")}
            className={`flex-1 md:flex-none cursor-pointer px-4.5 py-2 rounded-lg text-xs font-extrabold transition-all duration-200 flex items-center justify-center gap-2 select-none ${
              activeMonthFilter === "APR"
                ? "bg-white text-indigo-950 shadow-sm"
                : "text-white/80 hover:text-white hover:bg-white/5"
            }`}
          >
            April
          </button>
          <button
            onClick={() => setActiveMonthFilter("MAY")}
            className={`flex-1 md:flex-none cursor-pointer px-4.5 py-2 rounded-lg text-xs font-extrabold transition-all duration-200 flex items-center justify-center gap-2 select-none ${
              activeMonthFilter === "MAY"
                ? "bg-white text-indigo-950 shadow-sm"
                : "text-white/80 hover:text-white hover:bg-white/5"
            }`}
          >
            May
          </button>
          <button
            onClick={() => setActiveMonthFilter("JUN")}
            className={`flex-1 md:flex-none cursor-pointer px-4.5 py-2 rounded-lg text-xs font-extrabold transition-all duration-200 flex items-center justify-center gap-2 select-none ${
              activeMonthFilter === "JUN"
                ? "bg-white text-indigo-950 shadow-sm"
                : "text-white/80 hover:text-white hover:bg-white/5"
            }`}
          >
            June
          </button>
        </div>
      </div>

      {/* Dynamic Summary Cards Grid (Animated & Beautiful) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
        <MetricCard
          id="q2-metric-budget"
          title={activeMonthFilter === "ALL" ? "Total Budget" : activeMonthFilter === "APR" ? "April" : activeMonthFilter === "MAY" ? "May" : "June"}
          value={formatBDT(
            activeMonthFilter === "ALL" ? q2Totals.aprBudget + q2Totals.mayBudget + q2Totals.junBudget :
            activeMonthFilter === "APR" ? q2Totals.aprBudget :
            activeMonthFilter === "MAY" ? q2Totals.mayBudget : q2Totals.junBudget
          )}
          subtext={activeMonthFilter === "ALL" ? "Full Q2 Total" : activeMonthFilter === "APR" ? "April Allocation" : activeMonthFilter === "MAY" ? "May Allocation" : "June Allocation"}
          icon={<Wallet className="w-5 h-5 text-indigo-600" />}
          sheetItemsQ2={filteredItems}
          defaultOpenSection="Q2"
          selectedMonth={activeMonthFilter}
        />

        <MetricCard
          id="q2-metric-spent"
          title={activeMonthFilter === "ALL" ? "Total Actual" : activeMonthFilter === "APR" ? "April Actual" : activeMonthFilter === "MAY" ? "May Actual" : "June Actual"}
          value={activeMonthFilter === "APR" ? "Not Logged" : formatBDT(
            activeMonthFilter === "ALL" ? q2Totals.mayActual + q2Totals.junActual :
            activeMonthFilter === "MAY" ? q2Totals.mayActual : q2Totals.junActual
          )}
          subtext={activeMonthFilter === "APR" ? "No April disbursements" : "Audited Cash Spent"}
          icon={<TrendingDown className="w-5 h-5 text-blue-600" />}
          sheetItemsQ2={filteredItems}
          defaultOpenSection="Q2"
          selectedMonth={activeMonthFilter}
        />

        <MetricCard
          id="q2-metric-variance"
          title="Variance"
          value={(() => {
            const v = activeMonthFilter === "ALL" ? q2Totals.mayVariance + q2Totals.junVariance :
                      activeMonthFilter === "APR" ? 0 :
                      activeMonthFilter === "MAY" ? q2Totals.mayVariance : q2Totals.junVariance;
            const b = activeMonthFilter === "ALL" ? q2Totals.mayBudget + q2Totals.junBudget :
                      activeMonthFilter === "APR" ? q2Totals.aprBudget :
                      activeMonthFilter === "MAY" ? q2Totals.mayBudget : q2Totals.junBudget;
            if (b === 0) return "—";
            const pct = (v / b) * 100;
            return (pct >= 0 ? "+" : "") + pct.toFixed(1) + "%";
          })()}
          subtext="Variance % against budget"
          icon={<ArrowRightLeft className="w-5 h-5 text-purple-600" />}
          sheetItemsQ2={filteredItems}
          defaultOpenSection="Q2"
          selectedMonth={activeMonthFilter}
        />

        <MetricCard
          id="q2-metric-remaining"
          title={activeMonthFilter === "ALL" ? "Total Remaining" : activeMonthFilter === "APR" ? "April Remaining" : activeMonthFilter === "MAY" ? "May Remaining" : "June Remaining"}
          value={formatBDT(
            activeMonthFilter === "ALL" ? q2Totals.mayRemaining + q2Totals.junRemaining :
            activeMonthFilter === "APR" ? q2Totals.aprBudget :
            activeMonthFilter === "MAY" ? q2Totals.mayRemaining : q2Totals.junRemaining
          )}
          subtext={(activeMonthFilter === "ALL" ? q2Totals.mayRemaining + q2Totals.junRemaining :
                    activeMonthFilter === "APR" ? q2Totals.aprBudget :
                    activeMonthFilter === "MAY" ? q2Totals.mayRemaining : q2Totals.junRemaining) < 0 ? "Over budget limit warn" : "Remaining safety buffer"}
          icon={(activeMonthFilter === "ALL" ? q2Totals.mayRemaining + q2Totals.junRemaining :
                 activeMonthFilter === "APR" ? q2Totals.aprBudget :
                 activeMonthFilter === "MAY" ? q2Totals.mayRemaining : q2Totals.junRemaining) < 0 
                  ? <AlertCircle className="w-5 h-5 text-rose-500 animate-pulse" /> 
                  : <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          sheetItemsQ2={filteredItems}
          defaultOpenSection="Q2"
          selectedMonth={activeMonthFilter}
        />

        <MetricCard
          id="q2-metric-efficiency"
          title="Consumed Rate"
          value={(() => {
            const b = activeMonthFilter === "ALL" ? q2Totals.aprBudget + q2Totals.mayBudget + q2Totals.junBudget :
                      activeMonthFilter === "APR" ? q2Totals.aprBudget :
                      activeMonthFilter === "MAY" ? q2Totals.mayBudget : q2Totals.junBudget;
            const a = activeMonthFilter === "ALL" ? q2Totals.mayActual + q2Totals.junActual :
                      activeMonthFilter === "APR" ? 0 :
                      activeMonthFilter === "MAY" ? q2Totals.mayActual : q2Totals.junActual;
            return b > 0 ? ((a / b) * 100).toFixed(1) + "%" : "0.0%";
          })()}
          subtext="Spent rate against current limit"
          icon={<Activity className="w-5 h-5 text-emerald-500" />}
          progress={{
            value: (() => {
              const b = activeMonthFilter === "ALL" ? q2Totals.aprBudget + q2Totals.mayBudget + q2Totals.junBudget :
                        activeMonthFilter === "APR" ? q2Totals.aprBudget :
                        activeMonthFilter === "MAY" ? q2Totals.mayBudget : q2Totals.junBudget;
              const a = activeMonthFilter === "ALL" ? q2Totals.mayActual + q2Totals.junActual :
                        activeMonthFilter === "APR" ? 0 :
                        activeMonthFilter === "MAY" ? q2Totals.mayActual : q2Totals.junActual;
              return b > 0 ? (a / b) * 100 : 0;
            })(),
            color: (() => {
              const b = activeMonthFilter === "ALL" ? q2Totals.aprBudget + q2Totals.mayBudget + q2Totals.junBudget :
                        activeMonthFilter === "APR" ? q2Totals.aprBudget :
                        activeMonthFilter === "MAY" ? q2Totals.mayBudget : q2Totals.junBudget;
              const a = activeMonthFilter === "ALL" ? q2Totals.mayActual + q2Totals.junActual :
                        activeMonthFilter === "APR" ? 0 :
                        activeMonthFilter === "MAY" ? q2Totals.mayActual : q2Totals.junActual;
              const pct = b > 0 ? (a / b) * 100 : 0;
              return pct > 100 ? "bg-rose-500" : pct > 85 ? "bg-amber-500" : "bg-emerald-500";
            })()
          }}
          sheetItemsQ2={filteredItems}
          defaultOpenSection="Q2"
          selectedMonth={activeMonthFilter}
        />
      </div>

      {/* Top 5 Allocations + Departments Needing Attention */}
      <BudgetAttentionCards
        sheetItemsQ2={filteredItems}
        timePeriod={activeMonthFilter === "ALL" ? "Q2" : activeMonthFilter}
      />

      {/* Budget vs Actual by Department Bar Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mt-6 mb-6">
        <h3 className="font-bold text-gray-800 text-[15px] mb-6 flex items-center gap-2">
          <ChartBar className="w-5 h-5 text-blue-500" />
          Budget vs Actual — All Departments
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={deptChartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 11, fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
                angle={-25}
                textAnchor="end"
                className="select-none"
              />
              <YAxis 
                tick={{ fontSize: 11, fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
              />
              <Tooltip 
                cursor={{ fill: '#F3F4F6' }}
                contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                formatter={(value: number) => new Intl.NumberFormat('en-US').format(value)}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="budget" name="Budget" fill="#BFDBFE" stroke="#3B82F6" strokeWidth={1} radius={[4, 4, 0, 0]} />
              <Bar dataKey="actual" name="Actual" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid: Top Spend items visualizer & Table */}
      {topSpendChartData.length > 0 && (
        <div className="bg-white p-5 border border-gray-200 rounded-xl shadow-sm">
          <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5 mb-4">
            <ChartBar className="w-4 h-4 text-gray-400" />
            Top Financial Drivers in Current Filter Set
          </h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={topSpendChartData}
                margin={{ top: 0, right: 10, left: 20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#0f172a" }} width={120} />
                <Tooltip formatter={(value: any) => [formatBDT(Number(value)), undefined]} />
                <Bar dataKey="Budget" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tabular Scroller */}
      {(() => {
        const visibleItems = tableExpanded ? filteredItems : filteredItems.slice(0, 10);
        type NumCol = "aprBudget"|"mayBudget"|"mayActual"|"mayVariance"|"mayRemaining"|"junBudget"|"junActual"|"junVariance"|"junRemaining";

        const runningTotal = (col: NumCol): number | null => {
          if (!hoveredCell || hoveredCell.col !== col) return null;
          let sum = 0;
          for (let i = 0; i <= hoveredCell.rowIdx && i < visibleItems.length; i++) {
            sum += (visibleItems[i][col] as number) || 0;
          }
          return sum;
        };

        const NumCell = ({ value, col, rowIdx, bold, colorFn, isVar }: {
          value: number; col: NumCol; rowIdx: number;
          bold?: boolean; colorFn?: (v: number) => string; isVar?: boolean;
        }) => {
          const rt = runningTotal(col);
          const isHovered = hoveredCell?.col === col && hoveredCell?.rowIdx === rowIdx;
          const colorClass = colorFn ? colorFn(value) : "";
          return (
            <td
              className={`relative py-3 px-3 text-right text-[11px] tabular-nums whitespace-nowrap select-none ${bold ? "font-bold" : "font-medium"} ${colorClass} cursor-default`}
              onMouseEnter={() => setHoveredCell({ rowIdx, col })}
              onMouseLeave={() => setHoveredCell(null)}
            >
              {isVar ? (
                value === 0 ? <span className="text-gray-300">—</span> : (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    value < 0 ? "bg-red-50 text-red-600 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}>{formatVar(value)}</span>
                )
              ) : (
                <span className={isHovered ? "underline decoration-dotted" : ""}>{formatBDT(value)}</span>
              )}
              {isHovered && rt !== null && !isVar && (
                <div className="absolute right-2 -top-8 z-50 bg-gray-900 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap pointer-events-none border border-gray-700">
                  <span className="text-gray-400 font-normal">Cumulative: </span>{formatBDT(rt)}
                </div>
              )}
            </td>
          );
        };

        return (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm flex flex-col">
            <div className={`overflow-x-auto ${tableExpanded ? "max-h-[640px] overflow-y-auto" : ""}`}>
              <table className="w-full text-left border-collapse table-auto bg-white">
                <thead className="sticky top-0 z-20">
                  {/* Month group headers */}
                  <tr className="border-b border-gray-200 text-[9px] font-black uppercase tracking-widest select-none">
                    <th colSpan={3} className="py-2 px-4 text-gray-400 bg-gray-50 border-r border-gray-100" />
                    <th colSpan={1} className="py-2 px-3 text-center bg-sky-50 text-sky-600 border-r border-sky-100">April 2026</th>
                    <th colSpan={3} className="py-2 px-3 text-center bg-blue-50 text-blue-600 border-r border-blue-100">May 2026</th>
                    <th colSpan={3} className="py-2 px-3 text-center bg-indigo-50 text-indigo-600 border-r border-indigo-100">June 2026</th>
                  </tr>
                  {/* Sub-column headers */}
                  <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider select-none">
                    <th className="py-3 px-4 text-left min-w-[90px]">Dept</th>
                    <th className="py-3 px-3 text-left min-w-[160px]">Cost Heading</th>
                    <th className="py-3 px-3 text-left min-w-[240px] border-r border-gray-200">Description</th>
                    <th className="py-3 px-3 text-right bg-sky-50/60 text-sky-700 border-r border-sky-100">Budget</th>
                    <th className="py-3 px-3 text-right bg-blue-50/60 text-blue-700">Budget</th>
                    <th className="py-3 px-3 text-right bg-blue-50/60 text-blue-700">Actual</th>
                    <th className="py-3 px-3 text-right bg-blue-50/60 text-blue-700">Variance</th>
                    <th className="py-3 px-3 text-right bg-blue-50/60 text-blue-700 border-r border-blue-100">Remaining</th>
                    <th className="py-3 px-3 text-right bg-indigo-50/60 text-indigo-700">Budget</th>
                    <th className="py-3 px-3 text-right bg-indigo-50/60 text-indigo-700">Actual</th>
                    <th className="py-3 px-3 text-right bg-indigo-50/60 text-indigo-700">Variance</th>
                    <th className="py-3 px-3 text-right bg-indigo-50/60 text-indigo-700">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleItems.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-10 text-center text-gray-400 text-sm">
                        No budget records match the selected filters or search terms.
                      </td>
                    </tr>
                  ) : visibleItems.map((item, rowIdx) => {
                    const isSub = item.isSubtotal;
                    const isHead = item.isHeader;
                    const rowBase = isSub
                      ? "bg-gradient-to-r from-blue-50/70 to-indigo-50/30 border-b border-blue-100/60"
                      : isHead
                        ? "bg-slate-50 border-b border-slate-200 font-semibold"
                        : rowIdx % 2 === 0
                          ? "bg-white border-b border-gray-100 hover:bg-blue-50/20 transition-colors"
                          : "bg-gray-50/50 border-b border-gray-100 hover:bg-blue-50/20 transition-colors";
                    return (
                      <tr key={item.id} className={rowBase}>
                        {/* Dept chip */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isSub ? "bg-blue-100 text-blue-700" : isHead ? "bg-slate-200 text-slate-600" : "bg-gray-100 text-gray-600"
                          }`}>
                            {item.department || "—"}
                          </span>
                        </td>
                        {/* Cost heading */}
                        <td className={`py-3 px-3 text-[11px] leading-snug ${isSub ? "font-black text-gray-900" : "font-semibold text-gray-800"}`}>
                          {item.costHeading || "—"}
                        </td>
                        {/* Description — full text, wraps */}
                        <td className="py-3 px-3 text-[11px] text-gray-500 leading-relaxed min-w-[240px] max-w-[360px] border-r border-gray-200 whitespace-normal break-words">
                          {item.description || "—"}
                        </td>
                        {/* April */}
                        <NumCell value={item.aprBudget} col="aprBudget" rowIdx={rowIdx} bold={isSub} />
                        {/* May */}
                        <NumCell value={item.mayBudget} col="mayBudget" rowIdx={rowIdx} bold={isSub} />
                        <NumCell value={item.mayActual} col="mayActual" rowIdx={rowIdx} bold={isSub} colorFn={v => v > item.mayBudget && item.mayBudget > 0 ? "text-rose-600" : "text-gray-800"} />
                        <NumCell value={item.mayVariance} col="mayVariance" rowIdx={rowIdx} isVar />
                        <NumCell value={item.mayRemaining} col="mayRemaining" rowIdx={rowIdx} bold={isSub} colorFn={v => v < 0 ? "text-rose-600 bg-rose-50/30" : "text-emerald-700"} />
                        {/* June */}
                        <NumCell value={item.junBudget} col="junBudget" rowIdx={rowIdx} bold={isSub} />
                        <NumCell value={item.junActual} col="junActual" rowIdx={rowIdx} bold={isSub} colorFn={v => v > item.junBudget && item.junBudget > 0 ? "text-rose-600" : "text-gray-800"} />
                        <NumCell value={item.junVariance} col="junVariance" rowIdx={rowIdx} isVar />
                        <NumCell value={item.junRemaining} col="junRemaining" rowIdx={rowIdx} bold={isSub} colorFn={v => v < 0 ? "text-rose-600 bg-rose-50/30" : "text-emerald-700"} />
                      </tr>
                    );
                  })}
                </tbody>
                {/* Grand totals footer */}
                {visibleItems.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-900 text-white text-[11px] font-black border-t-2 border-slate-700 sticky bottom-0">
                      <td colSpan={3} className="py-3.5 px-4">
                        <span className="text-slate-400 text-[10px] uppercase tracking-wider">Grand Total</span>
                      </td>
                      <td className="py-3.5 px-3 text-right tabular-nums">{formatBDT(q2Totals.aprBudget)}</td>
                      <td className="py-3.5 px-3 text-right tabular-nums">{formatBDT(q2Totals.mayBudget)}</td>
                      <td className="py-3.5 px-3 text-right tabular-nums">{formatBDT(q2Totals.mayActual)}</td>
                      <td className="py-3.5 px-3 text-right tabular-nums">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] border font-black ${q2Totals.mayVariance < 0 ? "bg-red-900/40 text-red-300 border-red-700" : "bg-emerald-900/40 text-emerald-300 border-emerald-700"}`}>
                          {formatVar(q2Totals.mayVariance)}
                        </span>
                      </td>
                      <td className={`py-3.5 px-3 text-right tabular-nums ${q2Totals.mayRemaining < 0 ? "text-red-400" : "text-emerald-400"}`}>{formatBDT(q2Totals.mayRemaining)}</td>
                      <td className="py-3.5 px-3 text-right tabular-nums">{formatBDT(q2Totals.junBudget)}</td>
                      <td className="py-3.5 px-3 text-right tabular-nums">{formatBDT(q2Totals.junActual)}</td>
                      <td className="py-3.5 px-3 text-right tabular-nums">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] border font-black ${q2Totals.junVariance < 0 ? "bg-red-900/40 text-red-300 border-red-700" : "bg-emerald-900/40 text-emerald-300 border-emerald-700"}`}>
                          {formatVar(q2Totals.junVariance)}
                        </span>
                      </td>
                      <td className={`py-3.5 px-3 text-right tabular-nums ${q2Totals.junRemaining < 0 ? "text-red-400" : "text-emerald-400"}`}>{formatBDT(q2Totals.junRemaining)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            {filteredItems.length > 10 && (
              <div className="bg-gray-50 border-t border-gray-100 p-2 text-center">
                <button
                  onClick={() => setTableExpanded(!tableExpanded)}
                  className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors rounded-lg w-full flex items-center justify-center gap-2 outline-none"
                >
                  {tableExpanded ? "View Less" : `View More (${filteredItems.length - 10} hidden rows)`}
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* 3 Department/Team Wise Pie/Donut Charts */}
      <div className="flex flex-col gap-8 mt-8">
        {/* Chart 1: Department Wise Budget */}
        <div className="bg-white p-6 md:p-8 border border-gray-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="mb-6 border-b border-gray-100 pb-4">
            <h4 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <Wallet className="w-5 h-5" />
              </div>
              Department Budget Allocation
            </h4>
            <p className="text-sm text-gray-500 mt-1">Proportional budget limits assigned under chosen period</p>
          </div>
          {departmentPieChartData.budgetData.length > 0 ? (
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="h-[350px] w-full md:w-3/5 flex-shrink-0 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={departmentPieChartData.budgetData}
                      cx="50%"
                      cy="50%"
                      innerRadius="55%"
                      outerRadius="85%"
                      paddingAngle={4}
                      cornerRadius={6}
                      dataKey="value"
                      stroke="none"
                    >
                      {departmentPieChartData.budgetData.map((entry, index) => (
                        <Cell key={`cell-budget-${index}`} fill={entry.color} className="hover:opacity-80 transition-opacity duration-300 outline-none" />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white/95 backdrop-blur-sm p-3 border border-gray-100 rounded-xl shadow-xl ring-1 ring-black/5">
                              <p className="text-sm font-semibold text-gray-800 mb-1">{payload[0].name}</p>
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: payload[0].payload.color }}></span>
                                <span className="font-bold text-gray-900">{formatBDT(Number(payload[0].value))}</span>
                                <span className="text-xs text-gray-500 ml-1">Budget</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none drop-shadow-sm">
                  <div className="text-center bg-white/40 backdrop-blur-md w-36 h-36 rounded-full flex flex-col items-center justify-center border border-white/50 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]">
                    <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-1.5">Total Budget</span>
                    <p className="text-lg font-black text-gray-900 leading-tight">
                      {formatBDT(departmentPieChartData.totalBudgetSum)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="w-full md:w-2/5 md:max-h-[350px] overflow-y-auto pr-3 space-y-2 custom-scrollbar">
                {departmentPieChartData.budgetData
                  .sort((a,b) => b.value - a.value)
                  .map((entry) => (
                  <div key={entry.name} className="flex justify-between items-center text-sm border border-transparent hover:border-gray-100 hover:bg-slate-50/80 p-2.5 rounded-xl transition-all group">
                    <div className="flex items-center gap-3 min-w-0 mr-4">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: entry.color + '20' }}>
                        <span className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: entry.color }} />
                      </div>
                      <span className="text-gray-700 font-medium truncate group-hover:text-gray-900 transition-colors" title={entry.name}>{entry.name}</span>
                    </div>
                    <span className="font-bold text-gray-800 shrink-0 tabular-nums">{formatBDT(entry.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[350px] flex items-center justify-center text-sm text-gray-400 font-medium bg-slate-50/50 rounded-2xl border border-dashed border-gray-200 mt-4">
              No budget allocation data
            </div>
          )}
        </div>

        {/* Chart 2: Department Wise Actual Spent */}
        <div className="bg-white p-6 md:p-8 border border-gray-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="mb-6 border-b border-gray-100 pb-4">
            <h4 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <DollarSign className="w-5 h-5" />
              </div>
              Department Actual Spent
            </h4>
            <p className="text-sm text-gray-500 mt-1">Distribution of absolute spent figures across departments</p>
          </div>
          {departmentPieChartData.spentData.length > 0 ? (
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="h-[350px] w-full md:w-3/5 flex-shrink-0 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={departmentPieChartData.spentData}
                      cx="50%"
                      cy="50%"
                      innerRadius="55%"
                      outerRadius="85%"
                      paddingAngle={4}
                      cornerRadius={6}
                      dataKey="value"
                      stroke="none"
                    >
                      {departmentPieChartData.spentData.map((entry, index) => (
                        <Cell key={`cell-spent-${index}`} fill={entry.color} className="hover:opacity-80 transition-opacity duration-300 outline-none" />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white/95 backdrop-blur-sm p-3 border border-gray-100 rounded-xl shadow-xl ring-1 ring-black/5">
                              <p className="text-sm font-semibold text-gray-800 mb-1">{payload[0].name}</p>
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: payload[0].payload.color }}></span>
                                <span className="font-bold text-gray-900">{formatBDT(Number(payload[0].value))}</span>
                                <span className="text-xs text-gray-500 ml-1">Spent</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none drop-shadow-sm">
                  <div className="text-center bg-white/40 backdrop-blur-md w-36 h-36 rounded-full flex flex-col items-center justify-center border border-white/50 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]">
                    <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-1.5">Total Spent</span>
                    <p className="text-lg font-black text-gray-900 leading-tight">
                      {formatBDT(departmentPieChartData.totalSpentSum)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="w-full md:w-2/5 md:max-h-[350px] overflow-y-auto pr-3 space-y-2 custom-scrollbar">
                {departmentPieChartData.spentData
                  .sort((a,b) => b.value - a.value)
                  .map((entry) => (
                  <div key={entry.name} className="flex justify-between items-center text-sm border border-transparent hover:border-gray-100 hover:bg-slate-50/80 p-2.5 rounded-xl transition-all group">
                    <div className="flex items-center gap-3 min-w-0 mr-4">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: entry.color + '20' }}>
                        <span className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: entry.color }} />
                      </div>
                      <span className="text-gray-700 font-medium truncate group-hover:text-gray-900 transition-colors" title={entry.name}>{entry.name}</span>
                    </div>
                    <span className="font-bold text-gray-800 shrink-0 tabular-nums">{formatBDT(entry.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[350px] flex items-center justify-center text-sm text-gray-400 font-medium bg-slate-50/50 rounded-2xl border border-dashed border-gray-200 mt-4">
              No actual spent data recorded in selection
            </div>
          )}
        </div>

        {/* Chart 3: Department Wise Consumption Rate */}
        <div className="bg-white p-6 md:p-8 border border-gray-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="mb-6 border-b border-gray-100 pb-4">
            <h4 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                <Percent className="w-5 h-5" />
              </div>
              Department Consumption Rate
            </h4>
            <p className="text-sm text-gray-500 mt-1">Percentage consumption of allocated budget by department</p>
          </div>
          {departmentPieChartData.consumptionData.length > 0 ? (
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="h-[350px] w-full md:w-3/5 flex-shrink-0 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={departmentPieChartData.consumptionData}
                      cx="50%"
                      cy="50%"
                      innerRadius="55%"
                      outerRadius="85%"
                      paddingAngle={4}
                      cornerRadius={6}
                      dataKey="value"
                      stroke="none"
                    >
                      {departmentPieChartData.consumptionData.map((entry, index) => (
                        <Cell key={`cell-rate-${index}`} fill={entry.color} className="hover:opacity-80 transition-opacity duration-300 outline-none" />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white/95 backdrop-blur-sm p-3 border border-gray-100 rounded-xl shadow-xl ring-1 ring-black/5">
                              <p className="text-sm font-semibold text-gray-800 mb-1">{payload[0].name}</p>
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: payload[0].payload.color }}></span>
                                <span className="font-bold text-gray-900">{payload[0].value}%</span>
                                <span className="text-xs text-gray-500 ml-1">Consumption Rate</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none drop-shadow-sm">
                  <div className="text-center bg-white/40 backdrop-blur-md w-36 h-36 rounded-full flex flex-col items-center justify-center border border-white/50 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]">
                    <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-1.5">Avg Rate</span>
                    <p className="text-3xl font-black text-amber-600 leading-tight">
                      {departmentPieChartData.overallRate}%
                    </p>
                  </div>
                </div>
              </div>
              <div className="w-full md:w-2/5 md:max-h-[350px] overflow-y-auto pr-3 space-y-2 custom-scrollbar">
                {departmentPieChartData.consumptionData
                  .sort((a,b) => b.value - a.value)
                  .map((entry) => (
                  <div key={entry.name} className="flex justify-between items-center text-sm border border-transparent hover:border-gray-100 hover:bg-slate-50/80 p-2.5 rounded-xl transition-all group">
                    <div className="flex items-center gap-3 min-w-0 mr-4">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: entry.color + '20' }}>
                        <span className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: entry.color }} />
                      </div>
                      <span className="text-gray-700 font-medium truncate group-hover:text-gray-900 transition-colors" title={entry.name}>{entry.name}</span>
                    </div>
                    <span className="font-bold text-amber-600 shrink-0 tabular-nums">{entry.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[350px] flex items-center justify-center text-sm text-gray-400 font-medium bg-slate-50/50 rounded-2xl border border-dashed border-gray-200 mt-4">
              No consumption metrics available for selection
            </div>
          )}
        </div>
      </div>

      {/* Month Wise Comparison Bar Chart */}
      <div className="bg-white p-6 md:p-8 border border-gray-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] mt-8">
        <div className="mb-6 border-b border-gray-100 pb-4">
          <h4 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <ChartBar className="w-5 h-5" />
            </div>
            Department Month-Wise Actual Spent
          </h4>
          <p className="text-sm text-gray-500 mt-1">Comparison of actual spent across Apr, May, and Jun per department</p>
        </div>
        
        {departmentMonthWiseData.length > 0 ? (
          <div className="h-[600px] w-full mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={departmentMonthWiseData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                <XAxis 
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  tickFormatter={(value) => `৳${(value / 1000).toFixed(0)}k`}
                />
                <YAxis 
                  dataKey="name" 
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  width={150}
                />
                <Tooltip 
                  cursor={{ fill: '#F3F4F6' }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const apr = data.Apr || 0;
                      const may = data.May || 0;
                      const jun = data.Jun || 0;
                      
                      const getChange = (curr: number, prev: number) => {
                        if (prev === 0) return { val: 0, text: '-', type: 'neutral' };
                        const pct = ((curr - prev) / prev) * 100;
                        if (pct > 0) return { val: pct, text: `↑${pct.toFixed(1)}%`, type: 'up' };
                        if (pct < 0) return { val: pct, text: `↓${Math.abs(pct).toFixed(1)}%`, type: 'down' };
                        return { val: 0, text: '0%', type: 'neutral' };
                      };
                      
                      const mayChange = getChange(may, apr);
                      const junChange = getChange(jun, may);
                      
                      return (
                        <div className="bg-white/95 backdrop-blur-sm p-4 border border-gray-100 rounded-xl shadow-xl ring-1 ring-black/5 min-w-[240px]">
                          <p className="font-semibold text-gray-900 mb-3 border-b border-gray-100 pb-2">{label}</p>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-sm bg-[#3b82f6]"></div>
                                <span className="text-sm font-medium text-gray-700">April</span>
                              </div>
                              <span className="text-sm font-bold text-gray-900 tabular-nums">
                                {formatBDT(apr)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-sm bg-[#10b981]"></div>
                                <span className="text-sm font-medium text-gray-700">May</span>
                              </div>
                              <div className="flex items-center gap-2.5">
                                <span className="text-sm font-bold text-gray-900 tabular-nums">
                                  {formatBDT(may)}
                                </span>
                                {mayChange.text !== '-' && (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md min-w-[48px] text-center ${
                                    mayChange.type === 'up' ? 'bg-red-50 text-red-600' :
                                    mayChange.type === 'down' ? 'bg-emerald-50 text-emerald-600' :
                                    'bg-gray-100 text-gray-600'
                                  }`}>
                                    {mayChange.text}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-sm bg-[#f59e0b]"></div>
                                <span className="text-sm font-medium text-gray-700">June</span>
                              </div>
                              <div className="flex items-center gap-2.5">
                                <span className="text-sm font-bold text-gray-900 tabular-nums">
                                  {formatBDT(jun)}
                                </span>
                                {junChange.text !== '-' && (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md min-w-[48px] text-center ${
                                    junChange.type === 'up' ? 'bg-red-50 text-red-600' :
                                    junChange.type === 'down' ? 'bg-emerald-50 text-emerald-600' :
                                    'bg-gray-100 text-gray-600'
                                  }`}>
                                    {junChange.text}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="Apr" name="April" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={20} />
                <Bar dataKey="May" name="May" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={20} />
                <Bar dataKey="Jun" name="June" fill="#f59e0b" radius={[0, 4, 4, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[400px] flex items-center justify-center text-sm text-gray-400 font-medium bg-slate-50/50 rounded-2xl border border-dashed border-gray-200 mt-4">
            No month-wise data available
          </div>
        )}
      </div>

    </div>
  );
}

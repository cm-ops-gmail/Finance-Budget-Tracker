import React, { useState, useMemo } from "react";
import { Q3Item } from "../types.ts";
import MetricCard from "./MetricCard.tsx";
import SearchableSelect from "./SearchableSelect.tsx";
import BudgetAttentionCards from "./BudgetAttentionCards.tsx";
import { Search, Filter, RefreshCw, CheckSquare, Squircle, XCircle, Wallet, Calendar, CheckCircle2, DollarSign, Activity, Percent, Compass, AlertCircle, TrendingDown, ChartBar, ArrowRightLeft, Download } from "lucide-react";
import { exportPDF } from "../utils/exportPDF";
import { motion } from "motion/react";
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

interface QuarterConfig {
  quarter: string;   // "Q3" | "Q4"
  m1: string;        // "JUL" | "OCT"  — internal filter key
  m2: string;        // "AUG" | "NOV"
  m3: string;        // "SEP" | "DEC"
  m1Short: string;   // "Jul" | "Oct"
  m2Short: string;   // "Aug" | "Nov"
  m3Short: string;   // "Sep" | "Dec"
  m1Full: string;    // "July" | "October"
  m2Full: string;    // "August" | "November"
  m3Full: string;    // "September" | "December"
}

const Q3_CONFIG: QuarterConfig = {
  quarter: "Q3", m1: "JUL", m2: "AUG", m3: "SEP",
  m1Short: "Jul", m2Short: "Aug", m3Short: "Sep",
  m1Full: "July", m2Full: "August", m3Full: "September",
};

interface Q3BudgetGridProps {
  id: string;
  items: Q3Item[];
  title: string;
  quarterConfig?: QuarterConfig;
}

const COLORS = ["#1e293b", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899"];

export default function Q3BudgetGrid({ id, items, title, quarterConfig = Q3_CONFIG }: Q3BudgetGridProps) {
  const { quarter, m1, m2, m3, m1Short, m2Short, m3Short, m1Full, m2Full, m3Full } = quarterConfig;
  const [search, setSearch] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string[]>(["ALL"]);
  const [selectedCostType, setSelectedCostType] = useState<string[]>(["ALL"]);
  const [selectedSubTeam, setSelectedSubTeam] = useState<string[]>(["ALL"]);
  const [showSubtotals, setShowSubtotals] = useState(true);
  const [activeMonthFilter, setActiveMonthFilter] = useState<string>("ALL");
  const [tableExpanded, setTableExpanded] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{ rowIdx: number; col: string } | null>(null);

  const handleExportPDF = () => {
    const fmtNum = (n: number) =>
      new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
    const dataItems = filteredItems.filter(item => !item.isSubtotal);
    const rows = dataItems.map(item => [
      item.team,
      item.costType,
      item.purpose,
      fmtNum(item.julBudget),
      fmtNum(item.julActual),
      fmtNum(item.julVar),
      fmtNum(item.augBudget),
      fmtNum(item.augActual),
      fmtNum(item.augVar),
      fmtNum(item.sepBudget),
      fmtNum(item.sepActual),
      fmtNum(item.sepVar),
    ]);
    const totB = q3Totals.julBudget + q3Totals.augBudget + q3Totals.sepBudget;
    const totA = q3Totals.julActual + q3Totals.augActual + q3Totals.sepActual;
    const totV = q3Totals.julVar + q3Totals.augVar + q3Totals.sepVar;
    const varPct = totB > 0 ? ((totV / totB) * 100).toFixed(1) + "%" : "—";
    exportPDF({
      title: `${quarter} Budget Report`,
      subtitle: `Period: ${activeMonthFilter === "ALL" ? `All Months (${m1Full} – ${m3Full})` : activeMonthFilter}`,
      filters: [
        { label: "Team", value: selectedTeam.includes("ALL") ? "All" : selectedTeam.join(", ") },
        { label: "Cost Type", value: selectedCostType.includes("ALL") ? "All" : selectedCostType.join(", ") },
      ],
      summary: [
        { label: "Total Budget", value: "BDT " + fmtNum(totB) },
        { label: "Total Actual", value: "BDT " + fmtNum(totA) },
        { label: "Total Variance", value: "BDT " + fmtNum(totV) },
        { label: "Variance %", value: varPct },
        { label: "Rows Exported", value: String(rows.length) },
      ],
      columns: ["Team", "Cost Type", "Purpose", `${m1Full} Bgt`, `${m1Full} Act`, `${m1Full} Var`, `${m2Full} Bgt`, `${m2Full} Act`, `${m2Full} Var`, `${m3Full} Bgt`, `${m3Full} Act`, `${m3Full} Var`],
      rows,
      filename: `${quarter}-Budget-Report-${new Date().toISOString().slice(0, 10)}.pdf`,
    });
  };

  const isAnyFilterActive = 
    search !== "" || 
    selectedTeam.length > 0 && !(selectedTeam.length === 1 && selectedTeam[0] === "ALL") || 
    selectedCostType.length > 0 && !(selectedCostType.length === 1 && selectedCostType[0] === "ALL") || 
    selectedSubTeam.length > 0 && !(selectedSubTeam.length === 1 && selectedSubTeam[0] === "ALL") ||
    showSubtotals === false ||
    activeMonthFilter !== "ALL";

  const handleClearFilters = () => {
    setSearch("");
    setSelectedTeam(["ALL"]);
    setSelectedCostType(["ALL"]);
    setSelectedSubTeam(["ALL"]);
    setShowSubtotals(true);
    setActiveMonthFilter("ALL");
  };

  // Formatter utilities
  const formatBDT = (num: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num || 0);
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

  const isLc = useMemo(() => {
    return items.some(item => item.entity === "LC");
  }, [items]);

  const teamLabel = isLc ? "Department" : "Team";
  const subTeamLabel = isLc ? "Source" : "Sub-Team / Vertical / Project";
  const costTypeLabel = isLc ? "Description" : "Cost Type";
  const purposeLabel = isLc ? "Cost Heading by Finance" : "Purpose / Details";

  // Get list of unique Teams (Departments)
  const uniqueTeams = useMemo(() => {
    const set = new Set<string>();
    items.forEach(item => {
      if (item.team && !item.isSubtotal) set.add(item.team);
    });
    return Array.from(set).sort();
  }, [items]);

  // Get list of unique Cost Types (Cost Headings)
  const uniqueCostTypes = useMemo(() => {
    const set = new Set<string>();
    items.forEach(item => {
      if (item.costType && !item.isSubtotal) set.add(item.costType);
    });
    return Array.from(set).sort();
  }, [items]);

  // Get list of unique Subteams (Projects)
  const uniqueSubTeams = useMemo(() => {
    const set = new Set<string>();
    items.forEach(item => {
      if (item.subTeam && !item.isSubtotal) set.add(item.subTeam);
    });
    return Array.from(set).sort();
  }, [items]);

  // Handle data filtering
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // 1. Text Search matching team, subTeam, costType, purpose
      const textMatch =
        item.team.toLowerCase().includes(search.toLowerCase()) ||
        item.subTeam.toLowerCase().includes(search.toLowerCase()) ||
        item.costType.toLowerCase().includes(search.toLowerCase()) ||
        item.purpose.toLowerCase().includes(search.toLowerCase());

      // 2. Team selection
      const teamMatch = selectedTeam.includes("ALL") || selectedTeam.includes(item.team);

      // 3. Cost Type selection (Cost Heading)
      const costTypeMatch = selectedCostType.includes("ALL") || selectedCostType.includes(item.costType);

      // 4. SubTeam selection (Project)
      const subTeamMatch = selectedSubTeam.includes("ALL") || selectedSubTeam.includes(item.subTeam);

      // 5. Subtotal visibility toggle
      const subtotalMatch = showSubtotals || !item.isSubtotal;

      return textMatch && teamMatch && costTypeMatch && subTeamMatch && subtotalMatch;
    });
  }, [items, search, selectedTeam, selectedCostType, selectedSubTeam, showSubtotals]);

  // Compute top spend items for chart visualization (excluding subtotals)
  const topSpendChartData = useMemo(() => {
    return filteredItems
      .filter(item => !item.isSubtotal && (item.julBudget > 0 || item.augBudget > 0 || item.sepBudget > 0))
      .map(item => {
        let budget = 0;
        let spent = 0;
        if (activeMonthFilter === "ALL") {
          budget = item.julBudget + item.augBudget + item.sepBudget;
          spent = item.julActual + item.augActual + item.sepActual;
        } else if (activeMonthFilter === m1) {
          budget = item.julBudget;
          spent = item.julActual;
        } else if (activeMonthFilter === m2) {
          budget = item.augBudget;
          spent = item.augActual;
        } else if (activeMonthFilter === m3) {
          budget = item.sepBudget;
          spent = item.sepActual;
        }
        return {
          name: item.costType.length > 25 ? item.costType.slice(0, 22) + "..." : item.costType,
          Budget: budget,
          Spent: spent
        };
      })
      .sort((a, b) => b.Budget - a.Budget)
      .slice(0, 7);
  }, [filteredItems, activeMonthFilter]);

  // Aggregate department-wise budget, actual spent, and consumption rate
  const departmentPieChartData = useMemo(() => {
    const rawItems = filteredItems.filter(item => !item.isSubtotal);
    const aggregated: { [dept: string]: { budget: number; spent: number } } = {};

    rawItems.forEach(item => {
      // In LC context, department corresponds to team
      const dept = item.team || "Other";
      if (!aggregated[dept]) {
        aggregated[dept] = { budget: 0, spent: 0 };
      }

      let budget = 0;
      let spent = 0;

      if (activeMonthFilter === "ALL") {
        budget = item.julBudget + item.augBudget + item.sepBudget;
        spent = item.julActual + item.augActual + item.sepActual;
      } else if (activeMonthFilter === m1) {
        budget = item.julBudget;
        spent = item.julActual;
      } else if (activeMonthFilter === m2) {
        budget = item.augBudget;
        spent = item.augActual;
      } else if (activeMonthFilter === m3) {
        budget = item.sepBudget;
        spent = item.sepActual;
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
    const rawItems = filteredItems.filter(item => !item.isSubtotal);
    const aggregated: { [dept: string]: { jul: number, aug: number, sep: number } } = {};

    rawItems.forEach(item => {
      const dept = item.team || "Other";
      if (!aggregated[dept]) {
        aggregated[dept] = { jul: 0, aug: 0, sep: 0 };
      }
      aggregated[dept].jul += item.julActual || 0;
      aggregated[dept].aug += item.augActual || 0;
      aggregated[dept].sep += item.sepActual || 0;
    });

    return Object.entries(aggregated).map(([name, val]) => ({
      name,
      [m1Short]: val.jul,
      [m2Short]: val.aug,
      [m3Short]: val.sep,
    })).filter((d: any) => d[m1Short] > 0 || d[m2Short] > 0 || d[m3Short] > 0);
  }, [filteredItems]);

  const cumulativeBudget = useMemo(() => {
    return items
      .filter(item => !item.isSubtotal)
      .reduce((acc, curr) => acc + curr.q3Total, 0);
  }, [items]);

  const q3Totals = useMemo(() => {
    let julBudget = 0, julActual = 0, julVar = 0, julRem = 0;
    let augBudget = 0, augActual = 0, augVar = 0, augRem = 0;
    let sepBudget = 0, sepActual = 0, sepVar = 0, sepRem = 0;
    let q3Total = 0;

    filteredItems.forEach(item => {
      if (!item.isSubtotal) {
        julBudget += item.julBudget || 0;
        julActual += item.julActual || 0;
        julVar    += item.julVar    || 0;
        julRem    += item.julRem    || 0;
        augBudget += item.augBudget || 0;
        augActual += item.augActual || 0;
        augVar    += item.augVar    || 0;
        augRem    += item.augRem    || 0;
        sepBudget += item.sepBudget || 0;
        sepActual += item.sepActual || 0;
        sepVar    += item.sepVar    || 0;
        sepRem    += item.sepRem    || 0;
        q3Total   += item.q3Total   || 0;
      }
    });

    return { julBudget, julActual, julVar, julRem, augBudget, augActual, augVar, augRem, sepBudget, sepActual, sepVar, sepRem, q3Total };
  }, [filteredItems]);

  const deptChartData = useMemo(() => {
    const deptTotals: { [key: string]: { budget: number; actual: number } } = {};
    filteredItems.forEach(item => {
      if (!item.isSubtotal) {
        const d = item.team || "Other";
        if (!deptTotals[d]) deptTotals[d] = { budget: 0, actual: 0 };
        
        let budget = 0;
        let actual = 0;
        
        if (activeMonthFilter === "ALL") {
          budget = (item.julBudget || 0) + (item.augBudget || 0) + (item.sepBudget || 0);
          actual = (item.julActual || 0) + (item.augActual || 0) + (item.sepActual || 0);
        } else if (activeMonthFilter === m1) {
          budget = item.julBudget || 0;
          actual = item.julActual || 0;
        } else if (activeMonthFilter === m2) {
          budget = item.augBudget || 0;
          actual = item.augActual || 0;
        } else if (activeMonthFilter === m3) {
          budget = item.sepBudget || 0;
          actual = item.sepActual || 0;
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
      {/* Title block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 border border-gray-200 rounded-xl shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-400 mt-1">
            {m1Full} - {m3Full} 2026 detailed cost segments, allocation projections, and actual spend tracks.
          </p>
        </div>
        <div className="flex gap-4">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-gray-400">Total Items</span>
            <p className="text-md font-extrabold text-gray-950 mt-0.5">{filteredItems.length}</p>
          </div>
          <div className="border-l border-gray-200 pl-4 text-right">
            <span className="text-[10px] uppercase font-bold text-gray-400">Cumulative budget</span>
            <p className="text-md font-extrabold text-blue-600 mt-0.5">
              {formatBDT(cumulativeBudget)}
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Controls */}
      <div className="flex flex-col md:flex-row flex-wrap gap-4 items-stretch md:items-center bg-white p-4 border border-gray-100 rounded-xl shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={`Search ${quarter} items, purpose, cost type...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50/50 border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-xs text-gray-700 outline-none focus:bg-white focus:border-blue-500 hover:border-gray-300 transition-all font-medium"
          />
        </div>

        {/* Team Dropdown (Department) */}
        <div className="relative min-w-[150px] flex-1 md:flex-initial">
          <SearchableSelect
            value={selectedTeam}
            onChange={setSelectedTeam}
            options={uniqueTeams}
            allOptionLabel={isLc ? "All Departments" : "All Departments / Teams"}
            multiple
          />
        </div>

        {/* Cost Type Dropdown (Cost Heading) */}
        <div className="relative min-w-[150px] flex-1 md:flex-initial">
          <SearchableSelect
            value={selectedCostType}
            onChange={setSelectedCostType}
            options={uniqueCostTypes}
            allOptionLabel={isLc ? "All Descriptions" : "All Cost Headings / Types"}
            multiple
          />
        </div>

        {/* Sub-Team Dropdown (Project) */}
        <div className="relative min-w-[180px] flex-1 md:flex-initial max-w-full md:max-w-xs">
          <SearchableSelect
            value={selectedSubTeam}
            onChange={setSelectedSubTeam}
            options={uniqueSubTeams}
            allOptionLabel={isLc ? "All Sources" : "All Projects / Sub-Teams"}
            multiple
          />
        </div>

        {/* Collapsible Subtotals Switcher */}
        <button
          onClick={() => setShowSubtotals(!showSubtotals)}
          className={`cursor-pointer px-4 py-2 rounded-lg border text-xs font-bold select-none flex items-center justify-center gap-1.5 transition-all shrink-0 ${
            showSubtotals 
              ? "bg-slate-100 border-slate-200 text-slate-700" 
              : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
          }`}
        >
          {showSubtotals ? (
            <CheckSquare className="w-3.5 h-3.5 text-gray-600" />
          ) : (
            <Squircle className="w-3.5 h-3.5 text-gray-400" />
          )}
          Subtotals ({items.filter(i => i.isSubtotal).length})
        </button>

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
              {activeMonthFilter === "ALL" ? "All Months Combined" : `${activeMonthFilter === m1 ? m1Full : activeMonthFilter === m2 ? m2Full : m3Full} Focused`}
            </span>
          </div>
          <h3 className="text-lg font-extrabold tracking-tight text-white mt-1">
            {quarter} Fiscal Perspective Selector
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
            All {quarter}
          </button>
          <button
            onClick={() => setActiveMonthFilter(m1)}
            className={`flex-1 md:flex-none cursor-pointer px-4.5 py-2 rounded-lg text-xs font-extrabold transition-all duration-200 flex items-center justify-center gap-2 select-none ${
              activeMonthFilter === m1
                ? "bg-white text-indigo-950 shadow-sm"
                : "text-white/80 hover:text-white hover:bg-white/5"
            }`}
          >
            {m1Full}
          </button>
          <button
            onClick={() => setActiveMonthFilter(m2)}
            className={`flex-1 md:flex-none cursor-pointer px-4.5 py-2 rounded-lg text-xs font-extrabold transition-all duration-200 flex items-center justify-center gap-2 select-none ${
              activeMonthFilter === m2
                ? "bg-white text-indigo-950 shadow-sm"
                : "text-white/80 hover:text-white hover:bg-white/5"
            }`}
          >
            {m2Full}
          </button>
          <button
            onClick={() => setActiveMonthFilter(m3)}
            className={`flex-1 md:flex-none cursor-pointer px-4.5 py-2 rounded-lg text-xs font-extrabold transition-all duration-200 flex items-center justify-center gap-2 select-none ${
              activeMonthFilter === m3
                ? "bg-white text-indigo-950 shadow-sm"
                : "text-white/80 hover:text-white hover:bg-white/5"
            }`}
          >
            {m3Full}
          </button>
        </div>
      </div>

      {/* Dynamic Summary Cards Grid (Animated & Beautiful) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
        <MetricCard
          id="q3-metric-budget"
          title={activeMonthFilter === "ALL" ? `${quarter} Total` : activeMonthFilter === m1 ? `${m1Short} 2026` : activeMonthFilter === m2 ? `${m2Short} 2026` : `${m3Short} 2026`}
          value={formatBDT(
            activeMonthFilter === "ALL" ? q3Totals.julBudget + q3Totals.augBudget + q3Totals.sepBudget :
            activeMonthFilter === m1 ? q3Totals.julBudget :
            activeMonthFilter === m2 ? q3Totals.augBudget : q3Totals.sepBudget
          )}
          subtext={activeMonthFilter === "ALL" ? `Full ${quarter} Total` : activeMonthFilter === m1 ? `${m1Full} Allocation` : activeMonthFilter === m2 ? `${m2Full} Allocation` : `${m3Full} Allocation`}
          icon={<Wallet className="w-5 h-5 text-indigo-600" />}
          sheetItemsQ3={filteredItems}
          defaultOpenSection="Q3"
          selectedMonth={activeMonthFilter}
        />

        <MetricCard
          id="q3-metric-spent"
          title={activeMonthFilter === "ALL" ? `${quarter} Total Actual` : activeMonthFilter === m1 ? `${m1Full} Actual` : activeMonthFilter === m2 ? `${m2Short} Actual` : `${m3Short} Actual`}
          value={formatBDT(
            activeMonthFilter === "ALL" ? q3Totals.julActual + q3Totals.augActual + q3Totals.sepActual :
            activeMonthFilter === m1 ? q3Totals.julActual :
            activeMonthFilter === m2 ? q3Totals.augActual : q3Totals.sepActual
          )}
          subtext="Audited Cash Spent"
          icon={<TrendingDown className="w-5 h-5 text-blue-600" />}
          sheetItemsQ3={filteredItems}
          defaultOpenSection="Q3"
          selectedMonth={activeMonthFilter}
        />

        <MetricCard
          id="q3-metric-variance"
          title="Variance"
          value={(() => {
            const v = activeMonthFilter === "ALL" ? q3Totals.julVar + q3Totals.augVar + q3Totals.sepVar :
                      activeMonthFilter === m1 ? q3Totals.julVar :
                      activeMonthFilter === m2 ? q3Totals.augVar : q3Totals.sepVar;
            const b = activeMonthFilter === "ALL" ? q3Totals.julBudget + q3Totals.augBudget + q3Totals.sepBudget :
                      activeMonthFilter === m1 ? q3Totals.julBudget :
                      activeMonthFilter === m2 ? q3Totals.augBudget : q3Totals.sepBudget;
            if (b === 0) return "—";
            const pct = (v / b) * 100;
            return (pct >= 0 ? "+" : "") + pct.toFixed(1) + "%";
          })()}
          subtext="Variance % against budget"
          icon={<ArrowRightLeft className="w-5 h-5 text-purple-600" />}
          sheetItemsQ3={filteredItems}
          defaultOpenSection="Q3"
          selectedMonth={activeMonthFilter}
        />

        <MetricCard
          id="q3-metric-remaining"
          title={activeMonthFilter === "ALL" ? `${quarter} Total Remaining` : activeMonthFilter === m1 ? `${m1Full} Remaining` : activeMonthFilter === m2 ? `${m2Short} Remaining` : `${m3Short} Remaining`}
          value={formatBDT(
            activeMonthFilter === "ALL" ? q3Totals.julRem + q3Totals.augRem + q3Totals.sepRem :
            activeMonthFilter === m1 ? q3Totals.julRem :
            activeMonthFilter === m2 ? q3Totals.augRem : q3Totals.sepRem
          )}
          subtext={(activeMonthFilter === "ALL" ? q3Totals.julRem + q3Totals.augRem + q3Totals.sepRem :
                    activeMonthFilter === m1 ? q3Totals.julRem :
                    activeMonthFilter === m2 ? q3Totals.augRem : q3Totals.sepRem) < 0 ? "Over budget limits warn" : "Remaining safety buffer"}
          icon={(activeMonthFilter === "ALL" ? q3Totals.julRem + q3Totals.augRem + q3Totals.sepRem :
                 activeMonthFilter === m1 ? q3Totals.julRem :
                 activeMonthFilter === m2 ? q3Totals.augRem : q3Totals.sepRem) < 0
                  ? <AlertCircle className="w-5 h-5 text-rose-500 animate-pulse" />
                  : <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          sheetItemsQ3={filteredItems}
          defaultOpenSection="Q3"
          selectedMonth={activeMonthFilter}
        />

        <MetricCard
          id="q3-metric-efficiency"
          title="Consumed Rate"
          value={(() => {
            const b = activeMonthFilter === "ALL" ? q3Totals.julBudget + q3Totals.augBudget + q3Totals.sepBudget :
                      activeMonthFilter === m1 ? q3Totals.julBudget :
                      activeMonthFilter === m2 ? q3Totals.augBudget : q3Totals.sepBudget;
            const a = activeMonthFilter === "ALL" ? q3Totals.julActual + q3Totals.augActual + q3Totals.sepActual :
                      activeMonthFilter === m1 ? q3Totals.julActual :
                      activeMonthFilter === m2 ? q3Totals.augActual : q3Totals.sepActual;
            return b > 0 ? ((a / b) * 100).toFixed(1) + "%" : "0.0%";
          })()}
          subtext="Spent rate against current limit"
          icon={<Activity className="w-5 h-5 text-emerald-500" />}
          progress={{
            value: (() => {
              const b = activeMonthFilter === "ALL" ? q3Totals.julBudget + q3Totals.augBudget + q3Totals.sepBudget :
                        activeMonthFilter === m1 ? q3Totals.julBudget :
                        activeMonthFilter === m2 ? q3Totals.augBudget : q3Totals.sepBudget;
              const a = activeMonthFilter === "ALL" ? q3Totals.julActual + q3Totals.augActual + q3Totals.sepActual :
                        activeMonthFilter === m1 ? q3Totals.julActual :
                        activeMonthFilter === m2 ? q3Totals.augActual : q3Totals.sepActual;
              return b > 0 ? (a / b) * 100 : 0;
            })(),
            color: (() => {
              const b = activeMonthFilter === "ALL" ? q3Totals.julBudget + q3Totals.augBudget + q3Totals.sepBudget :
                        activeMonthFilter === m1 ? q3Totals.julBudget :
                        activeMonthFilter === m2 ? q3Totals.augBudget : q3Totals.sepBudget;
              const a = activeMonthFilter === "ALL" ? q3Totals.julActual + q3Totals.augActual + q3Totals.sepActual :
                        activeMonthFilter === m1 ? q3Totals.julActual :
                        activeMonthFilter === m2 ? q3Totals.augActual : q3Totals.sepActual;
              const pct = b > 0 ? (a / b) * 100 : 0;
              return pct > 100 ? "bg-rose-500" : pct > 85 ? "bg-amber-500" : "bg-emerald-500";
            })()
          }}
          sheetItemsQ3={filteredItems}
          defaultOpenSection="Q3"
          selectedMonth={activeMonthFilter}
        />
      </div>

      {/* Top 5 Allocations + Departments Needing Attention */}
      <BudgetAttentionCards
        sheetItemsQ3={filteredItems}
        timePeriod={activeMonthFilter === "ALL" ? quarter : activeMonthFilter}
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

      {/* Detailed Listing Grid */}
      {(() => {
        const visibleItems = tableExpanded ? filteredItems : filteredItems.slice(0, 10);

        // Compute cumulative sums per column up to hovered row
        type NumCol = "julBudget"|"julActual"|"julVar"|"julRem"|"augBudget"|"augActual"|"augVar"|"augRem"|"sepBudget"|"sepActual"|"sepVar"|"sepRem"|"q3Total";
        const runningTotal = (col: NumCol): number | null => {
          if (!hoveredCell || hoveredCell.col !== col) return null;
          let sum = 0;
          for (let i = 0; i <= hoveredCell.rowIdx && i < visibleItems.length; i++) {
            sum += (visibleItems[i][col] as number) || 0;
          }
          return sum;
        };

        const NumCell = ({
          value, col, rowIdx, bold, colorFn, isVar,
        }: {
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
                value === 0 ? (
                  <span className="text-gray-300">—</span>
                ) : (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    value < 0
                      ? "bg-red-50 text-red-600 border-red-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}>
                    {formatVar(value)}
                  </span>
                )
              ) : (
                <span className={isHovered ? "underline decoration-dotted" : ""}>
                  {formatBDT(value)}
                </span>
              )}
              {isHovered && rt !== null && (
                <div className="absolute right-2 -top-8 z-50 bg-gray-900 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap pointer-events-none border border-gray-700">
                  <span className="text-gray-400 font-normal">Cumulative: </span>
                  {formatBDT(rt)}
                </div>
              )}
            </td>
          );
        };

        return (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
            <div className={`overflow-x-auto ${tableExpanded ? "max-h-[640px] overflow-y-auto" : ""}`}>
              <table className="w-full text-left border-collapse table-auto text-xs bg-white">
                <thead className="sticky top-0 z-20">
                  {/* Month group headers */}
                  <tr className="border-b border-gray-200 text-[9px] font-black uppercase tracking-widest select-none">
                    <th colSpan={4} className="py-2 px-4 text-gray-400 bg-gray-50 border-r border-gray-100" />
                    <th colSpan={4} className={`py-2 px-3 text-center bg-blue-50 text-blue-600 border-r border-blue-100`}>{m1Full} 2026</th>
                    <th colSpan={4} className={`py-2 px-3 text-center bg-indigo-50 text-indigo-600 border-r border-indigo-100`}>{m2Full} 2026</th>
                    <th colSpan={4} className={`py-2 px-3 text-center bg-violet-50 text-violet-600 border-r border-violet-100`}>{m3Full} 2026</th>
                    <th className="py-2 px-3 text-center bg-slate-800 text-slate-200">{quarter} Total</th>
                  </tr>
                  {/* Column sub-headers */}
                  <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider select-none">
                    <th className="py-3 px-4 text-left bg-gray-50 min-w-[110px]">{teamLabel}</th>
                    <th className="py-3 px-3 text-left bg-gray-50 min-w-[130px]">{subTeamLabel}</th>
                    <th className="py-3 px-3 text-left bg-gray-50 min-w-[120px]">{costTypeLabel}</th>
                    <th className="py-3 px-3 text-left bg-gray-50 min-w-[140px] border-r border-gray-200">{purposeLabel}</th>
                    <th className="py-3 px-3 text-right bg-blue-50/60 text-blue-700">Budget</th>
                    <th className="py-3 px-3 text-right bg-blue-50/60 text-blue-700">Actual</th>
                    <th className="py-3 px-3 text-right bg-blue-50/60 text-blue-700">Variance</th>
                    <th className="py-3 px-3 text-right bg-blue-50/60 text-blue-700 border-r border-blue-100">Remaining</th>
                    <th className="py-3 px-3 text-right bg-indigo-50/60 text-indigo-700">Budget</th>
                    <th className="py-3 px-3 text-right bg-indigo-50/60 text-indigo-700">Actual</th>
                    <th className="py-3 px-3 text-right bg-indigo-50/60 text-indigo-700">Variance</th>
                    <th className="py-3 px-3 text-right bg-indigo-50/60 text-indigo-700 border-r border-indigo-100">Remaining</th>
                    <th className="py-3 px-3 text-right bg-violet-50/60 text-violet-700">Budget</th>
                    <th className="py-3 px-3 text-right bg-violet-50/60 text-violet-700">Actual</th>
                    <th className="py-3 px-3 text-right bg-violet-50/60 text-violet-700">Variance</th>
                    <th className="py-3 px-3 text-right bg-violet-50/60 text-violet-700 border-r border-violet-100">Remaining</th>
                    <th className="py-3 px-3 text-right bg-slate-800 text-slate-200 font-black">{quarter}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleItems.length === 0 ? (
                    <tr>
                      <td colSpan={17} className="py-10 text-center text-gray-400 text-sm">
                        No matching cost items found. Try revising search or filters.
                      </td>
                    </tr>
                  ) : (
                    visibleItems.map((item, rowIdx) => {
                      const isSub = item.isSubtotal;
                      const rowBase = isSub
                        ? "bg-gradient-to-r from-blue-50/70 to-indigo-50/30 border-b border-blue-100/60"
                        : rowIdx % 2 === 0
                          ? "bg-white border-b border-gray-100 hover:bg-blue-50/20 transition-colors"
                          : "bg-gray-50/50 border-b border-gray-100 hover:bg-blue-50/20 transition-colors";

                      return (
                        <tr key={item.id} className={rowBase}>
                          {/* Descriptor cells */}
                          <td className={`py-3 px-4 text-[11px] whitespace-nowrap ${isSub ? "font-black text-gray-900" : "font-semibold text-gray-700"}`}>
                            {item.team || "—"}
                          </td>
                          <td className={`py-3 px-3 text-[11px] whitespace-nowrap ${isSub ? "font-bold text-gray-800" : "text-gray-600"}`}>
                            {item.subTeam || "—"}
                          </td>
                          <td className={`py-3 px-3 text-[11px] font-mono whitespace-nowrap ${isSub ? "font-bold text-gray-800" : "text-gray-600"}`}>
                            {item.costType || "—"}
                          </td>
                          <td className="py-3 px-3 text-[11px] text-gray-500 min-w-[200px] max-w-[320px] border-r border-gray-200 whitespace-normal break-words leading-relaxed">
                            {item.purpose || "—"}
                          </td>
                          {/* July */}
                          <NumCell value={item.julBudget} col="julBudget" rowIdx={rowIdx} bold={isSub} />
                          <NumCell value={item.julActual} col="julActual" rowIdx={rowIdx} bold={isSub} colorFn={v => v > item.julBudget && item.julBudget > 0 ? "text-rose-600" : "text-gray-800"} />
                          <NumCell value={item.julVar} col="julVar" rowIdx={rowIdx} isVar />
                          <NumCell value={item.julRem} col="julRem" rowIdx={rowIdx} bold={isSub} colorFn={v => v < 0 ? "text-rose-600 bg-rose-50/30" : "text-emerald-700"} />
                          {/* August */}
                          <NumCell value={item.augBudget} col="augBudget" rowIdx={rowIdx} bold={isSub} />
                          <NumCell value={item.augActual} col="augActual" rowIdx={rowIdx} bold={isSub} colorFn={v => v > item.augBudget && item.augBudget > 0 ? "text-rose-600" : "text-gray-800"} />
                          <NumCell value={item.augVar} col="augVar" rowIdx={rowIdx} isVar />
                          <NumCell value={item.augRem} col="augRem" rowIdx={rowIdx} bold={isSub} colorFn={v => v < 0 ? "text-rose-600 bg-rose-50/30" : "text-emerald-700"} />
                          {/* September */}
                          <NumCell value={item.sepBudget} col="sepBudget" rowIdx={rowIdx} bold={isSub} />
                          <NumCell value={item.sepActual} col="sepActual" rowIdx={rowIdx} bold={isSub} colorFn={v => v > item.sepBudget && item.sepBudget > 0 ? "text-rose-600" : "text-gray-800"} />
                          <NumCell value={item.sepVar} col="sepVar" rowIdx={rowIdx} isVar />
                          <NumCell value={item.sepRem} col="sepRem" rowIdx={rowIdx} bold={isSub} colorFn={v => v < 0 ? "text-rose-600 bg-rose-50/30" : "text-emerald-700"} />
                          {/* Quarter Total */}
                          <NumCell value={item.q3Total} col="q3Total" rowIdx={rowIdx} bold />
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {/* Totals footer */}
                {visibleItems.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-900 text-white text-[11px] font-black border-t-2 border-slate-700 sticky bottom-0">
                      <td colSpan={4} className="py-3.5 px-4">
                        <span className="text-slate-400 text-[10px] uppercase tracking-wider">Grand Total</span>
                      </td>
                      {/* July totals */}
                      <td className="py-3.5 px-3 text-right tabular-nums">{formatBDT(q3Totals.julBudget)}</td>
                      <td className="py-3.5 px-3 text-right tabular-nums">{formatBDT(q3Totals.julActual)}</td>
                      <td className="py-3.5 px-3 text-right tabular-nums">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] border font-black ${q3Totals.julVar < 0 ? "bg-red-900/40 text-red-300 border-red-700" : "bg-emerald-900/40 text-emerald-300 border-emerald-700"}`}>
                          {formatVar(q3Totals.julVar)}
                        </span>
                      </td>
                      <td className={`py-3.5 px-3 text-right tabular-nums ${q3Totals.julRem < 0 ? "text-red-400" : "text-emerald-400"}`}>{formatBDT(q3Totals.julRem)}</td>
                      {/* August totals */}
                      <td className="py-3.5 px-3 text-right tabular-nums">{formatBDT(q3Totals.augBudget)}</td>
                      <td className="py-3.5 px-3 text-right tabular-nums">{formatBDT(q3Totals.augActual)}</td>
                      <td className="py-3.5 px-3 text-right tabular-nums">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] border font-black ${q3Totals.augVar < 0 ? "bg-red-900/40 text-red-300 border-red-700" : "bg-emerald-900/40 text-emerald-300 border-emerald-700"}`}>
                          {formatVar(q3Totals.augVar)}
                        </span>
                      </td>
                      <td className={`py-3.5 px-3 text-right tabular-nums ${q3Totals.augRem < 0 ? "text-red-400" : "text-emerald-400"}`}>{formatBDT(q3Totals.augRem)}</td>
                      {/* September totals */}
                      <td className="py-3.5 px-3 text-right tabular-nums">{formatBDT(q3Totals.sepBudget)}</td>
                      <td className="py-3.5 px-3 text-right tabular-nums">{formatBDT(q3Totals.sepActual)}</td>
                      <td className="py-3.5 px-3 text-right tabular-nums">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] border font-black ${q3Totals.sepVar < 0 ? "bg-red-900/40 text-red-300 border-red-700" : "bg-emerald-900/40 text-emerald-300 border-emerald-700"}`}>
                          {formatVar(q3Totals.sepVar)}
                        </span>
                      </td>
                      <td className={`py-3.5 px-3 text-right tabular-nums ${q3Totals.sepRem < 0 ? "text-red-400" : "text-emerald-400"}`}>{formatBDT(q3Totals.sepRem)}</td>
                      {/* Quarter total */}
                      <td className="py-3.5 px-3 text-right tabular-nums text-yellow-300">{formatBDT(q3Totals.q3Total)}</td>
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
              Team Budget Allocation
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
              Team Actual Spent
            </h4>
            <p className="text-sm text-gray-500 mt-1">Distribution of absolute spent figures across teams</p>
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
              Team Consumption Rate
            </h4>
            <p className="text-sm text-gray-500 mt-1">Percentage consumption of allocated budget by team</p>
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
            Team Month-Wise Actual Spent
          </h4>
          <p className="text-sm text-gray-500 mt-1">Comparison of actual spent across {m1Short}, {m2Short}, and {m3Short} per team</p>
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
                      const jul = data.Jul || 0;
                      const aug = data.Aug || 0;
                      const sep = data.Sep || 0;
                      
                      const getChange = (curr: number, prev: number) => {
                        if (prev === 0) return { val: 0, text: '-', type: 'neutral' };
                        const pct = ((curr - prev) / prev) * 100;
                        if (pct > 0) return { val: pct, text: `↑${pct.toFixed(1)}%`, type: 'up' };
                        if (pct < 0) return { val: pct, text: `↓${Math.abs(pct).toFixed(1)}%`, type: 'down' };
                        return { val: 0, text: '0%', type: 'neutral' };
                      };
                      
                      const augChange = getChange(aug, jul);
                      const sepChange = getChange(sep, aug);
                      
                      return (
                        <div className="bg-white/95 backdrop-blur-sm p-4 border border-gray-100 rounded-xl shadow-xl ring-1 ring-black/5 min-w-[240px]">
                          <p className="font-semibold text-gray-900 mb-3 border-b border-gray-100 pb-2">{label}</p>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-sm bg-[#3b82f6]"></div>
                                <span className="text-sm font-medium text-gray-700">July</span>
                              </div>
                              <span className="text-sm font-bold text-gray-900 tabular-nums">
                                {formatBDT(jul)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-sm bg-[#10b981]"></div>
                                <span className="text-sm font-medium text-gray-700">August</span>
                              </div>
                              <div className="flex items-center gap-2.5">
                                <span className="text-sm font-bold text-gray-900 tabular-nums">
                                  {formatBDT(aug)}
                                </span>
                                {augChange.text !== '-' && (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md min-w-[48px] text-center ${
                                    augChange.type === 'up' ? 'bg-red-50 text-red-600' :
                                    augChange.type === 'down' ? 'bg-emerald-50 text-emerald-600' :
                                    'bg-gray-100 text-gray-600'
                                  }`}>
                                    {augChange.text}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-sm bg-[#f59e0b]"></div>
                                <span className="text-sm font-medium text-gray-700">September</span>
                              </div>
                              <div className="flex items-center gap-2.5">
                                <span className="text-sm font-bold text-gray-900 tabular-nums">
                                  {formatBDT(sep)}
                                </span>
                                {sepChange.text !== '-' && (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md min-w-[48px] text-center ${
                                    sepChange.type === 'up' ? 'bg-red-50 text-red-600' :
                                    sepChange.type === 'down' ? 'bg-emerald-50 text-emerald-600' :
                                    'bg-gray-100 text-gray-600'
                                  }`}>
                                    {sepChange.text}
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
                <Bar dataKey={m1Short} name={m1Full} fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={20} />
                <Bar dataKey={m2Short} name={m2Full} fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={20} />
                <Bar dataKey={m3Short} name={m3Full} fill="#f59e0b" radius={[0, 4, 4, 0]} maxBarSize={20} />
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

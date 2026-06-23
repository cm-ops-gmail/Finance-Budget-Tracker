import React, { useState, useMemo } from "react";
import { 
  SpreadsheetData, 
  Q2Item, 
  Q3Item 
} from "../types.ts";
import MetricCard from "./MetricCard.tsx";
import SearchableSelect from "./SearchableSelect.tsx";
import BudgetAttentionCards from "./BudgetAttentionCards.tsx";
import {
  Wallet,
  TrendingUp,
  CheckCircle,
  DollarSign,
  Building2,
  Percent,
  ArrowRightLeft,
  Calendar,
  Layers,
  XCircle,
  AlertTriangle,
  AlertCircle,
  Trophy,
  ChartBar,
  Download
} from "lucide-react";
import { exportPDF } from "../utils/exportPDF";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";

interface OverviewDashboardProps {
  id: string;
  data: SpreadsheetData;
}

// Chart color constants
const COLORS_PIE = ["#1e293b", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899"];
const RECHARTS_BUDGET_COLOR = "#3b82f6"; // Geometric Blue-500
const RECHARTS_ACTUAL_COLOR = "#1e293b"; // Dark Slate-900

export default function OverviewDashboard({ id, data }: OverviewDashboardProps) {
  const [selectedQuarter, setSelectedQuarter] = useState<"ALL" | "Q2" | "Q3">("ALL");
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [entityFilter, setEntityFilter] = useState<"ALL" | "LTD" | "LC">("ALL");
  const [selectedTeam, setSelectedTeam] = useState<string[]>(["ALL"]);
  const [selectedCostHeading, setSelectedCostHeading] = useState<string[]>(["ALL"]);

  const timePeriod = useMemo(() => {
    if (selectedMonth !== "ALL") return selectedMonth;
    return selectedQuarter;
  }, [selectedQuarter, selectedMonth]);

  const TIME_PERIODS = [
    { value: "ALL", label: "All Periods" },
    { value: "Q2", label: "Q2 (Apr-Jun)" },
    { value: "Q3", label: "Q3 (Jul-Sep)" },
    { value: "APR", label: "April 2026" },
    { value: "MAY", label: "May 2026" },
    { value: "JUN", label: "June 2026" },
    { value: "JUL", label: "July 2026" },
    { value: "AUG", label: "August 2026" },
    { value: "SEP", label: "September 2026" }
  ];

  const ENTITIES = [
    { value: "ALL", label: "All Entities" },
    { value: "LTD", label: "10 MS LTD" },
    { value: "LC", label: "Learning Center" }
  ];

  // Format currency helpers (Traditional integer formatting in BDT/INR style with commas)
  const formatBDT = (num: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Convert large numbers to human-readable format e.g. 15.5 Lac or million
  const formatCompact = (num: number): string => {
    if (num >= 10000000) return (num / 10000000).toFixed(2) + " Cr";
    if (num >= 100000) return (num / 100000).toFixed(2) + " Lac";
    if (num >= 1000) return (num / 1000).toFixed(0) + "K";
    return num.toString();
  };

  // Compile unique lists for options
  const uniqueTeams = useMemo(() => {
    const list = new Set<string>();
    data.ltdQ2.forEach(i => { if (i.department && !i.isSubtotal && !i.isHeader) list.add(i.department); });
    data.lcQ2.forEach(i => { if (i.department && !i.isSubtotal && !i.isHeader) list.add(i.department); });
    data.ltdQ3.forEach(i => { if (i.team && !i.isSubtotal) list.add(i.team); });
    data.lcQ3.forEach(i => { if (i.team && !i.isSubtotal) list.add(i.team); });
    return Array.from(list).sort();
  }, [data]);

  const uniqueCostHeadings = useMemo(() => {
    const list = new Set<string>();
    data.ltdQ2.forEach(i => { if (i.costHeading && !i.isSubtotal && !i.isHeader) list.add(i.costHeading); });
    data.lcQ2.forEach(i => { if (i.costHeading && !i.isSubtotal && !i.isHeader) list.add(i.costHeading); });
    data.ltdQ3.forEach(i => { if (i.costType && !i.isSubtotal) list.add(i.costType); });
    data.lcQ3.forEach(i => { if (i.costType && !i.isSubtotal) list.add(i.costType); });
    return Array.from(list).sort();
  }, [data]);

  // Unified cascading filter engine
  const filteredData = useMemo(() => {
    return {
      ltdQ2Clean: (entityFilter === "ALL" || entityFilter === "LTD") ? data.ltdQ2.filter(item => {
        if (item.isSubtotal || item.isHeader) return false;
        if (!selectedTeam.includes("ALL") && !selectedTeam.includes(item.department)) return false;
        if (!selectedCostHeading.includes("ALL") && !selectedCostHeading.includes(item.costHeading)) return false;
        return true;
      }) : [],
      lcQ2Clean: (entityFilter === "ALL" || entityFilter === "LC") ? data.lcQ2.filter(item => {
        if (item.isSubtotal || item.isHeader) return false;
        if (!selectedTeam.includes("ALL") && !selectedTeam.includes(item.department)) return false;
        if (!selectedCostHeading.includes("ALL") && !selectedCostHeading.includes(item.costHeading)) return false;
        return true;
      }) : [],
      ltdQ3Clean: (entityFilter === "ALL" || entityFilter === "LTD") ? data.ltdQ3.filter(item => {
        if (item.isSubtotal) return false;
        if (!selectedTeam.includes("ALL") && !selectedTeam.includes(item.team)) return false;
        if (!selectedCostHeading.includes("ALL") && !selectedCostHeading.includes(item.costType)) return false;
        return true;
      }) : [],
      lcQ3Clean: (entityFilter === "ALL" || entityFilter === "LC") ? data.lcQ3.filter(item => {
        if (item.isSubtotal) return false;
        if (!selectedTeam.includes("ALL") && !selectedTeam.includes(item.team)) return false;
        if (!selectedCostHeading.includes("ALL") && !selectedCostHeading.includes(item.costType)) return false;
        return true;
      }) : []
    };
  }, [data, selectedTeam, selectedCostHeading, entityFilter]);

  const isAnyFilterActive = 
    (selectedTeam.length > 0 && !(selectedTeam.length === 1 && selectedTeam[0] === "ALL")) || 
    (selectedCostHeading.length > 0 && !(selectedCostHeading.length === 1 && selectedCostHeading[0] === "ALL")) ||
    entityFilter !== "ALL" ||
    selectedQuarter !== "ALL" ||
    selectedMonth !== "ALL";

  const handleClearFilters = () => {
    setSelectedTeam(["ALL"]);
    setSelectedCostHeading(["ALL"]);
    setEntityFilter("ALL");
    setSelectedQuarter("ALL");
    setSelectedMonth("ALL");
  };

  const handleExportPDF = () => {
    const fmtNum = (n: number) =>
      new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
    const { ltdQ2Clean, lcQ2Clean, ltdQ3Clean, lcQ3Clean } = filteredData;
    const allQ2 = [...ltdQ2Clean, ...lcQ2Clean];
    const allQ3 = [...ltdQ3Clean, ...lcQ3Clean];
    const rows: (string | number)[][] = [
      ...allQ2.filter(i => !i.isSubtotal && !i.isHeader).map(i => [
        "Q2", i.department, i.costHeading, i.description,
        fmtNum(i.aprBudget + i.mayBudget + i.junBudget),
        fmtNum(i.mayActual + i.junActual),
        fmtNum((i.mayVariance || 0) + (i.junVariance || 0)),
      ]),
      ...allQ3.filter(i => !i.isSubtotal).map(i => [
        "Q3", i.team, i.costType, i.purpose,
        fmtNum((i.julBudget || 0) + (i.augBudget || 0) + (i.sepBudget || 0)),
        fmtNum((i.julActual || 0) + (i.augActual || 0) + (i.sepActual || 0)),
        fmtNum((i.julVar || 0) + (i.augVar || 0) + (i.sepVar || 0)),
      ]),
    ];
    const varPct = activeMetrics.budget > 0
      ? ((activeMetrics.variance / activeMetrics.budget) * 100).toFixed(1) + "%"
      : "—";
    const periodLabel = TIME_PERIODS.find(t => t.value === timePeriod)?.label || timePeriod;
    exportPDF({
      title: "Executive Overview Report",
      subtitle: `Period: ${periodLabel}  ·  Entity: ${entityFilter === "ALL" ? "All Entities" : entityFilter}`,
      filters: [
        { label: "Period", value: periodLabel },
        { label: "Entity", value: entityFilter === "ALL" ? "All" : entityFilter },
        { label: "Team", value: selectedTeam.includes("ALL") ? "All" : selectedTeam.join(", ") },
      ],
      summary: [
        { label: "Total Budget", value: "BDT " + fmtNum(activeMetrics.budget) },
        { label: "Total Actual", value: "BDT " + fmtNum(activeMetrics.actual) },
        { label: "Remaining", value: "BDT " + fmtNum(activeMetrics.remaining) },
        { label: "Variance %", value: varPct },
        { label: "Consumption", value: activeMetrics.pct.toFixed(1) + "%" },
      ],
      columns: ["Quarter", "Team / Dept", "Cost Type", "Description", "Budget", "Actual", "Variance"],
      rows,
      filename: `Overview-Report-${new Date().toISOString().slice(0, 10)}.pdf`,
    });
  };

  // Aggregation computations (excluding subtotals to avoid overcounting)
  const stats = useMemo(() => {
    const { ltdQ2Clean, lcQ2Clean, ltdQ3Clean, lcQ3Clean } = filteredData;

    let periodBudget = 0;
    let periodActual = 0;
    let periodRemaining = 0;
    let ltdBudget = 0;
    let ltdActual = 0;
    let lcBudget = 0;
    let lcActual = 0;

    const addQ2 = (items: any[], isLtd: boolean) => {
      items.forEach(item => {
        let b = 0, a = 0, r = 0;
        if (timePeriod === "ALL" || timePeriod === "Q2") {
          b = item.aprBudget + item.mayBudget + item.junBudget;
          a = item.aprBudget + item.mayActual + item.junActual;
          r = item.aprRemaining + item.mayRemaining + item.junRemaining;
        } else if (timePeriod === "APR") {
          b = item.aprBudget; a = item.aprBudget; r = item.aprRemaining || 0;
        } else if (timePeriod === "MAY") {
          b = item.mayBudget; a = item.mayActual; r = item.mayRemaining;
        } else if (timePeriod === "JUN") {
          b = item.junBudget; a = item.junActual; r = item.junRemaining;
        }
        
        periodBudget += b; periodActual += a; periodRemaining += r;
        if (isLtd) { ltdBudget += b; ltdActual += a; }
        else { lcBudget += b; lcActual += a; }
      });
    };

    const addQ3 = (items: any[], isLtd: boolean) => {
      items.forEach(item => {
        let b = 0, a = 0, r = 0;
        if (timePeriod === "ALL" || timePeriod === "Q3") {
          b = item.julBudget + item.augBudget + item.sepBudget;
          a = item.julActual + item.augActual + item.sepActual;
          r = item.julRemaining + item.augRemaining + item.sepRemaining;
        } else if (timePeriod === "JUL") {
          b = item.julBudget; a = item.julActual; r = item.julRemaining;
        } else if (timePeriod === "AUG") {
          b = item.augBudget; a = item.augActual; r = item.augRemaining;
        } else if (timePeriod === "SEP") {
          b = item.sepBudget; a = item.sepActual; r = item.sepRemaining;
        }
        
        periodBudget += b; periodActual += a; periodRemaining += r;
        if (isLtd) { ltdBudget += b; ltdActual += a; }
        else { lcBudget += b; lcActual += a; }
      });
    };

    addQ2(ltdQ2Clean, true);
    addQ2(lcQ2Clean, false);
    addQ3(ltdQ3Clean, true);
    addQ3(lcQ3Clean, false);

    return {
      periodBudget,
      periodActual,
      periodRemaining,
      ltdBudget,
      ltdActual,
      lcBudget,
      lcActual
    };
  }, [filteredData, timePeriod]);

  // Dynamic values based on selected timePeriod
  const activeMetrics = useMemo(() => {
    return {
      budget: stats.periodBudget,
      actual: stats.periodActual,
      remaining: stats.periodRemaining,
      variance: stats.periodBudget - stats.periodActual,
      pct: stats.periodBudget > 0 ? (stats.periodActual / stats.periodBudget) * 100 : 0
    };
  }, [stats]);

  // Chart 1: Monthly Trend Data (April - Sept 2026)
  const monthlyTrendData = useMemo(() => {
    // Collect row item budget & actual calculations per month
    const m = {
      April: { budget: 0, actual: 0 },
      May: { budget: 0, actual: 0 },
      June: { budget: 0, actual: 0 },
      July: { budget: 0, actual: 0 },
      August: { budget: 0, actual: 0 },
      September: { budget: 0, actual: 0 },
    };

    const { ltdQ2Clean, lcQ2Clean, ltdQ3Clean, lcQ3Clean } = filteredData;

    // Q2 Addition
    [...ltdQ2Clean, ...lcQ2Clean].forEach(i => {
      m.April.budget += i.aprBudget;
      m.April.actual += i.aprBudget; // april actual same as budget in tracking
      
      m.May.budget += i.mayBudget;
      m.May.actual += i.mayActual;

      m.June.budget += i.junBudget;
      m.June.actual += i.junActual;
    });

    // Q3 Addition
    [...ltdQ3Clean, ...lcQ3Clean].forEach(i => {
      m.July.budget += i.julBudget;
      m.July.actual += i.julActual;

      m.August.budget += i.augBudget;
      m.August.actual += i.augActual;

      m.September.budget += i.sepBudget;
      m.September.actual += i.sepActual;
    });

    return [
      { name: "Apr 2026", Budget: m.April.budget, Actual: m.April.actual },
      { name: "May 2026", Budget: m.May.budget, Actual: m.May.actual },
      { name: "Jun 2026", Budget: m.June.budget, Actual: m.June.actual },
      { name: "Jul 2026", Budget: m.July.budget, Actual: m.July.actual },
      { name: "Aug 2026", Budget: m.August.budget, Actual: m.August.actual },
      { name: "Sep 2026", Budget: m.September.budget, Actual: m.September.actual },
    ];
  }, [filteredData]);

  // Configured Department aggregates across selected period
  const getDeptAggregates = () => {
    const deptTotals: { [key: string]: { budget: number; actual: number } } = {};
    const { ltdQ2Clean, lcQ2Clean, ltdQ3Clean, lcQ3Clean } = filteredData;

    [...ltdQ2Clean, ...lcQ2Clean].forEach(i => {
      const d = i.department || "Other";
      if (!deptTotals[d]) deptTotals[d] = { budget: 0, actual: 0 };
      
      if (timePeriod === "ALL" || timePeriod === "Q2") {
        deptTotals[d].budget += i.aprBudget + i.mayBudget + i.junBudget;
        deptTotals[d].actual += i.aprBudget + i.mayActual + i.junActual;
      } else if (timePeriod === "APR") {
        deptTotals[d].budget += i.aprBudget; deptTotals[d].actual += i.aprBudget;
      } else if (timePeriod === "MAY") {
        deptTotals[d].budget += i.mayBudget; deptTotals[d].actual += i.mayActual;
      } else if (timePeriod === "JUN") {
        deptTotals[d].budget += i.junBudget; deptTotals[d].actual += i.junActual;
      }
    });

    [...ltdQ3Clean, ...lcQ3Clean].forEach(i => {
      const d = i.team || "Other";
      if (!deptTotals[d]) deptTotals[d] = { budget: 0, actual: 0 };
      
      if (timePeriod === "ALL" || timePeriod === "Q3") {
        deptTotals[d].budget += i.julBudget + i.augBudget + i.sepBudget;
        deptTotals[d].actual += i.julActual + i.augActual + i.sepActual;
      } else if (timePeriod === "JUL") {
        deptTotals[d].budget += i.julBudget; deptTotals[d].actual += i.julActual;
      } else if (timePeriod === "AUG") {
        deptTotals[d].budget += i.augBudget; deptTotals[d].actual += i.augActual;
      } else if (timePeriod === "SEP") {
        deptTotals[d].budget += i.sepBudget; deptTotals[d].actual += i.sepActual;
      }
    });

    return deptTotals;
  };

  // Chart 2: Category distribution (Departmental aggregates combined across periods)
  const categoryChartData = useMemo(() => {
    const deptTotals = getDeptAggregates();

    // Consolidate into formatted array
    return Object.entries(deptTotals)
      .map(([name, val]) => ({
        name,
        Budget: val.budget,
        Actual: val.actual,
        Balance: Math.max(0, val.budget - val.actual)
      }))
      .filter(d => d.Budget > 0 || d.Actual > 0)
      .sort((a, b) => b.Budget - a.Budget)
      .slice(0, 8); // top 8 categories
  }, [filteredData, timePeriod]);

  // Chart 3: Entity comparison pie/donut data (LTD Limited vs LC Learning Center)
  const entityPieData = useMemo(() => {
    return [
      { name: "10MS Limited (LTD)", value: stats.ltdBudget, actual: stats.ltdActual },
      { name: "Learning Center (LC)", value: stats.lcBudget, actual: stats.lcActual },
    ];
  }, [stats]);

  // Lists for Top 5 Budget Allocations and Departments Needing Attention
  const panelsData = useMemo(() => {
    const deptTotals = getDeptAggregates();

    const allDepts = Object.entries(deptTotals)
      .map(([name, val]) => ({
        name,
        budget: val.budget,
        actual: val.actual,
        pct: val.budget > 0 ? (val.actual / val.budget) * 100 : 0
      }))
      .filter(d => d.budget > 0 || d.actual > 0);

    const topBudgets = [...allDepts]
      .filter(d => d.budget > 0)
      .sort((a, b) => b.budget - a.budget)
      .slice(0, 5);

    const maxBudget = topBudgets[0]?.budget || 1;

    const attentionDepts = [...allDepts]
      .filter(d => d.budget > 0)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5);

    return { allDepts, topBudgets, maxBudget, attentionDepts };
  }, [filteredData, timePeriod]);

  // Filter trend data based on selected tab period for rendering
  const filteredTrendData = useMemo(() => {
    if (timePeriod === "Q2") return monthlyTrendData.slice(0, 3);
    if (timePeriod === "Q3") return monthlyTrendData.slice(3, 6);
    if (timePeriod === "APR") return monthlyTrendData.slice(0, 1);
    if (timePeriod === "MAY") return monthlyTrendData.slice(1, 2);
    if (timePeriod === "JUN") return monthlyTrendData.slice(2, 3);
    if (timePeriod === "JUL") return monthlyTrendData.slice(3, 4);
    if (timePeriod === "AUG") return monthlyTrendData.slice(4, 5);
    if (timePeriod === "SEP") return monthlyTrendData.slice(5, 6);
    return monthlyTrendData;
  }, [timePeriod, monthlyTrendData]);

  return (
    <div id={id} className="space-y-6">
      {/* Selection Panel & Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-gray-200 text-gray-900 rounded-xl p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900">Executive Budget Analytics</h2>
          <p className="text-xs text-gray-500 mt-1">
            Consolidated business intelligence derived from live spreadsheet integrations
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Entity Filter */}
          <div className="relative w-full sm:w-auto">
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value as any)}
              className="appearance-none bg-gray-50 border border-gray-200 text-gray-800 text-xs font-semibold rounded-lg block w-full pl-3 pr-8 py-2 md:py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
            >
              {ENTITIES.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
          
          {/* Quarter Filter */}
          <div className="relative w-full sm:w-auto">
            <select
              value={selectedQuarter}
              onChange={(e) => {
                const q = e.target.value as "ALL" | "Q2" | "Q3";
                setSelectedQuarter(q);
                if (q === "Q2" && !["ALL", "APR", "MAY", "JUN"].includes(selectedMonth)) {
                  setSelectedMonth("ALL");
                } else if (q === "Q3" && !["ALL", "JUL", "AUG", "SEP"].includes(selectedMonth)) {
                  setSelectedMonth("ALL");
                }
              }}
              className="appearance-none bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold rounded-lg block w-full pl-3 pr-8 py-2 md:py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All Periods / Quarters</option>
              <option value="Q2">Q2 (Apr-Jun)</option>
              <option value="Q3">Q3 (Jul-Sep)</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-blue-600">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>

          {/* Month Filter */}
          <div className="relative w-full sm:w-auto">
            <select
              value={selectedMonth}
              onChange={(e) => {
                const m = e.target.value;
                setSelectedMonth(m);
                if (["APR", "MAY", "JUN"].includes(m)) {
                  setSelectedQuarter("Q2");
                } else if (["JUL", "AUG", "SEP"].includes(m)) {
                  setSelectedQuarter("Q3");
                }
              }}
              className="appearance-none bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold rounded-lg block w-full pl-3 pr-8 py-2 md:py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Months</option>
              {(selectedQuarter === "ALL" || selectedQuarter === "Q2") && (
                <>
                  <option value="APR">April 2026</option>
                  <option value="MAY">May 2026</option>
                  <option value="JUN">June 2026</option>
                </>
              )}
              {(selectedQuarter === "ALL" || selectedQuarter === "Q3") && (
                <>
                  <option value="JUL">July 2026</option>
                  <option value="AUG">August 2026</option>
                  <option value="SEP">September 2026</option>
                </>
              )}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-indigo-600">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Cascading Filters Bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        {/* Department / Team Filter */}
        <div className="flex-1">
          <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-blue-500" />
            Filter Department / Team
          </label>
          <SearchableSelect
            value={selectedTeam}
            onChange={setSelectedTeam}
            options={uniqueTeams}
            allOptionLabel="All Departments/Teams"
            multiple
          />
        </div>

        {/* Cost Type List Filter */}
        <div className="flex-1">
          <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1.5 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            Filter Cost Type / Heading
          </label>
          <SearchableSelect
            value={selectedCostHeading}
            onChange={setSelectedCostHeading}
            options={uniqueCostHeadings}
            allOptionLabel="All Cost Types"
            multiple
          />
        </div>

        {/* Clear Filters button */}
        {isAnyFilterActive && (
          <button
            onClick={handleClearFilters}
            className="sm:self-end flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-150 rounded-lg text-xs font-extrabold transition-all shrink-0 cursor-pointer select-none animate-fade-in"
          >
            <XCircle className="w-3.5 h-3.5" />
            Clear Filters
          </button>
        )}

        {/* Export PDF */}
        <button
          onClick={handleExportPDF}
          className="sm:self-end flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer select-none shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
          Export PDF
        </button>
      </div>

      {/* Metric Cards — Row 1: Budget · Actual · Remaining */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <MetricCard
          id="metric-budget"
          title={timePeriod === "ALL" ? "Total Budget" : `${timePeriod} Budget`}
          value={formatBDT(activeMetrics.budget)}
          subtext="Allocated limits from spreadsheet"
          icon={<Wallet className="w-5 h-5 text-indigo-600" />}
          sheetItemsQ2={[...filteredData.ltdQ2Clean, ...filteredData.lcQ2Clean]}
          sheetItemsQ3={[...filteredData.ltdQ3Clean, ...filteredData.lcQ3Clean]}
          defaultOpenSection={timePeriod === "ALL" ? undefined : timePeriod.startsWith("Q") ? (timePeriod as "Q2" | "Q3") : undefined}
          selectedMonth={timePeriod}
        />
        <MetricCard
          id="metric-spent"
          title={timePeriod === "ALL" ? "Total Actual" : `${timePeriod} Actual`}
          value={formatBDT(activeMetrics.actual)}
          subtext="Audited cash spent"
          icon={<TrendingUp className="w-5 h-5 text-blue-500" />}
          progress={{
            value: activeMetrics.pct,
            color: activeMetrics.pct > 100 ? "bg-red-500" : activeMetrics.pct > 80 ? "bg-amber-500" : "bg-emerald-500"
          }}
          sheetItemsQ2={[...filteredData.ltdQ2Clean, ...filteredData.lcQ2Clean]}
          sheetItemsQ3={[...filteredData.ltdQ3Clean, ...filteredData.lcQ3Clean]}
          defaultOpenSection={timePeriod === "ALL" ? undefined : timePeriod.startsWith("Q") ? (timePeriod as "Q2" | "Q3") : undefined}
          selectedMonth={timePeriod}
        />
        <MetricCard
          id="metric-remaining"
          title={timePeriod === "ALL" ? "Total Remaining" : `${timePeriod} Remaining`}
          value={formatBDT(activeMetrics.remaining)}
          subtext="Available non-committed funds"
          icon={<CheckCircle className="w-5 h-5 text-emerald-500" />}
          trend={activeMetrics.pct > 100 ? {
            value: Number((activeMetrics.pct - 100).toFixed(1)),
            isPositive: true,
            label: "Over assigned boundaries"
          } : undefined}
          sheetItemsQ2={[...filteredData.ltdQ2Clean, ...filteredData.lcQ2Clean]}
          sheetItemsQ3={[...filteredData.ltdQ3Clean, ...filteredData.lcQ3Clean]}
          defaultOpenSection={timePeriod === "ALL" ? undefined : timePeriod.startsWith("Q") ? (timePeriod as "Q2" | "Q3") : undefined}
          selectedMonth={timePeriod}
        />
      </div>

      {/* Metric Cards — Row 2: Variance · Consumption */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
        <MetricCard
          id="metric-variance"
          title="Variance"
          value={(() => {
            const b = activeMetrics.budget;
            const v = activeMetrics.variance;
            if (b === 0) return "—";
            const pct = (v / b) * 100;
            return (pct >= 0 ? "+" : "") + pct.toFixed(1) + "%";
          })()}
          subtext="Variance % against budget"
          icon={<ArrowRightLeft className="w-5 h-5 text-purple-600" />}
          sheetItemsQ2={[...filteredData.ltdQ2Clean, ...filteredData.lcQ2Clean]}
          sheetItemsQ3={[...filteredData.ltdQ3Clean, ...filteredData.lcQ3Clean]}
          defaultOpenSection={timePeriod === "ALL" ? undefined : timePeriod.startsWith("Q") ? (timePeriod as "Q2" | "Q3") : undefined}
          selectedMonth={timePeriod}
        />
        <MetricCard
          id="metric-efficiency"
          title="Overall Consumption"
          value={`${activeMetrics.pct.toFixed(1)}%`}
          subtext={`Consumption health for ${TIME_PERIODS.find(t => t.value === timePeriod)?.label || timePeriod}`}
          icon={<Percent className="w-5 h-5 text-blue-600" />}
          sheetItemsQ2={[...filteredData.ltdQ2Clean, ...filteredData.lcQ2Clean]}
          sheetItemsQ3={[...filteredData.ltdQ3Clean, ...filteredData.lcQ3Clean]}
          defaultOpenSection={timePeriod === "ALL" ? undefined : timePeriod.startsWith("Q") ? (timePeriod as "Q2" | "Q3") : undefined}
          selectedMonth={timePeriod}
        />
      </div>

      {/* Top 5 Allocations + Departments Needing Attention */}
      <BudgetAttentionCards
        sheetItemsQ2={[...filteredData.ltdQ2Clean, ...filteredData.lcQ2Clean]}
        sheetItemsQ3={[...filteredData.ltdQ3Clean, ...filteredData.lcQ3Clean]}
        timePeriod={timePeriod}
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
              data={panelsData.allDepts.filter(d => d.budget > 0 || d.actual > 0)}
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

      {/* Grid for Spend Trend & Entity Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spend Trend Area Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-gray-400" />
                Monthly Cash Outflow Speed
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Budget allocations compared with audited physical disbursements</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="budgetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={RECHARTS_BUDGET_COLOR} stopOpacity={0.15}/>
                    <stop offset="95%" stopColor={RECHARTS_BUDGET_COLOR} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={RECHARTS_ACTUAL_COLOR} stopOpacity={0.15}/>
                    <stop offset="95%" stopColor={RECHARTS_ACTUAL_COLOR} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(val) => formatCompact(val)} 
                  tick={{ fontSize: 11, fill: "#64748b" }} 
                />
                <Tooltip 
                  formatter={(value: any) => [formatBDT(Number(value)), undefined]}
                  contentStyle={{ background: "#0f172a", border: "none", borderRadius: "8px", color: "#fff" }}
                  labelStyle={{ fontSize: "11px", fontWeight: "bold", color: "#94a3b8" }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Area 
                  type="monotone" 
                  dataKey="Budget" 
                  stroke={RECHARTS_BUDGET_COLOR} 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#budgetGrad)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="Actual" 
                  stroke={RECHARTS_ACTUAL_COLOR} 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#actualGrad)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Entity Donut Distribution Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 mb-1">
              <Layers className="w-4 h-4 text-gray-400" />
              Entity Share breakdown
            </h3>
            <p className="text-xs text-gray-400 mb-6">Split of total budgets assigned to 10MS LTD vs LC Learning Center</p>
          </div>
          
          <div className="h-44 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={entityPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {entityPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [formatBDT(Number(value)), "Allocation"]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center flex flex-col items-center justify-center">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">LTD Total</span>
              <p className="text-sm font-extrabold text-gray-800 mt-0.5">{formatCompact(stats.ltdBudget)}</p>
            </div>
          </div>

          <div className="space-y-2 mt-4 border-t border-gray-100 pt-4">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-slate-900" />
                <span className="text-gray-600 font-medium">10MS Limited (LTD)</span>
              </div>
              <span className="font-bold text-gray-800">{((stats.ltdBudget / stats.combinedBudget) * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-gray-600 font-medium">Learning Center (LC)</span>
              </div>
              <span className="font-bold text-gray-800">{((stats.lcBudget / stats.combinedBudget) * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Department Budgets Analysis */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 mb-1">
            <Building2 className="w-4 h-4 text-gray-400" />
            Top Organizational Categories (Combined LTD & LC)
          </h3>
          <p className="text-xs text-gray-400 mb-6">Financial allocations contrasted with real spent thresholds for top-ranked team streams</p>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#64748b" }} />
              <YAxis 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(val) => formatCompact(val)} 
                tick={{ fontSize: 10, fill: "#64748b" }} 
              />
              <Tooltip 
                formatter={(value: any) => [formatBDT(Number(value)), undefined]}
                contentStyle={{ background: "#0f172a", border: "none", borderRadius: "8px", color: "#fff" }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
              <Bar dataKey="Budget" fill={RECHARTS_BUDGET_COLOR} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Actual" fill={RECHARTS_ACTUAL_COLOR} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}

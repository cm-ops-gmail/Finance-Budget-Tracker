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
  TrendingDown,
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
  Download,
  GitCompareArrows,
  Info,
} from "lucide-react";
import { exportPDF, captureChart } from "../utils/exportPDF";
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

  // ── Comparison section state ───────────────────────────────────────────────
  const [cmpTeam, setCmpTeam] = useState<string[]>(["ALL"]);
  const [cmpPeriodA, setCmpPeriodA] = useState<string>("Q2");
  const [cmpPeriodB, setCmpPeriodB] = useState<string>("Q3");
  const [openPopover, setOpenPopover] = useState<string | null>(null);

  // ── Team-wise comparison state ─────────────────────────────────────────────
  const [tcTeam1, setTcTeam1] = useState<string[]>([]);
  const [tcTeam2, setTcTeam2] = useState<string[]>([]);
  const [tcPeriod, setTcPeriod] = useState<string>("Q2");

  // Close popovers when clicking outside
  React.useEffect(() => {
    const close = () => setOpenPopover(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

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

  const COMPARISON_PERIODS = [
    { value: "Q2", label: "Q2 (Apr–Jun)" },
    { value: "Q3", label: "Q3 (Jul–Sep)" },
    { value: "APR", label: "April 2026" },
    { value: "MAY", label: "May 2026" },
    { value: "JUN", label: "June 2026" },
    { value: "JUL", label: "July 2026" },
    { value: "AUG", label: "August 2026" },
    { value: "SEP", label: "September 2026" },
  ];

  // Shared compute helper — accepts string[] for team (["ALL"] = no filter)
  const computePM = React.useCallback((period: string, teamArr: string[]) => {
      const isAll = teamArr.length === 0 || teamArr.includes("ALL");
      const isQ2 = period === "ALL" || period === "Q2" || ["APR","MAY","JUN"].includes(period);
      const isQ3 = period === "ALL" || period === "Q3" || ["JUL","AUG","SEP"].includes(period);

      const fQ2 = (items: Q2Item[]) =>
        items.filter(i => !i.isSubtotal && !i.isHeader && (isAll || teamArr.includes(i.department)));
      const fQ3 = (items: Q3Item[]) =>
        items.filter(i => !i.isSubtotal && (isAll || teamArr.includes(i.team)));

      let budget = 0, actual = 0, remaining = 0;
      let ltdBudget = 0, ltdActual = 0, lcBudget = 0, lcActual = 0;
      const monthMap: Record<string, { budget: number; actual: number }> = {};
      const add = (name: string, b: number, a: number) => {
        if (!monthMap[name]) monthMap[name] = { budget: 0, actual: 0 };
        monthMap[name].budget += b; monthMap[name].actual += a;
      };

      if (isQ2) {
        const processQ2 = (items: Q2Item[], isLtd: boolean) => {
          fQ2(items).forEach(i => {
            let b = 0, a = 0, r = 0;
            if (period === "Q2" || period === "ALL") {
              b = i.aprBudget + i.mayBudget + i.junBudget;
              a = i.aprBudget + i.mayActual + i.junActual;
              r = i.mayRemaining + i.junRemaining;
              add("April", i.aprBudget, i.aprBudget);
              add("May",   i.mayBudget, i.mayActual);
              add("June",  i.junBudget, i.junActual);
            } else if (period === "APR") {
              b = i.aprBudget; a = i.aprBudget; r = 0; add("April", i.aprBudget, i.aprBudget);
            } else if (period === "MAY") {
              b = i.mayBudget; a = i.mayActual; r = i.mayRemaining; add("May", i.mayBudget, i.mayActual);
            } else if (period === "JUN") {
              b = i.junBudget; a = i.junActual; r = i.junRemaining; add("June", i.junBudget, i.junActual);
            }
            budget += b; actual += a; remaining += r;
            if (isLtd) { ltdBudget += b; ltdActual += a; } else { lcBudget += b; lcActual += a; }
          });
        };
        processQ2(data.ltdQ2, true); processQ2(data.lcQ2, false);
      }

      if (isQ3) {
        const processQ3 = (items: Q3Item[], isLtd: boolean) => {
          fQ3(items).forEach(i => {
            let b = 0, a = 0, r = 0;
            if (period === "Q3" || period === "ALL") {
              b = i.julBudget + i.augBudget + i.sepBudget;
              a = i.julActual + i.augActual + i.sepActual;
              r = i.julRem + i.augRem + i.sepRem;
              add("July", i.julBudget, i.julActual); add("August", i.augBudget, i.augActual); add("September", i.sepBudget, i.sepActual);
            } else if (period === "JUL") {
              b = i.julBudget; a = i.julActual; r = i.julRem; add("July", i.julBudget, i.julActual);
            } else if (period === "AUG") {
              b = i.augBudget; a = i.augActual; r = i.augRem; add("August", i.augBudget, i.augActual);
            } else if (period === "SEP") {
              b = i.sepBudget; a = i.sepActual; r = i.sepRem; add("September", i.sepBudget, i.sepActual);
            }
            budget += b; actual += a; remaining += r;
            if (isLtd) { ltdBudget += b; ltdActual += a; } else { lcBudget += b; lcActual += a; }
          });
        };
        processQ3(data.ltdQ3, true); processQ3(data.lcQ3, false);
      }

      const variance = budget - actual;
      const variancePct = budget > 0 ? (variance / budget) * 100 : 0;
      const consumption = budget > 0 ? (actual / budget) * 100 : 0;
      const months = Object.entries(monthMap).map(([name, v]) => ({ name, ...v }));
      return { budget, actual, remaining, variance, variancePct, consumption,
               ltdBudget, ltdActual, lcBudget, lcActual, months };
  }, [data]);

  const cmpMetrics = useMemo(() => ({
    A: computePM(cmpPeriodA, cmpTeam),
    B: computePM(cmpPeriodB, cmpTeam),
  }), [computePM, cmpPeriodA, cmpPeriodB, cmpTeam]);

  const tcMetrics = useMemo(() => ({
    T1: tcTeam1.length > 0 ? computePM(tcPeriod, tcTeam1) : null,
    T2: tcTeam2.length > 0 ? computePM(tcPeriod, tcTeam2) : null,
  }), [computePM, tcPeriod, tcTeam1, tcTeam2]);

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

  const handleExportPDF = async () => {
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

    // Capture charts in parallel
    const chartResults = await Promise.all([
      captureChart("pdf-card-dept", "Budget vs Actual — All Departments"),
      captureChart("pdf-card-trend", "Monthly Cash Outflow Speed"),
      captureChart("pdf-card-entity", "Entity Share Breakdown"),
      captureChart("pdf-card-category", "Top Organizational Categories"),
    ]);
    const chartImages = chartResults.filter((c): c is { title: string; dataUrl: string } => c !== null);

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
      chartImages,
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
      <div id="pdf-card-dept" className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mt-6 mb-6">
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
        <div id="pdf-card-trend" className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm lg:col-span-2">
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
        <div id="pdf-card-entity" className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col justify-between">
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
              <span className="font-bold text-gray-800">{((stats.ltdBudget / (stats.ltdBudget + stats.lcBudget)) * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-gray-600 font-medium">Learning Center (LC)</span>
              </div>
              <span className="font-bold text-gray-800">{((stats.lcBudget / (stats.ltdBudget + stats.lcBudget)) * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Department Budgets Analysis */}
      <div id="pdf-card-category" className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
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

      {/* ── Comparison Section ─────────────────────────────────────────────────── */}
      {(() => {
        const { A: mA, B: mB } = cmpMetrics;
        const labelA = COMPARISON_PERIODS.find(p => p.value === cmpPeriodA)?.label ?? cmpPeriodA;
        const labelB = COMPARISON_PERIODS.find(p => p.value === cmpPeriodB)?.label ?? cmpPeriodB;

        // ── Popover helper ──────────────────────────────────────────────────────
        const Popover = ({ id, children }: { id: string; children: React.ReactNode }) => (
          <div className="relative inline-flex" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setOpenPopover(openPopover === id ? null : id); }}
              className="ml-1.5 w-[18px] h-[18px] rounded-full bg-gray-100 hover:bg-blue-100 text-gray-400 hover:text-blue-500 flex items-center justify-center transition-colors shrink-0"
            >
              <Info className="w-2.5 h-2.5" />
            </button>
            {openPopover === id && (
              <div className="absolute bottom-full right-0 mb-2.5 w-72 bg-gray-950 text-white rounded-2xl p-4 shadow-2xl z-50 border border-white/10">
                {children}
                <div className="absolute -bottom-[5px] right-4 w-2.5 h-2.5 bg-gray-950 border-r border-b border-white/10 rotate-45" />
              </div>
            )}
          </div>
        );

        // ── Delta badge ─────────────────────────────────────────────────────────
        const Delta = ({ a, b, lowerIsBetter = false }: { a: number; b: number; lowerIsBetter?: boolean }) => {
          if (a === 0 && b === 0) return <span className="text-[10px] text-gray-300 font-semibold">—</span>;
          const diff = b - a;
          const pct = a !== 0 ? (diff / Math.abs(a)) * 100 : (b !== 0 ? 100 : 0);
          if (Math.abs(pct) < 0.05) return <span className="text-[10px] text-gray-400 font-semibold">≈ 0%</span>;
          const isUp = diff > 0;
          const isGood = lowerIsBetter ? !isUp : isUp;
          return (
            <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full ${
              isGood ? "text-emerald-700 bg-emerald-50" : "text-rose-600 bg-rose-50"
            }`}>
              {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {isUp ? "+" : ""}{pct.toFixed(1)}%
            </span>
          );
        };

        // ── Popover content builders ─────────────────────────────────────────────
        const EntityRows = ({ m }: { m: typeof mA }) => (
          <div className="mt-2 space-y-1.5">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">Entity Breakdown</p>
            {[["10MS LTD", m.ltdBudget, m.ltdActual], ["Learning Center", m.lcBudget, m.lcActual]].map(([name, b, a]) => (
              <div key={String(name)} className="flex items-center justify-between">
                <span className="text-gray-400 text-[11px]">{name}</span>
                <div className="text-right">
                  <div className="text-white text-[11px] font-semibold">{formatBDT(Number(b))}</div>
                  <div className="text-gray-500 text-[10px]">Actual: {formatBDT(Number(a))}</div>
                </div>
              </div>
            ))}
          </div>
        );

        const MonthRows = ({ m }: { m: typeof mA }) =>
          m.months.length > 0 ? (
            <div className="mt-3 space-y-1.5 border-t border-white/10 pt-3">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">Monthly Breakdown</p>
              {m.months.map(mo => (
                <div key={mo.name} className="flex items-center justify-between">
                  <span className="text-gray-400 text-[11px]">{mo.name}</span>
                  <div className="text-right">
                    <div className="text-white text-[11px] font-semibold">{formatBDT(mo.budget)}</div>
                    <div className="text-gray-500 text-[10px]">Actual: {formatBDT(mo.actual)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : null;

        const BudgetPopover = ({ m, pid }: { m: typeof mA; pid: string }) => (
          <Popover id={pid}>
            <p className="text-[11px] font-bold text-white mb-1">Budget Breakdown</p>
            <p className="text-[10px] text-gray-400 mb-2">Total = {formatBDT(m.budget)}</p>
            <div className="text-[10px] text-gray-400 bg-white/5 rounded-lg px-2.5 py-1.5 font-mono mb-2">
              {m.months.map(mo => mo.name).join(" + ")} = Total
            </div>
            <EntityRows m={m} />
            <MonthRows m={m} />
          </Popover>
        );

        const ActualPopover = ({ m, pid }: { m: typeof mA; pid: string }) => (
          <Popover id={pid}>
            <p className="text-[11px] font-bold text-white mb-1">Actual Spend Breakdown</p>
            <p className="text-[10px] text-gray-400 mb-2">Total = {formatBDT(m.actual)}</p>
            <EntityRows m={m} />
            <MonthRows m={m} />
            {m.months.some(mo => mo.name === "April") && (
              <p className="mt-2 text-[10px] text-amber-400/80 border-t border-white/10 pt-2">
                ⚠ April actual = budget (no separate April actuals tracked)
              </p>
            )}
          </Popover>
        );

        const RemPopover = ({ m, pid }: { m: typeof mA; pid: string }) => (
          <Popover id={pid}>
            <p className="text-[11px] font-bold text-white mb-1">Remaining Calculation</p>
            <div className="text-[10px] text-gray-400 bg-white/5 rounded-lg px-2.5 py-2 font-mono space-y-0.5 mb-2">
              <div>Budget  = {formatBDT(m.budget)}</div>
              <div>Actual  = {formatBDT(m.actual)}</div>
              <div className="border-t border-white/10 pt-1 text-white font-semibold">Remaining = {formatBDT(m.remaining)}</div>
            </div>
            <p className="text-[10px] text-gray-500">Note: Remaining is taken directly from sheet remaining columns.</p>
          </Popover>
        );

        const VarPopover = ({ m, pid }: { m: typeof mA; pid: string }) => (
          <Popover id={pid}>
            <p className="text-[11px] font-bold text-white mb-1">Variance Calculation</p>
            <div className="text-[10px] text-gray-400 bg-white/5 rounded-lg px-2.5 py-2 font-mono space-y-0.5">
              <div>Budget   = {formatBDT(m.budget)}</div>
              <div>Actual   = {formatBDT(m.actual)}</div>
              <div className="border-t border-white/10 pt-1">Variance = Budget − Actual</div>
              <div>         = {formatBDT(m.variance)}</div>
              <div className="text-white font-semibold">Variance % = {(m.variancePct >= 0 ? "+" : "")}{m.variancePct.toFixed(2)}%</div>
            </div>
          </Popover>
        );

        const ConsPopover = ({ m, pid }: { m: typeof mA; pid: string }) => (
          <Popover id={pid}>
            <p className="text-[11px] font-bold text-white mb-1">Consumption Rate</p>
            <div className="text-[10px] text-gray-400 bg-white/5 rounded-lg px-2.5 py-2 font-mono space-y-0.5">
              <div>Actual   = {formatBDT(m.actual)}</div>
              <div>Budget   = {formatBDT(m.budget)}</div>
              <div className="border-t border-white/10 pt-1">Formula = Actual ÷ Budget × 100</div>
              <div className="text-white font-semibold">       = {m.consumption.toFixed(2)}%</div>
            </div>
          </Popover>
        );

        // ── Row config ──────────────────────────────────────────────────────────
        type RowDef = {
          icon: React.ReactNode;
          label: string;
          subLabel: string;
          valA: string;
          valB: string;
          rawA: number;
          rawB: number;
          lowerIsBetter?: boolean;
          popA: React.ReactNode;
          popB: React.ReactNode;
        };

        const rows: RowDef[] = [
          {
            icon: <Wallet className="w-4 h-4 text-blue-500" />,
            label: "Budget", subLabel: "Total allocated",
            valA: formatBDT(mA.budget), valB: formatBDT(mB.budget),
            rawA: mA.budget, rawB: mB.budget,
            popA: <BudgetPopover m={mA} pid="bud-a" />,
            popB: <BudgetPopover m={mB} pid="bud-b" />,
          },
          {
            icon: <TrendingUp className="w-4 h-4 text-emerald-500" />,
            label: "Actual Spend", subLabel: "Audited disbursement",
            valA: formatBDT(mA.actual), valB: formatBDT(mB.actual),
            rawA: mA.actual, rawB: mB.actual, lowerIsBetter: true,
            popA: <ActualPopover m={mA} pid="act-a" />,
            popB: <ActualPopover m={mB} pid="act-b" />,
          },
          {
            icon: <CheckCircle className="w-4 h-4 text-teal-500" />,
            label: "Remaining", subLabel: "Uncommitted funds",
            valA: formatBDT(mA.remaining), valB: formatBDT(mB.remaining),
            rawA: mA.remaining, rawB: mB.remaining,
            popA: <RemPopover m={mA} pid="rem-a" />,
            popB: <RemPopover m={mB} pid="rem-b" />,
          },
          {
            icon: <ArrowRightLeft className="w-4 h-4 text-violet-500" />,
            label: "Variance %", subLabel: "(Budget − Actual) / Budget",
            valA: (mA.variancePct >= 0 ? "+" : "") + mA.variancePct.toFixed(1) + "%",
            valB: (mB.variancePct >= 0 ? "+" : "") + mB.variancePct.toFixed(1) + "%",
            rawA: mA.variancePct, rawB: mB.variancePct,
            popA: <VarPopover m={mA} pid="var-a" />,
            popB: <VarPopover m={mB} pid="var-b" />,
          },
          {
            icon: <Percent className="w-4 h-4 text-orange-500" />,
            label: "Consumption %", subLabel: "Actual / Budget × 100",
            valA: mA.consumption.toFixed(1) + "%", valB: mB.consumption.toFixed(1) + "%",
            rawA: mA.consumption, rawB: mB.consumption, lowerIsBetter: true,
            popA: <ConsPopover m={mA} pid="con-a" />,
            popB: <ConsPopover m={mB} pid="con-b" />,
          },
        ];

        const cmpChartData = [
          { name: "Budget",    A: mA.budget,    B: mB.budget },
          { name: "Actual",    A: mA.actual,    B: mB.actual },
          { name: "Remaining", A: mA.remaining, B: mB.remaining },
        ];

        return (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <GitCompareArrows className="w-5 h-5 text-blue-400" />
                  Comparison
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Compare any two quarters or months — independent of the filters above.
                </p>
              </div>
              {!cmpTeam.includes("ALL") && cmpTeam.length > 0 && (
                <span className="text-[11px] font-bold text-blue-300 bg-blue-900/40 border border-blue-700/40 px-3 py-1 rounded-full self-start sm:self-auto">
                  {cmpTeam.length === 1 ? cmpTeam[0] : `${cmpTeam.length} teams`}
                </span>
              )}
            </div>

            {/* ── Filters ────────────────────────────────────────────────────── */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex flex-wrap items-end gap-3">
              <div className="min-w-[200px] flex-1">
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1.5">
                  Team / Department
                </label>
                <SearchableSelect
                  value={cmpTeam}
                  onChange={setCmpTeam}
                  options={uniqueTeams}
                  allOptionLabel="All Teams"
                  multiple
                />
              </div>

              <div className="min-w-[160px]">
                <label className="block text-[10px] font-black uppercase text-blue-500 tracking-wider mb-1.5">Period A</label>
                <SearchableSelect
                  value={cmpPeriodA}
                  onChange={(v: string) => setCmpPeriodA(v)}
                  options={COMPARISON_PERIODS}
                  allOptionLabel="All Periods"
                  allOptionValue="ALL"
                  multiple={false}
                />
              </div>

              <span className="pb-2 text-xs font-black text-gray-300 select-none">vs</span>

              <div className="min-w-[160px]">
                <label className="block text-[10px] font-black uppercase text-indigo-500 tracking-wider mb-1.5">Period B</label>
                <SearchableSelect
                  value={cmpPeriodB}
                  onChange={(v: string) => setCmpPeriodB(v)}
                  options={COMPARISON_PERIODS}
                  allOptionLabel="All Periods"
                  allOptionValue="ALL"
                  multiple={false}
                />
              </div>
            </div>

            {/* ── Comparison Table ────────────────────────────────────────────── */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[580px]">
                <thead>
                  <tr className="border-b-2 border-gray-100">
                    <th className="text-left py-4 pl-6 pr-3 text-[10px] font-black text-gray-400 uppercase tracking-widest w-44">Metric</th>
                    <th className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                        <span className="text-sm font-bold text-blue-700">{labelA}</span>
                      </div>
                    </th>
                    <th className="py-4 px-3 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest w-28">Change →</th>
                    <th className="py-4 px-4 pr-6 text-left">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-700 shrink-0" />
                        <span className="text-sm font-bold text-slate-700">{labelB}</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={row.label} className={`border-b border-gray-50 transition-colors hover:bg-gray-50/60 ${idx % 2 === 0 ? "" : "bg-gray-50/30"}`}>
                      {/* Metric label */}
                      <td className="py-4 pl-6 pr-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                            {row.icon}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-700">{row.label}</p>
                            <p className="text-[10px] text-gray-400">{row.subLabel}</p>
                          </div>
                        </div>
                      </td>

                      {/* Period A value */}
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-0.5">
                          <span className="text-sm font-bold text-blue-700 tabular-nums">{row.valA}</span>
                          {row.popA}
                        </div>
                      </td>

                      {/* Delta */}
                      <td className="py-4 px-3 text-center">
                        <Delta a={row.rawA} b={row.rawB} lowerIsBetter={row.lowerIsBetter} />
                      </td>

                      {/* Period B value */}
                      <td className="py-4 px-4 pr-6">
                        <div className="flex items-center gap-0.5">
                          <span className="text-sm font-bold text-slate-800 tabular-nums">{row.valB}</span>
                          {row.popB}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Visual Bar Chart ────────────────────────────────────────────── */}
            <div className="px-6 pt-4 pb-6 border-t border-gray-100 mt-2">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">
                Visual Comparison — Budget · Actual · Remaining
              </p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cmpChartData} margin={{ top: 4, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={v => formatCompact(v)} tick={{ fontSize: 10, fill: "#64748b" }} />
                    <Tooltip
                      formatter={(value: any) => [formatBDT(Number(value)), undefined]}
                      contentStyle={{ background: "#0f172a", border: "none", borderRadius: "10px", color: "#fff" }}
                    />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                      formatter={v => v === "A" ? labelA : labelB}
                    />
                    <Bar dataKey="A" name="A" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="B" name="B" fill="#1e293b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Team-wise Comparison ───────────────────────────────────────────────── */}
      {(() => {
        const { T1, T2 } = tcMetrics;
        const periodLabel = COMPARISON_PERIODS.find(p => p.value === tcPeriod)?.label ?? tcPeriod;

        type PM = NonNullable<typeof T1>;

        // ── reuse Delta component logic inline ──────────────────────────────────
        const Delta2 = ({ a, b, lowerIsBetter = false }: { a: number; b: number; lowerIsBetter?: boolean }) => {
          if (a === 0 && b === 0) return <span className="text-[10px] text-gray-300">—</span>;
          const diff = b - a;
          const pct = a !== 0 ? (diff / Math.abs(a)) * 100 : (b !== 0 ? 100 : 0);
          if (Math.abs(pct) < 0.05) return <span className="text-[10px] text-gray-400">≈ 0%</span>;
          const isUp = diff > 0;
          const isGood = lowerIsBetter ? !isUp : isUp;
          return (
            <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full ${
              isGood ? "text-emerald-700 bg-emerald-50" : "text-rose-600 bg-rose-50"
            }`}>
              {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {isUp ? "+" : ""}{pct.toFixed(1)}%
            </span>
          );
        };

        // ── popover for a single cell ───────────────────────────────────────────
        const TCPopover = ({ id, m, metric }: { id: string; m: PM; metric: "budget"|"actual"|"remaining"|"variance"|"consumption" }) => {
          const content = (() => {
            if (metric === "budget") return (
              <>
                <p className="text-[11px] font-bold text-white mb-2">Budget Breakdown</p>
                <div className="space-y-1.5">
                  {[["10MS LTD", m.ltdBudget], ["Learning Center", m.lcBudget]].map(([n, v]) => (
                    <div key={String(n)} className="flex justify-between text-[11px]">
                      <span className="text-gray-400">{n}</span>
                      <span className="text-white font-semibold">{formatBDT(Number(v))}</span>
                    </div>
                  ))}
                  {m.months.length > 0 && <div className="border-t border-white/10 pt-2 mt-2 space-y-1">
                    {m.months.map(mo => (
                      <div key={mo.name} className="flex justify-between text-[11px]">
                        <span className="text-gray-400">{mo.name}</span>
                        <span className="text-white font-semibold">{formatBDT(mo.budget)}</span>
                      </div>
                    ))}
                  </div>}
                </div>
              </>
            );
            if (metric === "actual") return (
              <>
                <p className="text-[11px] font-bold text-white mb-2">Actual Spend Breakdown</p>
                <div className="space-y-1.5">
                  {[["10MS LTD", m.ltdActual], ["Learning Center", m.lcActual]].map(([n, v]) => (
                    <div key={String(n)} className="flex justify-between text-[11px]">
                      <span className="text-gray-400">{n}</span>
                      <span className="text-white font-semibold">{formatBDT(Number(v))}</span>
                    </div>
                  ))}
                  {m.months.length > 0 && <div className="border-t border-white/10 pt-2 mt-2 space-y-1">
                    {m.months.map(mo => (
                      <div key={mo.name} className="flex justify-between text-[11px]">
                        <span className="text-gray-400">{mo.name}</span>
                        <span className="text-white font-semibold">{formatBDT(mo.actual)}</span>
                      </div>
                    ))}
                  </div>}
                </div>
              </>
            );
            if (metric === "remaining") return (
              <>
                <p className="text-[11px] font-bold text-white mb-2">Remaining</p>
                <div className="bg-white/5 rounded-lg px-2.5 py-2 font-mono text-[10px] space-y-0.5">
                  <div className="text-gray-400">Budget  = {formatBDT(m.budget)}</div>
                  <div className="text-gray-400">Actual  = {formatBDT(m.actual)}</div>
                  <div className="border-t border-white/10 pt-1 text-white font-semibold">Remaining = {formatBDT(m.remaining)}</div>
                </div>
              </>
            );
            if (metric === "variance") return (
              <>
                <p className="text-[11px] font-bold text-white mb-2">Variance</p>
                <div className="bg-white/5 rounded-lg px-2.5 py-2 font-mono text-[10px] space-y-0.5">
                  <div className="text-gray-400">Budget − Actual = Variance</div>
                  <div className="text-gray-400">{formatBDT(m.budget)} − {formatBDT(m.actual)}</div>
                  <div className="text-white font-semibold pt-0.5">{formatBDT(m.variance)} ({(m.variancePct >= 0 ? "+" : "") + m.variancePct.toFixed(1)}%)</div>
                </div>
              </>
            );
            return (
              <>
                <p className="text-[11px] font-bold text-white mb-2">Consumption</p>
                <div className="bg-white/5 rounded-lg px-2.5 py-2 font-mono text-[10px] space-y-0.5">
                  <div className="text-gray-400">Actual ÷ Budget × 100</div>
                  <div className="text-gray-400">{formatBDT(m.actual)} ÷ {formatBDT(m.budget)}</div>
                  <div className="text-white font-semibold pt-0.5">= {m.consumption.toFixed(2)}%</div>
                </div>
              </>
            );
          })();

          return (
            <div className="relative inline-flex" onClick={e => e.stopPropagation()}>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setOpenPopover(openPopover === id ? null : id); }}
                className="ml-1.5 w-[18px] h-[18px] rounded-full bg-gray-100 hover:bg-blue-100 text-gray-400 hover:text-blue-500 flex items-center justify-center transition-colors shrink-0"
              >
                <Info className="w-2.5 h-2.5" />
              </button>
              {openPopover === id && (
                <div className="absolute bottom-full right-0 mb-2.5 w-64 bg-gray-950 text-white rounded-2xl p-4 shadow-2xl z-50 border border-white/10">
                  {content}
                  <div className="absolute -bottom-[5px] right-4 w-2.5 h-2.5 bg-gray-950 border-r border-b border-white/10 rotate-45" />
                </div>
              )}
            </div>
          );
        };

        type MetricKey = "budget"|"actual"|"remaining"|"variance"|"consumption";
        const tcRows: { icon: React.ReactNode; label: string; sub: string; key: MetricKey; fmt: (m: PM) => string; lowerIsBetter?: boolean }[] = [
          { icon: <Wallet className="w-4 h-4 text-blue-500" />, label: "Budget", sub: "Total allocated", key: "budget", fmt: m => formatBDT(m.budget) },
          { icon: <TrendingUp className="w-4 h-4 text-emerald-500" />, label: "Actual Spend", sub: "Audited disbursement", key: "actual", fmt: m => formatBDT(m.actual), lowerIsBetter: true },
          { icon: <CheckCircle className="w-4 h-4 text-teal-500" />, label: "Remaining", sub: "Uncommitted funds", key: "remaining", fmt: m => formatBDT(m.remaining) },
          { icon: <ArrowRightLeft className="w-4 h-4 text-violet-500" />, label: "Variance %", sub: "(Budget−Actual)/Budget", key: "variance", fmt: m => (m.variancePct >= 0 ? "+" : "") + m.variancePct.toFixed(1) + "%" },
          { icon: <Percent className="w-4 h-4 text-orange-500" />, label: "Consumption", sub: "Actual / Budget × 100", key: "consumption", fmt: m => m.consumption.toFixed(1) + "%", lowerIsBetter: true },
        ];

        const rawVal = (m: PM | null, key: MetricKey): number => {
          if (!m) return 0;
          if (key === "variance") return m.variancePct;
          return m[key];
        };

        const tcChartData = T1 && T2 ? [
          { name: "Budget",    T1: T1.budget,    T2: T2.budget },
          { name: "Actual",    T1: T1.actual,    T2: T2.actual },
          { name: "Remaining", T1: T1.remaining, T2: T2.remaining },
        ] : [];

        return (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-indigo-900 to-violet-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-300" />
                  Team-wise Comparison
                </h3>
                <p className="text-xs text-indigo-300 mt-0.5">
                  Compare two teams head-to-head for any period — independent of all other filters.
                </p>
              </div>
              {tcTeam1.length > 0 && tcTeam2.length > 0 && (
                <span className="text-[11px] font-bold text-indigo-200 bg-indigo-800/50 border border-indigo-600/40 px-3 py-1 rounded-full self-start sm:self-auto">
                  {periodLabel}
                </span>
              )}
            </div>

            {/* Filters */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex flex-wrap items-end gap-3">
              <div className="min-w-[180px] flex-1">
                <label className="block text-[10px] font-black uppercase text-blue-500 tracking-wider mb-1.5">Team 1 (select one or more)</label>
                <SearchableSelect
                  value={tcTeam1}
                  onChange={setTcTeam1}
                  options={uniqueTeams}
                  allOptionLabel="Select teams..."
                  multiple={true}
                />
              </div>

              <div className="flex items-end pb-2">
                <span className="text-xs font-black text-gray-300 select-none">vs</span>
              </div>

              <div className="min-w-[180px] flex-1">
                <label className="block text-[10px] font-black uppercase text-violet-500 tracking-wider mb-1.5">Team 2 (select one or more)</label>
                <SearchableSelect
                  value={tcTeam2}
                  onChange={setTcTeam2}
                  options={uniqueTeams}
                  allOptionLabel="Select teams..."
                  multiple={true}
                />
              </div>

              <div className="min-w-[160px]">
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1.5">Period</label>
                <SearchableSelect
                  value={tcPeriod}
                  onChange={(v: string) => setTcPeriod(v)}
                  options={COMPARISON_PERIODS}
                  allOptionLabel="All Periods"
                  allOptionValue="ALL"
                  multiple={false}
                />
              </div>
            </div>

            {/* Empty state */}
            {(!T1 || !T2) ? (
              <div className="py-16 text-center">
                <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-400">Select two teams above to see the comparison</p>
                <p className="text-xs text-gray-300 mt-1">You can also choose any period — quarter or individual month</p>
              </div>
            ) : (
              <>
                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px]">
                    <thead>
                      <tr className="border-b-2 border-gray-100">
                        <th className="text-left py-4 pl-6 pr-3 text-[10px] font-black text-gray-400 uppercase tracking-widest w-44">Metric</th>
                        <th className="py-4 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                            <span className="text-sm font-bold text-blue-700 truncate max-w-[140px]">{tcTeam1.join(", ")}</span>
                          </div>
                        </th>
                        <th className="py-4 px-3 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest w-28">vs</th>
                        <th className="py-4 px-4 pr-6">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-violet-600 shrink-0" />
                            <span className="text-sm font-bold text-violet-700 truncate max-w-[140px]">{tcTeam2.join(", ")}</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tcRows.map((row, idx) => (
                        <tr key={row.key} className={`border-b border-gray-50 hover:bg-gray-50/60 transition-colors ${idx % 2 === 0 ? "" : "bg-gray-50/30"}`}>
                          <td className="py-4 pl-6 pr-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">{row.icon}</div>
                              <div>
                                <p className="text-xs font-bold text-gray-700">{row.label}</p>
                                <p className="text-[10px] text-gray-400">{row.sub}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-end gap-0.5">
                              <span className="text-sm font-bold text-blue-700 tabular-nums">{row.fmt(T1)}</span>
                              <TCPopover id={`tc-t1-${row.key}`} m={T1} metric={row.key} />
                            </div>
                          </td>
                          <td className="py-4 px-3 text-center">
                            <Delta2 a={rawVal(T1, row.key)} b={rawVal(T2, row.key)} lowerIsBetter={row.lowerIsBetter} />
                          </td>
                          <td className="py-4 px-4 pr-6">
                            <div className="flex items-center gap-0.5">
                              <span className="text-sm font-bold text-violet-700 tabular-nums">{row.fmt(T2)}</span>
                              <TCPopover id={`tc-t2-${row.key}`} m={T2} metric={row.key} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Bar chart */}
                {tcChartData.length > 0 && (
                  <div className="px-6 pt-4 pb-6 border-t border-gray-100">
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">
                      Visual Comparison — {tcTeam1.join(", ")} vs {tcTeam2.join(", ")}
                    </p>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={tcChartData} margin={{ top: 4, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                          <YAxis tickLine={false} axisLine={false} tickFormatter={v => formatCompact(v)} tick={{ fontSize: 10, fill: "#64748b" }} />
                          <Tooltip
                            formatter={(value: any) => [formatBDT(Number(value)), undefined]}
                            contentStyle={{ background: "#0f172a", border: "none", borderRadius: "10px", color: "#fff" }}
                          />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                            formatter={v => v === "T1" ? tcTeam1.join(", ") : tcTeam2.join(", ")}
                          />
                          <Bar dataKey="T1" name="T1" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="T2" name="T2" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })()}

    </div>
  );
}

import React, { useState, useMemo } from "react";
import { Q2Item, Q3Item } from "../types.ts";
import { 
  Trophy, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle, 
  X, 
  Building2, 
  ArrowRightLeft,
  DollarSign,
  TrendingUp,
  CornerDownRight,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface BudgetAttentionCardsProps {
  sheetItemsQ2?: Q2Item[];
  sheetItemsQ3?: Q3Item[];
  timePeriod: string; // e.g., "ALL", "Q2", "Q3", "APR", "MAY", "JUN", "JUL", "AUG", "SEP"
}

export default function BudgetAttentionCards({ 
  sheetItemsQ2 = [], 
  sheetItemsQ3 = [], 
  timePeriod 
}: BudgetAttentionCardsProps) {
  const [selectedDept, setSelectedDept] = useState<{
    name: string;
    budget: number;
    actual: number;
    pct: number;
    itemsQ2: Q2Item[];
    itemsQ3: Q3Item[];
  } | null>(null);

  const formatBDT = (num: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const panelsData = useMemo(() => {
    const deptTotals: { 
      [key: string]: { 
        budget: number; 
        actual: number; 
        itemsQ2: Q2Item[]; 
        itemsQ3: Q3Item[] 
      } 
    } = {};

    // 1. Process Q2 Items
    sheetItemsQ2.forEach(item => {
      if (item.isSubtotal || item.isHeader) return;
      const d = item.department || "Other";
      if (!deptTotals[d]) {
        deptTotals[d] = { budget: 0, actual: 0, itemsQ2: [], itemsQ3: [] };
      }

      let b = 0;
      let a = 0;
      if (timePeriod === "ALL") {
        b = (item.aprBudget || 0) + (item.mayBudget || 0) + (item.junBudget || 0);
        a = (item.aprBudget || 0) + (item.mayActual || 0) + (item.junActual || 0);
      } else if (timePeriod === "Q2") {
        b = (item.aprBudget || 0) + (item.mayBudget || 0) + (item.junBudget || 0);
        a = (item.aprBudget || 0) + (item.mayActual || 0) + (item.junActual || 0);
      } else if (timePeriod === "APR") {
        b = item.aprBudget || 0;
        a = item.aprBudget || 0;
      } else if (timePeriod === "MAY") {
        b = item.mayBudget || 0;
        a = item.mayActual || 0;
      } else if (timePeriod === "JUN") {
        b = item.junBudget || 0;
        a = item.junActual || 0;
      }

      if (b > 0 || a > 0) {
        deptTotals[d].budget += b;
        deptTotals[d].actual += a;
        deptTotals[d].itemsQ2.push(item);
      }
    });

    // 2. Process Q3 Items
    sheetItemsQ3.forEach(item => {
      if (item.isSubtotal) return;
      const d = item.team || "Other";
      if (!deptTotals[d]) {
        deptTotals[d] = { budget: 0, actual: 0, itemsQ2: [], itemsQ3: [] };
      }

      let b = 0;
      let a = 0;
      if (timePeriod === "ALL") {
        b = (item.julBudget || 0) + (item.augBudget || 0) + (item.sepBudget || 0);
        a = (item.julActual || 0) + (item.augActual || 0) + (item.sepActual || 0);
      } else if (timePeriod === "Q3") {
        b = (item.julBudget || 0) + (item.augBudget || 0) + (item.sepBudget || 0);
        a = (item.julActual || 0) + (item.augActual || 0) + (item.sepActual || 0);
      } else if (timePeriod === "JUL") {
        b = item.julBudget || 0;
        a = item.julActual || 0;
      } else if (timePeriod === "AUG") {
        b = item.augBudget || 0;
        a = item.augActual || 0;
      } else if (timePeriod === "SEP") {
        b = item.sepBudget || 0;
        a = item.sepActual || 0;
      }

      if (b > 0 || a > 0) {
        deptTotals[d].budget += b;
        deptTotals[d].actual += a;
        deptTotals[d].itemsQ3.push(item);
      }
    });

    const allDepts = Object.entries(deptTotals)
      .map(([name, val]) => ({
        name,
        budget: val.budget,
        actual: val.actual,
        pct: val.budget > 0 ? (val.actual / val.budget) * 100 : 0,
        itemsQ2: val.itemsQ2,
        itemsQ3: val.itemsQ3
      }))
      .filter(d => d.budget > 0 || d.actual > 0);

    const maxBudget = allDepts.reduce((max, curr) => curr.budget > max ? curr.budget : max, 0);

    const topBudgets = [...allDepts]
      .filter(d => d.budget > 0)
      .sort((a, b) => b.budget - a.budget)
      .slice(0, 5);

    const attentionDepts = [...allDepts]
      .filter(d => d.budget > 0)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5);

    return { topBudgets, maxBudget, attentionDepts };
  }, [sheetItemsQ2, sheetItemsQ3, timePeriod]);

  return (
    <div className="w-full">
      {/* Two side-by-side informative panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Top 5 Allocations */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-[0_4px_20px_rgb(0,0,0,0.03)] overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-100 bg-slate-50/50">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-[15px]">
              <Trophy className="w-5 h-5 text-amber-500" />
              Top 5 Budget Allocations
            </h3>
          </div>
          <div className="p-5 space-y-3 flex-grow">
            {panelsData.topBudgets.length > 0 ? (
              panelsData.topBudgets.map((item, index) => (
                <div 
                  key={item.name} 
                  onClick={() => setSelectedDept(item)}
                  className="cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between p-3.5 border border-gray-100 rounded-xl hover:border-blue-300 hover:bg-blue-50/40 transition-all gap-3 shadow-2xs hover:shadow-xs active:scale-[0.99] select-none"
                >
                  <div className="flex items-center gap-3.5 flex-grow min-w-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm ${index === 0 ? 'bg-amber-500' : 'bg-slate-500 group-hover:bg-blue-600 transition-colors'}`}>
                      {index + 1}
                    </div>
                    <div className="font-bold text-gray-800 text-[13px] truncate lg:w-32 xl:w-40 shrink-0 group-hover:text-blue-700 transition-colors" title={item.name}>{item.name}</div>
                    
                    {/* Progress Bar Container within flex space */}
                    <div className="hidden sm:flex flex-grow items-center mr-4">
                      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner flex">
                        <div className="h-full bg-blue-600 rounded-full transition-all duration-700 ease-out group-hover:bg-blue-700" style={{ width: `${(item.budget / panelsData.maxBudget) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 font-bold text-gray-900 text-sm tabular-nums shrink-0 sm:text-right pl-10 sm:pl-0">
                    {new Intl.NumberFormat('en-US').format(item.budget)}
                    <span className="text-[10px] text-blue-500 font-semibold underline group-hover:text-blue-700">Drilldown</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full py-12 flex items-center justify-center text-sm text-gray-400 font-medium">No budget allocations found</div>
            )}
          </div>
        </div>

        {/* Departments Needing Attention */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-[0_4px_20px_rgb(0,0,0,0.03)] overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-100 bg-slate-50/50">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-[15px]">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Departments Needing Attention
            </h3>
          </div>
          <div className="p-5 space-y-3 flex-grow">
            {panelsData.attentionDepts.length > 0 ? (
              panelsData.attentionDepts.map((item) => {
                const isCritical = item.pct >= 100;
                const isWarning = item.pct >= 75 && item.pct < 100;
                const isOk = item.pct < 75;

                return (
                  <div 
                    key={item.name}
                    onClick={() => setSelectedDept(item)}
                    className={`cursor-pointer group flex items-center justify-between p-3.5 border border-gray-100 rounded-xl hover:bg-slate-50 transition-all shadow-2xs hover:shadow-xs active:scale-[0.99] select-none ${
                    isCritical ? 'hover:border-red-300' : isWarning ? 'hover:border-amber-300' : 'hover:border-emerald-300'
                  }`}
                  >
                    <div className="flex items-center gap-4 min-w-0 pr-4">
                      <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1.5 min-w-[85px] justify-center shrink-0 ${
                        isCritical ? 'bg-red-50 text-red-600 border-red-100' :
                        isWarning ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        'bg-emerald-50 text-emerald-600 border-emerald-100'
                      }`}>
                        {isCritical && <AlertTriangle className="w-3 h-3" />}
                        {isWarning && <AlertCircle className="w-3 h-3" />}
                        {isOk && <CheckCircle className="w-3 h-3" />}
                        {isCritical ? 'Critical' : isWarning ? 'Warning' : 'OK'}
                      </div>
                      <div className="font-bold text-gray-800 text-[13px] truncate group-hover:text-blue-600 transition-colors" title={item.name}>{item.name}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className={`font-bold text-sm tabular-nums ${
                        isCritical ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-emerald-600'
                      }`}>
                        {Math.round(item.pct)}%
                      </div>
                      <span className="text-[10px] text-blue-500 font-semibold underline group-hover:text-blue-700">Drilldown</span>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="h-full py-12 flex items-center justify-center text-sm text-gray-400 font-medium">No attention metrics available</div>
            )}
          </div>
        </div>
      </div>

      {/* Drilldown Popover Modal */}
      <AnimatePresence>
        {selectedDept && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 flex items-start justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-800">{selectedDept.name}</h4>
                    <p className="text-xs text-slate-500">Drilldown sheet items and total calculations for period: <span className="font-bold text-slate-700 uppercase">{timePeriod}</span></p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedDept(null)}
                  className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer outline-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 min-h-0">
                
                {/* Stats Row */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-100">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Period Budget</span>
                    <span className="text-base font-extrabold text-slate-800 select-all">{formatBDT(selectedDept.budget)}</span>
                  </div>
                  <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-50">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400 block mb-1">Period Actual</span>
                    <span className="text-base font-extrabold text-blue-700 select-all">{formatBDT(selectedDept.actual)}</span>
                  </div>
                  <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-50">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400 block mb-1">Variance / Remaining</span>
                    <span className={`text-base font-extrabold select-all ${selectedDept.budget - selectedDept.actual < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                      {formatBDT(selectedDept.budget - selectedDept.actual)}
                    </span>
                  </div>
                  <div className={`p-4 rounded-xl border ${
                    selectedDept.pct >= 100 ? 'bg-red-50/50 border-red-100 text-red-700' :
                    selectedDept.pct >= 75 ? 'bg-amber-50/50 border-amber-100 text-amber-700' :
                    'bg-emerald-50/50 border-emerald-100 text-emerald-700'
                  }`}>
                    <span className="text-[10px] uppercase font-bold tracking-wider block mb-1">Consumption Rate</span>
                    <span className="text-lg font-extrabold select-all">{selectedDept.pct.toFixed(1)}%</span>
                  </div>
                </div>

                {/* Formula Breakdown Section */}
                <div id="drilldown-formula" className="p-4 bg-indigo-50/30 border border-indigo-100/50 rounded-xl space-y-3">
                  <h5 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-indigo-500" />
                    Calculation of Total
                  </h5>
                  <div className="text-xs text-indigo-900/95 space-y-1.5 font-sans leading-relaxed">
                    <p className="flex items-center gap-1">
                      <CornerDownRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span><strong>Raw Sheet Rows:</strong> Found <strong className="text-indigo-950">{selectedDept.itemsQ2.length} items</strong> for Q2 and <strong className="text-indigo-950">{selectedDept.itemsQ3.length} items</strong> for Q3 contributing to <span className="font-semibold">{selectedDept.name}</span>.</span>
                    </p>
                    <p className="flex items-center gap-1">
                      <CornerDownRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span><strong>Total Budget formula:</strong> Sum of active period budgets for all matching rows = <strong className="text-indigo-950">{formatBDT(selectedDept.budget)}</strong></span>
                    </p>
                    <p className="flex items-center gap-1">
                      <CornerDownRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span><strong>Total Actual Spent formula:</strong> Sum of active period actual disbursements = <strong className="text-indigo-950">{formatBDT(selectedDept.actual)}</strong></span>
                    </p>
                    <p className="flex items-center gap-1">
                      <CornerDownRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span><strong>Consumption calculation:</strong> (Total Actual / Total Budget) &times; 100 = <strong>{selectedDept.pct.toFixed(2)}%</strong></span>
                    </p>
                  </div>
                </div>

                {/* Contribution list table */}
                <div className="space-y-3">
                  <h5 className="text-xs font-bold text-slate-700">Contributing Spreadsheet Rows</h5>
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <div className="max-h-72 overflow-y-auto">
                      <table className="w-full text-left border-collapse bg-white">
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500 select-none">
                            <th className="py-3 px-4 bg-slate-50">Entity</th>
                            <th className="py-3 px-4 bg-slate-50">Source Tab</th>
                            <th className="py-3 px-4 min-w-[150px] bg-slate-50">Cost Heading / Purpose</th>
                            <th className="py-3 px-3 text-right bg-slate-50">Period Budget</th>
                            <th className="py-3 px-3 text-right bg-slate-50">Period Actual</th>
                            <th className="py-3 px-3 text-right bg-slate-50">Remaining</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-[11px] text-gray-700">
                          {selectedDept.itemsQ2.map((item, idx) => {
                            let b = 0, a = 0;
                            if (timePeriod === "ALL" || timePeriod === "Q2") {
                              b = (item.aprBudget || 0) + (item.mayBudget || 0) + (item.junBudget || 0);
                              a = (item.aprBudget || 0) + (item.mayActual || 0) + (item.junActual || 0);
                            } else if (timePeriod === "APR") {
                              b = item.aprBudget || 0; a = item.aprBudget || 0;
                            } else if (timePeriod === "MAY") {
                              b = item.mayBudget || 0; a = item.mayActual || 0;
                            } else if (timePeriod === "JUN") {
                              b = item.junBudget || 0; a = item.junActual || 0;
                            }
                            return (
                              <tr key={`q2-${idx}-${item.id}`} className="hover:bg-slate-50 transition-colors">
                                <td className="py-3 px-4">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${item.entity === 'LTD' ? 'bg-slate-900 text-white' : 'bg-blue-600 text-white'}`}>{item.entity}</span>
                                </td>
                                <td className="py-3 px-4 text-slate-500">Q2 Budget</td>
                                <td className="py-3 px-4 font-bold text-slate-800">
                                  <div>{item.costHeading}</div>
                                  <div className="font-normal text-slate-400 text-[10px] mt-0.5">{item.description}</div>
                                </td>
                                <td className="py-3 px-3 text-right font-medium tabular-nums text-slate-700">{formatBDT(b)}</td>
                                <td className="py-3 px-3 text-right font-medium tabular-nums text-blue-600">{formatBDT(a)}</td>
                                <td className={`py-3 px-3 text-right font-bold tabular-nums ${b - a < 0 ? 'text-red-500' : 'text-slate-600'}`}>
                                  {formatBDT(b - a)}
                                </td>
                              </tr>
                            );
                          })}

                          {selectedDept.itemsQ3.map((item, idx) => {
                            let b = 0, a = 0;
                            if (timePeriod === "ALL" || timePeriod === "Q3") {
                              b = (item.julBudget || 0) + (item.augBudget || 0) + (item.sepBudget || 0);
                              a = (item.julActual || 0) + (item.augActual || 0) + (item.sepActual || 0);
                            } else if (timePeriod === "JUL") {
                              b = item.julBudget || 0; a = item.julActual || 0;
                            } else if (timePeriod === "AUG") {
                              b = item.augBudget || 0; a = item.augActual || 0;
                            } else if (timePeriod === "SEP") {
                              b = item.sepBudget || 0; a = item.sepActual || 0;
                            }
                            return (
                              <tr key={`q3-${idx}-${item.id}`} className="hover:bg-slate-50 transition-colors">
                                <td className="py-3 px-4">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${item.entity === 'LTD' ? 'bg-slate-900 text-white' : 'bg-blue-600 text-white'}`}>{item.entity}</span>
                                </td>
                                <td className="py-3 px-4 text-slate-500">Q3 Budget</td>
                                <td className="py-3 px-4 font-bold text-slate-800">
                                  <div>{item.subTeam}</div>
                                  <div className="font-normal text-slate-400 text-[10px] mt-0.5">{item.purpose}</div>
                                </td>
                                <td className="py-3 px-3 text-right font-medium tabular-nums text-slate-700">{formatBDT(b)}</td>
                                <td className="py-3 px-3 text-right font-medium tabular-nums text-blue-600">{formatBDT(a)}</td>
                                <td className={`py-3 px-3 text-right font-bold tabular-nums ${b - a < 0 ? 'text-red-500' : 'text-slate-600'}`}>
                                  {formatBDT(b - a)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedDept(null)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs outline-none"
                >
                  Close Drilldown
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

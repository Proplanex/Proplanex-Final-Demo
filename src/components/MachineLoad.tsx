import React, { useState } from "react";
import { useAppState } from "../context/AppContext";
import { 
  Search, SlidersHorizontal, Cpu, Layers, Calendar, 
  AlertTriangle, Activity, CheckCircle2, Server, HelpCircle, ArrowRight
} from "lucide-react";
import { MachineConfig } from "../types";

interface MachineLoadProps {
  readOnly?: boolean;
}

export default function MachineLoad({ readOnly = false }: MachineLoadProps) {
  const { 
    machines, 
    machinePlans, 
    productionLogs, 
    orders, 
    machineStatusMap, 
    updateMachineStatus 
  } = useAppState();

  // Search filter local states
  const [filterType, setFilterType] = useState<string>("All Types");
  const [filterNo, setFilterNo] = useState<string>("");
  const [filterDiaGG, setFilterDiaGG] = useState<string>("");
  const [filterBrand, setFilterBrand] = useState<string>("");

  // Status map options list
  const statusOptions = [
    "Running", 
    "Servicing", 
    "No Order", 
    "Hold For Technical Issues", 
    "Hold For Quality Issues", 
    "Hold For Electric and Mechanical issues"
  ];

  // Helper: Retrieve which fabric was produced last on this machine
  const getLatestFabricType = (machineNo: string): string => {
    // 1. Check last production log
    const machLogs = productionLogs.filter(l => l.machineNo === machineNo);
    if (machLogs.length > 0) {
      // Sort to get the most recent log
      const sortedLogs = [...machLogs].sort((a, b) => b.date.localeCompare(a.date));
      const lastOrderNo = sortedLogs[0].orderNo;
      const matchedOrder = orders.find(o => o.orderNo === lastOrderNo);
      if (matchedOrder) return matchedOrder.fabricType;
    }

    // 2. Fallback to last scheduled machine plan
    const machPlans = machinePlans.filter(p => p.machineNo === machineNo);
    if (machPlans.length > 0) {
      const lastPlanOrderNo = machPlans[machPlans.length - 1].orderNo;
      const matchedOrder = orders.find(o => o.orderNo === lastPlanOrderNo);
      if (matchedOrder) return matchedOrder.fabricType;
    }

    // 3. Fallback to registered default fabric type in Settings
    const matchedMach = machines.find(m => m.machineNo === machineNo);
    return matchedMach?.fabricType || "N/A";
  };

  // Process data for all registered machines
  const processedMachines = machines.map((machine) => {
    // 1. Assigned Quantity (sum of plannedQty in machinePlans)
    const assignedQty = machinePlans
      .filter(p => p.machineNo === machine.machineNo)
      .reduce((sum, p) => sum + p.plannedQty, 0);

    // 2. Total Production (sum of qty in productionLogs)
    const totalProduction = productionLogs
      .filter(l => l.machineNo === machine.machineNo)
      .reduce((sum, l) => sum + l.qty, 0);

    // 3. Balance
    const balance = Math.max(0, assignedQty - totalProduction);

    // 4. Average production per day
    const machLogs = productionLogs.filter(l => l.machineNo === machine.machineNo);
    const uniqueDays = new Set(machLogs.map(l => l.date)).size;
    const avgProdPerDay = uniqueDays > 0 ? (totalProduction / uniqueDays) : (machine.capacityPerDay || 200);

    // 5. Days to be Free
    const daysToBeFree = balance > 0 && avgProdPerDay > 0 ? Math.ceil(balance / avgProdPerDay) : 0;

    // 6. Expected Free Date
    const getExpectedFreeDate = (days: number) => {
      if (balance <= 0) return "Free Now";
      if (days <= 0) return "Free Now";
      
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      return targetDate.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    };

    const status = machineStatusMap[machine.machineNo] || "Running";
    const fabricType = getLatestFabricType(machine.machineNo);

    return {
      ...machine,
      fabricType,
      assignedQty,
      totalProduction,
      balance,
      avgProdPerDay,
      daysToBeFree,
      expectedFreeDate: getExpectedFreeDate(daysToBeFree),
      status
    };
  });

  // Apply search filtering
  const filteredMachines = processedMachines.filter((m) => {
    const matchType = filterType === "All Types" || m.machineType === filterType;
    const matchNo = !filterNo ? true : m.machineNo.toLowerCase().includes(filterNo.toLowerCase());
    const matchDiaGG = !filterDiaGG ? true : `${m.dia} x ${m.gg}`.toLowerCase().includes(filterDiaGG.toLowerCase());
    const matchBrand = !filterBrand ? true : (m.brand || "").toLowerCase().includes(filterBrand.toLowerCase());

    return matchType && matchNo && matchDiaGG && matchBrand;
  });

  // KPI calculations
  const totalMachinesCount = processedMachines.length;
  const runningMachinesCount = processedMachines.filter(m => m.status === "Running").length;
  const machinesWithActiveLoad = processedMachines.filter(m => m.balance > 0).length;
  const totalOutstandingBalance = processedMachines.reduce((sum, m) => sum + m.balance, 0);
  const averageDaysToFree = machinesWithActiveLoad > 0 
    ? Math.ceil(processedMachines.reduce((sum, m) => sum + m.daysToBeFree, 0) / machinesWithActiveLoad)
    : 0;

  // Status visual colors mapper
  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case "Running":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "Servicing":
        return "bg-rose-50 text-rose-800 border-rose-150";
      case "No Order":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "Hold For Technical Issues":
      case "Hold For Quality Issues":
      case "Hold For Electric and Mechanical issues":
        return "bg-amber-50 text-amber-800 border-amber-200";
      default:
        return "bg-slate-50 text-slate-650 border-slate-150";
    }
  };

  return (
    <div id="machine_load_tab" className="space-y-6">
      {/* 1. TOP METRICS INDICATORS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* KPI: Active Floor State */}
        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-650 shrink-0">
            <Cpu className="h-5.5 w-5.5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono font-bold tracking-widest text-slate-400">Total Registered</p>
            <h3 className="font-bold text-lg text-slate-800 leading-tight mt-0.5">{totalMachinesCount} Machines</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Floor Capacity</p>
          </div>
        </div>

        {/* KPI: Running Machines */}
        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <Activity className="h-5.5 w-5.5 animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono font-bold tracking-widest text-slate-400">Status Running</p>
            <h3 className="font-bold text-lg text-slate-800 leading-tight mt-0.5">{runningMachinesCount} Active</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {totalMachinesCount > 0 ? Math.round((runningMachinesCount / totalMachinesCount) * 100) : 0}% Operational
            </p>
          </div>
        </div>

        {/* KPI: Machines with Balance Load */}
        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shrink-0">
            <Layers className="h-5.5 w-5.5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono font-bold tracking-widest text-slate-400">Loaded Machines</p>
            <h3 className="font-bold text-lg text-slate-800 leading-tight mt-0.5">{machinesWithActiveLoad} Loaded</h3>
            <p className="text-[10px] text-orange-800 font-medium">Bal: {totalOutstandingBalance.toLocaleString()} Kg</p>
          </div>
        </div>

        {/* KPI: Average release timeframe */}
        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-50 border border-blue-150 flex items-center justify-center text-blue-600 shrink-0">
            <Calendar className="h-5.5 w-5.5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono font-bold tracking-widest text-slate-400">Floor Completion</p>
            <h3 className="font-bold text-lg text-slate-800 leading-tight mt-0.5">~{averageDaysToFree} Days Avg.</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Until floor releases</p>
          </div>
        </div>
      </div>

      {/* 2. ADVANCED INTERACTIVE FILTER PANEL */}
      <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-3xs space-y-4">
        <div className="flex items-center gap-2 pb-1.5 border-b border-indigo-50/50">
          <SlidersHorizontal className="h-4 w-4 text-indigo-600" />
          <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider font-mono">Floor Filter Options</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Dropdown: Machine Type */}
          <div className="space-y-1">
            <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Machine Type</label>
            <select
              className="w-full text-xs p-2.5 bg-slate-55 border border-slate-200 rounded-lg font-semibold text-slate-750 focus:outline-indigo-650 cursor-pointer"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="All Types">All Machine Types</option>
              <option value="Single Jersey">Single Jersey</option>
              <option value="Double Jersey">Double Jersey</option>
            </select>
          </div>

          {/* Input: Machine Number */}
          <div className="space-y-1">
            <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Machine Number</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                <Search className="h-3.5 w-3.5" />
              </span>
              <input
                type="text"
                className="w-full text-xs py-2.5 pl-9 pr-3 bg-slate-55 border border-slate-200 rounded-lg placeholder-slate-400 text-slate-755 focus:outline-indigo-650"
                placeholder="e.g. M-101"
                value={filterNo}
                onChange={(e) => setFilterNo(e.target.value)}
              />
            </div>
          </div>

          {/* Input: DiaXGauge */}
          <div className="space-y-1">
            <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Dia x Gauge</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                <Search className="h-3.5 w-3.5" />
              </span>
              <input
                type="text"
                className="w-full text-xs py-2.5 pl-9 pr-3 bg-slate-55 border border-slate-200 rounded-lg placeholder-slate-400 text-slate-755 focus:outline-indigo-650"
                placeholder="e.g. 34 x 18"
                value={filterDiaGG}
                onChange={(e) => setFilterDiaGG(e.target.value)}
              />
            </div>
          </div>

          {/* Input: Machine Brand */}
          <div className="space-y-1">
            <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Machine Brand</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                <Search className="h-3.5 w-3.5" />
              </span>
              <input
                type="text"
                className="w-full text-xs py-2.5 pl-9 pr-3 bg-slate-55 border border-slate-200 rounded-lg placeholder-slate-400 text-slate-755 focus:outline-indigo-650"
                placeholder="e.g. Fukuhara, Terrot"
                value={filterBrand}
                onChange={(e) => setFilterBrand(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Clear filters utility banner if any are active */}
        {(filterType !== "All Types" || filterNo || filterDiaGG || filterBrand) && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => {
                setFilterType("All Types");
                setFilterNo("");
                setFilterDiaGG("");
                setFilterBrand("");
              }}
              className="text-[10px] font-mono font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider underline cursor-pointer"
            >
              Reset Selected Filter Options
            </button>
          </div>
        )}
      </div>

      {/* 3. CORE MACHINE LOAD DATA SHEET */}
      <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <h2 className="font-bold text-sm text-slate-800">Master Knitting Machine Load Capacity Sheet</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Calculated based on live Planning assigned quantities and real-time Production update Logs.</p>
          </div>
          <span className="text-[10px] font-mono bg-indigo-50 border border-indigo-100 font-bold px-3 py-1 text-indigo-755 rounded-xl self-start sm:self-auto">
            Showing {filteredMachines.length} of {totalMachinesCount} Machines
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-mono font-bold text-slate-450 uppercase tracking-wider">
                <th className="py-3 px-4">Machine Type</th>
                <th className="py-3 px-3">Machine No</th>
                <th className="py-3 px-3">Last Fabric Type Produced</th>
                <th className="py-3 px-3">Dia x Gauge</th>
                <th className="py-3 px-3">Brand</th>
                <th className="py-3 px-3">Origin</th>
                <th className="py-3 px-3 text-center">Feeder</th>
                <th className="py-3 px-3 text-right">Assign Qty (Kg)</th>
                <th className="py-3 px-3 text-right">Production (Kg)</th>
                <th className="py-3 px-3 text-right">Balance (Kg)</th>
                <th className="py-3 px-3 text-right">Avg Prod/Day</th>
                <th className="py-3 px-3 text-center">Days to Free</th>
                <th className="py-3 px-3">Expected Free Date</th>
                <th className="py-3 px-4">Current Status Set</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredMachines.length > 0 ? (
                filteredMachines.map((m, idx) => {
                  const hasLoad = m.balance > 0;
                  return (
                    <tr 
                      key={m.machineNo} 
                      className={`hover:bg-slate-50/70 transition-colors ${
                        idx % 2 === 1 ? "bg-slate-50/20" : ""
                      } ${hasLoad ? "font-medium" : ""}`}
                    >
                      {/* Machine Type */}
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {m.machineType || "Single Jersey"}
                      </td>

                      {/* Machine Number */}
                      <td className="py-3.5 px-3">
                        <span className="font-mono font-bold text-indigo-705 bg-indigo-50/50 border border-indigo-100 px-1.5 py-0.5 rounded text-[11px]">
                          {m.machineNo}
                        </span>
                      </td>

                      {/* Latest Fabric Type */}
                      <td className="py-3.5 px-3 max-w-xs truncate text-[11px]" title={m.fabricType}>
                        {m.fabricType !== "N/A" ? (
                          <span className="text-slate-800 font-semibold">{m.fabricType}</span>
                        ) : (
                          <span className="text-slate-400 italic">No logs recorded</span>
                        )}
                      </td>

                      {/* Dia x Gauge */}
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-650">
                        {m.dia} x {m.gg}
                      </td>

                      {/* Brand */}
                      <td className="py-3.5 px-3 text-slate-550 font-semibold">
                        {m.brand || <span className="text-slate-350 italic">—</span>}
                      </td>

                      {/* Origin */}
                      <td className="py-3.5 px-3 text-slate-550">
                        {m.origin || <span className="text-slate-350 italic">—</span>}
                      </td>

                      {/* Feeder */}
                      <td className="py-3.5 px-3 text-center text-slate-600 font-mono">
                        {m.feeder || <span className="text-slate-350 italic">—</span>}
                      </td>

                      {/* Assigned Qty */}
                      <td className="py-3.5 px-3 text-right font-mono text-slate-800 font-semibold">
                        {m.assignedQty > 0 ? `${m.assignedQty.toLocaleString()} kg` : "—"}
                      </td>

                      {/* Total Production */}
                      <td className="py-3.5 px-3 text-right font-mono text-emerald-700 font-semibold">
                        {m.totalProduction > 0 ? `${m.totalProduction.toLocaleString()} kg` : "—"}
                      </td>

                      {/* Balance Outstanding */}
                      <td className="py-3.5 px-3 text-right font-mono">
                        {m.balance > 0 ? (
                          <span className="text-orange-700 bg-orange-50 font-bold px-1.5 py-0.5 rounded border border-orange-100">
                            {m.balance.toLocaleString()} kg
                          </span>
                        ) : (
                          <span className="text-slate-400">0 kg</span>
                        )}
                      </td>

                      {/* Average Production / Day */}
                      <td className="py-3.5 px-3 text-right font-mono text-slate-600">
                        {Math.round(m.avgProdPerDay)} kg
                      </td>

                      {/* Days to be Free */}
                      <td className="py-3.5 px-3 text-center">
                        {m.daysToBeFree > 0 ? (
                          <span className="font-mono bg-blue-50 text-blue-750 px-1.5 py-0.5 rounded border border-blue-100 font-bold">
                            {m.daysToBeFree} {m.daysToBeFree === 1 ? "day" : "days"}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-mono font-bold bg-emerald-50 text-[10px] px-1.5 py-0.5 rounded border border-emerald-100">
                            Free
                          </span>
                        )}
                      </td>

                      {/* Expected Free Date */}
                      <td className="py-3.5 px-3">
                        {m.balance > 0 ? (
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <span className="text-[11px] font-semibold">{m.expectedFreeDate}</span>
                          </div>
                        ) : (
                          <span className="text-emerald-600 font-semibold text-[10px] uppercase font-mono tracking-wider">Ready Now</span>
                        )}
                      </td>

                      {/* Interactive Status dropdown */}
                      <td className="py-3.5 px-4">
                        {readOnly ? (
                          <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-mono font-bold uppercase border ${getStatusBadgeStyles(m.status)}`}>
                            {m.status}
                          </span>
                        ) : (
                          <select
                            value={m.status}
                            onChange={(e) => updateMachineStatus(m.machineNo, e.target.value)}
                            className={`text-[11px] font-mono font-bold uppercase rounded-lg px-2 py-1.5 border cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[190px] ${getStatusBadgeStyles(m.status)}`}
                          >
                            {statusOptions.map((opt) => (
                              <option key={opt} value={opt} className="bg-white text-slate-800 normal-case font-sans">
                                {opt}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-400 italic">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Server className="h-8 w-8 text-slate-300" />
                      <p className="text-xs">No floor machines match the specified search parameters.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 4. DYNAMIC FLOOR ANNOUNCEMENT / FOOTER SUMMARY */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-[11px] text-slate-550 leading-relaxed font-sans">
          <div className="flex items-start gap-2 max-w-xl">
            <HelpCircle className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
            <p>
              <strong>Status Guidance:</strong> Status settings default to <em>Running</em>. The <strong>Days to Free</strong> and <strong>Expected Free Dates</strong> automatically re-render dynamically as operators append knitting production rolls from the Floor Logs.
            </p>
          </div>
          <div className="p-2 bg-indigo-50/60 border border-indigo-100 rounded-lg text-[10px] font-semibold text-slate-650 flex items-center gap-1">
            <span>Machine Summary Source: Settings Machine Registry</span>
            <ArrowRight className="h-3 w-3 text-indigo-600" />
          </div>
        </div>
      </div>
    </div>
  );
}

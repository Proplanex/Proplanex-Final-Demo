import React, { useState } from "react";
import { useAppState } from "../context/AppContext";
import { Order, MachinePlan, ProductionLog } from "../types";
import { Search, Barcode, Calendar, FileDown, Plus, Clipboard, CheckCircle, Smartphone } from "lucide-react";
import { downloadTableAsExcel } from "../utils/helpers";

export default function ProductionUpdate() {
  const { 
    orders, machinePlans, productionLogs, addProductionLog, getPlannedQty, getTotalProduction 
  } = useAppState();

  // Operator Barcode Search input
  const [barcodeInput, setBarcodeInput] = useState("");
  const [activePlan, setActivePlan] = useState<MachinePlan | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  // Filters for ledger
  const [filterOrderNo, setFilterOrderNo] = useState("");
  const [filterJobCardNo, setFilterJobCardNo] = useState("");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");

  // Production entry values
  const [entryQty, setEntryQty] = useState("");
  const [selectedShift, setSelectedShift] = useState<"A" | "B" | "C">("A");
  const [dateTimeStr, setDateTimeStr] = useState(() => {
    const d = new Date();
    // Format to yyyy-MM-ddThh:mm
    const tzoffset = d.getTimezoneOffset() * 60000; 
    const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 16);
    return localISOTime;
  });

  // Handle barcode scanning simulation
  const handleBarcodeSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanBarcode = barcodeInput.trim().toUpperCase();
    if (!cleanBarcode) return;

    const matchedPlan = machinePlans.find(p => p.jobCardNo.toUpperCase() === cleanBarcode);
    if (!matchedPlan) {
      alert(`Job Card barcode "${cleanBarcode}" not found on shop floor schedule.`);
      return;
    }

    const matchedOrder = orders.find(o => o.orderNo === matchedPlan.orderNo);
    if (!matchedOrder) {
      alert("Associated order details could not be found.");
      return;
    }

    if (matchedOrder.status === "Complete") {
      alert("This order is already marked COMPLETE. Production logged on complete orders is prohibited.");
      return;
    }

    setActivePlan(matchedPlan);
    setActiveOrder(matchedOrder);
  };

  const handleSaveProduction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlan || !activeOrder) return;

    const qty = Number(entryQty);
    if (!qty || qty <= 0) {
      alert("Please enter a valid positive production weight.");
      return;
    }

    // Check Job Card Balance
    const loggedOnThisJob = productionLogs
      .filter(l => l.jobCardNo === activePlan.jobCardNo)
      .reduce((sum, l) => sum + l.qty, 0);
    const jobCardBalance = activePlan.plannedQty - loggedOnThisJob;

    if (qty > jobCardBalance) {
      // Allow minor tolerance or enforce hard block? Rule: "plannedQty has a balance, warn user if exceeded or follow rules:"
      if (!window.confirm(`Warning: Entering ${qty} Kg exceeds Job Card Plan Balance (${jobCardBalance} Kg). Exceeding plan is generally restricted. Proceed anyway?`)) {
        return;
      }
    }

    // Save production entry
    addProductionLog({
      date: dateTimeStr.replace("T", " "),
      orderNo: activePlan.orderNo,
      jobCardNo: activePlan.jobCardNo,
      machineNo: activePlan.machineNo,
      shift: selectedShift,
      qty: qty
    });

    // Reset popup
    setActivePlan(null);
    setActiveOrder(null);
    setEntryQty("");
    setBarcodeInput("");
  };

  // Filtered ledger logic
  const filteredLogs = productionLogs.filter(log => {
    // Join details from parent Order for filtering checks
    const ordObj = orders.find(o => o.orderNo === log.orderNo);
    if (!ordObj) return false;

    if (filterOrderNo && !log.orderNo.toLowerCase().includes(filterOrderNo.toLowerCase())) return false;
    if (filterJobCardNo && !log.jobCardNo.toLowerCase().includes(filterJobCardNo.toLowerCase())) return false;

    // Dates check
    const logDateOnly = log.date.substring(0, 10); // YYYY-MM-DD
    if (filterFromDate && logDateOnly < filterFromDate) return false;
    if (filterToDate && logDateOnly > filterToDate) return false;

    return true;
  });

  const subtotalFilteredProduction = filteredLogs.reduce((sum, log) => sum + log.qty, 0);

  // Download XLS action
  const handleExportExcel = () => {
    if (filteredLogs.length === 0) {
      alert("No data to export.");
      return;
    }

    const excelRows = filteredLogs.map((log, index) => {
      const ordObj = orders.find(o => o.orderNo === log.orderNo);
      
      // Aggregates
      const yarnsJoined = ordObj?.yarns.map(y => y.yc).filter(Boolean).join(" + ") || "N/A";
      const lotsJoined = ordObj?.yarns.map(y => y.lot).filter(Boolean).join(" + ") || "N/A";
      const spinnerJoined = ordObj?.yarns.map(y => y.spinner).filter(Boolean).join(" + ") || "N/A";
      const slJoined = ordObj?.yarns.map(y => y.sl).filter(Boolean).join(" + ") || "N/A";

      return {
        SL: index + 1,
        "Production Date": log.date,
        "W/Order Number": log.orderNo,
        "Job Card Number": log.jobCardNo,
        "M/C No": log.machineNo,
        Shift: log.shift,
        "Partner Factory": ordObj?.factoryName || "N/A",
        "Factory Order Ref": ordObj?.factoryOrder || "N/A",
        "Fabric Type": ordObj?.fabricType || "N/A",
        "Dia x GG": ordObj?.diaGG || "N/A",
        "Color Variant": ordObj?.color || "N/A",
        "Finish GSM": ordObj?.finishGSM || 0,
        "Finish Dia": ordObj?.finishDia || 0,
        "Factory Job No": ordObj?.factoryJobNo || "N/A",
        "Yarn Spec": yarnsJoined,
        "Yarn Lots": lotsJoined,
        Spinners: spinnerJoined,
        "Stitch Lengths": slJoined,
        "Production Weight (Kg)": log.qty
      };
    });

    downloadTableAsExcel(excelRows, `PROPLANEX_Production_Entries_${new Date().toISOString().split("T")[0]}`);
  };

  return (
    <div className="space-y-6">
      {/* BARCODE SCANNING CONSOLE */}
      <div className="bg-slate-900 text-slate-100 p-6 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 text-slate-800/10 -mt-6 -mr-6 pointer-events-none transform rotate-12">
          <Barcode className="h-64 w-64" />
        </div>
        <div className="max-w-xl space-y-4 relative z-10">
          <div className="flex items-center gap-2 text-indigo-400 font-mono text-xs uppercase tracking-widest font-semibold">
            <Smartphone className="h-4 w-4" /> Operator Shop Floor Integration
          </div>
          <div>
            <h2 className="font-sans font-bold text-lg text-white">Daily Production Output Capture</h2>
            <p className="text-xs text-slate-400 mt-1">Scan or type the Job Card barcode located on the printed A4 ticket to log yarn knitted weight output.</p>
          </div>
          
          <form onSubmit={handleBarcodeSearch} className="flex gap-2.5">
            <div className="relative flex-1">
              <Barcode className="absolute left-3 top-3 h-5 w-5 text-indigo-400" />
              <input
                type="text"
                className="w-full bg-slate-950 border border-slate-800/80 rounded-xl py-3 pl-11 pr-4 text-sm text-lime-400 font-mono uppercase focus:ring-2 focus:ring-indigo-500/20 focus:outline-hidden placeholder:text-slate-600 focus:border-indigo-500"
                placeholder="PRO-M4-0001 (Scan Ticket Barcode)..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-6 rounded-xl cursor-pointer transition-colors"
            >
              Scan Log
            </button>
          </form>
          
          <p className="text-[10px] text-slate-500 font-mono">
            *Tip: Try scanning <span className="text-lime-500 font-bold bg-slate-950 px-1 py-0.5 rounded border border-slate-800">PROM1010001</span> after scheduling on machine M-101 in Module 3.
          </p>
        </div>
      </div>

      {/* FILTERABLE LEDGER AND SUMMARY BANNER */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        {/* Subtotal Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Shop Floor Production ledger</h3>
            <p className="text-xs text-slate-400 mt-0.5">Filter of daily Knitting, Carding, and Terry output logs.</p>
          </div>

          <div className="bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl text-right flex items-center justify-between sm:justify-end gap-6">
            <span className="text-xs font-mono text-slate-400 leading-none">Subtotal Volume (Filtered):</span>
            <span className="text-base font-bold font-mono text-indigo-700 leading-none">{subtotalFilteredProduction.toLocaleString()} <span className="text-xs font-normal text-slate-500">Kg</span></span>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">Contract W/Order #</label>
            <input
              type="text"
              className="w-full p-2 border border-slate-200 rounded-lg"
              placeholder="e.g. PRO0001"
              value={filterOrderNo}
              onChange={(e) => setFilterOrderNo(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">Job Card Ref #</label>
            <input
              type="text"
              className="w-full p-2 border border-slate-200 rounded-lg"
              placeholder="e.g. PROM40001"
              value={filterJobCardNo}
              onChange={(e) => setFilterJobCardNo(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">From Date</label>
            <input
              type="date"
              className="w-full p-2 border border-slate-200 rounded-lg text-slate-500"
              value={filterFromDate}
              onChange={(e) => setFilterFromDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">To Date</label>
            <input
              type="date"
              className="w-full p-2 border border-slate-200 rounded-lg text-slate-500"
              value={filterToDate}
              onChange={(e) => setFilterToDate(e.target.value)}
            />
          </div>
          <div className="col-span-2 md:col-span-1 flex items-end">
            <button
              onClick={handleExportExcel}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium p-2 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors text-[11px]"
            >
              <FileDown className="h-4 w-4" /> Excel (.xlsx)
            </button>
          </div>
        </div>
      </div>

      {/* LEDGER DATA TABLE */}
      <div className="bg-white border border-slate-150 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs text-slate-700">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3">Date & Time</th>
                <th className="py-3 px-3">W/Order</th>
                <th className="py-3 px-2">Job Card</th>
                <th className="py-3 px-2">M/C No</th>
                <th className="py-3 px-2 text-center">Shift</th>
                <th className="py-3 px-3">Factory Partner</th>
                <th className="py-3 px-3">Fabric Detail</th>
                <th className="py-3 px-2">Dia x GG</th>
                <th className="py-3 px-3">Yarn Description</th>
                <th className="py-3 px-3">Lot No</th>
                <th className="py-3 px-3 text-right">knitted (Kg)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredLogs.length === 0 ? (
                <tr className="font-sans">
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    No production recordings match selected indices.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => {
                  const ordObj = orders.find(o => o.orderNo === log.orderNo);
                  if (!ordObj) return null;

                  // Combined strings for condensed display
                  const yarnsJoined = ordObj.yarns.map(y => y.yc).filter(Boolean).join(" + ") || "N/A";
                  const lotsJoined = ordObj.yarns.map(y => y.lot).filter(Boolean).join(" + ") || "N/A";

                  return (
                    <tr key={log.id || idx} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap">{log.date}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">{log.orderNo}</td>
                      <td className="py-3 px-2 font-bold text-sky-850 whitespace-nowrap">{log.jobCardNo}</td>
                      <td className="py-3 px-2 text-slate-800 font-bold">{log.machineNo}</td>
                      <td className="py-3 px-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${log.shift === 'A' ? 'bg-amber-100 text-amber-900' : log.shift === 'B' ? 'bg-blue-100 text-blue-900' : 'bg-purple-100 text-purple-900'}`}>
                          {log.shift}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-sans font-medium text-slate-800 truncate max-w-[120px]">{ordObj.factoryName}</td>
                      <td className="py-3 px-3 font-sans text-slate-500 max-w-[140px] truncate" title={ordObj.fabricType}>
                        {ordObj.fabricType} ({ordObj.color})
                      </td>
                      <td className="py-3 px-2 whitespace-nowrap">{ordObj.diaGG}</td>
                      <td className="py-3 px-3 font-sans text-slate-500 max-w-[150px] truncate" title={yarnsJoined}>{yarnsJoined}</td>
                      <td className="py-3 px-3 truncate max-w-[110px]" title={lotsJoined}>{lotsJoined}</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900 text-sm">{log.qty.toLocaleString()} Kg</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PRODUCTION LOG ENTRY POPUP DIALOG */}
      {activePlan && activeOrder && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs flex items-start justify-center p-4 z-50 overflow-y-auto pt-4 md:pt-10 pb-10">
          <div className="bg-white rounded-2xl border border-slate-300 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-slate-900 text-white py-4 px-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Barcode className="h-5 w-5 text-indigo-400" />
                <h3 className="font-mono font-bold text-sm tracking-wide">Barcode Match: {activePlan.jobCardNo}</h3>
              </div>
              <button
                type="button"
                onClick={() => { setActivePlan(null); setActiveOrder(null); }}
                className="text-slate-400 hover:text-white text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveProduction} className="p-6 space-y-4">
              {/* Ticket details summary */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs space-y-2 text-slate-650">
                <p className="text-[10px] font-mono text-indigo-600 font-bold uppercase tracking-wider mb-2">Validated Job Specs</p>
                <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
                  <p><span className="text-slate-400">Machine Assigned:</span> <strong className="text-slate-800">{activePlan.machineNo}</strong></p>
                  <p><span className="text-slate-400">Order No:</span> <strong className="text-slate-800">{activePlan.orderNo}</strong></p>
                  <p><span className="text-slate-400">Factory Name:</span> <strong className="text-slate-800">{activeOrder.factoryName}</strong></p>
                  <p><span className="text-slate-400">Factory Order:</span> <strong className="text-slate-800">{activeOrder.factoryOrder}</strong></p>
                  <p className="col-span-2"><span className="text-slate-400">Fabric Type:</span> <strong className="text-slate-800">{activeOrder.fabricType}</strong></p>
                  <p><span className="text-slate-400">Color Variant:</span> <strong className="text-slate-800">{activeOrder.color}</strong></p>
                  <p><span className="text-slate-400">Dia x Gauge:</span> <strong className="text-slate-800">{activeOrder.diaGG}</strong></p>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-2 gap-2">
                  <div className="bg-indigo-50 border border-indigo-100/50 p-2 rounded-lg text-center">
                    <span className="text-[9px] font-mono text-indigo-500 uppercase">Plan Target</span>
                    <p className="font-bold font-mono text-sm text-indigo-800 mt-0.5">{activePlan.plannedQty.toLocaleString()} Kg</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100/50 p-2 rounded-lg text-center">
                    <span className="text-[9px] font-mono text-emerald-500 uppercase">Available Plan Bal</span>
                    {(() => {
                      const logged = productionLogs
                        .filter(l => l.jobCardNo === activePlan.jobCardNo)
                        .reduce((sum, l) => sum + l.qty, 0);
                      const bal = activePlan.plannedQty - logged;
                      return <p className="font-bold font-mono text-sm text-emerald-800 mt-0.5">{bal.toLocaleString()} Kg</p>;
                    })()}
                  </div>
                </div>
              </div>

              {/* Input Form Fields */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Knitting Shift</label>
                  <select
                    className="w-full p-2 border border-slate-200 rounded-xl text-sm bg-white"
                    value={selectedShift}
                    onChange={(e) => setSelectedShift(e.target.value as any)}
                  >
                    <option value="A">Shift A (Morning)</option>
                    <option value="B">Shift B (Evening)</option>
                    <option value="C">Shift C (Night)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Log Date & Time</label>
                  <input
                    type="datetime-local"
                    className="w-full p-2 border border-slate-200 rounded-xl text-sm font-mono"
                    value={dateTimeStr}
                    onChange={(e) => setDateTimeStr(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Knitted Fabric Weight output (Kg)</label>
                <input
                  type="number"
                  placeholder="Enter Weight in Kg"
                  required
                  className="w-full p-3 border border-indigo-200 rounded-xl text-base font-bold text-center text-indigo-700 bg-indigo-50/20 focus:ring-2 focus:ring-indigo-500/30 focus:outline-hidden"
                  value={entryQty}
                  onChange={(e) => setEntryQty(e.target.value)}
                />
              </div>

              {/* POPUP BUTTONS */}
              <div className="border-t border-slate-100 pt-4 flex gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => { setActivePlan(null); setActiveOrder(null); }}
                  className="flex-1 border border-slate-200 text-slate-500 bg-white hover:bg-slate-50 rounded-xl py-2.5 font-semibold cursor-pointer"
                >
                  Reject & Close (Esc)
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl py-2.5 font-semibold cursor-pointer shadow-indigo-200 shadow-sm"
                >
                  Save knitting Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

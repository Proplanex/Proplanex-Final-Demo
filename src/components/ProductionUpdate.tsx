import React, { useState, useEffect, useRef } from "react";
import { useAppState } from "../context/AppContext";
import { Order, MachinePlan, ProductionLog } from "../types";
import { Search, Barcode, Calendar, FileDown, Plus, Clipboard, CheckCircle, Smartphone, Trash2, Printer, X } from "lucide-react";
import { downloadTableAsExcel } from "../utils/helpers";
import ProductionSticker from "./ProductionSticker";
import JsBarcode from "jsbarcode";

// Custom helper to generate barcode via jsbarcode inside an SVG for live preview
const BarcodeImage: React.FC<{ value: string }> = ({ value }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: "CODE128",
          height: 38,
          width: 1.8,
          displayValue: false,
          margin: 0,
          background: "transparent",
        });
      } catch (err) {
        console.error("Barcode generation error:", err);
      }
    }
  }, [value]);

  return (
    <div className="flex justify-center items-center py-1">
      <svg ref={svgRef} className="max-w-full h-11" />
    </div>
  );
};

const getShiftFromTimeStr = (dateTimeString: string): "A" | "B" | "C" => {
  try {
    const d = new Date(dateTimeString);
    if (isNaN(d.getTime())) return "A";
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    // A Shift: 6:10 AM to 2:10 PM => 370 minutes to 850 minutes
    // B Shift: 2:10 PM to 10:10 PM => 850 minutes to 1330 minutes
    // C Shift: 10:10 PM to 6:10 AM => 1330 minutes to 370 minutes
    if (totalMinutes >= 370 && totalMinutes < 850) {
      return "A";
    } else if (totalMinutes >= 850 && totalMinutes < 1335) {
      return "B";
    } else {
      return "C";
    }
  } catch (e) {
    return "A";
  }
};

interface ProductionUpdateProps {
  readOnly?: boolean;
}

export default function ProductionUpdate({ readOnly = false }: ProductionUpdateProps) {
  const { 
    orders, machinePlans, productionLogs, addProductionLog, getPlannedQty, getTotalProduction, deleteProductionLog, canCurrentUserDeleteData,
    showToast, currentUser
  } = useAppState();

  // Operator Barcode Search input
  const [barcodeInput, setBarcodeInput] = useState("");
  const [activePlan, setActivePlan] = useState<MachinePlan | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [stickerLog, setStickerLog] = useState<ProductionLog | null>(null);

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
    const tzoffset = d.getTimezoneOffset() * 60000; 
    const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 16);
    return localISOTime;
  });

  // Sticker layout dimensions (synchronized with Reprint settings via localStorage)
  const [stickerWidth, setStickerWidth] = useState<number>(() => {
    const saved = localStorage.getItem("sticker_width");
    return saved ? parseFloat(saved) : 2.50;
  });
  const [stickerHeight, setStickerHeight] = useState<number>(() => {
    const saved = localStorage.getItem("sticker_height");
    return saved ? parseFloat(saved) : 1.90;
  });
  const [stickerFontScale, setStickerFontScale] = useState<number>(() => {
    const saved = localStorage.getItem("sticker_font_scale");
    return saved ? parseFloat(saved) : 1.0;
  });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("sticker_width", stickerWidth.toString());
    localStorage.setItem("sticker_height", stickerHeight.toString());
    localStorage.setItem("sticker_font_scale", stickerFontScale.toString());
  }, [stickerWidth, stickerHeight, stickerFontScale]);

  // Calculate Roll Number helper:
  // Count Job Card Number if it's entered 1st Time it will show “Job Card Number_01”, 2nd Time “Job Card Number_02”, etc.
  const getRollNumber = (logID: string, jobCardNo: string) => {
    const matchingLogs = productionLogs.filter(l => l.jobCardNo === jobCardNo);
    const matchedIdx = matchingLogs.findIndex(l => l.id === logID);
    const rollIndex = matchedIdx === -1 ? 1 : matchedIdx + 1;
    const seqStr = String(rollIndex).padStart(2, "0");
    return `${jobCardNo}_${seqStr}`;
  };

  // Handle barcode scanning simulation
  const handleBarcodeSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanBarcode = barcodeInput.trim().toUpperCase();
    if (!cleanBarcode) return;

    const matchedPlan = machinePlans.find(p => p.jobCardNo.toUpperCase() === cleanBarcode);
    if (!matchedPlan) {
      alert(`Job Card barcode "${cleanBarcode}" not found on active production schedule.`);
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

    // Capture precise scan-time local iso & auto set shift immediately
    const d = new Date();
    const tzoffset = d.getTimezoneOffset() * 60000; 
    const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 16);
    setDateTimeStr(localISOTime);
    setSelectedShift(getShiftFromTimeStr(localISOTime));

    setActivePlan(matchedPlan);
    setActiveOrder(matchedOrder);
  };

  const handleDateTimeStrChange = (val: string) => {
    setDateTimeStr(val);
    setSelectedShift(getShiftFromTimeStr(val));
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
      if (!window.confirm(`Warning: Entering ${qty} Kg exceeds Job Card Plan Balance (${jobCardBalance} Kg). Exceeding plan is generally restricted. Proceed anyway?`)) {
        return;
      }
    }

    // Save production entry
    const generatedLogId = `PL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const tempLog: ProductionLog = {
      id: generatedLogId,
      date: dateTimeStr.replace("T", " "),
      orderNo: activePlan.orderNo,
      jobCardNo: activePlan.jobCardNo,
      machineNo: activePlan.machineNo,
      shift: selectedShift,
      qty: qty
    };

    addProductionLog(tempLog);

    showToast(`Production of ${qty} Kg logged successfully for Job Card ${activePlan.jobCardNo}!`, "success");

    // Reset popup
    setActivePlan(null);
    setActiveOrder(null);
    setEntryQty("");
    setBarcodeInput("");
  };

  // Filtered ledger logic
  const filteredLogs = productionLogs.filter(log => {
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
  const totalProductionSumAll = productionLogs.reduce((sum, log) => sum + log.qty, 0);
  const isAnyFilterActive = !!(filterOrderNo || filterJobCardNo || filterFromDate || filterToDate);

  // Download XLS action
  const handleExportExcel = () => {
    if (filteredLogs.length === 0) {
      alert("No data to export.");
      return;
    }

    const excelRows = filteredLogs.map((log, index) => {
      const ordObj = orders.find(o => o.orderNo === log.orderNo);
      
      const y1 = ordObj?.yarns?.[0]?.yc || "-";
      const y2 = ordObj?.yarns?.[1]?.yc || "-";
      const y3 = ordObj?.yarns?.[2]?.yc || "-";
      const y4 = ordObj?.yarns?.[3]?.yc || "-";
      const combinedYarn = [y1, y2, y3, y4].filter(v => v && v !== "-").join("+") || "-";

      const l1 = ordObj?.yarns?.[0]?.lot || "-";
      const l2 = ordObj?.yarns?.[1]?.lot || "-";
      const l3 = ordObj?.yarns?.[2]?.lot || "-";
      const l4 = ordObj?.yarns?.[3]?.lot || "-";
      const combinedLot = [l1, l2, l3, l4].filter(v => v && v !== "-").join("+") || "-";

      const s1 = ordObj?.yarns?.[0]?.spinner || "-";
      const s2 = ordObj?.yarns?.[1]?.spinner || "-";
      const s3 = ordObj?.yarns?.[2]?.spinner || "-";
      const s4 = ordObj?.yarns?.[3]?.spinner || "-";
      const combinedSpinner = [s1, s2, s3, s4].filter(v => v && v !== "-").join("+") || "-";

      const sl1 = ordObj?.yarns?.[0]?.sl || "-";
      const sl2 = ordObj?.yarns?.[1]?.sl || "-";
      const sl3 = ordObj?.yarns?.[2]?.sl || "-";
      const sl4 = ordObj?.yarns?.[3]?.sl || "-";
      const combinedSL = [sl1, sl2, sl3, sl4].filter(v => v && v !== "-").join("+") || "-";

      const rollNumber = getRollNumber(log.id, log.jobCardNo);

      return {
        SL: index + 1,
        "Date": log.date,
        "W/Oder": log.orderNo,
        "M/C No": log.machineNo,
        "Shift": log.shift,
        "Factory Name": ordObj?.factoryName || "N/A",
        "Factory Order": ordObj?.factoryOrder || "N/A",
        "Fabric Type": ordObj?.fabricType || "N/A",
        "Dia x GG": ordObj?.diaGG || "N/A",
        "Color": ordObj?.color || "N/A",
        "Finish GSM": ordObj?.finishGSM || 0,
        "Finish Dia": ordObj?.finishDia || 0,
        "Factory Job No": ordObj?.factoryJobNo || "N/A",
        "Yarn (YC1+YC2+YC3+YC4)": combinedYarn,
        "Lot (Lot1+Lot2+Lot3+Lot4)": combinedLot,
        "Spinner (Spinner1+Spinner2+Spinner3+Spinner4)": combinedSpinner,
        "SL (S/L1+S/L2+S/L3+S/L4)": combinedSL,
        "Roll Number": rollNumber,
        "Total Production (Kg)": log.qty
      };
    });

    downloadTableAsExcel(excelRows, `PROPLANEX_Production_Entries_${new Date().toISOString().split("T")[0]}`);
    showToast("Production ledger exported to Excel (.xlsx) successfully!", "success");
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
            <Smartphone className="h-4 w-4" /> Operator Production Integration
          </div>
          <div>
            <h2 className="font-sans font-bold text-lg text-white">Daily Production Output Capture</h2>
            <p className="text-xs text-slate-400 mt-1">Scan or type the Job Card barcode located on the printed A4 ticket to log yarn knitted weight output.</p>
          </div>
          
          <form onSubmit={handleBarcodeSearch} className="flex gap-2.5">
            <div className="relative flex-1 opacity-90">
              <Barcode className="absolute left-3 top-3 h-5 w-5 text-indigo-400" />
              <input
                disabled={readOnly}
                type="text"
                className="w-full bg-slate-950 border border-slate-800/80 rounded-xl py-3 pl-11 pr-4 text-sm text-lime-400 font-mono uppercase focus:ring-2 focus:ring-indigo-500/20 focus:outline-hidden placeholder:text-slate-650 focus:border-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
                placeholder={readOnly ? "Barcode scanned disabled - read-only..." : "PRO-M4-0001 (Scan Ticket Barcode)..."}
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
              />
            </div>
            <button
              disabled={readOnly}
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-950 disabled:text-indigo-400 disabled:cursor-not-allowed text-white font-semibold text-xs px-6 rounded-xl cursor-pointer transition-colors"
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
            <h3 className="text-sm font-semibold text-slate-800">Knitting Production Ledger</h3>
            <p className="text-xs text-slate-400 mt-0.5">Filter of daily Knitting, Carding, and Terry output logs.</p>
          </div>

          <div className="bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl text-right flex items-center justify-between sm:justify-end gap-6">
            <span className="text-xs font-mono text-slate-500 leading-none">
              {isAnyFilterActive ? "Subtotal Production QTY (Filtered):" : "Total Production QTY (All Logs):"}
            </span>
            <span className="text-base font-bold font-mono text-indigo-750 leading-none">
              {(isAnyFilterActive ? subtotalFilteredProduction : totalProductionSumAll).toLocaleString()}{" "}
              <span className="text-xs font-normal text-slate-500">Kg</span>
            </span>
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
              className="w-full p-2 border border-slate-200 rounded-lg text-slate-505"
              value={filterFromDate}
              onChange={(e) => setFilterFromDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-400 uppercase font-mono mb-1">To Date</label>
            <input
              type="date"
              className="w-full p-2 border border-slate-200 rounded-lg text-slate-505"
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
        <div className="overflow-auto max-h-[58vh]">
          <table className="min-w-[1900px] border-collapse text-left text-xs text-slate-700 table-fixed">
            <colgroup>
              <col className="w-[140px]" />
              <col className="w-[90px]" />
              <col className="w-[90px]" />
              <col className="w-[60px]" />
              <col className="w-[120px]" />
              <col className="w-[110px]" />
              <col className="w-[110px]" />
              <col className="w-[80px]" />
              <col className="w-[100px]" />
              <col className="w-[90px]" />
              <col className="w-[80px]" />
              <col className="w-[110px]" />
              <col className="w-[160px]" />
              <col className="w-[120px]" />
              <col className="w-[120px]" />
              <col className="w-[100px]" />
              <col className="w-[190px]" />
              <col className="w-[120px]" />
            </colgroup>
            <thead className="sticky top-0 z-20">
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono uppercase tracking-wider text-[10px]">
                <th className="sticky top-0 bg-slate-50 py-3 px-3 z-20">Date</th>
                <th className="sticky top-0 bg-slate-50 py-3 px-3 z-20">W/Oder</th>
                <th className="sticky top-0 bg-slate-50 py-3 px-3 z-20">M/C No</th>
                <th className="sticky top-0 bg-slate-50 py-3 px-1 text-center z-20">Shift</th>
                <th className="sticky top-0 bg-slate-50 py-3 px-3 z-20">Factory Name</th>
                <th className="sticky top-0 bg-slate-50 py-3 px-3 z-20">Factory Order</th>
                <th className="sticky top-0 bg-slate-50 py-3 px-3 z-20">Fabric Type</th>
                <th className="sticky top-0 bg-slate-50 py-3 px-3 z-20">Dia x GG</th>
                <th className="sticky top-0 bg-slate-50 py-3 px-3 z-20">Color</th>
                <th className="sticky top-0 bg-slate-50 py-3 px-3 z-20">Finish GSM</th>
                <th className="sticky top-0 bg-slate-50 py-3 px-3 z-20">Finish Dia</th>
                <th className="sticky top-0 bg-slate-50 py-3 px-3 z-20">Factory Job No</th>
                <th className="sticky top-0 bg-slate-50 py-3 px-3 z-20">Yarn (YC1+YC2+YC3+YC4)</th>
                <th className="sticky top-0 bg-slate-50 py-3 px-3 z-20">Lot (Lot1+Lot2+Lot3+Lot4)</th>
                <th className="sticky top-0 bg-slate-50 py-3 px-3 z-20">Spinner (Spinner1+Spinner2+Spinner3+Spinner4)</th>
                <th className="sticky top-0 bg-slate-50 py-3 px-3 z-20">SL (S/L1+S/L2+S/L3+S/L4)</th>
                <th className="sticky top-0 bg-slate-50 py-3 px-3 z-20">Roll Number</th>
                <th className="sticky top-0 bg-slate-50 py-3 px-3 text-right z-20">Total Production (Kg)</th>
                {canCurrentUserDeleteData() && <th className="sticky top-0 bg-slate-50 py-3 px-3 text-center w-12 z-20">Delete</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredLogs.length === 0 ? (
                <tr className="font-sans">
                  <td colSpan={canCurrentUserDeleteData() ? 19 : 18} className="py-12 text-center text-slate-400">
                    No production recordings match selected indices.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => {
                  const ordObj = orders.find(o => o.orderNo === log.orderNo);
                  if (!ordObj) return null;

                  const y1 = ordObj.yarns?.[0]?.yc || "-";
                  const y2 = ordObj.yarns?.[1]?.yc || "-";
                  const y3 = ordObj.yarns?.[2]?.yc || "-";
                  const y4 = ordObj.yarns?.[3]?.yc || "-";
                  const combinedYarn = [y1, y2, y3, y4].filter(v => v && v !== "-").join("+") || "-";

                  const l1 = ordObj.yarns?.[0]?.lot || "-";
                  const l2 = ordObj.yarns?.[1]?.lot || "-";
                  const l3 = ordObj.yarns?.[2]?.lot || "-";
                  const l4 = ordObj.yarns?.[3]?.lot || "-";
                  const combinedLot = [l1, l2, l3, l4].filter(v => v && v !== "-").join("+") || "-";

                  const s1 = ordObj.yarns?.[0]?.spinner || "-";
                  const s2 = ordObj.yarns?.[1]?.spinner || "-";
                  const s3 = ordObj.yarns?.[2]?.spinner || "-";
                  const s4 = ordObj.yarns?.[3]?.spinner || "-";
                  const combinedSpinner = [s1, s2, s3, s4].filter(v => v && v !== "-").join("+") || "-";

                  const sl1 = ordObj.yarns?.[0]?.sl || "-";
                  const sl2 = ordObj.yarns?.[1]?.sl || "-";
                  const sl3 = ordObj.yarns?.[2]?.sl || "-";
                  const sl4 = ordObj.yarns?.[3]?.sl || "-";
                  const combinedSL = [sl1, sl2, sl3, sl4].filter(v => v && v !== "-").join("+") || "-";

                  const rollNumber = getRollNumber(log.id, log.jobCardNo);

                  return (
                    <tr key={log.id || idx} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap truncate">{log.date}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900 truncate">{log.orderNo}</td>
                      <td className="py-3 px-3 font-bold text-slate-800 truncate">{log.machineNo}</td>
                      <td className="py-3 px-1 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${log.shift === 'A' ? 'bg-amber-100 text-amber-900' : log.shift === 'B' ? 'bg-blue-100 text-blue-900' : 'bg-purple-100 text-purple-900'}`}>
                          {log.shift}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-sans font-medium text-slate-800 truncate" title={ordObj.factoryName}>{ordObj.factoryName}</td>
                      <td className="py-3 px-3 truncate" title={ordObj.factoryOrder}>{ordObj.factoryOrder}</td>
                      <td className="py-3 px-3 font-sans text-slate-700 truncate" title={ordObj.fabricType}>{ordObj.fabricType}</td>
                      <td className="py-3 px-3 whitespace-nowrap truncate">{ordObj.diaGG}</td>
                      <td className="py-3 px-3 font-sans text-slate-600 truncate" title={ordObj.color}>{ordObj.color}</td>
                      <td className="py-3 px-3 truncate">{ordObj.finishGSM}</td>
                      <td className="py-3 px-3 truncate">{ordObj.finishDia}''{ordObj.knitType ? ` ${ordObj.knitType}` : ""}</td>
                      <td className="py-3 px-3 truncate" title={ordObj.factoryJobNo}>{ordObj.factoryJobNo}</td>
                      <td className="py-3 px-3 font-sans text-slate-500 truncate" title={combinedYarn}>{combinedYarn}</td>
                      <td className="py-3 px-3 text-slate-500 truncate" title={combinedLot}>{combinedLot}</td>
                      <td className="py-3 px-3 text-slate-500 truncate" title={combinedSpinner}>{combinedSpinner}</td>
                      <td className="py-3 px-3 text-slate-500 truncate" title={combinedSL}>{combinedSL}</td>
                      <td className="py-2 px-3 font-bold text-indigo-700 whitespace-nowrap truncate flex items-center justify-between gap-1 group">
                        <span className="truncate">{rollNumber}</span>
                        <button
                          onClick={() => setStickerLog(log)}
                          className="no-print bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] font-sans flex items-center gap-1 transition-all shrink-0 hover:scale-102 active:scale-95 cursor-pointer font-bold"
                          title="Reprint Thermal Sticker"
                        >
                          <Printer className="h-3 w-3" />
                          <span>Reprint</span>
                        </button>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900 text-sm whitespace-nowrap">{log.qty.toLocaleString()} Kg</td>
                      {canCurrentUserDeleteData() && (
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete production log for Roll ${rollNumber}?`)) {
                                deleteProductionLog(log.id);
                                showToast(`Production entry for Roll ${rollNumber} has been deleted.`, "info");
                              }
                            }}
                            className="text-slate-300 hover:text-red-500 hover:bg-slate-50 p-1 rounded transition-colors cursor-pointer"
                            title="Delete Production Log"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PRODUCTION LOG ENTRY POPUP DIALOG */}
      {activePlan && activeOrder && (() => {
        const nextRollIndex = productionLogs.filter(l => l.jobCardNo === activePlan.jobCardNo).length + 1;
        const nextRollNo = `${activePlan.jobCardNo}_${String(nextRollIndex).padStart(2, "0")}`;
        const opName = currentUser ? currentUser.userId.split("@")[0].toUpperCase() : "OPERATOR";
        const operatorText = `${opName}-${activePlan.machineNo}`;

        // Yarn properties with fallback
        const firstYarn = activeOrder.yarns?.[0];
        const yarnCount = firstYarn?.yc || "40s BCI PIMA";
        const yarnSpinner = firstYarn?.spinner || "PRECOT";
        const yarnLot = firstYarn?.lot || "256860";
        const stitchLength = firstYarn?.sl || "1.75";

        const fabricType = activeOrder.fabricType || "Twill Jersey";
        const knitType = activeOrder.knitType || "Blade Open";
        const factoryJobNo = activeOrder.factoryJobNo || "EKL-05-34x34,70";
        const factoryOrder = activeOrder.factoryOrder || "264712-FBR";
        const factoryName = activeOrder.factoryName || "Tommy Hilfiger";
        const color = activeOrder.color || "BLACK";
        const finishGSM = activeOrder.finishGSM || 210;
        const finishDia = activeOrder.finishDia || 40;

        // Compute current live weight string
        const currentWeightNum = Number(entryQty);
        const liveWeightStr = isNaN(currentWeightNum) || currentWeightNum <= 0 ? "0.000" : currentWeightNum.toFixed(3);

        const handlePopupPrint = () => {
          window.print();
        };

        return (
          <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs flex items-start justify-center p-4 z-50 overflow-y-auto pt-4 md:pt-10 pb-10 printable-sticker-modal">
            {/* Dynamic PRINT override stylesheet tailored for the user's custom thermal sticker label size */}
            <style>{`
              @media print {
                /* Hide non-printable panels completely from layout */
                #pro_nav, header, .no-print, button, form, input, select, .editor-panel, .settings-panel {
                  display: none !important;
                }
                /* Reset root containers to be transparent/un-styled with no extra spacing or flow height */
                html, body {
                  margin: 0 !important;
                  padding: 0 !important;
                  background: #ffffff !important;
                  color: #000000 !important;
                  height: auto !important;
                  min-height: 0 !important;
                }
                #pro_app_root, #pro_main, .printable-sticker-modal {
                  display: block !important;
                  position: static !important;
                  background: transparent !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  height: auto !important;
                  min-height: 0 !important;
                  overflow: visible !important;
                  border: none !important;
                  box-shadow: none !important;
                }
                /* Remove layout/shadow constraints from the main modal container */
                .printable-sticker-modal > div {
                  border: none !important;
                  box-shadow: none !important;
                  background: transparent !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  width: auto !important;
                  max-width: none !important;
                  height: auto !important;
                }
                /* Render ONLY the sticker card precisely at the top-left */
                .sticker-card {
                  display: block !important;
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: ${stickerWidth}in !important;
                  height: ${stickerHeight}in !important;
                  border: none !important;
                  box-shadow: none !important;
                  margin: 0 !important;
                  padding: 0.05in !important;
                  box-sizing: border-box !important;
                  page-break-inside: avoid !important;
                  page-break-after: avoid !important;
                  background: #ffffff !important;
                  font-size: ${9 * stickerFontScale}px !important;
                  line-height: 1.1 !important;
                }
                /* Ensure crisp black rendering and scaled down text */
                .sticker-text {
                  color: #000000 !important;
                  font-family: "Courier New", Courier, monospace !important;
                  font-weight: bold !important;
                }
              }
            `}</style>

            <div className="bg-white rounded-2xl border border-slate-300 shadow-2xl max-w-5xl w-full overflow-hidden print:border-none print:shadow-none print:p-0 print:m-0 print:bg-transparent">
              <div className="bg-slate-900 text-white py-4 px-6 flex items-center justify-between no-print">
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

              <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-150">
                {/* Left Side: Form entry & details */}
                <form onSubmit={handleSaveProduction} className="flex-1 p-6 space-y-4 max-h-[75vh] overflow-y-auto no-print">
                  {/* Ticket details summary */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 text-xs space-y-2.5 text-slate-650">
                    <p className="text-[10px] font-mono text-indigo-600 font-bold uppercase tracking-wider mb-2">Validated Job Specs</p>
                    <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
                      <p><span className="text-slate-400">Machine Number:</span> <strong className="text-slate-800">{activePlan.machineNo}</strong></p>
                      <p><span className="text-slate-400">Order Number:</span> <strong className="text-slate-800">{activePlan.orderNo}</strong></p>
                      <p><span className="text-slate-400">Factory Name:</span> <strong className="text-slate-800">{activeOrder.factoryName}</strong></p>
                      <p><span className="text-slate-400">Factory Order:</span> <strong className="text-slate-800">{activeOrder.factoryOrder}</strong></p>
                      <p><span className="text-slate-400">Fabric Type:</span> <strong className="text-slate-800">{activeOrder.fabricType}</strong></p>
                      <p><span className="text-slate-400">Dia x GG:</span> <strong className="text-slate-800">{activeOrder.diaGG}</strong></p>
                      <p><span className="text-slate-400">Color Variant:</span> <strong className="text-slate-800">{activeOrder.color}</strong></p>
                      <p><span className="text-slate-400">Finish GSM:</span> <strong className="text-slate-800">{activeOrder.finishGSM} GSM</strong></p>
                      <p><span className="text-slate-400">Finish Dia:</span> <strong className="text-slate-800">{activeOrder.finishDia}''{activeOrder.knitType ? ` ${activeOrder.knitType}` : ""}</strong></p>
                      <p><span className="text-slate-400">Factory Job No:</span> <strong className="text-slate-800">{activeOrder.factoryJobNo}</strong></p>
                    </div>

                    {/* Yarn segment details block */}
                    <div className="border-t border-slate-200 mt-3 pt-3 space-y-1.5">
                      <p className="text-[10px] font-mono text-slate-500 font-bold uppercase">Yarn Setup Specifications</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] bg-white p-2 rounded-lg border border-slate-100">
                        <div>
                          <span className="text-slate-405 block uppercase">Segment 1</span>
                          <p className="font-semibold text-slate-800">{activeOrder.yarns?.[0]?.yc || "-"}</p>
                          <p className="text-slate-400 font-mono text-[9px]">L: {activeOrder.yarns?.[0]?.lot || "-"}</p>
                          <p className="text-slate-400 font-mono text-[9px]">S: {activeOrder.yarns?.[0]?.spinner || "-"}</p>
                          <p className="text-slate-400 font-mono text-[9px]">SL: {activeOrder.yarns?.[0]?.sl || "-"}</p>
                        </div>
                        <div>
                          <span className="text-slate-405 block uppercase">Segment 2</span>
                          <p className="font-semibold text-slate-800">{activeOrder.yarns?.[1]?.yc || "-"}</p>
                          <p className="text-slate-400 font-mono text-[9px]">L: {activeOrder.yarns?.[1]?.lot || "-"}</p>
                          <p className="text-slate-400 font-mono text-[9px]">S: {activeOrder.yarns?.[1]?.spinner || "-"}</p>
                          <p className="text-slate-400 font-mono text-[9px]">SL: {activeOrder.yarns?.[1]?.sl || "-"}</p>
                        </div>
                        <div>
                          <span className="text-slate-405 block uppercase">Segment 3</span>
                          <p className="font-semibold text-slate-800">{activeOrder.yarns?.[2]?.yc || "-"}</p>
                          <p className="text-slate-400 font-mono text-[9px]">L: {activeOrder.yarns?.[2]?.lot || "-"}</p>
                          <p className="text-slate-400 font-mono text-[9px]">S: {activeOrder.yarns?.[2]?.spinner || "-"}</p>
                          <p className="text-slate-400 font-mono text-[9px]">SL: {activeOrder.yarns?.[2]?.sl || "-"}</p>
                        </div>
                        <div>
                          <span className="text-slate-405 block uppercase">Segment 4</span>
                          <p className="font-semibold text-slate-800">{activeOrder.yarns?.[3]?.yc || "-"}</p>
                          <p className="text-slate-400 font-mono text-[9px]">L: {activeOrder.yarns?.[3]?.lot || "-"}</p>
                          <p className="text-slate-400 font-mono text-[9px]">S: {activeOrder.yarns?.[3]?.spinner || "-"}</p>
                          <p className="text-slate-400 font-mono text-[9px]">SL: {activeOrder.yarns?.[3]?.sl || "-"}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-1 text-[11px] text-slate-600 font-mono bg-indigo-50/40 p-2 rounded-lg border border-indigo-100/50 mt-2">
                        <p><span className="text-slate-400 font-bold">Yarn:</span> {activeOrder.yarns?.map(y => y.yc).filter(Boolean).join("+") || "-"}</p>
                        <p><span className="text-slate-400 font-bold">Lot:</span> {activeOrder.yarns?.map(y => y.lot).filter(Boolean).join("+") || "-"}</p>
                        <p><span className="text-slate-400 font-bold">Spinner:</span> {activeOrder.yarns?.map(y => y.spinner).filter(Boolean).join("+") || "-"}</p>
                        <p><span className="text-slate-400 font-bold">SL (S/L):</span> {activeOrder.yarns?.map(y => y.sl).filter(Boolean).join("+") || "-"}</p>
                      </div>
                    </div>

                    {/* Production metrics targets */}
                    <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-2 gap-2">
                      <div className="bg-indigo-50 border border-indigo-100/50 p-2.5 rounded-lg text-center">
                        <span className="text-[9px] font-mono text-indigo-500 uppercase">Total Production</span>
                        {(() => {
                          const logged = productionLogs
                            .filter(l => l.jobCardNo === activePlan.jobCardNo)
                            .reduce((sum, l) => sum + l.qty, 0);
                          return <p className="font-bold font-mono text-sm text-indigo-900 mt-0.5">{logged.toLocaleString()} Kg</p>;
                        })()}
                      </div>
                      <div className="bg-emerald-50 border border-emerald-100/50 p-2.5 rounded-lg text-center">
                        <span className="text-[9px] font-mono text-emerald-500 uppercase">Job Card Balance</span>
                        {(() => {
                          const logged = productionLogs
                            .filter(l => l.jobCardNo === activePlan.jobCardNo)
                            .reduce((sum, l) => sum + l.qty, 0);
                          const bal = activePlan.plannedQty - logged;
                          return <p className="font-bold font-mono text-sm text-emerald-900 mt-0.5">{bal.toLocaleString()} Kg</p>;
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* KG Entry Table row / selector row */}
                  <div className="border border-indigo-100 bg-indigo-50/15 p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-indigo-100/60 pb-2">
                      <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-mono">KG Entry Table Panel</span>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md font-bold">Knitting Weights</span>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Knitted Fabric Weight Input (Kg) *</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="Enter production quantity (e.g. 125.5)"
                        required
                        className="w-full p-3 border border-indigo-200 rounded-xl text-base font-bold text-center text-indigo-700 bg-white focus:ring-2 focus:ring-indigo-500/30 focus:outline-hidden"
                        value={entryQty}
                        onChange={(e) => setEntryQty(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Input Form Fields for Date & Shift */}
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Select Shift (A, B, C)</label>
                      <select
                        className="w-full p-2 border border-slate-200 rounded-xl text-xs bg-white font-mono"
                        value={selectedShift}
                        onChange={(e) => setSelectedShift(e.target.value as any)}
                      >
                        <option value="A">Shift A (06:10 AM - 02:10 PM)</option>
                        <option value="B">Shift B (02:10 PM - 10:10 PM)</option>
                        <option value="C">Shift C (10:10 PM - 06:10 AM)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Date & Time *</label>
                      <input
                        type="datetime-local"
                        className="w-full p-2 border border-slate-200 rounded-xl text-xs font-mono"
                        value={dateTimeStr}
                        onChange={(e) => handleDateTimeStrChange(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* POPUP BUTTONS */}
                  <div className="border-t border-slate-100 pt-4 flex gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => { setActivePlan(null); setActiveOrder(null); }}
                      className="flex-1 border border-slate-200 text-slate-500 bg-white hover:bg-slate-50 rounded-xl py-2.5 font-semibold cursor-pointer"
                    >
                      Reject & Close
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 font-semibold cursor-pointer shadow-indigo-250 shadow-md"
                    >
                      Save Production
                    </button>
                  </div>
                </form>

                {/* Right Side: Live Thermal Sticker Preview (Non-Editable) */}
                <div className="w-full md:w-[410px] bg-slate-50 p-6 flex flex-col items-center border-t md:border-t-0 md:border-l border-slate-200 overflow-y-auto max-h-[75vh] print:border-none print:p-0 print:m-0 print:w-auto print:h-auto print:bg-transparent">
                  <span className="text-slate-400 text-[10px] font-mono mb-3 uppercase tracking-wider font-semibold no-print">Live Sticker Preview ({stickerWidth.toFixed(2)}" x {stickerHeight.toFixed(2)}")</span>

                  {/* Sticker Container */}
                  <div 
                    style={{ fontSize: `${9 * stickerFontScale}px` }}
                    className="bg-white text-black p-2 shadow-lg w-[280px] h-[213px] border border-slate-300 rounded-md flex flex-col justify-between text-left font-mono sticker-card leading-tight select-none mb-4"
                  >
                    
                    {/* Row 1: Factory Job No + Knit Type */}
                    <div className="font-black tracking-tight leading-none uppercase flex justify-between border-b border-black/10 pb-0.5 sticker-text" style={{ fontSize: `${10 * stickerFontScale}px` }}>
                      <span className="truncate max-w-[130px]">{factoryJobNo}</span>
                      <span className="truncate max-w-[110px]" style={{ fontSize: `${9 * stickerFontScale}px` }}>{knitType}</span>
                    </div>

                    {/* Row 2: Barcode */}
                    <div className="w-full text-center">
                      <BarcodeImage value={nextRollNo} />
                    </div>

                    {/* Row 3: Barcode value + Contract / Order Reference */}
                    <div className="font-bold tracking-tighter leading-none uppercase flex justify-between sticker-text" style={{ fontSize: `${9 * stickerFontScale}px` }}>
                      <span className="truncate max-w-[140px]">{nextRollNo}</span>
                      <span className="truncate max-w-[100px]">{factoryOrder}</span>
                    </div>

                    {/* Row 4: Weight, Fabric Type, Stitch Length */}
                    <div className="font-bold leading-none uppercase flex justify-between border-t border-dashed border-black/20 pt-0.5 sticker-text" style={{ fontSize: `${9 * stickerFontScale}px` }}>
                      <span>W:{liveWeightStr} Kg</span>
                      <span className="max-w-[110px] truncate text-center">{fabricType}</span>
                      <span>S/L:{stitchLength}</span>
                    </div>

                    {/* Row 5: Factory Order Ref, Factory Name */}
                    <div className="font-bold leading-none uppercase flex justify-between sticker-text" style={{ fontSize: `${9 * stickerFontScale}px` }}>
                      <span>{factoryOrder}</span>
                      <span className="max-w-[120px] truncate text-right">{factoryName}</span>
                    </div>

                    {/* Row 6: Color, GSM, Machine Brand */}
                    <div className="font-bold leading-none uppercase flex justify-between sticker-text" style={{ fontSize: `${9 * stickerFontScale}px` }}>
                      <span>{color}</span>
                      <span>{finishGSM} GSM</span>
                      <span>Norsel</span>
                    </div>

                    {/* Row 7: Operator & Machine No, Shift, Date Time */}
                    <div className="font-bold leading-none uppercase flex justify-between sticker-text border-t border-dotted border-black/20 pt-0.5" style={{ fontSize: `${8 * stickerFontScale}px` }}>
                      <span>{operatorText}</span>
                      <span>SHIFT {selectedShift}</span>
                      <span style={{ fontSize: `${7.5 * stickerFontScale}px` }}>{dateTimeStr.replace("T", " ")}</span>
                    </div>

                    {/* Row 8: Finish Dia, Yarn Count, Spinner, Lot */}
                    <div className="font-bold leading-none uppercase flex justify-between bg-black/5 p-0.5 rounded sticker-text" style={{ fontSize: `${8 * stickerFontScale}px` }}>
                      <span>D:{finishDia}</span>
                      <span className="max-w-[80px] truncate">{yarnCount}</span>
                      <span className="max-w-[50px] truncate">{yarnSpinner}</span>
                      <span>L:{yarnLot}</span>
                    </div>

                  </div>

                  {/* Dimension Tuning Controls directly inside the preview area */}
                  <div className="w-full max-w-[280px] bg-white border border-slate-200 rounded-xl p-3 mb-4 space-y-3 shadow-xs no-print">
                    <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider block">Manual Dimension Adjuster</span>
                    
                    {/* Presets */}
                    <div className="grid grid-cols-3 gap-1.5 pb-1">
                      <button
                        type="button"
                        onClick={() => { setStickerWidth(2.50); setStickerHeight(1.90); }}
                        className={`py-1 px-1 rounded-md text-[9px] font-bold border transition-all cursor-pointer text-center ${
                          stickerWidth === 2.50 && stickerHeight === 1.90
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        2.50" x 1.90"
                      </button>
                      <button
                        type="button"
                        onClick={() => { setStickerWidth(3.00); setStickerHeight(2.00); }}
                        className={`py-1 px-1 rounded-md text-[9px] font-bold border transition-all cursor-pointer text-center ${
                          stickerWidth === 3.00 && stickerHeight === 2.00
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        3.00" x 2.00"
                      </button>
                      <button
                        type="button"
                        onClick={() => { setStickerWidth(4.00); setStickerHeight(3.00); }}
                        className={`py-1 px-1 rounded-md text-[9px] font-bold border transition-all cursor-pointer text-center ${
                          stickerWidth === 4.00 && stickerHeight === 3.00
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        4.00" x 3.00"
                      </button>
                    </div>

                    {/* Custom Width, Height, Font Scale inputs */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[9px] font-semibold text-slate-450 uppercase mb-0.5">W (in)</label>
                        <input
                          type="number"
                          step="0.05"
                          min="1.0"
                          max="6.0"
                          value={stickerWidth}
                          onChange={(e) => setStickerWidth(parseFloat(e.target.value) || 2.50)}
                          className="w-full p-1 border border-slate-200 rounded text-[10px] text-center font-bold text-slate-700 bg-slate-50"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold text-slate-450 uppercase mb-0.5">H (in)</label>
                        <input
                          type="number"
                          step="0.05"
                          min="1.0"
                          max="6.0"
                          value={stickerHeight}
                          onChange={(e) => setStickerHeight(parseFloat(e.target.value) || 1.90)}
                          className="w-full p-1 border border-slate-200 rounded text-[10px] text-center font-bold text-slate-700 bg-slate-50"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold text-slate-450 uppercase mb-0.5">Font Scale</label>
                        <input
                          type="number"
                          step="0.05"
                          min="0.5"
                          max="2.0"
                          value={stickerFontScale}
                          onChange={(e) => setStickerFontScale(parseFloat(e.target.value) || 1.0)}
                          className="w-full p-1 border border-slate-200 rounded text-[10px] text-center font-bold text-slate-700 bg-slate-50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Print trigger in Preview */}
                  <button
                    type="button"
                    onClick={handlePopupPrint}
                    className="w-full max-w-[280px] bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-700/10 no-print"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Print Sticker Only</span>
                  </button>
                  <p className="text-[10px] text-slate-400 mt-2 text-center max-w-[280px] no-print">
                    Tip: In Chrome's print popup, set margins to <strong>None</strong> and uncheck <strong>Headers and Footers</strong> for a perfect 2.50" x 1.90" fit!
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {stickerLog && (
        <ProductionSticker 
          log={stickerLog} 
          onClose={() => setStickerLog(null)} 
        />
      )}
    </div>
  );
}

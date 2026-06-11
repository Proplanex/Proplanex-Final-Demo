import React, { useState, useEffect } from "react";
import { useAppState } from "../context/AppContext";
import { Order, DeliveryChallan, GreyDeliveryItem, YarnReturnItem } from "../types";
import { Plus, Search, FileText, Printer, FileDown, Trash2, HelpCircle, ExternalLink } from "lucide-react";
import { downloadTableAsExcel } from "../utils/helpers";

interface DeliveryModuleProps {
  readOnly?: boolean;
}

export default function DeliveryModule({ readOnly = false }: DeliveryModuleProps) {
  const { 
    orders, deliveryChallans, addDeliveryChallan, billRecords,
    getYarnReceived, getTotalProduction, getTotalDelivery, factories, companyProfile, poweredByProfile 
  } = useAppState();

  const [showAddModal, setShowAddModal] = useState(false);

  // Search parameters for Ledger
  const [ledgerSearchOrder, setLedgerSearchOrder] = useState("");
  const [ledgerSearchFactory, setLedgerSearchFactory] = useState("");
  const [ledgerSearchOrderRef, setLedgerSearchOrderRef] = useState("");
  const [ledgerSearchFrom, setLedgerSearchFrom] = useState("");
  const [ledgerSearchTo, setLedgerSearchTo] = useState("");

  // ENTRY FORM STATE
  const [selectedFactory, setSelectedFactory] = useState("");
  const [truckNo, setTruckNo] = useState("");
  const [driverName, setDriverName] = useState("");
  const [challanType, setChallanType] = useState<"Grey Fabric Delivery" | "Yarn Return">("Grey Fabric Delivery");

  // Grey Fabric Items state - starts with 1 item, can add up to 4
  const [greyItems, setGreyItems] = useState<Array<{orderNo: string; roll: string; qty: string}>>([
    { orderNo: "", roll: "", qty: "" }
  ]);

  // Yarn Return Items state - starts with 1 item, can add up to 4, with dynamic select options from selected order yarns
  const [yarnItems, setYarnItems] = useState<Array<{orderNo: string; yarnIdx: number; bag: string; qty: string}>>([
    { orderNo: "", yarnIdx: 0, bag: "", qty: "" }
  ]);

  // Handle active Challan selection for Printing
  const [activePrintChallan, setActivePrintChallan] = useState<DeliveryChallan | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);

  const triggerPrintChallan = () => {
    try {
      setPrintError(null);
      window.focus();
      window.print();
    } catch (err) {
      console.warn("Direct window.print() failed: ", err);
      setPrintError("Browser iframe print block detected. Please open the app in a standalone tab.");
    }
  };

  // Set default factory
  useEffect(() => {
    if (factories.length > 0 && !selectedFactory) {
      setSelectedFactory(factories[0].name);
    }
  }, [factories, selectedFactory]);

  // Clear selections when factory changes
  const handleFactoryChange = (name: string) => {
    setSelectedFactory(name);
    setGreyItems([{ orderNo: "", roll: "", qty: "" }]);
    setYarnItems([{ orderNo: "", yarnIdx: 0, bag: "", qty: "" }]);
  };

  // Filter orders eligible for delivery
  const getEligibleOrders = () => {
    return orders.filter(o => {
      if (o.factoryName !== selectedFactory) return false;
      if (o.status === "Complete") return false;

      const produced = getTotalProduction(o.orderNo);
      const delivered = getTotalDelivery(o.orderNo);
      const balance = produced - delivered;

      return produced > 0 && balance > 0;
    });
  };

  // Grey Items adding and removing
  const addGreyRow = () => {
    if (greyItems.length >= 4) return;
    setGreyItems(prev => [...prev, { orderNo: "", roll: "", qty: "" }]);
  };

  const removeGreyRow = (index: number) => {
    setGreyItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const updateGreyRow = (index: number, field: "orderNo" | "roll" | "qty", value: string) => {
    setGreyItems(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // Yarn Items adding and removing
  const addYarnRow = () => {
    if (yarnItems.length >= 4) return;
    setYarnItems(prev => [...prev, { orderNo: "", yarnIdx: 0, bag: "", qty: "" }]);
  };

  const removeYarnRow = (index: number) => {
    setYarnItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const updateYarnRow = (index: number, field: "orderNo" | "yarnIdx" | "bag" | "qty", value: any) => {
    setYarnItems(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleCreateChallan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFactory) {
      alert("Please select a partner factory.");
      return;
    }

    // Auto generate Gatepass Challan Sequence
    let maxSeq = 0;
    deliveryChallans.forEach(ch => {
      const num = parseInt(ch.challanNo.replace("GP-", ""), 10);
      if (!isNaN(num) && num > maxSeq) maxSeq = num;
    });
    const nextChallanNo = "GP-" + String(maxSeq + 1).padStart(4, "0");
    const today = new Date().toISOString().split("T")[0];

    if (challanType === "Grey Fabric Delivery") {
      // Validate Grey Items
      const validGrey: GreyDeliveryItem[] = [];
      for (const item of greyItems) {
        if (!item.orderNo) continue;
        const oVol = Number(item.qty);
        const rolls = Number(item.roll) || 0;

        const ord = orders.find(o => o.orderNo === item.orderNo);
        if (!ord) continue;

        const prod = getTotalProduction(item.orderNo);
        const del = getTotalDelivery(item.orderNo);
        const bal = prod - del;

        if (!oVol || oVol <= 0) {
          alert(`Please enter a valid weight for order ${item.orderNo}`);
          return;
        }

        if (oVol > bal) {
          alert(`Error: Delivery weight for ${item.orderNo} (${oVol} Kg) exceeds fabric balance remaining (${bal} Kg).`);
          return;
        }

        validGrey.push({
          orderNo: item.orderNo,
          roll: rolls,
          qty: oVol
        });
      }

      if (validGrey.length === 0) {
        alert("Please add at least one valid fabric order row.");
        return;
      }

      addDeliveryChallan({
        challanNo: nextChallanNo,
        date: today,
        factoryName: selectedFactory,
        truckNo,
        driverName,
        type: "Grey Fabric Delivery",
        greyItems: validGrey
      });

    } else {
      // Validate Yarn Items
      const validYarn: YarnReturnItem[] = [];
      for (const item of yarnItems) {
        if (!item.orderNo) continue;
        const ord = orders.find(o => o.orderNo === item.orderNo);
        if (!ord) continue;

        const yarnDef = ord.yarns[item.yarnIdx];
        if (!yarnDef || !yarnDef.yc) continue;

        const retQty = Number(item.qty);
        const bags = Number(item.bag) || 0;

        if (!retQty || retQty <= 0) {
          alert(`Please enter a valid weight for yarn return standard.`);
          return;
        }

        validYarn.push({
          orderNo: item.orderNo,
          yc: yarnDef.yc,
          lot: yarnDef.lot,
          spinner: yarnDef.spinner,
          bag: bags,
          qty: retQty
        });
      }

      if (validYarn.length === 0) {
        alert("Please configure at least one yarn return item row.");
        return;
      }

      addDeliveryChallan({
        challanNo: nextChallanNo,
        date: today,
        factoryName: selectedFactory,
        truckNo,
        driverName,
        type: "Yarn Return",
        yarnItems: validYarn
      });
    }

    // Reset Form
    setTruckNo("");
    setDriverName("");
    setGreyItems([{ orderNo: "", roll: "", qty: "" }]);
    setYarnItems([{ orderNo: "", yarnIdx: 0, bag: "", qty: "" }]);
    setShowAddModal(false);
  };

  // LEDGER FILTER PROCESSOR
  const getBilledQtyOnChallan = (challanNo: string, orderNo: string): number => {
    let sum = 0;
    billRecords.forEach(br => {
      br.items.forEach(item => {
        if (item.challanNo === challanNo && item.orderNo === orderNo) {
          sum += item.qty;
        }
      });
    });
    return sum;
  };

  // Compile individual rows for the Ledger
  // Since a challan could bundle multiple items, we render a row per sub-item to represent details properly in the Ledger grid
  const ledgerRows: Array<{
    date: string;
    orderNo: string;
    factoryName: string;
    factoryOrder: string;
    factoryJobNo: string;
    fabricType: string;
    color: string;
    challanNo: string;
    isYarnReturn: boolean;
    qty: number;
    billedQty: number;
    billBalance: number;
    status: string;
  }> = [];

  deliveryChallans.forEach(ch => {
    // Check Date ranges of Challan
    if (ledgerSearchFrom && ch.date < ledgerSearchFrom) return;
    if (ledgerSearchTo && ch.date > ledgerSearchTo) return;
    if (ledgerSearchFactory && !ch.factoryName.toLowerCase().includes(ledgerSearchFactory.toLowerCase())) return;

    if (ch.type === "Grey Fabric Delivery" && ch.greyItems) {
      ch.greyItems.forEach(item => {
        const ord = orders.find(o => o.orderNo === item.orderNo);
        if (!ord) return;

        // Search text checks
        if (ledgerSearchOrder && !item.orderNo.toLowerCase().includes(ledgerSearchOrder.toLowerCase())) return;
        if (ledgerSearchOrderRef && !ord.factoryOrder.toLowerCase().includes(ledgerSearchOrderRef.toLowerCase())) return;

        const billed = getBilledQtyOnChallan(ch.challanNo, item.orderNo);
        const devBalance = item.qty - billed;
        const statusStr = devBalance <= 0 ? "Complete" : "Pending";

        ledgerRows.push({
          date: ch.date,
          orderNo: item.orderNo,
          factoryName: ch.factoryName,
          factoryOrder: ord.factoryOrder,
          factoryJobNo: ord.factoryJobNo,
          fabricType: ord.fabricType,
          color: ord.color,
          challanNo: ch.challanNo,
          isYarnReturn: false,
          qty: item.qty,
          billedQty: billed,
          billBalance: devBalance,
          status: statusStr
        });
      });
    } else if (ch.type === "Yarn Return" && ch.yarnItems) {
      ch.yarnItems.forEach(item => {
        const ord = orders.find(o => o.orderNo === item.orderNo);
        if (!ord) return;

        if (ledgerSearchOrder && !item.orderNo.toLowerCase().includes(ledgerSearchOrder.toLowerCase())) return;
        if (ledgerSearchOrderRef && !ord.factoryOrder.toLowerCase().includes(ledgerSearchOrderRef.toLowerCase())) return;

        ledgerRows.push({
          date: ch.date,
          orderNo: item.orderNo,
          factoryName: ch.factoryName,
          factoryOrder: ord.factoryOrder,
          factoryJobNo: ord.factoryJobNo,
          fabricType: ord.fabricType,
          color: ord.color,
          challanNo: ch.challanNo,
          isYarnReturn: true,
          qty: item.qty,
          billedQty: 0,
          billBalance: 0,
          status: "Yarn Return"
        });
      });
    }
  });

  const handleExportLedgerExcel = () => {
    if (ledgerRows.length === 0) {
      alert("No delivery records to export.");
      return;
    }

    const data = ledgerRows.map((row, idx) => ({
      SL: idx + 1,
      Date: row.date,
      "Order Number": row.orderNo,
      "Factory Name": row.factoryName,
      "Factory Order": row.factoryOrder,
      "Fabric Job No": row.factoryJobNo,
      "Fabric Type": row.fabricType,
      Color: row.color,
      "Challan (Gatepass) No": row.challanNo,
      "Type Category": row.isYarnReturn ? "Yarn Return" : "Fabric Delivery",
      "Delivered Weight (Kg)": row.qty,
      "Invoiced Weight (Kg)": row.billedQty,
      "Bill Balance (Kg)": row.billBalance,
      Status: row.status
    }));

    downloadTableAsExcel(data, `PROPLANEX_Delivery_Ledger_${new Date().toISOString().split("T")[0]}`);
  };

  return (
    <div className="space-y-6">
      {/* ACTION HEADER BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h3 className="font-sans font-semibold text-slate-800">Dispatch, Delivery & Yarn Returns</h3>
          <p className="text-xs text-slate-400 mt-1">Deploy fabric rolls or record residual yarn sacks back to mills. Generates legally-compliant A4 gatepasses.</p>
        </div>
        {!readOnly && (
          <button
            onClick={() => setShowAddModal(true)}
            disabled={factories.length === 0}
            className="w-full sm:w-auto bg-sky-600 hover:bg-sky-700 text-white font-medium text-sm px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Issue Challan (Dispatch)
          </button>
        )}
      </div>

      {/* SEARCH BOX FILTERS */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 grid grid-cols-2 lg:grid-cols-6 gap-3 text-xs shadow-3xs">
        <div>
          <label className="block text-[10px] text-slate-400 font-mono uppercase mb-1">W/Order #</label>
          <input
            type="text"
            className="w-full p-2 border border-slate-200 rounded-lg"
            placeholder="Search Order No..."
            value={ledgerSearchOrder}
            onChange={(e) => setLedgerSearchOrder(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[10px] text-slate-400 font-mono uppercase mb-1">Factory Name</label>
          <input
            type="text"
            className="w-full p-2 border border-slate-200 rounded-lg"
            placeholder="Search Factory..."
            value={ledgerSearchFactory}
            onChange={(e) => setLedgerSearchFactory(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[10px] text-slate-400 font-mono uppercase mb-1">Factory Order #</label>
          <input
            type="text"
            className="w-full p-2 border border-slate-200 rounded-lg"
            placeholder="Search Order Ref..."
            value={ledgerSearchOrderRef}
            onChange={(e) => setLedgerSearchOrderRef(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[10px] text-slate-400 font-mono uppercase mb-1">From Date</label>
          <input
            type="date"
            className="w-full p-2 border border-slate-200 rounded-lg text-slate-500"
            value={ledgerSearchFrom}
            onChange={(e) => setLedgerSearchFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[10px] text-slate-400 font-mono uppercase mb-1">To Date</label>
          <input
            type="date"
            className="w-full p-2 border border-slate-200 rounded-lg text-slate-500"
            value={ledgerSearchTo}
            onChange={(e) => setLedgerSearchTo(e.target.value)}
          />
        </div>
        <div className="col-span-2 lg:col-span-1 flex items-end">
          <button
            onClick={handleExportLedgerExcel}
            className="w-full bg-emerald-650 hover:bg-emerald-700 text-white font-semibold py-2 rounded-lg text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
          >
            <FileDown className="h-4 w-4" /> Export Ledger
          </button>
        </div>
      </div>

      {/* DISPATCH LEDGER DATA GRID */}
      <div className="bg-white border border-slate-150 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs text-slate-755">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3">Date Details</th>
                <th className="py-3 px-3">W/Order No</th>
                <th className="py-3 px-3">Factory Destination</th>
                <th className="py-3 px-3">Factory Order/Job No</th>
                <th className="py-3 px-3">Fabric Architecture</th>
                <th className="py-3 px-3">Challan / Gatepass No</th>
                <th className="py-3 px-3">Freight Type</th>
                <th className="py-3 px-3 text-right">Dispatched (Kg)</th>
                <th className="py-3 px-3 text-right">Billed (Kg)</th>
                <th className="py-3 px-3 text-right">Outstanding (Kg)</th>
                <th className="py-3 px-3 text-center">Audit status</th>
                <th className="py-3 px-3 text-center">Ticket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {ledgerRows.length === 0 ? (
                <tr className="font-sans">
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    No active dispatches matched input index filters.
                  </td>
                </tr>
              ) : (
                ledgerRows.map((row, idx) => {
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 text-slate-500">{row.date}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">{row.orderNo}</td>
                      <td className="py-3 px-3 font-medium font-sans text-slate-800">{row.factoryName}</td>
                      <td className="py-3 px-3 text-slate-600">
                        {row.factoryOrder} <span className="text-[10px] text-slate-400 block font-mono bg-slate-50 px-1 py-0.5 rounded border border-slate-100 mt-0.5">Job: {row.factoryJobNo}</span>
                      </td>
                      <td className="py-3 px-3 font-sans text-slate-500 max-w-[130px] truncate" title={row.fabricType}>
                        {row.fabricType} <span className="text-[10px] text-slate-450 block font-mono">Color: {row.color}</span>
                      </td>
                      <td className="py-3 px-3 font-bold text-sky-850">{row.challanNo}</td>
                      <td className="py-3 px-3 font-sans">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${row.isYarnReturn ? "bg-amber-50 text-amber-800 border border-amber-100" : "bg-sky-50 text-sky-800 border border-sky-100"}`}>
                          {row.isYarnReturn ? "Yarn Return" : "Fabric Roll"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">{row.qty.toLocaleString()} Kg</td>
                      <td className="py-3 px-3 text-right text-slate-600">{row.billedQty > 0 ? `${row.billedQty.toLocaleString()} Kg` : "-"}</td>
                      <td className="py-3 px-3 text-right text-slate-600">
                        {!row.isYarnReturn ? `${row.billBalance.toLocaleString()} Kg` : "-"}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {row.isYarnReturn ? (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">Yarn Returned</span>
                        ) : row.status === "Complete" ? (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full ring-1 ring-emerald-200">Billed</span>
                        ) : (
                          <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 bg-opacity-70 px-2.5 py-0.5 rounded-full ring-1 ring-amber-200">Pending Bill</span>
                        )}
                      </td>
                      <td className="py-1 px-3 text-center">
                        <button
                          onClick={() => {
                            const fullChallan = deliveryChallans.find(c => c.challanNo === row.challanNo);
                            if (fullChallan) {
                              setPrintError(null);
                              setActivePrintChallan(fullChallan);
                            }
                          }}
                          className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-1 rounded text-[11px] font-bold inline-flex items-center gap-1 hover:bg-indigo-100 cursor-pointer"
                        >
                          <Printer className="h-3 w-3" /> Gatepass
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DISPATCH POPUP ENTRY DRAWER */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 z-50 overflow-y-auto pt-4 md:pt-10 pb-10">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-y-auto">
            <div className="bg-slate-50 border-b border-slate-100 py-3.5 px-6 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="font-sans font-semibold text-sm text-slate-800">Dispatch Dispatching & Yarn Returns Setup</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer">&times;</button>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT SIDE ENTRY FORM (col-span-7) */}
              <form onSubmit={handleCreateChallan} className="col-span-1 lg:col-span-7 space-y-6 border-b lg:border-b-0 lg:border-r border-slate-150 pb-6 lg:pb-0 lg:pr-6">
                <div>
                  <h4 className="text-xs font-mono uppercase text-sky-600 font-semibold tracking-wider mb-3">Freight & Logistics Header</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Partner Factory</label>
                      <select
                        className="w-full p-2 border border-slate-200 rounded-xl text-xs bg-white"
                        value={selectedFactory}
                        onChange={(e) => handleFactoryChange(e.target.value)}
                      >
                        {factories.map((f, i) => (
                          <option key={i} value={f.name}>{f.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Truck / Vehicle No.</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. DMT L-12-1133"
                        className="w-full p-2 border border-slate-200 rounded-xl text-xs"
                        value={truckNo}
                        onChange={(e) => setTruckNo(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Driver Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Driver Rafiq"
                        className="w-full p-2 border border-slate-200 rounded-xl text-xs"
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Dispatch Mode Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-550 mb-1.5">Dispatch Mode Category</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setChallanType("Grey Fabric Delivery")}
                      className={`py-2 px-3 rounded-lg border font-semibold text-center cursor-pointer transition-colors ${challanType === "Grey Fabric Delivery" ? "bg-sky-50 text-sky-850 border-sky-400" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
                    >
                      Grey Fabric Delivery
                    </button>
                    <button
                      type="button"
                      onClick={() => setChallanType("Yarn Return")}
                      className={`py-2 px-3 rounded-lg border font-semibold text-center cursor-pointer transition-colors ${challanType === "Yarn Return" ? "bg-amber-50 text-amber-850 border-amber-450" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
                    >
                      Yarn Return Mode
                    </button>
                  </div>
                </div>

                {/* DYNAMIC FORMS ACCORDING TO CATEGORIES */}
                {challanType === "Grey Fabric Delivery" ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-xs font-semibold text-slate-700 font-mono">Grey Fabric Dispatch rows (Max 4 orders)</span>
                      {greyItems.length < 4 && (
                        <button
                          type="button"
                          onClick={addGreyRow}
                          className="bg-sky-600 text-white rounded-lg p-1 text-xs font-bold hover:bg-sky-750 flex items-center justify-center cursor-pointer h-6 w-6"
                        >
                          +
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      {greyItems.map((item, idx) => {
                        const eligible = getEligibleOrders();
                        const selectedOrderObj = orders.find(o => o.orderNo === item.orderNo);
                        const balance = selectedOrderObj ? (getTotalProduction(item.orderNo) - getTotalDelivery(item.orderNo)) : 0;

                        return (
                          <div key={idx} className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-2 relative text-xs">
                            <div className="flex justify-between items-center">
                              <span className="font-mono text-[10px] text-sky-600 font-semibold uppercase">Fabric Item Line {idx+1}</span>
                              {greyItems.length > 1 && (
                                <button type="button" onClick={() => removeGreyRow(idx)} className="text-red-500 hover:text-red-700 cursor-pointer">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              <div>
                                <label className="block text-[10px] text-slate-400 font-mono uppercase mb-0.5">Select Contract</label>
                                <select
                                  className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                                  value={item.orderNo}
                                  onChange={(e) => updateGreyRow(idx, "orderNo", e.target.value)}
                                >
                                  <option value="">-- Choose Order --</option>
                                  {eligible.map((o) => (
                                    <option key={o.orderNo} value={o.orderNo}>
                                      {o.orderNo} (O: {o.factoryOrder} | Job: {o.factoryJobNo})
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-400 font-mono uppercase mb-0.5">Dispatched Rolls Count</label>
                                <input
                                  type="number"
                                  placeholder="e.g. 15"
                                  className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                                  value={item.roll}
                                  onChange={(e) => updateGreyRow(idx, "roll", e.target.value)}
                                />
                              </div>
                              <div>
                                <div className="flex justify-between">
                                  <label className="block text-[10px] text-slate-400 font-mono uppercase mb-0.5">Fabric Qty (Kg)</label>
                                  {selectedOrderObj && <span className="text-[10px] font-semibold text-sky-600">Max: {balance} Kg</span>}
                                </div>
                                <input
                                  type="number"
                                  placeholder="Kg Weight"
                                  className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                                  value={item.qty}
                                  onChange={(e) => updateGreyRow(idx, "qty", e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  // Yarn Return rows
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-xs font-semibold text-slate-750 font-mono">Yarn Return rows (Max 4 orders)</span>
                      {yarnItems.length < 4 && (
                        <button
                          type="button"
                          onClick={addYarnRow}
                          className="bg-amber-600 text-white rounded-lg p-1 text-xs font-bold hover:bg-amber-750 flex items-center justify-center cursor-pointer h-6 w-6"
                        >
                          +
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      {yarnItems.map((item, idx) => {
                        // orders with some positive production count
                        const matchingOrders = orders.filter(o => o.factoryName === selectedFactory && o.status !== "Complete");
                        const selectedOrderObj = orders.find(o => o.orderNo === item.orderNo);
                        const netReceivedYarn = selectedOrderObj ? getYarnReceived(item.orderNo) : 0;

                        return (
                          <div key={idx} className="p-3 bg-amber-50/40 border border-amber-100 rounded-xl space-y-2 relative text-xs">
                            <div className="flex justify-between items-center">
                              <span className="font-mono text-[10px] text-amber-700 font-semibold uppercase">Yarn Item Line {idx+1}</span>
                              {yarnItems.length > 1 && (
                                <button type="button" onClick={() => removeYarnRow(idx)} className="text-red-500 hover:text-red-700 cursor-pointer">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                              <div>
                                <label className="block text-[10px] text-slate-400 font-mono uppercase mb-0.5">Select Order</label>
                                <select
                                  className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[11px]"
                                  value={item.orderNo}
                                  onChange={(e) => updateYarnRow(idx, "orderNo", e.target.value)}
                                >
                                  <option value="">-- Choose Order --</option>
                                  {matchingOrders.map((o) => (
                                    <option key={o.orderNo} value={o.orderNo}>
                                      {o.orderNo} ({o.factoryOrder})
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {selectedOrderObj && (
                                <div>
                                  <label className="block text-[10px] text-slate-400 font-mono uppercase mb-0.5">Select Yarn Count</label>
                                  <select
                                    className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[11px]"
                                    value={item.yarnIdx}
                                    onChange={(e) => updateYarnRow(idx, "yarnIdx", Number(e.target.value))}
                                  >
                                    {selectedOrderObj.yarns.map((y, yIdx) => y.yc ? (
                                      <option key={yIdx} value={yIdx}>
                                        {y.yc} (Lot: {y.lot})
                                      </option>
                                    ) : null)}
                                  </select>
                                </div>
                              )}

                              <div>
                                <label className="block text-[10px] text-slate-400 font-mono uppercase mb-0.5">Bags Return Count</label>
                                <input
                                  type="number"
                                  placeholder="Bags Count"
                                  className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[11px]"
                                  value={item.bag}
                                  onChange={(e) => updateYarnRow(idx, "bag", e.target.value)}
                                />
                              </div>

                              <div>
                                <div className="flex justify-between">
                                  <label className="block text-[10px] text-slate-400 font-mono uppercase mb-0.5">Return Qty (Kg)</label>
                                  {selectedOrderObj && <span className="text-[9px] text-amber-700 font-semibold font-mono">Net Rx: {netReceivedYarn}</span>}
                                </div>
                                <input
                                  type="number"
                                  placeholder="Weight Kg"
                                  className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold"
                                  value={item.qty}
                                  onChange={(e) => updateYarnRow(idx, "qty", e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* POPUP SUBMIT ACTIONS */}
                <div className="border-t border-slate-100 pt-4 flex gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl py-2 cursor-pointer text-center font-semibold"
                  >
                    Cancel Drawer
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-sky-600 hover:bg-sky-700 text-white rounded-xl py-2 cursor-pointer text-center font-semibold"
                  >
                    Generate Gatepass Challan
                  </button>
                </div>
              </form>

              {/* RIGHT SIDE LIVE PREVIEW (col-span-5) */}
              <div className="col-span-1 lg:col-span-5 bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4 max-h-[70vh] overflow-y-auto">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block font-mono">Live Gatepass challan Preview</span>
                
                <div className="bg-white p-5 rounded-xl border border-slate-250 shadow-sm space-y-4 text-slate-900 text-[11px] leading-relaxed font-sans">
                  {/* COMPANY TOP INFO */}
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-2">
                    {companyProfile.logoUrl && (
                      <img 
                        src={companyProfile.logoUrl} 
                        alt="Company Logo" 
                        className="h-10 max-w-[100px] object-contain shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="text-left space-y-0.5 flex-1 min-w-0">
                      <h3 className="font-bold text-sm text-slate-800 leading-snug">{companyProfile.name}</h3>
                      <p className="text-[8px] text-slate-400 uppercase tracking-wider leading-none mb-1">{companyProfile.tagline}</p>
                      <p className="text-[8px] text-slate-400 leading-tight">{companyProfile.address}</p>
                      <p className="text-[8px] text-slate-400 leading-tight">{companyProfile.phoneEmail}</p>
                    </div>
                  </div>

                  {/* CHALLAN TITLE */}
                  <p className="text-right text-[9px] font-mono">Date: {new Date().toISOString().split("T")[0]}</p>
                  
                  {/* METADATA GRID */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] border-b border-slate-100 pb-2">
                    <div>
                      <span className="text-slate-400">Factory:</span> <strong>{selectedFactory}</strong>
                      <p className="text-[8px] text-slate-400 mt-0.5 font-sans leading-tight">
                        {factories.find(f => f.name === selectedFactory)?.address || "N/A Address"}
                      </p>
                    </div>
                    <div>
                      <p><span className="text-slate-400">Truck No:</span> <strong>{truckNo || "---"}</strong></p>
                      <p className="mt-1"><span className="text-slate-400">Driver Name:</span> <strong>{driverName || "---"}</strong></p>
                    </div>
                  </div>

                  <h4 className="text-center font-bold text-xs uppercase tracking-wider underline text-slate-800">
                    {challanType === "Grey Fabric Delivery" ? "Grey Fabric DELIVERY CHALLAN" : "Yarn Return CHALLAN"}
                  </h4>

                  {/* PREVIEW COLUMNS */}
                  {challanType === "Grey Fabric Delivery" ? (
                    <div className="space-y-2 border border-slate-200 rounded p-1.5">
                      <table className="w-full text-left text-[9px]">
                        <thead>
                          <tr className="bg-slate-100 text-slate-500 font-mono">
                            <th className="py-1 px-1">Goods Description</th>
                            <th className="py-1 px-1 text-center">GSM/Width</th>
                            <th className="py-1 px-1 text-center font-semibold">Roll</th>
                            <th className="py-1 px-1 text-right">Weight (KG)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {greyItems.filter(i => i.orderNo).map((item, idx) => {
                            const ord = orders.find(o => o.orderNo === item.orderNo);
                            return (
                              <tr key={idx}>
                                <td className="py-1 px-1 leading-tight">
                                  <strong>Job:</strong> {ord?.factoryJobNo} | <strong>O/No:</strong> {ord?.factoryOrder}
                                  <p className="text-[8px] text-slate-500 font-mono">
                                    {ord?.fabricType} ({ord?.color})
                                  </p>
                                </td>
                                <td className="py-1 px-1 text-center">{ord?.finishGSM} GSM | F.{ord?.finishDia}"</td>
                                <td className="py-1 px-1 text-center font-bold font-mono">{item.roll || "0"}</td>
                                <td className="py-1 px-1 text-right font-bold font-mono">{Number(item.qty).toLocaleString() || "0"} Kg</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="space-y-2 border border-slate-200 rounded p-1.5">
                      <table className="w-full text-left text-[9px]">
                        <thead>
                          <tr className="bg-slate-100 text-slate-500 font-mono">
                            <th className="py-1 px-1 col-span-2">Yarn Count / Lot Details</th>
                            <th className="py-1 px-1 text-center font-semibold">Bags</th>
                            <th className="py-1 px-1 text-right">Return Weight (KG)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {yarnItems.filter(i => i.orderNo).map((item, idx) => {
                            const ord = orders.find(o => o.orderNo === item.orderNo);
                            const yarnDef = ord?.yarns[item.yarnIdx];
                            return (
                              <tr key={idx}>
                                <td className="py-1 px-1">
                                  <strong>O/No:</strong> {ord?.factoryOrder} | <strong>Job:</strong> {ord?.factoryJobNo}
                                  <p className="text-[8px] text-slate-500 font-sans">
                                    {yarnDef?.yc} (Lot: {yarnDef?.lot} | Spinner: {yarnDef?.spinner})
                                  </p>
                                </td>
                                <td className="py-1 px-1 text-slate-500 italic">{ord?.color}</td>
                                <td className="py-1 px-1 text-center font-bold font-mono">{item.bag || "0"}</td>
                                <td className="py-1 px-1 text-right font-mono font-bold">{Number(item.qty).toLocaleString() || "0"} Kg</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Weight totals */}
                  <div className="text-right border-t border-slate-200 pt-2 text-[10px]">
                    <strong>Total Weight (KG) : </strong>
                    <span className="font-mono font-bold bg-slate-900 text-white rounded px-2 py-0.5">
                      {(challanType === "Grey Fabric Delivery" 
                        ? greyItems.reduce((sum, i) => sum + (Number(i.qty) || 0), 0) 
                        : yarnItems.reduce((sum, i) => sum + (Number(i.qty) || 0), 0)
                      ).toLocaleString()} Kg
                    </span>
                  </div>

                  <p className="text-[8px] italic text-slate-400 mt-2">
                    NB: Received the Above Materials in Good Condition. For: <strong>{companyProfile.name}</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INDEPENDENT PRINTABLE CHALLAN A4 OVERLAY */}
      {activePrintChallan && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-start justify-center p-4 z-50 overflow-y-auto pt-4 md:pt-10 pb-10">
          <div className="bg-white rounded-2xl border border-slate-300 shadow-2xl max-w-3xl w-full p-6 space-y-6 relative print-invoice-card">
            <div className="sticky top-0 bg-white z-20 -mx-6 px-6 pt-1 pb-4 flex items-center justify-between no-print border-b border-slate-100 shadow-xs mb-4">
              <span className="text-xs font-mono font-semibold bg-sky-50 text-sky-700 px-3 py-1 rounded-full">
                {activePrintChallan.type} Gatepass (Print Preview)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={triggerPrintChallan}
                  className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="h-4 w-4" /> Print Challan
                </button>
                <button
                  onClick={() => setActivePrintChallan(null)}
                  className="bg-slate-100 hover:bg-slate-250 text-slate-500 px-4 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>

            {/* IFRAME PRINT NOTIFICATION (no-print) */}
            {(window.self !== window.top || printError) && (
              <div className="no-print p-4 bg-amber-50/90 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-805 shadow-sm leading-relaxed">
                <span className="text-lg select-none mt-0.5">⚠️</span>
                <div className="space-y-1">
                  <p className="font-semibold text-amber-900">Browser Security Restricts Printing inside Editor Sandbox</p>
                  <p className="text-amber-700 text-[11px]">
                    Your web browser blocks print commands nested inside secure development iframes. To print or save files as PDF perfectly, please click <strong>"Open in New Tab" / "Open"</strong> at the top-right corner of the web simulator in AI Studio, or launch via the link below:
                  </p>
                  <a 
                    href={window.location.href} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center gap-1 font-mono text-[10px] font-bold bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white px-3 py-1.5 rounded-lg shadow-sm transition-colors mt-2 uppercase tracking-wider cursor-pointer"
                  >
                    Open Standalone & Print <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}

            {/* A4 TARGET LAYOUT FOR CHALLANS */}
            <div className="space-y-6 text-slate-900 font-sans p-2 border border-slate-150 rounded-xl print:border-none print:p-0">
              {/* Profile Header */}
              <div className="flex items-center gap-4.5 pb-4 border-b border-slate-150">
                {companyProfile.logoUrl && (
                  <img 
                    src={companyProfile.logoUrl} 
                    alt="Company Logo" 
                    className="h-16 max-w-[160px] object-contain shrink-0"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="text-left space-y-0.5 flex-1 min-w-0">
                  <h2 className="font-bold text-lg tracking-wide text-slate-800">{companyProfile.name}</h2>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-none mb-1">{companyProfile.tagline}</p>
                  <p className="text-[10px] text-slate-400 leading-tight">{companyProfile.address}</p>
                  <p className="text-[10px] text-slate-400 leading-tight">{companyProfile.phoneEmail}</p>
                </div>
              </div>

              <div className="flex justify-between text-xs text-slate-650 border-t border-b border-slate-150 py-3 mt-4">
                <div className="space-y-1">
                  <p><span className="text-slate-400 block mb-0.5">FOR/DELIVERED TO:</span> <strong className="text-slate-900 text-sm">{activePrintChallan.factoryName}</strong></p>
                  <p className="text-[10px] max-w-xs">{factories.find(f => f.name === activePrintChallan.factoryName)?.address || "N/A Address"}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p>Challan / Gatepass No: <strong className="text-indigo-800 font-mono text-sm">{activePrintChallan.challanNo}</strong></p>
                  <p>Date: <strong className="text-slate-800">{activePrintChallan.date}</strong></p>
                  <p>Truck No: <strong>{activePrintChallan.truckNo}</strong> | Driver: <strong>{activePrintChallan.driverName}</strong></p>
                </div>
              </div>

              <h4 className="text-center font-bold text-xs uppercase tracking-widest text-slate-800 py-1 underline">
                {activePrintChallan.type === "Grey Fabric Delivery" ? "GREY FABRIC DELIVERY CHALLAN" : "YARN RETURN CHALLAN"}
              </h4>

              {/* TABLE CONFIGS */}
              {activePrintChallan.type === "Grey Fabric Delivery" && activePrintChallan.greyItems ? (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 font-mono">
                        <th className="py-2.5 px-3 w-10">SL</th>
                        <th className="py-2.5 px-3">Description of Goods</th>
                        <th className="py-2.5 px-3 text-center">GSM / Finish</th>
                        <th className="py-2.5 px-2 text-center">Dia x GG</th>
                        <th className="py-2.5 px-3 text-center">Color</th>
                        <th className="py-2.5 px-3 text-center">Roll</th>
                        <th className="py-2.5 px-3 text-right">Weight (KG)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {activePrintChallan.greyItems.map((item, yidx) => {
                        const ord = orders.find(o => o.orderNo === item.orderNo);
                        return (
                          <tr key={yidx} className="font-mono text-[11px]">
                            <td className="py-3 px-3">{yidx + 1}</td>
                            <td className="py-3 px-3">
                              <span className="font-sans font-bold text-slate-800 block text-xs">Job: {ord?.factoryJobNo}</span>
                              <span className="text-slate-500">O/No: {ord?.factoryOrder} | {ord?.fabricType}</span>
                            </td>
                            <td className="py-3 px-3 text-center font-sans">{ord?.finishGSM} GSM / F.{ord?.finishDia}"</td>
                            <td className="py-3 px-2 text-center whitespace-nowrap">{ord?.diaGG}</td>
                            <td className="py-3 px-3 text-center font-sans">{ord?.color}</td>
                            <td className="py-3 px-3 text-center font-bold text-slate-900">{item.roll}</td>
                            <td className="py-3 px-3 text-right font-bold text-slate-950 text-xs">{item.qty.toLocaleString()} Kg</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : activePrintChallan.type === "Yarn Return" && activePrintChallan.yarnItems ? (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 font-mono">
                        <th className="py-2.5 px-3 w-10">SL</th>
                        <th className="py-2.5 px-3">Description of Goods</th>
                        <th className="py-2.5 px-3">Yarn Count Specification</th>
                        <th className="py-2.5 px-3">Lot No</th>
                        <th className="py-2.5 px-3">Spinner Source</th>
                        <th className="py-2.5 px-3 text-center">Bag Returns</th>
                        <th className="py-2.5 px-3 text-right">Return Weight (KG)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 font-mono text-[11px]">
                      {activePrintChallan.yarnItems.map((item, yidx) => {
                        const ord = orders.find(o => o.orderNo === item.orderNo);
                        return (
                          <tr key={yidx}>
                            <td className="py-3 px-3">{yidx + 1}</td>
                            <td className="py-3 px-3">
                              <span className="font-sans font-semibold text-slate-850 block">O/No: {ord?.factoryOrder}</span>
                              <span className="text-slate-500 text-[10px]">Job: {ord?.factoryJobNo} | Fabric: {ord?.fabricType}</span>
                            </td>
                            <td className="py-3 px-3 font-sans text-slate-800">{item.yc}</td>
                            <td className="py-3 px-3">{item.lot}</td>
                            <td className="py-3 px-3">{item.spinner}</td>
                            <td className="py-3 px-3 text-center font-bold text-slate-900">{item.bag}</td>
                            <td className="py-3 px-3 text-right font-bold text-slate-950 text-xs">{item.qty.toLocaleString()} Kg</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {/* Grand weight total display */}
              <div className="text-right border-t border-slate-200 pt-3 text-heading">
                <span className="text-xs font-mono uppercase text-slate-500 mr-2">Dispatched Capacity (Total Weight):</span>
                <span className="text-sm font-bold font-mono bg-slate-900 text-white rounded px-2.5 py-1">
                  {(activePrintChallan.type === "Grey Fabric Delivery" && activePrintChallan.greyItems
                    ? activePrintChallan.greyItems.reduce((sum, item) => sum + item.qty, 0)
                    : activePrintChallan.yarnItems?.reduce((sum, item) => sum + item.qty, 0) || 0
                  ).toLocaleString()} Kg
                </span>
              </div>

              <p className="text-[10px] leading-relaxed text-slate-500 pt-3 border-t border-dashed border-slate-200">
                NB: Received the Above Materials in Good Condition. All materials dispatched remain the physical inventory of the manufacturer until certified receipt returns are formalised.
              </p>

              {/* Signatures */}
              <div className="pt-12 grid grid-cols-4 gap-4 text-center text-[10px] text-slate-500">
                <div className="border-t border-slate-300 pt-2 font-mono">
                  Received by & Name
                </div>
                <div className="border-t border-slate-300 pt-2 font-mono">
                  Prepared By
                </div>
                <div className="border-t border-slate-300 pt-2 font-mono">
                  Accountant
                </div>
                <div className="border-t border-slate-300 pt-2 font-mono">
                  Authorized Signature
                </div>
              </div>

              {/* Powered tagline footer */}
              {poweredByProfile && (
                <div className="border-t border-slate-150 pt-3.5 flex items-center justify-between font-sans text-left mt-3">
                  {/* Left Side */}
                  <div className="flex items-center gap-2.5">
                    {poweredByProfile.logoUrl && (
                      <img 
                        src={poweredByProfile.logoUrl} 
                        alt="Logo" 
                        className="h-8 max-w-[80px] object-contain shrink-0" 
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-slate-800 tracking-wide uppercase leading-none">
                        Powered By {poweredByProfile.name || "Proplanex Software"}
                      </p>
                      <p className="text-[8px] text-slate-400 uppercase tracking-widest leading-none font-medium">
                        {poweredByProfile.slogan || "Automated Floor Intelligence & Control Systems"}
                      </p>
                    </div>
                  </div>

                  {/* Right Side */}
                  {poweredByProfile.qrCodeUrl && (
                    <img 
                      src={poweredByProfile.qrCodeUrl} 
                      alt="QR" 
                      className="h-9 w-9 object-contain shrink-0 border border-slate-100 rounded p-0.5"
                      referrerPolicy="no-referrer"
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

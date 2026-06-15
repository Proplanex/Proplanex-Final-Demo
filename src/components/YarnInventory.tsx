import React, { useState } from "react";
import { useAppState } from "../context/AppContext";
import { YarnTransaction } from "../types";
import { Plus, Search, ChevronDown, ChevronUp, RefreshCw, BarChart2, Calendar, FileDown, Trash2 } from "lucide-react";

interface YarnInventoryProps {
  readOnly?: boolean;
}

export default function YarnInventory({ readOnly = false }: YarnInventoryProps) {
  const { 
    orders, yarnTransactions, addYarnTransaction, getYarnReceived, factories, deleteYarnTransaction, canCurrentUserDeleteData 
  } = useAppState();

  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  // Search & Filter state values
  const [searchOrderNo, setSearchOrderNo] = useState("");
  const [searchPartyOrderNo, setSearchPartyOrderNo] = useState("");
  const [searchPartyName, setSearchPartyName] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Form active states
  const [selectedOrderNo, setSelectedOrderNo] = useState("");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split("T")[0]);
  const [transactionMode, setTransactionMode] = useState<"Received" | "Returned">("Received");
  
  // Choice of yarn segment from the selected order
  const [yarnIndex, setYarnIndex] = useState<number>(0);
  const [transactionQty, setTransactionQty] = useState("");

  // Only permit yarn operations on orders whose status is NOT "Complete"
  const activeOrders = orders.filter(o => o.status !== "Complete");

  // Initialize selected order if not set
  React.useEffect(() => {
    if (activeOrders.length > 0 && !selectedOrderNo) {
      setSelectedOrderNo(activeOrders[0].orderNo);
    }
  }, [activeOrders, selectedOrderNo]);

  const selectedOrder = orders.find(o => o.orderNo === selectedOrderNo);

  const toggleExpand = (orderNo: string) => {
    setExpandedOrders(prev => ({ ...prev, [orderNo]: !prev[orderNo] }));
  };

  const handleSubmitTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) {
      alert("Please select a valid order first.");
      return;
    }
    const yarnDetail = selectedOrder.yarns[yarnIndex];
    if (!yarnDetail || !yarnDetail.yc) {
      alert("The selected yarn segment on this order is empty. Config first!");
      return;
    }
    const qtyNum = Number(transactionQty);
    if (!qtyNum || qtyNum <= 0) {
      alert("Please enter a valid positive quantity.");
      return;
    }

    addYarnTransaction({
      orderNo: selectedOrderNo,
      date: transactionDate,
      mode: transactionMode,
      yc: yarnDetail.yc,
      lot: yarnDetail.lot,
      spinner: yarnDetail.spinner,
      qty: qtyNum
    });

    setTransactionQty("");
    setShowAddModal(false);
  };

  // Filter logic on active state
  const filteredOrders = orders.filter(order => {
    // Filter by Order Number (case-insensitive)
    if (searchOrderNo && !order.orderNo.toLowerCase().includes(searchOrderNo.toLowerCase())) {
      return false;
    }
    // Filter by Party Order Number (which is order.factoryOrder)
    if (searchPartyOrderNo && !order.factoryOrder.toLowerCase().includes(searchPartyOrderNo.toLowerCase())) {
      return false;
    }
    // Filter by Party Name (which maps to factory name selection)
    if (searchPartyName && order.factoryName !== searchPartyName) {
      return false;
    }
    // Filter by Date Range on corresponding yarn transactions
    if (fromDate || toDate) {
      const oTx = yarnTransactions.filter(tx => tx.orderNo === order.orderNo);
      const hasMatchingTx = oTx.some(tx => {
        if (fromDate && tx.date < fromDate) return false;
        if (toDate && tx.date > toDate) return false;
        return true;
      });
      if (!hasMatchingTx) return false;
    }
    return true;
  });

  // KPI calculations based on active dataset
  const totalYarnTransactionsCount = yarnTransactions.length;
  const inHouseStockWeight = filteredOrders.reduce((sum, o) => sum + getYarnReceived(o.orderNo), 0);

  // CSV Exporter mimicking requested image columns precisely
  const handleDownloadExcel = () => {
    const transactionsToExport = yarnTransactions.filter(tx => {
      const order = orders.find(o => o.orderNo === tx.orderNo);
      
      // Apply searches
      if (searchOrderNo && !tx.orderNo.toLowerCase().includes(searchOrderNo.toLowerCase())) {
        return false;
      }
      if (searchPartyOrderNo && (!order || !order.factoryOrder.toLowerCase().includes(searchPartyOrderNo.toLowerCase()))) {
        return false;
      }
      if (searchPartyName && (!order || order.factoryName !== searchPartyName)) {
        return false;
      }
      if (fromDate && tx.date < fromDate) {
        return false;
      }
      if (toDate && tx.date > toDate) {
        return false;
      }
      return true;
    });

    // Column alignment as shown in user illustration
    const headers = [
      "Date",
      "Order Number",
      "Mode of Transaction",
      "Factory Name",
      "Factory Order",
      "Fabric Type",
      "Color",
      "Yarn Count",
      "Lot",
      "Spinner",
      "Received QTY",
      "Return QTY",
      "Net Received"
    ];

    const escapeCSV = (val: any) => {
      if (val === undefined || val === null) return '""';
      let str = String(val);
      str = str.replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvRows = [headers.join(",")];

    transactionsToExport.forEach(tx => {
      const order = orders.find(o => o.orderNo === tx.orderNo);
      
      const receivedQty = tx.mode === "Received" ? tx.qty : "";
      const returnedQty = tx.mode === "Returned" ? tx.qty : "";
      const netReceivedQty = tx.mode === "Received" ? tx.qty : -tx.qty;

      // Map to individual layout matching spreadsheet row format
      const row = [
        escapeCSV(tx.date),
        escapeCSV(tx.orderNo),
        escapeCSV(tx.mode === "Received" ? "Yarn Received" : "Yarn Returned"),
        escapeCSV(order?.factoryName || "—"),
        escapeCSV(order?.factoryOrder || "—"),
        escapeCSV(order?.fabricType || "—"),
        escapeCSV(order?.color || "—"),
        escapeCSV(tx.yc),
        escapeCSV(tx.lot),
        escapeCSV(tx.spinner),
        receivedQty,
        returnedQty,
        netReceivedQty
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = csvRows.join("\n");
    // UTF-8 BOM prefix
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];
    
    link.setAttribute("href", url);
    link.setAttribute("download", `Yarn_Inventory_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Total Orders Tracking */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">Monitored Fabric Orders</p>
            <p className="text-2xl font-sans font-semibold text-slate-800 mt-2">
              {filteredOrders.length} <span className="text-sm font-normal text-slate-500">Filtered Active</span>
            </p>
          </div>
          <div className="bg-sky-50 p-3 rounded-xl text-sky-600">
            <BarChart2 className="h-6 w-6" />
          </div>
        </div>

        {/* Total In-House Yarn Stock */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">In-House Net Yarn Stock</p>
            <p className="text-2xl font-sans font-semibold text-emerald-600 mt-2">
              {inHouseStockWeight.toLocaleString()} <span className="text-sm font-normal text-slate-500">Kg</span>
            </p>
          </div>
          <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600">
            <RefreshCw className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* FILTER workspace AND ACTIONS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <h3 className="font-sans font-semibold text-slate-800 text-sm flex items-center gap-2">
            <span className="p-1.5 bg-slate-50 text-slate-500 rounded-lg"><Search className="h-4 w-4" /></span>
            <span>Search & Filter Yarn Inventory</span>
          </h3>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleDownloadExcel}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
            >
              <FileDown className="h-4 w-4" /> Download to Excel
            </button>
            {!readOnly && (
              <button
                onClick={() => setShowAddModal(true)}
                disabled={activeOrders.length === 0}
                className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
              >
                <Plus className="h-4 w-4" /> Add Yarn Data
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
          {/* Order Number */}
          <div>
            <label className="block text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Order Number
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search order no..."
                value={searchOrderNo}
                onChange={(e) => setSearchOrderNo(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:border-sky-500 focus:bg-white rounded-xl text-xs transition-colors font-mono"
              />
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>

          {/* Party Order Number */}
          <div>
            <label className="block text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Party Order Number
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search party order..."
                value={searchPartyOrderNo}
                onChange={(e) => setSearchPartyOrderNo(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:border-sky-500 focus:bg-white rounded-xl text-xs transition-colors font-mono"
              />
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>

          {/* Party Name Dropdown */}
          <div>
            <label className="block text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Party Name
            </label>
            <select
              value={searchPartyName}
              onChange={(e) => setSearchPartyName(e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:border-sky-500 focus:bg-white rounded-xl text-xs transition-colors text-slate-700 bg-white"
            >
              <option value="">All Parties</option>
              {factories.map((factory) => (
                <option key={factory.name} value={factory.name}>
                  {factory.name}
                </option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div>
            <label className="block text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider mb-1">
              From Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:border-sky-500 focus:bg-white rounded-xl text-xs transition-colors text-slate-700"
              />
              <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>

          {/* To Date */}
          <div>
            <label className="block text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider mb-1">
              To Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:border-sky-500 focus:bg-white rounded-xl text-xs transition-colors text-slate-700"
              />
              <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Clear Filters helper */}
        {(searchOrderNo || searchPartyOrderNo || searchPartyName || fromDate || toDate) && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => {
                setSearchOrderNo("");
                setSearchPartyOrderNo("");
                setSearchPartyName("");
                setFromDate("");
                setToDate("");
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 p-1 px-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-100 transition-all cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Reset Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* INVENTORY TABLE LEDGER */}
      <div className="bg-white border border-slate-150 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-auto max-h-[58vh]">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-20">
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-mono uppercase tracking-wider">
                <th className="sticky top-0 bg-slate-50 py-4 px-4 w-12 text-center z-20"></th>
                <th className="sticky top-0 bg-slate-50 py-4 px-3 z-20">Order Number</th>
                <th className="sticky top-0 bg-slate-50 py-4 px-3 z-20">Factory Name</th>
                <th className="sticky top-0 bg-slate-50 py-4 px-3 z-20">Factory Order</th>
                <th className="sticky top-0 bg-slate-50 py-4 px-3 z-20">Fabric Type</th>
                <th className="sticky top-0 bg-slate-50 py-4 px-3 z-20">Color</th>
                <th className="sticky top-0 bg-slate-50 py-4 px-3 z-20">Factory Job No</th>
                <th className="sticky top-0 bg-slate-50 py-4 px-3 text-right z-20">Net Yarn Received (Kg)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-750">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    {orders.length === 0
                      ? "No active yarn stocks initialized. Define orders first."
                      : "No active yarn stocks match your filter criteria."}
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const isExpanded = !!expandedOrders[order.orderNo];
                  const netReceived = getYarnReceived(order.orderNo);
                  const oTx = yarnTransactions.filter(tx => tx.orderNo === order.orderNo);
                  
                  // Filter expanded rows if dates are active
                  const filteredOTx = oTx.filter(tx => {
                    if (fromDate && tx.date < fromDate) return false;
                    if (toDate && tx.date > toDate) return false;
                    return true;
                  });

                  return (
                    <React.Fragment key={order.orderNo}>
                      <tr className={`${isExpanded ? "bg-slate-50/50" : "bg-white hover:bg-slate-50/20"} transition-colors`}>
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => toggleExpand(order.orderNo)}
                            className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </td>
                        <td className="py-4 px-3 font-mono font-semibold text-slate-900">{order.orderNo}</td>
                        <td className="py-4 px-3 font-medium text-slate-800">{order.factoryName}</td>
                        <td className="py-4 px-3 text-slate-600">{order.factoryOrder}</td>
                        <td className="py-4 px-3 text-slate-500">{order.fabricType}</td>
                        <td className="py-4 px-3 text-slate-500">{order.color}</td>
                        <td className="py-4 px-3 text-slate-650 font-mono text-xs">{order.factoryJobNo}</td>
                        <td className={`py-4 px-3 text-right font-mono font-semibold ${netReceived > 0 ? "text-emerald-700" : "text-slate-400"}`}>
                          {netReceived.toLocaleString()} Kg
                        </td>
                      </tr>
                      {/* Expanded Transaction Logs */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80">
                          <td colSpan={8} className="py-4 px-8 border-b border-slate-100">
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 font-mono">Transaction History Ledger</p>
                              {filteredOTx.length === 0 ? (
                                <p className="text-xs text-slate-400 italic py-2">No matching yarn transactions logged for this active contract.</p>
                              ) : (
                                <div className="border border-slate-100 rounded-xl overflow-hidden shadow-2xs bg-white">
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                      <tr className="bg-slate-100 border-b border-slate-250 text-slate-500 font-mono">
                                        <th className="py-2.5 px-3">Date</th>
                                        <th className="py-2.5 px-3">Mode</th>
                                        <th className="py-2.5 px-3">Yarn Count Specification</th>
                                        <th className="py-2.5 px-3">Lot No</th>
                                        <th className="py-2.5 px-3">Spinner</th>
                                        <th className="py-2.5 px-3 text-right">Quantity (Kg)</th>
                                        {canCurrentUserDeleteData() && <th className="py-2.5 px-3 text-center w-12">Delete</th>}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                                      {filteredOTx.map((tx, tIdx) => (
                                        <tr key={tx.id || tIdx} className="hover:bg-slate-50/50">
                                          <td className="py-2 px-3">{tx.date}</td>
                                          <td className="py-2 px-3 font-semibold">
                                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] ${tx.mode === "Received" ? "bg-emerald-50 text-emerald-800 border border-emerald-100" : "bg-amber-100 text-amber-800 border border-amber-200"}`}>
                                              {tx.mode}
                                            </span>
                                          </td>
                                          <td className="py-2 px-3 text-slate-800 font-sans">{tx.yc}</td>
                                          <td className="py-2 px-3">{tx.lot}</td>
                                          <td className="py-2 px-3">{tx.spinner}</td>
                                          <td className={`py-2 px-3 text-right font-semibold text-sm ${tx.mode === "Received" ? "text-emerald-700" : "text-amber-800"}`}>
                                            {tx.mode === "Received" ? "+" : "-"}{tx.qty.toLocaleString()}
                                          </td>
                                          {canCurrentUserDeleteData() && (
                                            <td className="py-2 px-3 text-center">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  if (window.confirm("Are you sure you want to delete this yarn transaction record?")) {
                                                    deleteYarnTransaction(tx.id);
                                                  }
                                                }}
                                                className="text-slate-355 hover:text-red-500 p-0.5 hover:bg-slate-100 rounded transition-colors"
                                                title="Delete Transaction"
                                              >
                                                <Trash2 className="h-3.5 w-3.5" />
                                              </button>
                                            </td>
                                          )}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TRANSACT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 z-50 overflow-y-auto pt-4 md:pt-10 pb-10">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full">
            <div className="bg-slate-50 border-b border-slate-100 py-3.5 px-6 flex items-center justify-between">
              <h3 className="font-sans font-semibold text-sm text-slate-800">Add Yarn Transaction Record</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer">&times;</button>
            </div>

            <form onSubmit={handleSubmitTransaction} className="p-6 space-y-4">
              {/* Order picker */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Select Order Contract</label>
                <select
                  className="w-full p-2 border border-slate-200 rounded-xl text-sm bg-white"
                  value={selectedOrderNo}
                  onChange={(e) => setSelectedOrderNo(e.target.value)}
                >
                  {activeOrders.map(o => (
                    <option key={o.orderNo} value={o.orderNo}>
                      {o.orderNo} ({o.factoryName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Order Metadata Preview */}
              {selectedOrder && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-500">
                  <p><span className="text-slate-400">Factory:</span> {selectedOrder.factoryName}</p>
                  <p><span className="text-slate-400">Order Ref:</span> {selectedOrder.factoryOrder}</p>
                  <p className="col-span-2"><span className="text-slate-400">Fabric Type:</span> {selectedOrder.fabricType}</p>
                  <p><span className="text-slate-400">Color Variant:</span> {selectedOrder.color}</p>
                </div>
              )}

              {/* Transaction Setup Details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Receipt Date</label>
                  <input
                    type="date"
                    required
                    className="w-full p-2 border border-slate-200 rounded-xl text-sm"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Transaction Mode</label>
                  <select
                    className="w-full p-2 border border-slate-200 rounded-xl text-sm bg-white font-semibold"
                    value={transactionMode}
                    onChange={(e) => setTransactionMode(e.target.value as any)}
                  >
                    <option value="Received">Yarn Received (+)</option>
                    <option value="Returned">Yarn Returned (-)</option>
                  </select>
                </div>
              </div>

              {/* Yarn Options from order config */}
              {selectedOrder && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Target Yarn Count & Lot (From Config)</label>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto border border-slate-100 rounded-xl p-2 bg-slate-50">
                    {selectedOrder.yarns.filter(y => y.yc !== "").length === 0 ? (
                      <p className="text-xs text-red-500 p-2 text-center">
                        This order has no yarns configured in the ledger! Setup yarns in Module 1 first.
                      </p>
                    ) : (
                      selectedOrder.yarns.map((yarn, idx) => {
                        if (!yarn.yc) return null;
                        const isChosen = yarnIndex === idx;
                        return (
                          <div
                            key={idx}
                            onClick={() => setYarnIndex(idx)}
                            className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${isChosen ? "border-sky-500 bg-sky-50 text-sky-800" : "border-slate-200 bg-white hover:bg-slate-100 text-slate-700"}`}
                          >
                            <p className="font-semibold">{yarn.yc}</p>
                            <p className="text-[10px] opacity-75 font-mono">Lot: {yarn.lot} | Spinner: {yarn.spinner} | SL: {yarn.sl}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Volume */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Transaction Quantity (Kg)</label>
                <input
                  type="number"
                  required
                  placeholder="Enter Weight in Kilograms"
                  className="w-full p-2 border border-slate-200 rounded-xl text-sm font-semibold"
                  value={transactionQty}
                  onChange={(e) => setTransactionQty(e.target.value)}
                />
              </div>

              {/* ACTIONS */}
              <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-150 rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedOrder || selectedOrder.yarns.filter(y => y.yc).length === 0}
                  className="bg-sky-600 hover:bg-sky-700 text-white px-5 py-2 rounded-xl text-xs font-medium cursor-pointer disabled:opacity-50"
                >
                  Log Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

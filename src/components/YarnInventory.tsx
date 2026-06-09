import React, { useState } from "react";
import { useAppState } from "../context/AppContext";
import { YarnTransaction } from "../types";
import { Plus, Search, ChevronDown, ChevronUp, RefreshCw, BarChart2, Calendar } from "lucide-react";

export default function YarnInventory() {
  const { 
    orders, yarnTransactions, addYarnTransaction, getYarnReceived 
  } = useAppState();

  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

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

  // KPI calculations
  const totalYarnTransactionsCount = yarnTransactions.length;
  const inHouseStockWeight = orders.reduce((sum, o) => sum + getYarnReceived(o.orderNo), 0);

  return (
    <div className="space-y-6">
      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Total Orders Tracking */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">Monitored Fabric Orders</p>
            <p className="text-2xl font-sans font-semibold text-slate-800 mt-2">
              {orders.length} <span className="text-sm font-normal text-slate-500">Active Contracts</span>
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

      {/* FILTER & TRANSACTION TRIGGER */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100">
        <h3 className="font-sans font-semibold text-slate-800 text-sm flex items-center gap-2">
          <span>Yarn Allocation Ledgers</span>
        </h3>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={activeOrders.length === 0}
          className="bg-sky-600 hover:bg-sky-700 text-white px-5 py-2 rounded-xl text-sm font-medium flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Add Yarn Data
        </button>
      </div>

      {/* INVENTORY TABLE LEDGER */}
      <div className="bg-white border border-slate-150 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-mono uppercase tracking-wider">
                <th className="py-4 px-4 w-12 text-center"></th>
                <th className="py-4 px-3">Order Number</th>
                <th className="py-4 px-3">Factory Name</th>
                <th className="py-4 px-3">Factory Order</th>
                <th className="py-4 px-3">Fabric Type</th>
                <th className="py-4 px-3">Color</th>
                <th className="py-4 px-3">Factory Job No</th>
                <th className="py-4 px-3 text-right">Net Yarn Received (Kg)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-750">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No active yarn stocks initialized. Define orders first.
                  </td>
                </tr>
              ) : (
                orders.map(order => {
                  const isExpanded = !!expandedOrders[order.orderNo];
                  const netReceived = getYarnReceived(order.orderNo);
                  const oTx = yarnTransactions.filter(tx => tx.orderNo === order.orderNo);

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
                              {oTx.length === 0 ? (
                                <p className="text-xs text-slate-400 italic py-2">No yarn transactions logged for this active contract.</p>
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
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                                      {oTx.map((tx, tIdx) => (
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

import React, { useState } from "react";
import { useAppState } from "../context/AppContext";
import { Order } from "../types";
import { Plus, Search, ChevronDown, ChevronUp, AlertCircle, Sparkles, Filter, Trash2, Edit } from "lucide-react";

interface OrderStatusProps {
  readOnly?: boolean;
}

export default function OrderStatus({ readOnly = false }: OrderStatusProps) {
  const { 
    orders, addOrder, updateOrder, getPlannedQty, getYarnReceived, 
    getTotalProduction, getTotalDelivery, updateOrderStatus, factories,
    machinePlans, productionLogs, machineStatusMap, deleteOrder, canCurrentUserDeleteData
  } = useAppState();

  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Edit states
  const [editReceiveDate, setEditReceiveDate] = useState("");
  const [editFactoryName, setEditFactoryName] = useState("");
  const [editFactoryOrder, setEditFactoryOrder] = useState("");
  const [editFabricType, setEditFabricType] = useState("");
  const [editDiaGG, setEditDiaGG] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editFinishGSM, setEditFinishGSM] = useState("");
  const [editFinishDia, setEditFinishDia] = useState("");
  const [editKnitType, setEditKnitType] = useState<"Needle Open" | "Blade Open" | "Tube" | "">("Needle Open");
  const [editFactoryJobNo, setEditFactoryJobNo] = useState("");
  const [editRate, setEditRate] = useState("");
  const [editRequiredQty, setEditRequiredQty] = useState("");
  const [editRemarks, setEditRemarks] = useState("");
  const [editStatus, setEditStatus] = useState<Order["status"]>("Pending");
  const [editYarns, setEditYarns] = useState<Array<{yc: string, lot: string, spinner: string, sl: string}>>([]);

  const startEditingOrder = (order: Order) => {
    setEditingOrder(order);
    setEditReceiveDate(order.receiveDate);
    setEditFactoryName(order.factoryName);
    setEditFactoryOrder(order.factoryOrder);
    setEditFabricType(order.fabricType);
    setEditDiaGG(order.diaGG);
    setEditColor(order.color);
    setEditFinishGSM(String(order.finishGSM || ""));
    setEditFinishDia(String(order.finishDia || ""));
    setEditKnitType(order.knitType || "Needle Open");
    setEditFactoryJobNo(order.factoryJobNo);
    setEditRate(String(order.rate || ""));
    setEditRequiredQty(String(order.requiredQty || ""));
    setEditRemarks(order.remarks || "");
    setEditStatus(order.status);
    
    const yClones = (order.yarns || []).map(y => ({ ...y }));
    while (yClones.length < 4) {
      yClones.push({ yc: "", lot: "", spinner: "", sl: "" });
    }
    setEditYarns(yClones);
  };

  const handleYarnEditForUpdate = (idx: number, field: string, val: string) => {
    setEditYarns(prev => prev.map((y, i) => {
      if (i === idx) {
        return { ...y, [field]: val };
      }
      return y;
    }));
  };

  const handleUpdateOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    if (!editRequiredQty || !editRate || !editFactoryOrder || !editFactoryJobNo) {
      alert("Please fill in all mandatory fields (Required KG, Rate, Job No, Order No)");
      return;
    }

    const updatedOrder: Order = {
      ...editingOrder,
      receiveDate: editReceiveDate,
      factoryName: editFactoryName,
      factoryOrder: editFactoryOrder,
      fabricType: editFabricType,
      diaGG: editDiaGG,
      color: editColor,
      finishGSM: Number(editFinishGSM) || 0,
      finishDia: Number(editFinishDia) || 0,
      knitType: editKnitType || undefined,
      factoryJobNo: editFactoryJobNo,
      rate: Number(editRate) || 0,
      requiredQty: Number(editRequiredQty) || 0,
      yarns: editYarns,
      remarks: editRemarks,
      status: editStatus
    };

    updateOrder(updatedOrder);
    setEditingOrder(null);
  };

  // Form states
  const [receiveDate, setReceiveDate] = useState(new Date().toISOString().split("T")[0]);
  const [factoryName, setFactoryName] = useState("");
  const [factoryOrder, setFactoryOrder] = useState("");
  const [fabricType, setFabricType] = useState("");
  const [diaGG, setDiaGG] = useState("");
  const [color, setColor] = useState("");
  const [finishGSM, setFinishGSM] = useState("");
  const [finishDia, setFinishDia] = useState("");
  const [knitType, setKnitType] = useState<"Needle Open" | "Blade Open" | "Tube" | "">("Needle Open");
  const [factoryJobNo, setFactoryJobNo] = useState("");
  const [rate, setRate] = useState("");
  const [requiredQty, setRequiredQty] = useState("");
  const [remarks, setRemarks] = useState("");

  const [yarns, setYarns] = useState<Array<{yc: string, lot: string, spinner: string, sl: string}>>([
    { yc: "", lot: "", spinner: "", sl: "" },
    { yc: "", lot: "", spinner: "", sl: "" },
    { yc: "", lot: "", spinner: "", sl: "" },
    { yc: "", lot: "", spinner: "", sl: "" }
  ]);

  // Set default factory on modal trigger
  React.useEffect(() => {
    if (factories.length > 0 && !factoryName) {
      setFactoryName(factories[0].name);
    }
  }, [factories, factoryName]);

  // Handle nested yarn field edits
  const handleYarnEdit = (index: number, field: "yc" | "lot" | "spinner" | "sl", val: string) => {
    setYarns(prev => prev.map((y, idx) => {
      if (idx === index) {
        return { ...y, [field]: val };
      }
      return y;
    }));
  };

  const toggleExpand = (orderNo: string) => {
    setExpandedOrders(prev => ({ ...prev, [orderNo]: !prev[orderNo] }));
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requiredQty || !rate || !factoryOrder || !factoryJobNo) {
      alert("Please fill in all mandatory fields (Required KG, Rate, Job No, Order No)");
      return;
    }

    addOrder({
      receiveDate,
      factoryName,
      factoryOrder,
      fabricType,
      diaGG,
      color,
      finishGSM: Number(finishGSM) || 0,
      finishDia: Number(finishDia) || 0,
      knitType,
      factoryJobNo,
      rate: Number(rate) || 0,
      requiredQty: Number(requiredQty) || 0,
      yarns,
      remarks
    });

    // Reset Form
    setReceiveDate(new Date().toISOString().split("T")[0]);
    setFactoryOrder("");
    setFabricType("");
    setDiaGG("");
    setColor("");
    setFinishGSM("");
    setFinishDia("");
    setKnitType("Needle Open");
    setFactoryJobNo("");
    setRate("");
    setRequiredQty("");
    setRemarks("");
    setYarns([
      { yc: "", lot: "", spinner: "", sl: "" },
      { yc: "", lot: "", spinner: "", sl: "" },
      { yc: "", lot: "", spinner: "", sl: "" },
      { yc: "", lot: "", spinner: "", sl: "" }
    ]);
    setShowAddModal(false);
  };

  // KPI Dashboard Counts/Sums
  const totalOrdersCount = orders.length;
  const totalOrdersQty = orders.reduce((sum, o) => sum + o.requiredQty, 0);

  const pendingOrdersCount = orders.filter(o => o.status === "Pending").length;

  const runningOrders = orders.filter(o => o.status === "Running");
  const runningOrdersCount = runningOrders.length;
  const runningOrdersProductionSum = runningOrders.reduce((sum, o) => sum + getTotalProduction(o.orderNo), 0);

  const completeOrders = orders.filter(o => o.status === "Complete");
  const completeOrdersCount = completeOrders.length;
  const completeOrdersProductionSum = completeOrders.reduce((sum, o) => sum + getTotalProduction(o.orderNo), 0);

  // Filters search box
  const filteredOrders = orders.filter(o => {
    const term = searchTerm.toLowerCase();
    return (
      o.orderNo.toLowerCase().includes(term) ||
      o.factoryOrder.toLowerCase().includes(term) ||
      o.factoryName.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* KPI BANNER */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Orders Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs hover:shadow-md transition-all duration-200">
          <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">Total Orders</p>
          <p className="text-2xl font-sans font-semibold text-slate-800 mt-2">
            {totalOrdersQty.toLocaleString()} <span className="text-sm font-normal text-slate-500">Kg</span>
          </p>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
            <span className="font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">{totalOrdersCount}</span> active records
          </div>
        </div>

        {/* Pending Orders Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs hover:shadow-md transition-all duration-200">
          <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">Pending Orders</p>
          <p className="text-2xl font-sans font-semibold text-amber-600 mt-2">
            {pendingOrdersCount} <span className="text-sm font-normal text-slate-500">Orders</span>
          </p>
          <div className="mt-2 text-xs text-slate-500">
            Awaiting planning & setup
          </div>
        </div>

        {/* Running Orders Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs hover:shadow-md transition-all duration-200">
          <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">Running Orders</p>
          <p className="text-2xl font-sans font-semibold text-emerald-600 mt-2">
            {runningOrdersProductionSum.toLocaleString()} <span className="text-sm font-normal text-slate-500">Kg Produced</span>
          </p>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
            <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{runningOrdersCount}</span> in production
          </div>
        </div>

        {/* Complete Orders Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs hover:shadow-md transition-all duration-200">
          <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">Complete Orders</p>
          <p className="text-2xl font-sans font-semibold text-slate-500 mt-2">
            {completeOrdersProductionSum.toLocaleString()} <span className="text-sm font-normal text-slate-450">Kg Delivered</span>
          </p>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
            <span className="font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">{completeOrdersCount}</span> archived orders
          </div>
        </div>
      </div>

      {/* FILTER & ADD BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Order #, Factory Order #, Factory Name..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {!readOnly && (
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto bg-sky-600 hover:bg-sky-700 text-white px-5 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Order
          </button>
        )}
      </div>

      {/* ORDERS LEDGER */}
      <div className="bg-white border border-slate-150 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-mono uppercase tracking-wider">
                <th className="py-4 px-4 w-12 text-center"></th>
                <th className="py-4 px-3">Order No</th>
                <th className="py-4 px-3">Factory Name</th>
                <th className="py-4 px-3">Factory Order</th>
                <th className="py-4 px-3">Fabric Type</th>
                <th className="py-4 px-3 text-right">Required (Kg)</th>
                <th className="py-4 px-3 text-right">Yarn Received (Kg)</th>
                <th className="py-4 px-3 text-right">Total Prod. (Kg)</th>
                <th className="py-4 px-3 text-right">Prod. Bal (Kg)</th>
                <th className="py-4 px-3 text-right">Delivered (Kg)</th>
                <th className="py-4 px-3 text-right">Del. Bal (Kg)</th>
                <th className="py-4 px-3">Status</th>
                <th className="py-4 px-3 text-center">Override</th>
                {canCurrentUserDeleteData() && <th className="py-4 px-3 text-center w-12 text-slate-500 font-mono text-[10px] uppercase">Edit</th>}
                {canCurrentUserDeleteData() && <th className="py-4 px-3 text-center w-12 text-slate-500 font-mono text-[10px] uppercase">Delete</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-750">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={canCurrentUserDeleteData() ? 15 : 13} className="py-12 text-center text-slate-400">
                    No order records found matching filters.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const isExpanded = !!expandedOrders[order.orderNo];
                  const rxKg = getYarnReceived(order.orderNo);
                  const prodKg = getTotalProduction(order.orderNo);
                  const planKg = getPlannedQty(order.orderNo);
                  const prodBal = order.requiredQty - prodKg;
                  const delKg = getTotalDelivery(order.orderNo);
                  const delBal = prodKg - delKg;

                  // CSS matching statuses
                  let statusBadgeStyle = "bg-slate-100 text-slate-800";
                  if (order.status === "Pending") statusBadgeStyle = "bg-amber-100 text-amber-800";
                  else if (order.status === "Running") statusBadgeStyle = "bg-sky-100 text-sky-800";
                  else if (order.status === "Hold") statusBadgeStyle = "bg-red-100 text-red-800";
                  else if (order.status === "Production Done") statusBadgeStyle = "bg-indigo-100 text-indigo-800 bg-opacity-70";
                  else if (order.status === "Complete") statusBadgeStyle = "bg-emerald-100 text-emerald-800";

                  return (
                    <React.Fragment key={order.orderNo}>
                      <tr className={`${isExpanded ? "bg-slate-50/50" : "bg-white hover:bg-slate-50/30"} transition-colors duration-150`}>
                        <td className="py-4 px-4 text-center">
                          <button 
                            onClick={() => toggleExpand(order.orderNo)}
                            className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </td>
                        <td className="py-4 px-3 font-mono font-semibold text-slate-900">{order.orderNo}</td>
                        <td className="py-4 px-3 font-medium text-slate-800 max-w-[160px] truncate" title={order.factoryName}>
                          {order.factoryName}
                        </td>
                        <td className="py-4 px-3 text-slate-600">{order.factoryOrder}</td>
                        <td className="py-4 px-3 text-slate-600 max-w-[180px] truncate" title={order.fabricType}>
                          {order.fabricType}
                        </td>
                        <td className="py-4 px-3 text-right font-semibold text-slate-900">{order.requiredQty.toLocaleString()}</td>
                        <td className={`py-4 px-3 text-right font-mono ${rxKg > 0 ? "text-emerald-700 font-medium" : "text-slate-400"}`}>
                          {rxKg.toLocaleString()}
                        </td>
                        <td className="py-4 px-3 text-right font-mono font-semibold text-slate-800">{prodKg.toLocaleString()}</td>
                        <td className={`py-4 px-3 text-right font-semibold ${prodBal < 0 ? "text-emerald-600" : prodBal === 0 ? "text-slate-500" : "text-amber-750"}`}>
                          {prodBal.toLocaleString()}
                        </td>
                        <td className="py-4 px-3 text-right font-mono text-slate-700">{delKg.toLocaleString()}</td>
                        <td className="py-4 px-3 text-right font-semibold text-slate-700">{delBal.toLocaleString()}</td>
                        <td className="py-4 px-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBadgeStyle}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="py-4 px-3 text-center">
                          <select
                            disabled={readOnly}
                            className={`bg-transparent border-0 rounded-lg px-2 py-1 text-xs font-medium focus:ring-2 focus:ring-sky-500 cursor-pointer ${readOnly ? "opacity-60 pointer-events-none" : "hover:bg-slate-100"}`}
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.orderNo, e.target.value as Order["status"], true)}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Running">Running</option>
                            <option value="Hold">Hold</option>
                            <option value="Production Done">Prod Done</option>
                            <option value="Complete">Complete</option>
                          </select>
                        </td>
                        {canCurrentUserDeleteData() && (
                          <>
                            <td className="py-4 px-3 text-center">
                              <button
                                onClick={() => startEditingOrder(order)}
                                className="p-1 text-slate-300 hover:text-sky-600 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                                title="Edit Order"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            </td>
                            <td className="py-4 px-3 text-center">
                              <button
                                onClick={() => {
                                  if (window.confirm(`Are you sure you want to delete order ${order.orderNo}?`)) {
                                    deleteOrder(order.orderNo);
                                  }
                                }}
                                className="p-1 text-slate-300 hover:text-red-500 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                                title="Delete Order"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50">
                          <td colSpan={canCurrentUserDeleteData() ? 15 : 13} className="py-4 px-6 border-b border-slate-100">
                            <div className="space-y-4 text-left py-2">
                              {/* Consolidated Spreadsheet Table */}
                              <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-slate-300">
                                <table className="w-full border-collapse border border-slate-300 text-xs text-slate-800">
                                  <tbody>
                                    {/* SECTION 1: FABRIC DETAILS */}
                                    <tr>
                                      <td rowSpan={2} className="py-3 px-3 text-center font-bold text-[11px] text-slate-700 border border-slate-300 bg-slate-100/90 font-sans w-28 uppercase tracking-wide">
                                        Fabric Details
                                      </td>
                                      <th className="py-1.5 px-3 border border-slate-300 bg-slate-50 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider text-left w-[12%]">DiaX GG</th>
                                      <th className="py-1.5 px-3 border border-slate-300 bg-slate-50 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider text-left w-[10%]">GSM</th>
                                      <th className="py-1.5 px-3 border border-slate-300 bg-slate-50 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider text-left w-[24%]">F.Dia (Width)</th>
                                      <th className="py-1.5 px-3 border border-slate-300 bg-slate-50 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider text-left w-[20%]">Color Variant</th>
                                      <th className="py-1.5 px-3 border border-slate-300 bg-slate-50 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider text-left w-[17%]">Factory Job No</th>
                                      <th className="py-1.5 px-3 border border-slate-300 bg-slate-50 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider text-left w-[17%]">Price</th>
                                    </tr>
                                    <tr className="hover:bg-slate-50/40 text-[11px]">
                                      <td className="py-2 px-3 border border-slate-300 font-mono font-bold text-slate-900">{order.diaGG || "—"}</td>
                                      <td className="py-2 px-3 border border-slate-300 font-mono font-semibold text-slate-800">{order.finishGSM || "—"}</td>
                                      <td className="py-2 px-3 border border-slate-300 font-mono font-semibold text-slate-800">
                                        {order.finishDia ? (order.knitType ? `${order.finishDia}" ${order.knitType}` : `${order.finishDia}"`) : "—"}
                                      </td>
                                      <td className="py-2 px-3 border border-slate-300 font-semibold text-slate-800">{order.color || "—"}</td>
                                      <td className="py-2 px-3 border border-slate-300 font-mono text-slate-700 font-semibold">{order.factoryJobNo || "—"}</td>
                                      <td className="py-2 px-3 border border-slate-300 font-mono font-bold text-slate-900">{order.rate ? `${order.rate} BDT/Kg` : "—"}</td>
                                    </tr>

                                    {/* SECTION 2: YARN DETAILS */}
                                    {(() => {
                                      const activeYarns = order.yarns ? order.yarns.filter(yarn => yarn.yc) : [];
                                      const yarnsRowSpan = 1 + Math.max(1, activeYarns.length);
                                      return (
                                        <>
                                          <tr>
                                            <td rowSpan={yarnsRowSpan} className="py-3 px-3 text-center font-bold text-[11px] text-slate-700 border border-slate-300 bg-slate-100/90 font-sans w-28 uppercase tracking-wide">
                                              Yarn Details
                                            </td>
                                            <th className="py-1.5 px-3 border border-slate-300 bg-slate-50 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider text-left w-[28%]">Yarn Count</th>
                                            <th className="py-1.5 px-3 border border-slate-300 bg-slate-50 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider text-left w-[16%]">Lot</th>
                                            <th className="py-1.5 px-3 border border-slate-300 bg-slate-50 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider text-left w-[28%]">Spinner</th>
                                            <th className="py-1.5 px-3 border border-slate-300 bg-slate-50 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider text-center w-[12%]">S/L</th>
                                            <th className="py-1.5 px-3 border border-slate-300 bg-slate-50 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider text-left w-[8%]"></th>
                                            <th className="py-1.5 px-3 border border-slate-300 bg-slate-50 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider text-left w-[8%]"></th>
                                          </tr>
                                          {activeYarns.length > 0 ? (
                                            activeYarns.map((yarn, idx) => (
                                              <tr key={idx} className="hover:bg-slate-50/40 text-[11px]">
                                                <td className="py-2 px-3 border border-slate-300 font-bold text-slate-900">{yarn.yc}</td>
                                                <td className="py-2 px-3 border border-slate-300 font-mono text-slate-700 font-semibold">{yarn.lot || "—"}</td>
                                                <td className="py-2 px-3 border border-slate-300 font-semibold text-slate-800">{yarn.spinner || "—"}</td>
                                                <td className="py-2 px-3 border border-slate-300 text-center font-mono font-bold text-slate-905">{yarn.sl || "—"}</td>
                                                <td className="py-2 px-3 border border-slate-300"></td>
                                                <td className="py-2 px-3 border border-slate-300"></td>
                                              </tr>
                                            ))
                                          ) : (
                                            <tr>
                                              <td colSpan={6} className="py-3 px-3 border border-slate-300 text-center text-slate-400 italic">
                                                No active yarn specifications mapped to this order fabric.
                                              </td>
                                            </tr>
                                          )}
                                        </>
                                      );
                                    })()}

                                    {/* SECTION 3: PRODUCTION LIVE TRACKER */}
                                    {(() => {
                                      const plansForOrder = machinePlans.filter(p => p.orderNo === order.orderNo);
                                      const plansRowSpan = 1 + Math.max(1, plansForOrder.length);
                                      return (
                                        <>
                                          <tr>
                                            <td rowSpan={plansRowSpan} className="py-3 px-3 text-center font-bold text-[11px] text-slate-700 border border-slate-300 bg-slate-100/90 font-sans w-28 uppercase tracking-wide">
                                              Production Live Tracker
                                            </td>
                                            <th className="py-1.5 px-3 border border-slate-300 bg-slate-50 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider text-left">Assigned M/C No.</th>
                                            <th className="py-1.5 px-3 border border-slate-300 bg-slate-50 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider text-left">Job Card No.</th>
                                            <th className="py-1.5 px-3 border border-slate-300 bg-slate-50 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider text-right">Plan Allocated (Kg)</th>
                                            <th className="py-1.5 px-3 border border-slate-300 bg-slate-50 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider text-right">Actual Prod. (Kg)</th>
                                            <th className="py-1.5 px-3 border border-slate-300 bg-slate-50 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider w-[22%]">Ops Progress</th>
                                            <th className="py-1.5 px-3 border border-slate-300 bg-slate-50 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider text-center">Machine Status</th>
                                          </tr>
                                          {plansForOrder.length > 0 ? (
                                            plansForOrder.map((plan) => {
                                              const prodForPlan = productionLogs
                                                .filter(log => log.orderNo === order.orderNo && log.machineNo === plan.machineNo && log.jobCardNo === plan.jobCardNo)
                                                .reduce((sum, log) => sum + log.qty, 0);

                                              const progressPercent = plan.plannedQty > 0 
                                                ? Math.round(Math.min((prodForPlan / plan.plannedQty) * 100, 100)) 
                                                : 0;

                                              let machineStatus = machineStatusMap?.[plan.machineNo];
                                              if (machineStatus === undefined) {
                                                const assignedQtyVal = machinePlans
                                                  .filter(p => p.machineNo === plan.machineNo)
                                                  .reduce((sum, p) => sum + p.plannedQty, 0);
                                                const totalProdVal = productionLogs
                                                  .filter(l => l.machineNo === plan.machineNo)
                                                  .reduce((sum, l) => sum + l.qty, 0);
                                                const hasActiveLoad = (assignedQtyVal - totalProdVal) > 0;
                                                machineStatus = hasActiveLoad ? "Running" : "No Order";
                                              }
                                              
                                              let statusColor = "bg-slate-50 text-slate-650 border-slate-150";
                                              let dotColor = "bg-slate-400";
                                              if (machineStatus === "Running") {
                                                statusColor = "bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold";
                                                dotColor = "bg-emerald-500 animate-pulse";
                                              } else if (machineStatus === "Servicing") {
                                                statusColor = "bg-rose-50 text-rose-800 border-rose-150 font-semibold";
                                                dotColor = "bg-rose-500 animate-pulse";
                                              } else if (machineStatus === "No Order") {
                                                statusColor = "bg-slate-100 text-slate-700 border-slate-200 font-semibold";
                                                dotColor = "bg-slate-400";
                                              } else {
                                                statusColor = "bg-amber-50 text-amber-800 border-amber-200 font-semibold";
                                                dotColor = "bg-amber-500";
                                              }

                                              return (
                                                <tr key={plan.id} className="hover:bg-slate-50/40 text-[11px]">
                                                  <td className="py-2 px-3 border border-slate-300 font-mono font-bold text-slate-800 flex items-center gap-1.5">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
                                                    {plan.machineNo}
                                                  </td>
                                                  <td className="py-2 px-3 border border-slate-300 font-mono text-slate-700 font-semibold">{plan.jobCardNo}</td>
                                                  <td className="py-2 px-3 border border-slate-300 text-right font-mono font-semibold text-slate-800">{plan.plannedQty.toLocaleString()} kg</td>
                                                  <td className="py-2 px-3 border border-slate-300 text-right font-mono font-bold text-slate-905">{prodForPlan.toLocaleString()} kg</td>
                                                  <td className="py-2 px-3 border border-slate-300">
                                                    <div className="flex items-center gap-2">
                                                      <div className="relative w-full h-1.5 bg-slate-105 rounded-full overflow-hidden border border-slate-200">
                                                        <div 
                                                          className={`absolute left-0 top-0 h-full rounded-full transition-all duration-300 ${
                                                            progressPercent === 100 
                                                              ? 'bg-emerald-500' 
                                                              : progressPercent > 50 
                                                              ? 'bg-sky-500' 
                                                              : progressPercent > 0 
                                                              ? 'bg-amber-500' 
                                                              : 'bg-slate-300'
                                                          }`}
                                                          style={{ width: `${progressPercent}%` }}
                                                        ></div>
                                                      </div>
                                                      <span className="font-mono text-[10px] text-slate-600 font-bold min-w-[28px] text-right">{progressPercent}%</span>
                                                    </div>
                                                  </td>
                                                  <td className="py-2 px-3 border border-slate-300 text-center">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono border uppercase tracking-wider leading-none ${statusColor}`}>
                                                      {machineStatus}
                                                    </span>
                                                  </td>
                                                </tr>
                                              );
                                            })
                                          ) : (
                                            <tr>
                                              <td colSpan={6} className="py-3 px-3 border border-slate-300 text-center text-slate-400 italic">
                                                No live scheduler planning logs found for this order. Assign routing cards to track live machine operational progress.
                                              </td>
                                            </tr>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </tbody>
                                </table>
                              </div>

                              {/* Order Remarks Footer if available */}
                              {order.remarks && (
                                <div className="text-[11px] text-slate-550 italic bg-amber-50/40 p-2.5 rounded-lg border border-slate-200/65 font-sans leading-relaxed">
                                  <strong>Special Remarks:</strong> {order.remarks}
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

      {/* ADD ORDER MODAL */}
      {showAddModal && (
        <div id="add_order_modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 z-50 overflow-y-auto pt-4 md:pt-10 pb-10">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-slate-50 border-b border-slate-100 py-4 px-6 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-sky-600" />
                <h3 className="font-sans font-semibold text-base text-slate-800">Create New Production Order</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-6 space-y-6">
              {/* Row 1 */}
              <div>
                <h4 className="text-xs font-mono uppercase text-sky-600 font-semibold tracking-wider mb-3">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Receive Date</label>
                    <input
                      type="date"
                      required
                      className="w-full p-2 border border-slate-200 rounded-xl text-sm"
                      value={receiveDate}
                      onChange={(e) => setReceiveDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Factory Partner</label>
                    {factories.length === 0 ? (
                      <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg border border-red-100">
                        No Running Factories! Setup in Settings first.
                      </p>
                    ) : (
                      <select
                        className="w-full p-2 border border-slate-200 rounded-xl text-sm bg-white"
                        value={factoryName}
                        onChange={(e) => setFactoryName(e.target.value)}
                      >
                        {factories.map((f, i) => (
                          <option key={i} value={f.name}>{f.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Factory Order No.</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. FO-109"
                      className="w-full p-2 border border-slate-200 rounded-xl text-sm"
                      value={factoryOrder}
                      onChange={(e) => setFactoryOrder(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Fabric Description Type</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 100% Cotton Single Jersey"
                    className="w-full p-2 border border-slate-200 rounded-xl text-sm"
                    value={fabricType}
                    onChange={(e) => setFabricType(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Machine Dia x GG</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 44 x 18"
                    className="w-full p-2 border border-slate-200 rounded-xl text-sm"
                    value={diaGG}
                    onChange={(e) => setDiaGG(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Color Variant</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Carbon Black"
                    className="w-full p-2 border border-slate-200 rounded-xl text-sm"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                  />
                </div>
              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Finish GSM</label>
                  <input
                    type="number"
                    placeholder="GSM"
                    className="w-full p-2 border border-slate-200 rounded-xl text-sm"
                    value={finishGSM}
                    onChange={(e) => setFinishGSM(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Finish Width (Dia)</label>
                  <input
                    type="number"
                    placeholder="Dia Inches"
                    className="w-full p-2 border border-slate-200 rounded-xl text-sm"
                    value={finishDia}
                    onChange={(e) => setFinishDia(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Knit Type</label>
                  <select
                    className="w-full p-2 border border-slate-200 rounded-xl text-sm bg-white"
                    value={knitType || "Needle Open"}
                    onChange={(e) => setKnitType(e.target.value as any)}
                  >
                    <option value="Needle Open">Needle Open</option>
                    <option value="Blade Open">Blade Open</option>
                    <option value="Tube">Tube</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Factory Job No.</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. JOB-8902"
                    className="w-full p-2 border border-slate-200 rounded-xl text-sm"
                    value={factoryJobNo}
                    onChange={(e) => setFactoryJobNo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Rate (BDT / Kg)</label>
                  <input
                    type="number"
                    required
                    placeholder="Price per Kg"
                    className="w-full p-2 border border-slate-200 rounded-xl text-sm"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Required Qty (Kg)</label>
                  <input
                    type="number"
                    required
                    placeholder="Required Weight"
                    className="w-full p-2 border border-slate-200 rounded-xl text-sm font-semibold"
                    value={requiredQty}
                    onChange={(e) => setRequiredQty(e.target.value)}
                  />
                </div>
              </div>

              {/* YARN SECTIONS */}
              <div className="border-t border-slate-100 pt-4">
                <h4 className="text-xs font-mono uppercase text-sky-600 font-semibold tracking-wider mb-3">Yarn Information (Up to 4 segments)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {yarns.map((yarn, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                      <p className="text-xs font-semibold text-slate-600 font-mono">Yarn Segment {idx + 1}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-400 font-mono uppercase">Yarn Count</label>
                          <input
                            type="text"
                            placeholder="e.g. 30s Combed"
                            className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                            value={yarn.yc}
                            onChange={(e) => handleYarnEdit(idx, "yc", e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-mono uppercase">Yarn Lot</label>
                          <input
                            type="text"
                            placeholder="e.g. RE-77"
                            className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                            value={yarn.lot}
                            onChange={(e) => handleYarnEdit(idx, "lot", e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-mono uppercase">Spinner Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Square Yarns"
                            className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                            value={yarn.spinner}
                            onChange={(e) => handleYarnEdit(idx, "spinner", e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-mono uppercase">Stitch Length (SL)</label>
                          <input
                            type="text"
                            placeholder="e.g. 3.12"
                            className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                            value={yarn.sl}
                            onChange={(e) => handleYarnEdit(idx, "sl", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* REMARKS */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Order Remarks / Instructions</label>
                <textarea
                  className="w-full p-2 border border-slate-200 rounded-xl text-sm"
                  rows={2}
                  placeholder="Enter custom remarks regarding the stitch, machinery, or timelines..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>

              {/* ACTIONS */}
              <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={factories.length === 0}
                  className="bg-sky-600 hover:bg-sky-700 text-white px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-50 cursor-pointer"
                >
                  Confirm Code Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ORDER MODAL */}
      {editingOrder && (
        <div id="edit_order_modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 z-50 overflow-y-auto pt-4 md:pt-10 pb-10">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-slate-50 border-b border-slate-100 py-4 px-6 flex items-center justify-between sticky top-0 bg-white z-10 font-sans">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-sky-600" />
                <h3 className="font-semibold text-base text-slate-800">Edit Production Order: {editingOrder.orderNo}</h3>
              </div>
              <button
                onClick={() => setEditingOrder(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUpdateOrderSubmit} className="p-6 space-y-6">
              {/* Row 1 */}
              <div>
                <h4 className="text-xs font-mono uppercase text-sky-600 font-semibold tracking-wider mb-3">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Receive Date</label>
                    <input
                      type="date"
                      required
                      className="w-full p-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:border-sky-500"
                      value={editReceiveDate}
                      onChange={(e) => setEditReceiveDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Factory Partner</label>
                    {factories.length === 0 ? (
                      <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg border border-red-100">
                        No Running Factories! Setup in Settings first.
                      </p>
                    ) : (
                      <select
                        className="w-full p-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-hidden focus:border-sky-500"
                        value={editFactoryName}
                        onChange={(e) => setEditFactoryName(e.target.value)}
                      >
                        {factories.map((f, i) => (
                          <option key={i} value={f.name}>{f.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Factory Order No.</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. FO-109"
                      className="w-full p-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:border-sky-500"
                      value={editFactoryOrder}
                      onChange={(e) => setEditFactoryOrder(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Current Status</label>
                    <select
                      className="w-full p-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-hidden focus:border-sky-500"
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as any)}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Running">Running</option>
                      <option value="Hold">Hold</option>
                      <option value="Production Done">Production Done</option>
                      <option value="Complete">Complete</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Fabric Description Type</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 100% Cotton Single Jersey"
                    className="w-full p-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:border-sky-500"
                    value={editFabricType}
                    onChange={(e) => setEditFabricType(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Machine Dia x GG</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 44 x 18"
                    className="w-full p-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:border-sky-500"
                    value={editDiaGG}
                    onChange={(e) => setEditDiaGG(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Color Variant</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Carbon Black"
                    className="w-full p-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:border-sky-500"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                  />
                </div>
              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Finish GSM</label>
                  <input
                    type="number"
                    placeholder="GSM"
                    className="w-full p-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:border-sky-500"
                    value={editFinishGSM}
                    onChange={(e) => setEditFinishGSM(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Finish Width (Dia)</label>
                  <input
                    type="number"
                    placeholder="Dia Inches"
                    className="w-full p-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:border-sky-500"
                    value={editFinishDia}
                    onChange={(e) => setEditFinishDia(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Knit Type</label>
                  <select
                    className="w-full p-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-hidden focus:border-sky-500"
                    value={editKnitType || "Needle Open"}
                    onChange={(e) => setEditKnitType(e.target.value as any)}
                  >
                    <option value="Needle Open">Needle Open</option>
                    <option value="Blade Open">Blade Open</option>
                    <option value="Tube">Tube</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Factory Job No.</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. JOB-8902"
                    className="w-full p-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:border-sky-500"
                    value={editFactoryJobNo}
                    onChange={(e) => setEditFactoryJobNo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Rate (BDT / Kg)</label>
                  <input
                    type="number"
                    required
                    placeholder="Price per Kg"
                    className="w-full p-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:border-sky-500"
                    value={editRate}
                    onChange={(e) => setEditRate(e.target.value)}
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Required Qty (Kg)</label>
                  <input
                    type="number"
                    required
                    placeholder="Required Weight"
                    className="w-full p-2 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-hidden focus:border-sky-500"
                    value={editRequiredQty}
                    onChange={(e) => setEditRequiredQty(e.target.value)}
                  />
                </div>
              </div>

              {/* YARN SECTIONS */}
              <div className="border-t border-slate-100 pt-4">
                <h4 className="text-xs font-mono uppercase text-sky-600 font-semibold tracking-wider mb-3">Yarn Information (Up to 4 segments)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {editYarns.map((yarn, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                      <p className="text-xs font-semibold text-slate-600 font-mono">Yarn Segment {idx + 1}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-400 font-mono uppercase">Yarn Count</label>
                          <input
                            type="text"
                            placeholder="e.g. 30s Combed"
                            className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-sky-500"
                            value={yarn.yc}
                            onChange={(e) => handleYarnEditForUpdate(idx, "yc", e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-mono uppercase">Yarn Lot</label>
                          <input
                            type="text"
                            placeholder="e.g. RE-77"
                            className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-sky-500"
                            value={yarn.lot}
                            onChange={(e) => handleYarnEditForUpdate(idx, "lot", e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-mono uppercase">Spinner Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Square Yarns"
                            className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-sky-500"
                            value={yarn.spinner}
                            onChange={(e) => handleYarnEditForUpdate(idx, "spinner", e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-mono uppercase">Stitch Length (SL)</label>
                          <input
                            type="text"
                            placeholder="e.g. 3.12"
                            className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-sky-500"
                            value={yarn.sl}
                            onChange={(e) => handleYarnEditForUpdate(idx, "sl", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* REMARKS */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Order Remarks / Instructions</label>
                <textarea
                  className="w-full p-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:border-sky-500"
                  rows={2}
                  placeholder="Enter custom remarks regarding the stitch, machinery, or timelines..."
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                />
              </div>

              {/* ACTIONS */}
              <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={factories.length === 0}
                  className="bg-sky-600 hover:bg-sky-700 text-white px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-50 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

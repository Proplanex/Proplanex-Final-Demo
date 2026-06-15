import React, { useState } from "react";
import { useAppState } from "../context/AppContext";
import { Order, MachinePlan } from "../types";
import { Search, Plus, Calendar, Settings, Printer, Scissors, HelpCircle, ChevronRight, CheckCircle, ExternalLink, Trash2, Download } from "lucide-react";
import { formatDateDDMMYYYY } from "./DeliveryModule";
import { downloadElementAsPdf } from "../utils/pdfHelper";

interface PlanningFileProps {
  readOnly?: boolean;
}

export default function PlanningFile({ readOnly = false }: PlanningFileProps) {
  const { 
    orders, machinePlans, addMachinePlan, updateMachinePlan, splitMachinePlan, getPlannedQty, machines, companyProfile, poweredByProfile, deleteMachinePlan, canCurrentUserDeleteData 
  } = useAppState();

  const [searchTerm, setSearchTerm] = useState("");
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  
  // Assignment form modal state
  const [assigningOrderNo, setAssigningOrderNo] = useState<string | null>(null);
  const [planDate, setPlanDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedMachineNo, setSelectedMachineNo] = useState("");
  const [plannedQty, setPlannedQty] = useState("");

  // Printable Job Card selection
  const [activeJobCard, setActiveJobCard] = useState<MachinePlan | null>(null);
  const [activeJobCardOrder, setActiveJobCardOrder] = useState<Order | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);

  // Adjust/Split job card modal state
  const [adjustingPlan, setAdjustingPlan] = useState<MachinePlan | null>(null);
  const [adjustingOrder, setAdjustingOrder] = useState<Order | null>(null);
  const [adjustMethod, setAdjustMethod] = useState<"edit" | "split">("edit");
  const [adjustMachineNo, setAdjustMachineNo] = useState("");
  const [adjustQty, setAdjustQty] = useState("");
  const [splitTargetMachineNo, setSplitTargetMachineNo] = useState("");
  const [splitKeepQty, setSplitKeepQty] = useState("");
  const [splitGiveQty, setSplitGiveQty] = useState("");

  // Filters search by Order Number ONLY (pulls from Order Status)
  const filteredOrders = orders.filter(o => {
    // Only planning on orders not complete
    if (o.status === "Complete") return false;
    if (!searchTerm) return true;
    return o.orderNo.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const toggleExpand = (orderNo: string) => {
    setExpandedOrders(prev => ({ ...prev, [orderNo]: !prev[orderNo] }));
  };

  const handleOpenAssignModal = (order: Order) => {
    setAssigningOrderNo(order.orderNo);
    // Find matching machines
    // e.g. "44 x 18" -> search Dia is "44"
    const parsedDia = parseInt(order.diaGG.split("x")[0].trim(), 10);
    const eligibleMachines = machines.filter(m => m.dia === parsedDia);
    if (eligibleMachines.length > 0) {
      setSelectedMachineNo(eligibleMachines[0].machineNo);
    } else {
      setSelectedMachineNo(machines[0]?.machineNo || "");
    }
    setPlanDate(new Date().toISOString().split("T")[0]);
    setPlannedQty("");
  };

  const handleSaveAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningOrderNo) return;

    const order = orders.find(o => o.orderNo === assigningOrderNo);
    if (!order) return;

    const totalPlanned = getPlannedQty(assigningOrderNo);
    const balance = order.requiredQty - totalPlanned;
    const enteredQty = Number(plannedQty);

    if (!enteredQty || enteredQty <= 0) {
      alert("Please enter a valid planned weight.");
      return;
    }

    if (enteredQty > balance) {
      alert(`Error: Planned quantity cannot be greater than Plan Balance (${balance} Kg).`);
      return;
    }

    if (!selectedMachineNo) {
      alert("Please assign a machine.");
      return;
    }

    addMachinePlan({
      orderNo: assigningOrderNo,
      planDate,
      machineNo: selectedMachineNo,
      plannedQty: enteredQty
    });

    setAssigningOrderNo(null);
  };

  const handleViewJobCard = (plan: MachinePlan, order: Order) => {
    setPrintError(null);
    setActiveJobCard(plan);
    setActiveJobCardOrder(order);
  };

  const handleOpenAdjustModal = (plan: MachinePlan, order: Order) => {
    if (!canCurrentUserDeleteData()) {
      alert("Unauthorized! Only Admin or Superadmin is allowed to change, adjust, or split job cards.");
      return;
    }
    setAdjustingPlan(plan);
    setAdjustingOrder(order);
    setAdjustMethod("edit");
    setAdjustMachineNo(plan.machineNo);
    setAdjustQty(plan.plannedQty.toString());
    
    setSplitTargetMachineNo("");
    const defaultSplit = (plan.plannedQty / 2);
    setSplitKeepQty(defaultSplit.toString());
    setSplitGiveQty(defaultSplit.toString());
  };

  const getMaxAllowedQty = (plan: MachinePlan, order: Order) => {
    const totalPlanned = getPlannedQty(order.orderNo);
    const balance = order.requiredQty - totalPlanned;
    return plan.plannedQty + balance;
  };

  const handleSaveAdjustmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingPlan || !adjustingOrder) return;

    if (adjustMethod === "edit") {
      const enteredQty = Number(adjustQty);
      if (!enteredQty || enteredQty <= 0) {
        alert("Please enter a valid planned weight.");
        return;
      }

      const maxLimit = getMaxAllowedQty(adjustingPlan, adjustingOrder);
      if (enteredQty > maxLimit) {
        alert(`Error: Quantity cannot exceed maximum permissible limit of ${maxLimit} Kg.`);
        return;
      }

      if (!adjustMachineNo) {
        alert("Please select a machine.");
        return;
      }

      updateMachinePlan(adjustingPlan.id, {
        machineNo: adjustMachineNo,
        plannedQty: enteredQty
      });

      setAdjustingPlan(null);
      setAdjustingOrder(null);
    } else {
      // Split
      const keep = Number(splitKeepQty);
      const give = Number(splitGiveQty);
      const total = adjustingPlan.plannedQty;

      if (!keep || keep <= 0 || !give || give <= 0) {
        alert("Enter valid weights for both split portions.");
        return;
      }

      if (Math.abs((keep + give) - total) > 0.01) {
        alert(`Error: Sum of split portions (${keep + give} Kg) must exactly equal total quantity (${total} Kg).`);
        return;
      }

      if (!splitTargetMachineNo) {
        alert("Please select the target machine to route split capacity.");
        return;
      }

      // Perform split
      splitMachinePlan(adjustingPlan.id, keep, splitTargetMachineNo, give);

      setAdjustingPlan(null);
      setAdjustingOrder(null);
    }
  };

  const handleSplitKeepChange = (val: string) => {
    if (!adjustingPlan) return;
    const total = adjustingPlan.plannedQty;
    const num = Number(val);
    setSplitKeepQty(val);
    if (!isNaN(num) && num >= 0 && num <= total) {
      setSplitGiveQty((total - num).toFixed(2));
    }
  };

  const handleSplitGiveChange = (val: string) => {
    if (!adjustingPlan) return;
    const total = adjustingPlan.plannedQty;
    const num = Number(val);
    setSplitGiveQty(val);
    if (!isNaN(num) && num >= 0 && num <= total) {
      setSplitKeepQty((total - num).toFixed(2));
    }
  };

  const triggerPrintJobCard = () => {
    try {
      setPrintError(null);
      window.focus();
      window.print();
    } catch (err) {
      console.warn("Direct window.print() failed: ", err);
      setPrintError("Browser iframe print block detected. Please open the app in a standalone tab.");
    }
  };

  const downloadPdfJobCard = async () => {
    if (!activeJobCard) return;
    try {
      setPrintError(null);
      await downloadElementAsPdf("jobcard_print_target", activeJobCard.jobCardNo);
    } catch (err) {
      console.warn("Direct PDF export failed: ", err);
      setPrintError("Direct PDF export failed. Try opening the app in a standalone tab.");
    }
  };

  return (
    <div className="space-y-6">
      {/* SEARCH CARD BY ORDER NO ONLY */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Assign Machine & Production Splitting</h3>
          <p className="text-xs text-slate-400 mt-1">Search specifically by order references to manage physical assignments and generate scannable Job Cards.</p>
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Order Number ONLY (e.g. PRO0001)..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* PLANNING MAIN LEDGER */}
      <div className="bg-white border border-slate-150 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-auto max-h-[58vh]">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-20">
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-mono uppercase tracking-wider">
                <th className="sticky top-0 bg-slate-50 py-4 px-4 w-12 text-center z-20"></th>
                <th className="sticky top-0 bg-slate-50 py-4 px-3 z-20" colSpan={2}>Order & Job details</th>
                <th className="sticky top-0 bg-slate-50 py-4 px-3 z-20">Fabric Architecture</th>
                <th className="sticky top-0 bg-slate-50 py-4 px-3 z-20">Dia x GG</th>
                <th className="sticky top-0 bg-slate-50 py-4 px-3 text-right z-20">Required (Kg)</th>
                <th className="sticky top-0 bg-slate-50 py-4 px-3 text-right z-20">Planned (Kg)</th>
                <th className="sticky top-0 bg-slate-50 py-4 px-3 text-right z-20">Plan Balance (Kg)</th>
                <th className="sticky top-0 bg-slate-50 py-4 px-3 text-center z-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-750">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No matching orders available for machine routing.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const isExpanded = !!expandedOrders[order.orderNo];
                  const planned = getPlannedQty(order.orderNo);
                  const planBalance = order.requiredQty - planned;

                  const orderPlans = machinePlans.filter(p => p.orderNo === order.orderNo);

                  return (
                    <React.Fragment key={order.orderNo}>
                      <tr className={`${isExpanded ? "bg-slate-50/50" : "bg-white hover:bg-slate-50/20"} transition-colors`}>
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => toggleExpand(order.orderNo)}
                            className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {isExpanded ? <ChevronRight className="h-4 w-4 rotate-90 transition-transform" /> : <ChevronRight className="h-4 w-4 transition-transform" />}
                          </button>
                        </td>
                        <td className="py-4 px-3 font-mono font-semibold text-slate-900">{order.orderNo}</td>
                        <td className="py-3 px-3">
                          <div className="text-xs">
                            <span className="font-semibold text-slate-800 block">{order.factoryName}</span>
                            <span className="text-slate-500">Order: {order.factoryOrder} | Job: {order.factoryJobNo}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-xs">
                            <span className="text-slate-800 font-medium block">{order.fabricType}</span>
                            <span className="text-slate-400">Color: {order.color}</span>
                          </div>
                        </td>
                        <td className="py-4 px-3 font-mono font-semibold text-slate-800">{order.diaGG}</td>
                        <td className="py-4 px-3 text-right font-mono font-semibold text-slate-800">{order.requiredQty.toLocaleString()}</td>
                        <td className="py-4 px-3 text-right font-mono font-medium text-sky-700">{planned.toLocaleString()}</td>
                        <td className={`py-4 px-3 text-right font-mono font-semibold ${planBalance === 0 ? "text-emerald-600" : "text-amber-800"}`}>
                          {planBalance.toLocaleString()}
                        </td>
                        <td className="py-4 px-3 text-center">
                          {readOnly ? (
                            <span className="text-[10px] font-mono text-slate-400 font-semibold italic">
                              Read-Only
                            </span>
                          ) : planBalance > 0 ? (
                            <button
                              onClick={() => handleOpenAssignModal(order)}
                              className="bg-sky-50 text-sky-700 hover:bg-sky-100 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 mx-auto cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5" /> Route M/C
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-emerald-700 bg-emerald-50 rounded-lg font-semibold mx-auto">
                              <CheckCircle className="h-3 w-3" /> Fully Planned
                            </span>
                          )}
                        </td>
                      </tr>
                      {/* Expanded Section showing Assigned Machines & Job Cards */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80">
                          <td colSpan={9} className="py-4 px-10 border-b border-slate-100">
                            <div className="space-y-4">
                              {/* Yarn detail cards */}
                              {order.yarns.some(y => y.yc) && (
                                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-3xs">
                                  <p className="text-xs font-semibold text-slate-400 font-mono uppercase mb-2">Primary Yarn Configurations</p>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {order.yarns.map((y, idx) => y.yc ? (
                                      <div key={idx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">
                                        <span className="text-[10px] text-sky-600 font-bold font-mono uppercase block mb-1">Yarn {idx+1}</span>
                                        <p className="font-semibold text-slate-800">{y.yc}</p>
                                        <p className="text-slate-500 opacity-80 mt-0.5">Lot: {y.lot} | Spn: {y.spinner} | SL: {y.sl}</p>
                                      </div>
                                    ) : null)}
                                  </div>
                                </div>
                              )}

                              {/* Machine Routing Table */}
                              <div>
                                <p className="text-xs font-semibold text-slate-500 font-mono uppercase tracking-wider mb-2">Knitting Machine Assignments</p>
                                {orderPlans.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic py-2">No machines currently scheduled on this contract.</p>
                                ) : (
                                  <div className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-3xs">
                                    <table className="w-full text-left text-xs border-collapse">
                                      <thead>
                                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 font-mono">
                                          <th className="py-2.5 px-3">Date Drafted</th>
                                          <th className="py-2.5 px-3">Assigned Machine No</th>
                                          <th className="py-2.5 px-3 text-right">Drafted Capacity (Kg)</th>
                                          <th className="py-2.5 px-3">Job Card Reference #</th>
                                          <th className="py-2.5 px-3 text-center">Action Ticket</th>
                                          {canCurrentUserDeleteData() && <th className="py-2.5 px-3 text-center w-12">Delete</th>}
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 font-mono">
                                        {orderPlans.map((plan) => (
                                          <tr key={plan.id} className="hover:bg-slate-50/50">
                                            <td className="py-2.5 px-3 text-slate-500">{formatDateDDMMYYYY(plan.planDate)}</td>
                                            <td className="py-2.5 px-3 font-semibold text-slate-800">{plan.machineNo}</td>
                                            <td className="py-2.5 px-3 text-right font-semibold text-slate-950">{plan.plannedQty.toLocaleString()} Kg</td>
                                            <td className="py-2.5 px-3 font-bold text-sky-800">{plan.jobCardNo}</td>
                                            <td className="py-2 px-3 text-center">
                                              <div className="flex justify-center gap-1.5">
                                                <button
                                                  onClick={() => handleViewJobCard(plan, order)}
                                                  className="bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 px-2 py-1 rounded-[6px] text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                                                  title="Generate and print ticket"
                                                >
                                                  <Printer className="h-3 w-3" /> Ticket
                                                </button>
                                                {canCurrentUserDeleteData() && (
                                                  <button
                                                    onClick={() => handleOpenAdjustModal(plan, order)}
                                                    className="bg-amber-50 border border-amber-100 hover:bg-amber-100 text-amber-700 px-2 py-1 rounded-[6px] text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                                                    title="Adjust or Split this Job Card (Admins Only)"
                                                  >
                                                    <Scissors className="h-3 w-3" /> Adjust/Split
                                                  </button>
                                                )}
                                              </div>
                                            </td>
                                            {canCurrentUserDeleteData() && (
                                              <td className="py-2.5 px-3 text-center">
                                                <button
                                                  onClick={() => {
                                                    if (window.confirm(`Are you sure you want to delete job card ${plan.jobCardNo}?`)) {
                                                      deleteMachinePlan(plan.id);
                                                    }
                                                  }}
                                                  className="text-slate-350 hover:text-red-500 p-1 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                                  title="Delete Job Card"
                                                >
                                                  <Trash2 className="h-4 w-4" />
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

      {/* MACHINE ROUTING ASSIGN MODAL */}
      {assigningOrderNo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 z-50 overflow-y-auto pt-4 md:pt-10 pb-10">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full">
            <div className="bg-slate-50 border-b border-slate-100 py-3.5 px-6 flex items-center justify-between">
              <h3 className="font-sans font-semibold text-sm text-slate-800">Add Machine Production Plan</h3>
              <button onClick={() => setAssigningOrderNo(null)} className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer">&times;</button>
            </div>

            <form onSubmit={handleSaveAssignment} className="p-6 space-y-4">
              {/* Plan Date */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Plan Start date</label>
                <input
                  type="date"
                  required
                  className="w-full p-2 border border-slate-200 rounded-xl text-sm"
                  value={planDate}
                  onChange={(e) => setPlanDate(e.target.value)}
                />
              </div>

              {/* Machine Selection (Filtered or fallback) */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Select Machine Partner (Dia matching)
                </label>
                {(() => {
                  const ordObj = orders.find(o => o.orderNo === assigningOrderNo);
                  if (!ordObj) return null;
                  const targetDia = parseInt(ordObj.diaGG.split("x")[0].trim(), 10);
                  const matchingMachines = machines.filter(m => m.dia === targetDia);
                  
                  return (
                    <div>
                      <select
                        className="w-full p-2 border border-slate-200 rounded-xl text-sm bg-white"
                        value={selectedMachineNo}
                        onChange={(e) => setSelectedMachineNo(e.target.value)}
                      >
                        {matchingMachines.map((m, idx) => (
                          <option key={idx} value={m.machineNo}>
                            {m.machineNo} ({m.dia}" Dia x {m.gg} GG) - Matched
                          </option>
                        ))}
                        {machines.filter(m => m.dia !== targetDia).map((m, idx) => (
                          <option key={idx} value={m.machineNo} className="text-slate-400">
                            {m.machineNo} ({m.dia}" Dia x {m.gg} GG) - Unmatched Dia
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-400 mt-1">
                        *Filtered first by target fabric dia ({targetDia}"). Highlighted matched ones can prevent stitch density defects.
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* Capacity Assignment */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-500">Plan Quantity (Kg)</label>
                  {(() => {
                    const ordObj = orders.find(o => o.orderNo === assigningOrderNo);
                    if (!ordObj) return null;
                    const bal = ordObj.requiredQty - getPlannedQty(ordObj.orderNo);
                    return <span className="text-xs font-semibold text-indigo-600">Balance: {bal.toLocaleString()} Kg</span>;
                  })()}
                </div>
                <input
                  type="number"
                  required
                  placeholder="Enter Weight allocation"
                  className="w-full p-2 border border-slate-200 rounded-xl text-sm font-semibold text-indigo-700"
                  value={plannedQty}
                  onChange={(e) => setPlannedQty(e.target.value)}
                />
              </div>

              {/* ACTIONS */}
              <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setAssigningOrderNo(null)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE JOB CARD TICKET MODAL */}
      {activeJobCard && activeJobCardOrder && (
        <div id="jobcard_overlay" className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-start justify-center p-4 z-50 overflow-y-auto pt-4 md:pt-10 pb-10">
          <div className="bg-white rounded-2xl border border-slate-300 shadow-2xl max-w-2xl w-full p-6 space-y-6 relative print-invoice-card">
            {/* INSTRUCTIONS & BUTTONS IN THE POPUP MODAL */}
            <div className="sticky top-0 bg-white z-20 -mx-6 px-6 pt-1 pb-4 flex items-center justify-between no-print border-b border-slate-100 shadow-xs mb-4">
              <span className="text-xs font-mono font-semibold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">
                Manufacturing Job Ticket (Print Preview)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={triggerPrintJobCard}
                  className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                >
                  <Printer className="h-4 w-4" /> Print Ticket
                </button>
                <button
                  onClick={() => { setActiveJobCard(null); setActiveJobCardOrder(null); }}
                  className="bg-slate-100 hover:bg-slate-250 text-slate-500 px-4 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* IFRAME PRINT NOTIFICATION (no-print) */}
            {(((window.self !== window.top) && (window.location.hostname.includes("run.app") || window.location.hostname.includes("localhost") || window.location.hostname.includes("127.0.0.1"))) || printError) && (
              <div className="no-print p-4 bg-amber-50/90 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-800 shadow-sm leading-relaxed">
                <span className="text-lg select-none mt-0.5">⚠️</span>
                <div className="space-y-1">
                  <p className="font-semibold text-amber-900">
                    {printError ? "Print Capability Notice" : "Browser Security Restricts Printing inside Editor Sandbox"}
                  </p>
                  <p className="text-amber-700 text-[11px]">
                    {printError ? (
                      <span>{printError}</span>
                    ) : (
                      <span>
                        Your web browser blocks print commands nested inside secure development iframes. To print or save files as PDF, please click <strong>"Open in New Tab" / "Open"</strong> at top right to open the standalone app, then print and select <strong>"Save as PDF"</strong> in your browser's print options.
                      </span>
                    )}
                  </p>
                  {!printError && (
                    <a 
                      href={window.location.href} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex items-center gap-1 font-mono text-[10px] font-bold bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white px-3 py-1.5 rounded-lg shadow-sm transition-colors mt-2 uppercase tracking-wider cursor-pointer"
                    >
                      Open Standalone & Print <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* THE ACTUAL PRINT CARD FORMAT (TARGET OF A4 TICKET) */}
            <div id="jobcard_print_target" className="space-y-6 text-slate-900 font-sans p-2 border border-slate-100 rounded-xl print:border-none print:p-0">
              {/* Header Profile Info */}
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
                  <h2 className="font-sans font-bold text-lg tracking-wider text-slate-800">{companyProfile.name}</h2>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-none mb-1">{companyProfile.tagline}</p>
                  <p className="text-[10px] text-slate-400 leading-tight">{companyProfile.address}</p>
                  <p className="text-[10px] text-slate-400 leading-tight mt-0.5">Contact: {companyProfile.phoneEmail}</p>
                </div>
              </div>

              <hr className="border-slate-250" />

              {/* SCANNABLE BARCODE HEADER BLOCK */}
              <div className="text-center py-4 bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center">
                <p className="font-barcode text-6xl text-black select-none tracking-normal leading-none my-1">
                  *{activeJobCard.jobCardNo.toUpperCase()}*
                </p>
                <p className="text-xs font-bold font-mono tracking-widest text-slate-800 mt-1">
                  {activeJobCard.jobCardNo.toUpperCase()}
                </p>
                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest mt-0.5">Scannable Job ticket barcode (Code-39)</span>
              </div>

              {/* CORE PARAMETERS */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3.5 text-xs text-slate-750">
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Manufacturer / Partner</p>
                  <p className="font-bold text-slate-900 text-sm">{activeJobCardOrder.factoryName}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Assigned Machinery</p>
                  <p className="font-bold text-slate-900 text-sm">Machine No: {activeJobCard.machineNo}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Order Contract No.</p>
                  <p className="font-mono font-semibold text-slate-800">{activeJobCardOrder.orderNo}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Partner Job Reference No.</p>
                  <p className="font-mono font-semibold text-slate-800">{activeJobCardOrder.factoryJobNo}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Contract Reference</p>
                  <p className="font-medium text-slate-800">Order: {activeJobCardOrder.factoryOrder}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Fabric Type / Colors</p>
                  <p className="font-semibold text-slate-850">{activeJobCardOrder.fabricType} ({activeJobCardOrder.color})</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Machinery Specs</p>
                  <p className="font-medium text-slate-800">Dia x Gauge: {activeJobCardOrder.diaGG} | Finish GSM: {activeJobCardOrder.finishGSM} GSM</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Finish Specs</p>
                  <p className="font-medium text-slate-800">Finish Dia Width: {activeJobCardOrder.finishDia ? (activeJobCardOrder.knitType ? `${activeJobCardOrder.finishDia}" ${activeJobCardOrder.knitType}` : `${activeJobCardOrder.finishDia}"`) : "—"}</p>
                </div>
              </div>

              {/* SPECIFIC YARN LINE TABLE */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 font-mono">
                      <th className="py-2 px-3">Yarn Description</th>
                      <th className="py-2 px-3">Lot No</th>
                      <th className="py-2 px-3">Spinner Source</th>
                      <th className="py-2 px-3 text-center">Stitch Length (SL)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {activeJobCardOrder.yarns.filter(y => y.yc).map((y, yIdx) => (
                      <tr key={yIdx}>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{y.yc}</td>
                        <td className="py-2.5 px-3 font-mono">{y.lot}</td>
                        <td className="py-2.5 px-3">{y.spinner}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">{y.sl}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* PROPLANEX PLAN DETAILS CARDS */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50/70 p-4 rounded-xl border border-dashed border-slate-300">
                <div className="text-center py-2.5 bg-white rounded-lg border border-slate-100 shadow-3xs">
                  <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Target Batch Volume Allocation</p>
                  <p className="text-xl font-bold font-mono text-indigo-700 mt-1">{activeJobCard.plannedQty.toLocaleString()} Kg</p>
                </div>
                <div className="text-center py-2.5 bg-white rounded-lg border border-slate-100 shadow-3xs">
                  <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Target Output / Shift Limit</p>
                  <p className="text-sm font-semibold text-slate-800 mt-1.5">350 Kg / Shift</p>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-8 grid grid-cols-3 gap-4 text-center text-[10px] text-slate-500">
                <div className="border-t border-slate-300 pt-1.5">
                  Prepared By : __________________
                </div>
                <div className="border-t border-slate-300 pt-1.5">
                  Approved By : __________________
                </div>
                <div className="border-t border-slate-300 pt-1.5 text-right pr-2">
                  Draft Date: {formatDateDDMMYYYY(activeJobCard.planDate)}
                </div>
              </div>

              {/* Branding tagline footer */}
              {poweredByProfile && (
                <div className="border-t border-slate-200 pt-3 mt-3">
                  {/* Software Generated subtitle notice exactly layout block 2 */}
                  <div className="text-[10px] text-slate-500 font-sans tracking-wide mb-3 uppercase font-semibold text-center italic opacity-95">
                    This is a software generated report.
                  </div>
                  
                  <div className="flex items-center justify-between font-sans text-left">
                    {/* Left Side */}
                    <div className="flex items-center gap-3">
                      {poweredByProfile.logoUrl && (
                        <img 
                          src={poweredByProfile.logoUrl} 
                          alt="Logo" 
                          className="h-12 max-w-[120px] object-contain shrink-0" 
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-bold text-slate-800 tracking-wide uppercase leading-tight">
                          Powered By {poweredByProfile.name || "Proplanex Software"}
                        </p>
                        <p className="text-[9px] text-slate-400 uppercase tracking-widest leading-none font-medium">
                          {poweredByProfile.slogan || "Automated Floor Intelligence & Control Systems"}
                        </p>
                      </div>
                    </div>

                    {/* Right Side */}
                    {poweredByProfile.qrCodeUrl && (
                      <img 
                        src={poweredByProfile.qrCodeUrl} 
                        alt="QR" 
                        className="h-16 w-16 object-contain shrink-0 border border-slate-200 bg-white rounded-lg p-1 shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADJUST & SPLIT MACHINE PLAN MODAL */}
      {adjustingPlan && adjustingOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 z-50 overflow-y-auto pt-4 md:pt-10 pb-10">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 py-4 px-6 flex items-center justify-between">
              <div>
                <h3 className="font-sans font-semibold text-sm text-slate-800">Adjust / Split Job Card</h3>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Card No: {adjustingPlan.jobCardNo} | Order: {adjustingOrder.orderNo}</p>
              </div>
              <button 
                onClick={() => { setAdjustingPlan(null); setAdjustingOrder(null); }} 
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* TAB SELECTION */}
            <div className="flex border-b border-slate-100 bg-slate-50/50 p-1 m-4 rounded-xl">
              <button
                type="button"
                onClick={() => setAdjustMethod("edit")}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  adjustMethod === "edit"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                1. Change Machine / Quantity
              </button>
              <button
                type="button"
                onClick={() => setAdjustMethod("split")}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  adjustMethod === "split"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                2. Divide & Split Job Card
              </button>
            </div>

            <form onSubmit={handleSaveAdjustmentSubmit} className="px-6 pb-6 space-y-4">
              {adjustMethod === "edit" ? (
                <>
                  <div className="p-3.5 bg-sky-50/60 rounded-xl border border-sky-100/50 text-xs text-sky-800 space-y-1">
                    <p className="font-semibold">Modify Existing Job Card</p>
                    <p className="opacity-90">Change the machine partner or re-allocate planned capacity for this specific job card ticket.</p>
                  </div>

                  {/* Machine selection */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Target Knitting Machine
                    </label>
                    {(() => {
                      const targetDia = parseInt(adjustingOrder.diaGG.split("x")[0].trim(), 10);
                      const matchingMachines = machines.filter(m => m.dia === targetDia);
                      
                      return (
                        <select
                          className="w-full p-2 border border-slate-200 rounded-xl text-sm bg-white"
                          value={adjustMachineNo}
                          onChange={(e) => setAdjustMachineNo(e.target.value)}
                        >
                          {matchingMachines.map((m, idx) => (
                            <option key={idx} value={m.machineNo}>
                              {m.machineNo} ({m.dia}" Dia x {m.gg} GG) - Matched
                            </option>
                          ))}
                          {machines.filter(m => m.dia !== targetDia).map((m, idx) => (
                            <option key={idx} value={m.machineNo} className="text-slate-400">
                              {m.machineNo} ({m.dia}" Dia x {m.gg} GG) - Unmatched
                            </option>
                          ))}
                        </select>
                      );
                    })()}
                  </div>

                  {/* Quantity adjustment */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="block text-xs font-medium text-slate-500">Planned Quantity (Kg)</label>
                      <span className="text-xs font-semibold text-indigo-600">
                        Max Allowed: {getMaxAllowedQty(adjustingPlan, adjustingOrder).toLocaleString()} Kg
                      </span>
                    </div>
                    <input
                      type="number"
                      required
                      className="w-full p-2 border border-slate-200 rounded-xl text-sm font-semibold"
                      value={adjustQty}
                      onChange={(e) => setAdjustQty(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-100/50 text-xs text-amber-800 space-y-1">
                    <p className="font-semibold">Divide & Slice Job Card Capacity</p>
                    <p className="opacity-90">
                      Splits the current job card ({adjustingPlan.plannedQty} Kg) into 2. E.g. divide to original machine ({adjustingPlan.machineNo}) & another target machine.
                    </p>
                  </div>

                  {/* Split distribution balanced inputs */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11.5px] font-medium text-slate-500 mb-1">
                        Original Card ({adjustingPlan.machineNo}) Keep (Kg)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          required
                          className="w-full p-2 pr-9 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                          value={splitKeepQty}
                          onChange={(e) => handleSplitKeepChange(e.target.value)}
                        />
                        <span className="absolute right-3 top-2 text-xs text-slate-400 font-mono">Kg</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11.5px] font-medium text-slate-500 mb-1">
                        Split-off Card Send (Kg)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          required
                          className="w-full p-2 pr-9 border border-slate-300 rounded-xl text-sm font-semibold text-indigo-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          value={splitGiveQty}
                          onChange={(e) => handleSplitGiveChange(e.target.value)}
                        />
                        <span className="absolute right-3 top-2 text-xs text-indigo-400 font-mono">Kg</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress visualization */}
                  <div className="relative h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                    {(() => {
                      const keep = Number(splitKeepQty) || 0;
                      const give = Number(splitGiveQty) || 0;
                      const tot = adjustingPlan.plannedQty;
                      const keepPct = Math.min(100, Math.max(0, (keep / tot) * 100));
                      const givePct = Math.min(100, Math.max(0, (give / tot) * 100));
                      return (
                        <>
                          <div style={{ width: `${keepPct}%` }} className="bg-amber-400 transition-all" />
                          <div style={{ width: `${givePct}%` }} className="bg-indigo-600 transition-all" />
                        </>
                      );
                    })()}
                  </div>

                  {/* Target Machine Selection for split-off */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Route Split-off Capacity to Machine No:
                    </label>
                    {(() => {
                      const targetDia = parseInt(adjustingOrder.diaGG.split("x")[0].trim(), 10);
                      const matchingMachines = machines.filter(m => m.dia === targetDia && m.machineNo !== adjustingPlan.machineNo);
                      
                      return (
                        <select
                          className="w-full p-2 border border-slate-200 rounded-xl text-sm bg-white"
                          value={splitTargetMachineNo}
                          onChange={(e) => setSplitTargetMachineNo(e.target.value)}
                          required
                        >
                          <option value="">-- Choose Target Machine --</option>
                          {matchingMachines.map((m, idx) => (
                            <option key={idx} value={m.machineNo}>
                              {m.machineNo} ({m.dia}" Dia x {m.gg} GG) - Matched Partner
                            </option>
                          ))}
                          {machines.filter(m => m.dia !== targetDia || m.machineNo === adjustingPlan.machineNo).map((m, idx) => (
                            <option key={idx} value={m.machineNo} className="text-slate-400">
                              {m.machineNo} ({m.dia}" Dia x {m.gg} GG) - Unmatched/Self
                            </option>
                          ))}
                        </select>
                      );
                    })()}
                  </div>
                </>
              )}

              {/* ACTIONS */}
              <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => { setAdjustingPlan(null); setAdjustingOrder(null); }}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Confirm & Apply Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

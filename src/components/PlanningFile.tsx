import React, { useState } from "react";
import { useAppState } from "../context/AppContext";
import { Order, MachinePlan } from "../types";
import { Search, Plus, Calendar, Settings, Printer, Scissors, HelpCircle, ChevronRight, CheckCircle } from "lucide-react";

export default function PlanningFile() {
  const { 
    orders, machinePlans, addMachinePlan, getPlannedQty, machines, companyProfile 
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
    setActiveJobCard(plan);
    setActiveJobCardOrder(order);
  };

  const triggerPrintJobCard = () => {
    window.print();
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
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-mono uppercase tracking-wider">
                <th className="py-4 px-4 w-12 text-center"></th>
                <th className="py-4 px-3" colSpan={2}>Order & Job details</th>
                <th className="py-4 px-3">Fabric Architecture</th>
                <th className="py-4 px-3">Dia x GG</th>
                <th className="py-4 px-3 text-right">Required (Kg)</th>
                <th className="py-4 px-3 text-right">Planned (Kg)</th>
                <th className="py-4 px-3 text-right">Plan Balance (Kg)</th>
                <th className="py-4 px-3 text-center">Action</th>
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
                          {planBalance > 0 ? (
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

                              {/* Machine Routing Table */}
                              <div>
                                <p className="text-xs font-semibold text-slate-500 font-mono uppercase tracking-wider mb-2">Shop Floor Machine Assignments</p>
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
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 font-mono">
                                        {orderPlans.map((plan) => (
                                          <tr key={plan.id} className="hover:bg-slate-50/50">
                                            <td className="py-2.5 px-3 text-slate-500">{plan.planDate}</td>
                                            <td className="py-2.5 px-3 font-semibold text-slate-800">{plan.machineNo}</td>
                                            <td className="py-2.5 px-3 text-right font-semibold text-slate-950">{plan.plannedQty.toLocaleString()} Kg</td>
                                            <td className="py-2.5 px-3 font-bold text-sky-800">{plan.jobCardNo}</td>
                                            <td className="py-2 px-3 text-center">
                                              <button
                                                onClick={() => handleViewJobCard(plan, order)}
                                                className="bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 px-3 py-1 rounded text-[11px] font-semibold flex items-center gap-1 mx-auto cursor-pointer"
                                              >
                                                <Printer className="h-3.5 w-3.5" /> View Ticket
                                              </button>
                                            </td>
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
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer"
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

            {/* THE ACTUAL PRINT CARD FORMAT (TARGET OF A4 TICKET) */}
            <div id="jobcard_print_target" className="space-y-6 text-slate-900 font-sans p-2 border border-slate-100 rounded-xl print:border-none print:p-0">
              {/* Header Profile Info */}
              <div className="text-center space-y-1">
                <h2 className="font-sans font-bold text-lg tracking-wider text-slate-800">{companyProfile.name}</h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">{companyProfile.tagline}</p>
                <p className="text-[10px] text-slate-400">{companyProfile.address}</p>
                <p className="text-[10px] text-slate-400">Contact: {companyProfile.phoneEmail}</p>
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
                  <p className="font-medium text-slate-800">Finish Dia Width: {activeJobCardOrder.finishDia} Inches </p>
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
                  Draft Date: {activeJobCard.planDate}
                </div>
              </div>

              {/* Branding tagline footer */}
              <div className="border-t border-slate-200 pt-3 text-center">
                <p className="text-[10px] font-sans font-bold text-sky-800 tracking-wider">POWERED BY PROPLANEX </p>
                <p className="text-[8px] text-slate-400 uppercase tracking-widest mt-0.5">Precious Planning ● Synchronized Production ● Next Gen Intelligence</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

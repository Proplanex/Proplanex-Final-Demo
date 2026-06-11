import React, { useState, useEffect } from "react";
import { useAppState } from "../context/AppContext";
import { BillRecord, BillItem, DeliveryChallan, Order } from "../types";
import { Plus, Search, FileDown, Printer, DollarSign, Receipt, BarChart3, HelpCircle, ExternalLink, Trash2 } from "lucide-react";
import { downloadTableAsExcel, numberToWords } from "../utils/helpers";
import { formatDateDDMMYYYY } from "./DeliveryModule";

interface BillingSectionProps {
  readOnly?: boolean;
}

export default function BillingSection({ readOnly = false }: BillingSectionProps) {
  const { 
    orders, deliveryChallans, billRecords, addBillRecord, factories, companyProfile, poweredByProfile, deleteBillRecord, canCurrentUserDeleteData 
  } = useAppState();

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedFactory, setSelectedFactory] = useState("");
  
  // Choice of up to 3 pending Delivery Challans
  const [selectedChallanNos, setSelectedChallanNos] = useState<string[]>([""]);

  // Print view state
  const [activePrintBill, setActivePrintBill] = useState<BillRecord | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);

  const triggerPrintBill = () => {
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

  const handleFactoryChange = (name: string) => {
    setSelectedFactory(name);
    setSelectedChallanNos([""]); // Reset selected invoices
  };

  // Check which deliveries have pending bill status
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

  // Get only pending grey fabric challans for selected factory
  const getPendingChallans = (): DeliveryChallan[] => {
    return deliveryChallans.filter(ch => {
      if (ch.factoryName !== selectedFactory) return false;
      if (ch.type !== "Grey Fabric Delivery") return false; // Yarn returns don't bill

      // Check if some items are still unbilled
      let hasUnbilled = false;
      ch.greyItems?.forEach(item => {
        const billed = getBilledQtyOnChallan(ch.challanNo, item.orderNo);
        if (item.qty - billed > 0) {
          hasUnbilled = true;
        }
      });
      return hasUnbilled;
    });
  };

  const handleAddChallanSelector = () => {
    if (selectedChallanNos.length >= 3) return;
    setSelectedChallanNos(prev => [...prev, ""]);
  };

  const handleRemoveChallanSelector = (index: number) => {
    setSelectedChallanNos(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleChallanSelectChange = (index: number, val: string) => {
    setSelectedChallanNos(prev => prev.map((no, idx) => {
      if (idx === index) return val;
      return no;
    }));
  };

  // Live bill items compiler for form preview
  const compileActiveBillItems = (): BillItem[] => {
    const items: BillItem[] = [];
    const chosenNos = selectedChallanNos.filter(Boolean);

    chosenNos.forEach(chNo => {
      const ch = deliveryChallans.find(c => c.challanNo === chNo);
      if (ch && ch.greyItems) {
        ch.greyItems.forEach(item => {
          const ord = orders.find(o => o.orderNo === item.orderNo);
          const rate = ord?.rate || 0;
          const billed = getBilledQtyOnChallan(chNo, item.orderNo);
          const outstanding = item.qty - billed;

          if (outstanding > 0) {
            items.push({
              challanNo: chNo,
              orderNo: item.orderNo,
              factoryOrder: ord?.factoryOrder || "N/A",
              factoryJobNo: ord?.factoryJobNo || "N/A",
              fabricType: ord?.fabricType || "N/A",
              qty: outstanding,
              rate: rate,
              amount: outstanding * rate
            });
          }
        });
      }
    });

    return items;
  };

  const handleSaveBill = (e: React.FormEvent) => {
    e.preventDefault();
    const items = compileActiveBillItems();
    if (items.length === 0) {
      alert("Please choose at least one valid pending dispatch challan.");
      return;
    }

    let maxNum = 0;
    billRecords.forEach(br => {
      const num = parseInt(br.id.replace("INV-", ""), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    });
    const nextBillNo = "INV-" + String(maxNum + 1).padStart(4, "0");
    const today = new Date().toISOString().split("T")[0];

    const totalBillAmt = items.reduce((sum, item) => sum + item.amount, 0);

    addBillRecord({
      id: nextBillNo,
      date: today,
      factoryName: selectedFactory,
      items,
      totalAmount: totalBillAmt,
      takaInWords: numberToWords(totalBillAmt)
    });

    setSelectedChallanNos([""]);
    setShowAddModal(false);
  };

  // CALCULATE KPI METRIC STATISTICS
  // Pending Bills: Count deliveries still unbilled & sum of their remaining unbilled fabric quantities
  let pendingDeliveriesCount = 0;
  let pendingDeliveriesWeight = 0;

  deliveryChallans.forEach(ch => {
    if (ch.type === "Grey Fabric Delivery" && ch.greyItems) {
      let isChallanPending = false;
      ch.greyItems.forEach(item => {
        const billed = getBilledQtyOnChallan(ch.challanNo, item.orderNo);
        const outstanding = item.qty - billed;
        if (outstanding > 0) {
          pendingDeliveriesWeight += outstanding;
          isChallanPending = true;
        }
      });
      if (isChallanPending) {
        pendingDeliveriesCount++;
      }
    }
  });

  // Billed counts
  const totalBilledSummaryBDT = billRecords.reduce((sum, br) => sum + br.totalAmount, 0);
  const billedDeliveriesCount = billRecords.length;

  const handleExportBillingLedgerExcel = () => {
    if (billRecords.length === 0) {
      alert("No invoices to export.");
      return;
    }

    // Compile flatten rows
    const data = billRecords.flatMap((br, brIdx) => {
      return br.items.map((item, itemIdx) => ({
        "Invoice No": br.id,
        "Billing Date": br.date,
        "Partner Factory": br.factoryName,
        "Challan Ref": item.challanNo,
        "W/Order No": item.orderNo,
        "Factory Order Ref": item.factoryOrder,
        "Fabric Job No": item.factoryJobNo,
        "Fabric Description": item.fabricType,
        "Invoiced Weight (Kg)": item.qty,
        "Unit Rate (BDT/Kg)": item.rate,
        "Subtotal Charge (BDT)": item.amount,
        "Total Bill Amount (BDT)": itemIdx === 0 ? br.totalAmount : ""
      }));
    });

    downloadTableAsExcel(data, `PROPLANEX_Billing_Ledger_${new Date().toISOString().split("T")[0]}`);
  };

  return (
    <div className="space-y-6">
      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Pending Bills */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">Pending Billable Fabrics</p>
            <p className="text-2xl font-semibold text-amber-600 mt-2">
              {pendingDeliveriesWeight.toLocaleString()} <span className="text-sm font-normal text-slate-500">Kg</span>
            </p>
            <div className="mt-1 text-[11px] text-slate-450">
              Across <span className="font-bold">{pendingDeliveriesCount}</span> pending mill deliveries
            </div>
          </div>
          <div className="bg-amber-50 p-3 rounded-xl text-amber-600">
            <Receipt className="h-6 w-6" />
          </div>
        </div>

        {/* Billed Deliveries */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">Invoices issued</p>
            <p className="text-2xl font-semibold text-emerald-600 mt-2">
              {billedDeliveriesCount} <span className="text-sm font-normal text-slate-500">Certificates</span>
            </p>
            <div className="mt-1 text-[11px] text-slate-450">
              Accounts cleared to date
            </div>
          </div>
          <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600">
            <BarChart3 className="h-6 w-6" />
          </div>
        </div>

        {/* Total Billed Summary */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">Total Invoice Turnover</p>
            <p className="text-2xl font-semibold text-indigo-700 mt-2 font-mono">
              ৳ {totalBilledSummaryBDT.toLocaleString()}
            </p>
            <div className="mt-1 text-[11px] text-slate-450 text-indigo-650 font-semibold font-mono">
              Invoiced turnover in BDT
            </div>
          </div>
          <div className="bg-indigo-50 p-3 rounded-xl text-indigo-650 font-bold overflow-hidden text-sm">
            ৳ BDT
          </div>
        </div>
      </div>

      {/* FILTER & INVOICING TRIGGER */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div>
          <h3 className="font-sans font-semibold text-slate-800 text-sm">Fabric Commercial Billing Ledger</h3>
          <p className="text-xs text-slate-400">Generate commercial billing challans grouping multiple dispatches securely.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handleExportBillingLedgerExcel}
            className="flex-1 sm:flex-none border border-slate-200 hover:bg-slate-50 text-slate-650 font-semibold text-xs px-4 py-2 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-colors"
          >
            <FileDown className="h-4 w-4" /> Export Ledger
          </button>
          {!readOnly && (
            <button
              onClick={() => setShowAddModal(true)}
              disabled={factories.length === 0}
              className="flex-1 sm:flex-none bg-sky-600 hover:bg-sky-700 text-white font-medium text-xs px-5 py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="h-4 w-4" /> Issue Invoice Bill
            </button>
          )}
        </div>
      </div>

      {/* BILLING RECORD LEDGER TABLE */}
      <div className="bg-white border border-slate-150 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs text-slate-750">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-3">Billing Date</th>
                <th className="py-3 px-3">Factory Partner Name</th>
                <th className="py-3 px-3">Aggregated Challans</th>
                <th className="py-3 px-3">Items description list</th>
                <th className="py-3 px-3 text-right">Invoiced weight</th>
                <th className="py-3 px-4 text-right">Invoiced Amount (BDT)</th>
                <th className="py-3 px-3 text-center">Ticket</th>
                {canCurrentUserDeleteData() && <th className="py-3 px-3 text-center w-12">Delete</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {billRecords.length === 0 ? (
                <tr className="font-sans">
                  <td colSpan={canCurrentUserDeleteData() ? 9 : 8} className="py-12 text-center text-slate-400">
                    No billing transactions recorded yet. Choose "Issue Invoice Bill" above.
                  </td>
                </tr>
              ) : (
                billRecords.map((bill, bidx) => {
                  const uniqueChallanNos = Array.from(new Set(bill.items.map(i => i.challanNo)));
                  const totalWeight = bill.items.reduce((sum, i) => sum + i.qty, 0);

                  return (
                    <tr key={bill.id || bidx} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 font-bold text-indigo-750">{bill.id}</td>
                      <td className="py-3.5 px-3 text-slate-500">{formatDateDDMMYYYY(bill.date)}</td>
                      <td className="py-3.5 px-3 font-medium font-sans text-slate-800">{bill.factoryName}</td>
                      <td className="py-3.5 px-3 max-w-[120px] truncate" title={uniqueChallanNos.join(", ")}>
                        {uniqueChallanNos.map(no => (
                          <span key={no} className="inline-block px-1.5 py-0.5 text-[10px] text-sky-800 bg-sky-50 rounded border border-sky-100 font-semibold mr-1 mb-1">
                            {no}
                          </span>
                        ))}
                      </td>
                      <td className="py-3.5 px-3 max-w-[180px] truncate" title={bill.items.map(i => `${i.orderNo} (${i.qty}Kg)`).join(", ")}>
                        <span className="font-sans text-[11px] text-slate-500">
                          {bill.items.length} segments invoiced
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-slate-900">{totalWeight.toLocaleString()} Kg</td>
                      <td className="py-3.5 px-4 text-right font-bold text-indigo-700 text-sm">৳ {bill.totalAmount.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => {
                            setPrintError(null);
                            setActivePrintBill(bill);
                          }}
                          className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1 rounded font-bold text-[11px] hover:bg-indigo-100 cursor-pointer inline-flex items-center gap-1"
                        >
                          <Printer className="h-3 w-3" /> Invoice
                        </button>
                      </td>
                      {canCurrentUserDeleteData() && (
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete invoice ${bill.id}? This will restore the bill balance for its associated delivery challans.`)) {
                                deleteBillRecord(bill.id);
                              }
                            }}
                            className="text-slate-300 hover:text-red-500 hover:bg-slate-50 p-1.5 rounded transition-colors cursor-pointer inline-flex items-center"
                            title="Delete Invoice"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

      {/* BILL CHALLAN SAVING POPUP DIALOG */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 z-50 overflow-y-auto pt-4 md:pt-10 pb-10">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-y-auto">
            <div className="bg-slate-50 border-b border-slate-100 py-3.5 px-6 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="font-sans font-semibold text-sm text-slate-800">Generate Commercial Bill Challan</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer">&times;</button>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT FORM SELECTOR COLUMNS (7/12) */}
              <form onSubmit={handleSaveBill} className="col-span-1 lg:col-span-7 space-y-4 border-b lg:border-b-0 lg:border-r border-slate-150 pb-6 lg:pb-0 lg:pr-6 text-xs">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Select Factory Partner</label>
                  <select
                    className="w-full p-2 border border-slate-200 rounded-xl text-xs bg-white font-medium"
                    value={selectedFactory}
                    onChange={(e) => handleFactoryChange(e.target.value)}
                  >
                    {factories.map((f, i) => (
                      <option key={i} value={f.name}>{f.name}</option>
                    ))}
                  </select>
                </div>

                {/* up to 3 Delivery Challans */}
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="font-mono font-semibold text-slate-700">Consolidate Challans (Max 3)</span>
                    {selectedChallanNos.length < 3 && (
                      <button
                        type="button"
                        onClick={handleAddChallanSelector}
                        className="bg-indigo-650 hover:bg-indigo-750 text-white rounded p-1 text-xs font-bold w-6 h-6 flex items-center justify-center cursor-pointer"
                      >
                        +
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {selectedChallanNos.map((challanNo, idx) => {
                      const avail = getPendingChallans();
                      return (
                        <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="font-mono font-bold text-[10px] text-indigo-600">Idx {idx+1}</span>
                          <select
                            className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-xs"
                            value={challanNo}
                            onChange={(e) => handleChallanSelectChange(idx, e.target.value)}
                          >
                            <option value="">-- Choose Pending Challan --</option>
                            {avail.map(ch => (
                              <option key={ch.challanNo} value={ch.challanNo}>
                                {ch.challanNo} (Dated: {formatDateDDMMYYYY(ch.date)}) - {ch.greyItems?.length} items
                              </option>
                            ))}
                          </select>
                          {selectedChallanNos.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveChallanSelector(idx)}
                              className="text-red-500 hover:text-red-700 cursor-pointer"
                            >
                              &times;
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Compile Items summary feedback in form */}
                {compileActiveBillItems().length > 0 && (
                  <div className="border border-slate-150 rounded-xl overflow-hidden shadow-3xs bg-white text-[11px]">
                    <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 font-mono text-slate-500">Bill Breakdown Ledger</div>
                    <div className="p-3 divide-y divide-slate-100">
                      {compileActiveBillItems().map((item, idx) => (
                        <div key={idx} className="py-2.5 flex justify-between gap-4 font-mono">
                          <div>
                            <span className="font-bold text-indigo-750 block">{item.orderNo} (Challan: {item.challanNo})</span>
                            <span className="text-slate-400 font-sans">{item.fabricType}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-slate-800 block">{item.qty} Kg @ ৳{item.rate}</span>
                            <span className="font-semibold text-indigo-700">৳{item.amount.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-slate-100 pt-4 flex gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-650 py-2.5 rounded-xl font-semibold cursor-pointer"
                  >
                    Cancel Billing
                  </button>
                  <button
                    type="submit"
                    disabled={compileActiveBillItems().length === 0}
                    className="flex-1 bg-sky-600 hover:bg-sky-700 text-white py-2.5 rounded-xl font-semibold cursor-pointer disabled:opacity-40"
                  >
                    Confirm Invoice Saving
                  </button>
                </div>
              </form>

              {/* RIGHT LIVE INVOICE PREVIEW (5/12) */}
              <div className="col-span-1 lg:col-span-12 lg:col-span-5 bg-slate-100/60 p-4 rounded-2xl border border-slate-200 max-h-[70vh] overflow-y-auto space-y-4">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono font-bold block">Live Commercial Invoice Preview</span>

                {(() => {
                  const activeItems = compileActiveBillItems();
                  const totalBillAmt = activeItems.reduce((sum, item) => sum + item.amount, 0);

                  return (
                    <div className="bg-white p-5 rounded-xl border border-slate-250 shadow-sm space-y-4 text-slate-900 text-[10px] font-sans h-full">
                      {/* Brand Info */}
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
                          <h4 className="font-bold text-slate-800 text-xs leading-snug">{companyProfile.name}</h4>
                          <p className="text-[7px] text-slate-400 uppercase tracking-widest leading-none mb-1">{companyProfile.tagline}</p>
                          <p className="text-[7px] text-slate-450 leading-tight">{companyProfile.address}</p>
                          <p className="text-[7px] text-slate-450 leading-tight">{companyProfile.phoneEmail}</p>
                        </div>
                      </div>

                      <p className="text-right text-[8px] font-mono">Date: {new Date().toISOString().split("T")[0]}</p>

                      <div className="border-b border-slate-100 pb-2 text-[9px]">
                        <p><span className="text-slate-400">Bill Partner To:</span> <strong>{selectedFactory}</strong></p>
                        <p className="text-[8px] text-slate-400 mt-0.5 font-sans">
                          {factories.find(f => f.name === selectedFactory)?.address || "N/A Address"}
                        </p>
                      </div>

                      <h4 className="text-center font-bold text-[10px] tracking-widest underline uppercase text-slate-800">BILL CHALLAN INVOICE</h4>

                      {/* ITEMS */}
                      <table className="w-full text-left text-[8px] border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-500 font-mono border-b border-slate-200">
                            <th className="py-1 px-1">Challan / Order</th>
                            <th className="py-1 px-1 text-center">Qty (Kg)</th>
                            <th className="py-1 px-1 text-center">Rate</th>
                            <th className="py-1 px-1 text-right">Subtotal (BDT)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {activeItems.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-4 text-center text-slate-350 italic">
                                Choose pending dispatches to populate billing lines.
                              </td>
                            </tr>
                          ) : (
                            activeItems.map((item, idx) => (
                              <tr key={idx} className="font-mono">
                                <td className="py-1 px-1">
                                  <strong>{item.challanNo}</strong> | {item.orderNo}
                                </td>
                                <td className="py-1 px-1 text-center font-bold">{item.qty} Kg</td>
                                <td className="py-1 px-1 text-center font-bold">৳{item.rate}</td>
                                <td className="py-1 px-1 text-right font-bold">৳{item.amount.toLocaleString()}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>

                      {/* Turnover BDT */}
                      <div className="pt-2 border-t border-slate-200 text-right">
                        <strong>Total Amount (BDT): </strong>
                        <span className="font-mono font-bold bg-slate-900 text-white px-2 py-0.5 rounded text-[11px]">
                          ৳{totalBillAmt.toLocaleString()}
                        </span>
                      </div>

                      {totalBillAmt > 0 && (
                        <p className="text-[8px] leading-relaxed p-1.5 bg-slate-50 border rounded text-slate-500 font-mono">
                          <strong>Taka in Words: </strong> {numberToWords(totalBillAmt)}
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INDEPENDENT PRINTABLE INVOICE BILL TICKET A4 OVERLAY */}
      {activePrintBill && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-start justify-center p-4 z-50 overflow-y-auto pt-4 md:pt-10 pb-10">
          <div className="bg-white rounded-2xl border border-slate-300 shadow-2xl max-w-3xl w-full p-6 space-y-6 relative print-invoice-card">
            <div className="sticky top-0 bg-white z-20 -mx-6 px-6 pt-1 pb-4 flex items-center justify-between no-print border-b border-slate-100 shadow-xs mb-4">
              <span className="text-xs font-mono font-semibold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">
                Invoice {activePrintBill.id} (Print Preview)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={triggerPrintBill}
                  className="bg-red-650 hover:bg-red-750 text-white px-4 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                >
                  <FileDown className="h-4 w-4" /> Download PDF
                </button>
                <button
                  onClick={triggerPrintBill}
                  className="bg-indigo-650 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="h-4 w-4" /> Print Bill
                </button>
                <button
                  onClick={() => setActivePrintBill(null)}
                  className="bg-slate-100 hover:bg-slate-250 text-slate-500 px-4 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Close Invoice
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
                    To save files as vector PDF perfectly, please click <strong>"Download PDF"</strong> and select <strong>"Save as PDF"</strong> as your printer destination. If blockages persist, open in a standalone tab:
                  </p>
                  <a 
                    href={window.location.href} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center gap-1 font-mono text-[10px] font-bold bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white px-3 py-1.5 rounded-lg shadow-sm transition-colors mt-2 uppercase tracking-wider cursor-pointer"
                  >
                    Open Standalone & Save PDF <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}

            {/* A4 TARGET LAYOUT FOR COMMERCIAL BILLS */}
            <div className="space-y-6 text-slate-900 font-sans p-2 border border-slate-150 rounded-xl print:border-none print:p-0">
              {/* BRAND HEADER */}
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

              {/* METADATA GRID */}
              <div className="flex justify-between text-xs text-slate-650 border-t border-b border-slate-150 py-3 mt-4">
                <div className="space-y-1">
                  <p><span className="text-slate-400 block mb-0.5">INVOICE PREPARED TO / DEBTOR:</span> <strong className="text-slate-900 text-sm">{activePrintBill.factoryName}</strong></p>
                  <p className="text-[10px] max-w-xs">{factories.find(f => f.name === activePrintBill.factoryName)?.address || "N/A Address"}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p>Invoice Bill ID: <strong className="text-indigo-800 font-mono text-sm">{activePrintBill.id}</strong></p>
                  <p>Date of Issue: <strong className="text-slate-800">{formatDateDDMMYYYY(activePrintBill.date)}</strong></p>
                  <p>Payment Status: <strong className="text-emerald-700 font-bold font-mono">DUE ON RECEIPT</strong></p>
                </div>
              </div>

              <h4 className="text-center font-bold text-xs uppercase tracking-widest text-slate-800 py-1 underline">
                COMMERCIAL BILL CHALLAN INVOICE
              </h4>

              {/* ITEMS INVOICED GRID TABLE */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 font-mono">
                      <th className="py-2.5 px-3 w-10">SL</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Challan Ref</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">W/Order Ref</th>
                      <th className="py-2.5 px-3">Fabric Architecture Description</th>
                      <th className="py-2.5 px-3 text-center">Billed Capacity</th>
                      <th className="py-2.5 px-3 text-center">Rate</th>
                      <th className="py-2.5 px-3 text-right">Invoice Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 font-mono text-[11px]">
                    {activePrintBill.items.map((item, yidx) => (
                      <tr key={yidx}>
                        <td className="py-3 px-3">{yidx + 1}</td>
                        <td className="py-3 px-3 font-bold text-sky-850">{item.challanNo}</td>
                        <td className="py-3 px-3">{item.orderNo}</td>
                        <td className="py-3 px-3">
                          <span className="font-sans font-semibold text-slate-800 block text-xs">{item.fabricType}</span>
                          <span className="text-slate-450 text-[10px]">Order Ref: {item.factoryOrder} | Job No: {item.factoryJobNo}</span>
                        </td>
                        <td className="py-3 px-3 text-center text-slate-900 font-bold">{item.qty.toLocaleString()} Kg</td>
                        <td className="py-3 px-3 text-center">৳ {item.rate}</td>
                        <td className="py-3 px-3 text-right font-bold text-slate-950">৳ {item.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total block */}
              <div className="text-right border-t border-slate-200 pt-3 text-heading">
                <span className="text-xs font-mono uppercase text-slate-550 mr-2">Grand Total Bill amount (BDT):</span>
                <span className="text-sm font-bold font-mono bg-slate-900 text-white rounded px-2.5 py-1">
                  ৳ {activePrintBill.totalAmount.toLocaleString()} BDT
                </span>
              </div>

              {/* Legal Taka in words converter display */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">Taka in Words certified translation</span>
                <p className="font-bold font-mono text-slate-800 text-xs capitalize leading-relaxed">
                  ৳ {activePrintBill.takaInWords}
                </p>
              </div>

              <p className="text-[10px] leading-relaxed text-slate-500 pt-3 border-t border-dashed border-slate-200">
                NB: All textile knit processing values are computed and invoiced after thorough quality audit verification. Kindly clear balances within statutory prompt windows.
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

              {/* Footer Powered tagline */}
              {poweredByProfile && (
                <div className="border-t border-slate-150 pt-3 mt-3">
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
    </div>
  );
}

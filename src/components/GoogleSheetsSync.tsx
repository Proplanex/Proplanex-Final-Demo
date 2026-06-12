import React, { useState, useEffect } from "react";
import { useAppState } from "../context/AppContext";
import { initAuth, googleSignIn, logoutGoogle, getAccessToken } from "../utils/firebaseAuth";
import { createAndPopulateSpreadsheet, SyncResult } from "../utils/googleSheetsService";
import { 
  FileSpreadsheet, Loader2, Sparkles, LogOut, CheckCircle2, 
  AlertCircle, ExternalLink, HelpCircle, ArrowUpRight,
  Copy, Check, Info, Settings, ShieldAlert, Monitor, UserCheck
} from "lucide-react";
import { User } from "firebase/auth";

export default function GoogleSheetsSync() {
  const state = useAppState();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [syncHistory, setSyncHistory] = useState<Array<{ spreadsheetId: string; spreadsheetUrl: string; title: string; timestamp: string }>>([]);

  // Sync mode choices: "webhook" (best for shared PC) or "oauth" (direct manual login)
  const [syncMode, setSyncMode] = useState<"webhook" | "oauth">("webhook");

  const webhookUrl = state.sheetsWebhookUrl;
  const setWebhookUrl = state.updateSheetsWebhookUrl;

  const [copiedScript, setCopiedScript] = useState(false);
  const [showTutor, setShowTutor] = useState(false);

  // Load from localStorage on mount and initialize Firebase state
  useEffect(() => {
    const saved = localStorage.getItem("proplaex_google_sheets_history");
    if (saved) {
      try {
        setSyncHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse sync history", e);
      }
    }

    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setAccessToken(token);
        setIsInitializing(false);
      },
      () => {
        setCurrentUser(null);
        setAccessToken(null);
        setIsInitializing(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setErrorMsg(null);
    setSyncResult(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setAccessToken(res.accessToken);
      }
    } catch (err: any) {
      console.error("Sign-in failed:", err);
      setErrorMsg(err?.message || "Google Authentication failed. Please try again.");
    }
  };

  const handleLogout = async () => {
    try {
      await logoutGoogle();
      setCurrentUser(null);
      setAccessToken(null);
      setSyncResult(null);
    } catch (err: any) {
      console.error("Logout failed:", err);
    }
  };

  const handleSaveWebhook = (url: string) => {
    const cleanUrl = url.trim();
    setWebhookUrl(cleanUrl);
  };

  // Regular direct sync using User's Google Token
  const handleSyncDatabase = async () => {
    const token = accessToken || (await getAccessToken());
    if (!token) {
      setErrorMsg("Unauthorized. Please sign in with Google first before starting sync.");
      return;
    }

    setIsSyncing(true);
    setErrorMsg(null);
    setSyncResult(null);

    const titlePrefix = "Proplaex ERP Master Database";
    const dateStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const sheetTitle = `${titlePrefix} - Sync ${dateStr}`;

    try {
      const syncParams = {
        orders: state.orders,
        yarnTransactions: state.yarnTransactions,
        machinePlans: state.machinePlans,
        productionLogs: state.productionLogs,
        deliveryChallans: state.deliveryChallans,
        billRecords: state.billRecords,
        machines: state.machines,
        factories: state.factories,
        machineStatusMap: state.machineStatusMap,
        users: state.users,
      };

      const result = await createAndPopulateSpreadsheet(
        token,
        syncParams,
        titlePrefix
      );
      
      setSyncResult(result);

      // Save to localStorage history list
      const newSyncRecord = {
        spreadsheetId: result.spreadsheetId,
        spreadsheetUrl: result.spreadsheetUrl,
        title: sheetTitle,
        timestamp: new Date().toISOString()
      };
      const updatedHistory = [newSyncRecord, ...syncHistory];
      setSyncHistory(updatedHistory);
      localStorage.setItem("proplaex_google_sheets_history", JSON.stringify(updatedHistory));
    } catch (err: any) {
      console.error("Sync to google sheets failed:", err);
      setErrorMsg(err?.message || "Critical error exporting data to Google Sheets.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Google Apps Script Web App Webhook Sync (Perfect for shared public PCs)
  const handleWebhookSync = async () => {
    if (!webhookUrl || !webhookUrl.startsWith("https://script.google.com/")) {
      setErrorMsg("Please enter a valid Google Apps Script Web App URL first.");
      return;
    }

    setIsSyncing(true);
    setErrorMsg(null);
    setSyncResult(null);

    const titlePrefix = "Proplaex ERP Master Database (Shared PC Mode)";
    const dateStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const sheetTitle = `${titlePrefix} - Sync ${dateStr}`;

    try {
      const syncParams = {
        orders: state.orders,
        yarnTransactions: state.yarnTransactions,
        machinePlans: state.machinePlans,
        productionLogs: state.productionLogs,
        deliveryChallans: state.deliveryChallans,
        billRecords: state.billRecords,
        machines: state.machines,
        factories: state.factories,
        machineStatusMap: state.machineStatusMap,
        users: state.users,
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(syncParams)
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      const rawResult = await response.json();
      
      if (rawResult.status === "error") {
        throw new Error(rawResult.error || "Google Apps Script internal processing error.");
      }

      const result: SyncResult = {
        spreadsheetId: rawResult.spreadsheetId || "shared_sheet",
        spreadsheetUrl: rawResult.spreadsheetUrl || "https://docs.google.com/spreadsheets"
      };

      setSyncResult(result);

      // Save to localStorage history list
      const newSyncRecord = {
        spreadsheetId: result.spreadsheetId,
        spreadsheetUrl: result.spreadsheetUrl,
        title: sheetTitle,
        timestamp: new Date().toISOString()
      };
      const updatedHistory = [newSyncRecord, ...syncHistory];
      setSyncHistory(updatedHistory);
      localStorage.setItem("proplaex_google_sheets_history", JSON.stringify(updatedHistory));
    } catch (err: any) {
      console.error("Webhook sync failed:", err);
      setErrorMsg(err?.message || "CORS, Network failure, or invalid Google Web App script response. Verify your Web App deployment settings are set to access 'Anyone'.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopyScript = () => {
    const rawScript = `function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    
    var collections = {
      orders: { title: "Orders", columns: [
        "Order No", "Receive Date", "Factory Name", "Factory Order", "Fabric Type", 
        "Dia x GG", "Color", "Finish GSM", "Finish Dia", "Factory Job No", 
        "Rate (BDT)", "Required Qty (Kg)", "Status", "Remarks"
      ]},
      yarnTransactions: { title: "Yarn Transactions", columns: [
        "Transaction ID", "Order No", "Date", "Mode", "Yarn Count (YC)", "Lot No", "Spinner", "Quantity (Kg)"
      ]},
      machinePlans: { title: "Job Cards (Planning)", columns: [
        "Job Card No", "Order No", "Plan Date", "Machine No", "Planned Qty (Kg)"
      ]},
      productionLogs: { title: "Production Logs", columns: [
        "Log ID", "Date", "Order No", "Job Card No", "Machine No", "Shift", "Net Production Qty (Kg)"
      ]},
      deliveryChallans: { title: "Delivery Challans", columns: [
        "Challan No", "Challan Date", "Factory Name", "Truck No", "Driver Name", 
        "Delivery Type", "Item - Order No", "Item - Cargo/Rolls", "Item - Weight (Kg)", "Item Info"
      ]},
      billRecords: { title: "Billed Invoices", columns: [
        "Invoice ID", "Date", "Factory Name", "Total Amount (BDT)", "Taka In Words", 
        "Detail - Challan No", "Detail - Order No", "Detail - Factory Order", 
        "Detail - Factory Job No", "Detail - Fabric Type", "Detail - Qty (Kg)", 
        "Detail - Rate (BDT)", "Detail - Subtotal (BDT)"
      ]},
      machines: { title: "Knitting Machines", columns: [
        "Machine No", "Dia", "GG", "Machine Type", "Knit Type", 
        "Brand", "Origin", "RPM", "Feeder", "Code", "Efficiency (%)", 
        "Capacity Per Day (Kg)", "Current Machine Status Check"
      ]},
      factories: { title: "Partner Factories", columns: [
        "Factory Name", "Factory Address (Location)", "Responsible Person", "Designation", "Phone", "Email"
      ]},
      users: { title: "Registered Users", columns: [
        "User ID", "Orders Permission", "Yarn Permission", "Planning Permission", "Production Permission", "Delivery Permission", "Billing Permission", "Machine Load", "Settings Permission", "Admin Panel"
      ]}
    };

    for (var key in collections) {
      if (!payload[key]) continue;
      var config = collections[key];
      var rawData = payload[key];
      
      var sheet = activeSpreadsheet.getSheetByName(config.title) || activeSpreadsheet.insertSheet(config.title);
      sheet.clear();
      sheet.appendRow(config.columns);
      
      var lines = [];
      if (key === "orders") {
        rawData.forEach(function(o) {
          lines.push([
            o.orderNo || "", o.receiveDate || "", o.factoryName || "", o.factoryOrder || "", o.fabricType || "", 
            o.diaGG || "", o.color || "", o.finishGSM || 0, o.finishDia || "", o.factoryJobNo || "", 
            o.rate || 0, o.requiredQty || 0, o.status || "", o.remarks || ""
          ]);
        });
      } else if (key === "yarnTransactions") {
        rawData.forEach(function(tx) {
          lines.push([
            tx.id || "", tx.orderNo || "", tx.date || "", tx.mode || "", tx.yc || "", tx.lot || "", tx.spinner || "", tx.qty || 0
          ]);
        });
      } else if (key === "machinePlans") {
        rawData.forEach(function(p) {
          lines.push([
            p.jobCardNo || "", p.orderNo || "", p.planDate || "", p.machineNo || "", p.plannedQty || 0
          ]);
        });
      } else if (key === "productionLogs") {
        rawData.forEach(function(l) {
          lines.push([
            l.id || "", l.date || "", l.orderNo || "", l.jobCardNo || "", l.machineNo || "", l.shift || "", l.qty || 0
          ]);
        });
      } else if (key === "deliveryChallans") {
        rawData.forEach(function(ch) {
          if (ch.type === "Grey Fabric Delivery" && ch.greyItems && ch.greyItems.length) {
            ch.greyItems.forEach(function(item) {
              lines.push([
                ch.challanNo || "", ch.date || "", ch.factoryName || "", ch.truckNo || "", ch.driverName || "", ch.type || "",
                item.orderNo || "", "Roll " + (item.roll || ""), item.qty || 0, "Knit Fabric Cargo"
              ]);
            });
          } else if (ch.type === "Yarn Return" && ch.yarnItems && ch.yarnItems.length) {
            ch.yarnItems.forEach(function(item) {
              lines.push([
                ch.challanNo || "", ch.date || "", ch.factoryName || "", ch.truckNo || "", ch.driverName || "", ch.type || "",
                item.orderNo || "", "Bag " + (item.bag || ""), item.qty || 0, (item.yc || "") + " | Lot " + (item.lot || "") + " | Spin " + (item.spinner || "")
              ]);
            });
          } else {
            lines.push([
              ch.challanNo || "", ch.date || "", ch.factoryName || "", ch.truckNo || "", ch.driverName || "", ch.type || "",
              "", "", 0, "No item detail lines"
            ]);
          }
        });
      } else if (key === "billRecords") {
        rawData.forEach(function(b) {
          if (b.items && b.items.length) {
            b.items.forEach(function(item) {
              lines.push([
                b.id || "", b.date || "", b.factoryName || "", b.totalAmount || 0, b.takaInWords || "",
                item.challanNo || "", item.orderNo || "", item.factoryOrder || "", item.factoryJobNo || "", 
                item.fabricType || "", item.qty || 0, item.rate || 0, item.amount || 0
              ]);
            });
          } else {
            lines.push([
              b.id || "", b.date || "", b.factoryName || "", b.totalAmount || 0, b.takaInWords || "",
              "", "", "", "", "", 0, 0, 0
            ]);
          }
        });
      } else if (key === "machines") {
        var statusMap = payload.machineStatusMap || {};
        rawData.forEach(function(m) {
          lines.push([
            m.machineNo || "", m.dia || "", m.gg || "", m.machineType || "Circular", m.fabricType || "Knit", 
            m.brand || "—", m.origin || "—", m.rpm || 0, m.feeder || 0, m.code || "—", 
            m.efficiency ? m.efficiency + "%" : "—", m.capacityPerDay || 0, 
            statusMap[m.machineNo] || "Available"
          ]);
        });
      } else if (key === "factories") {
        rawData.forEach(function(f) {
          lines.push([
            f.name || "", f.address || "", f.responsiblePerson || "—", f.designation || "—", f.phone || "—", f.email || "—"
          ]);
        });
      } else if (key === "users") {
        rawData.forEach(function(u) {
          lines.push([
            u.userId || "", u.permissions.orders || "None", u.permissions.yarn || "None", 
            u.permissions.planning || "None", u.permissions.production || "None", 
            u.permissions.delivery || "None", u.permissions.billing || "None", 
            u.permissions.machineload || "None", u.permissions.settings || "None", 
            u.permissions.admin || "None"
          ]);
        });
      }

      if (lines.length > 0) {
        sheet.getRange(2, 1, lines.length, config.columns.length).setValues(lines);
      }
      
      sheet.autoResizeColumns(1, config.columns.length);
      var headerRange = sheet.getRange(1, 1, 1, config.columns.length);
      headerRange.setBackground("#e8f5e9").setFontWeight("bold").setFontColor("#1b5e20");
    }

    return ContentService.createTextOutput(JSON.stringify({ 
      status: "success", 
      spreadsheetUrl: activeSpreadsheet.getUrl(),
      spreadsheetId: activeSpreadsheet.getId()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      error: err.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;
    navigator.clipboard.writeText(rawScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const clearHistory = () => {
    if (window.confirm("Are you sure you want to clear your local sync history list? This will NOT delete the actual spreadsheets from your Google Drive/Sheets account.")) {
      setSyncHistory([]);
      localStorage.removeItem("proplaex_google_sheets_history");
    }
  };

  if (isInitializing) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-3 min-h-[220px]">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Initializing Google Integration Services...</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 space-y-6 shadow-xs select-none">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/50 shrink-0 shadow-xs">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-slate-950 font-bold text-base tracking-tight">Google Sheets Sync Engine</h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Auto-export raw tables and structured business data directly to your Sheet</p>
          </div>
        </div>

        {/* Tab switch buttons */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200/30 w-full md:w-auto self-stretch md:self-auto select-none select-none text-xs">
          <button
            onClick={() => {
              setSyncMode("webhook");
              setErrorMsg(null);
              setSyncResult(null);
            }}
            className={`flex-1 md:flex-none inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg shrink-0 font-bold tracking-tight transition-all cursor-pointer ${
              syncMode === "webhook" 
                ? "bg-white text-indigo-700 shadow-xs" 
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Monitor className="h-3.5 w-3.5" />
            Shared PC Mode
          </button>
          <button
            onClick={() => {
              setSyncMode("oauth");
              setErrorMsg(null);
              setSyncResult(null);
            }}
            className={`flex-1 md:flex-none inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg shrink-0 font-bold tracking-tight transition-all cursor-pointer ${
              syncMode === "oauth" 
                ? "bg-white text-indigo-700 shadow-xs" 
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            Personal Google Auth
          </button>
        </div>
      </div>

      {/* Shared PC Webhook Mode view */}
      {syncMode === "webhook" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2">
            <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wide flex items-center gap-1.5">
              <Monitor className="h-4 w-4 text-indigo-600" />
              Shared PC Mode (Persistent No-Login Solution)
            </h3>
            <p className="text-xs text-indigo-800 leading-relaxed font-medium">
              This webpage runs on a shared workstation accessed by multiple daily operators/workers. 
              To allow workers to perform a Google sheets sync without requiring them to sign in or have access to administrative passcodes, 
              save a <strong>Google Apps Script Web App URL</strong>. This connects the database permanently with 100% security!
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Google Sheets Web App Webhook URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={webhookUrl}
                  onChange={(e) => handleSaveWebhook(e.target.value)}
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                />
                {webhookUrl && (
                  <button
                    onClick={() => handleSaveWebhook("")}
                    className="px-3 text-xs font-bold text-slate-400 hover:text-red-500 cursor-pointer transition-colors"
                  >
                    Clear Input
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                Stored locally on this PC: {webhookUrl ? "✓ Saved & ready for all local users" : "✗ Not set yet (Workers won't be able to sync)"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5 justify-between flex flex-col">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Sync All Modules Dataset</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Once the URL above is saved, clicking raw sync formats all 9 live business modules (orders, planning, machines, yarn) and uploads them instantly to the designated Master Sheet.
                  </p>
                </div>
                <div className="pt-3">
                  <button
                    disabled={isSyncing || !webhookUrl}
                    onClick={handleWebhookSync}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer tracking-wide active:scale-98 transition-all"
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Synchronizing Master Database...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Push Database to Stored Sheet URL
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Step-by-step Apps Script configuration tutorial */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => setShowTutor(!showTutor)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                      Instructions: Set up Master Sheet in 1 Minute
                    </h4>
                    <p className="text-[10px] text-slate-400 font-medium">Click to expand visual guide and copy helper script</p>
                  </div>
                  <HelpCircle className="h-5 w-5 text-indigo-500 shrink-0" />
                </button>

                {showTutor && (
                  <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3 text-xs text-slate-650 leading-relaxed max-h-96 overflow-y-auto">
                    <div className="space-y-2">
                      <p className="font-semibold text-slate-800">Please follow these exact steps to link your Master Sheet:</p>
                      <ol className="list-decimal pl-4.5 space-y-1.5 text-[11px]">
                        <li>Open any Google Sheet (or create a blank one named <strong>"Proplaex ERP Master Database"</strong>).</li>
                        <li>In the top menu bar, click <strong>Extensions &gt; Apps Script</strong>.</li>
                        <li>Delete any existing empty code in the editor, and paste our helper code using the button below.</li>
                        <li>Click the <strong>Deploy</strong> blue button at the top-right &gt; Choose <strong>New deployment</strong>.</li>
                        <li>Click the **Gear icon** next to "Select type" &gt; Choose <strong>Web app</strong>.</li>
                        <li>Set <strong>Execute as:</strong> <strong className="text-slate-900 font-bold">Me</strong> (your administrator email).</li>
                        <li>Set <strong>Who has access:</strong> <strong className="text-slate-900 font-bold">Anyone</strong>.</li>
                        <li>Click <strong>Deploy</strong>, authorize security permissions, copy the generated Web App URL, and paste it into the textbox above!</li>
                      </ol>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={handleCopyScript}
                        className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-bold transition-all ${
                          copiedScript 
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                        }`}
                      >
                        {copiedScript ? (
                          <>
                            <Check className="h-4 w-4" />
                            Copied successfully!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copy Helper Apps Script Code
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Direct Google OAuth Mode view */}
      {syncMode === "oauth" && (
        <div className="space-y-6 animate-fadeIn">
          {currentUser && (
            <div className="flex items-center justify-between p-3.5 bg-emerald-50/50 border border-emerald-200/50 rounded-xl text-xs font-medium">
              <div className="flex items-center gap-2">
                <img 
                  src={currentUser.photoURL || undefined} 
                  alt={currentUser.displayName || "Google User"} 
                  className="h-6 w-6 rounded-full border border-emerald-200"
                  referrerPolicy="no-referrer"
                />
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-800">Authorized as manager</p>
                  <p className="text-[10px] text-slate-500 font-medium font-mono">{currentUser.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-red-650 hover:bg-red-50 hover:text-red-700 border border-red-150 rounded px-2 py-1.5 transition-colors cursor-pointer text-[11px] font-bold"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign Out
              </button>
            </div>
          )}

          {!currentUser ? (
            <div className="flex flex-col items-center justify-center text-center p-8 space-y-5 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                <HelpCircle className="h-5 w-5 text-slate-400" />
              </div>
              <div className="max-w-md space-y-2">
                <p className="text-slate-800 font-semibold text-sm">Action Required: Connect Google Drive</p>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Authenticate via standard Google OAuth login to dynamically create fresh spreadsheets in your individual Google drive profile. Note: In compliance with Google safety limits, direct user access tokens expire every single hour.
                </p>
              </div>

              <button
                onClick={handleSignIn}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-250 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-800 shadow-xs cursor-pointer active:scale-98 transition-all"
              >
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-4 w-4 shrink-0">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
                Sign in with Google Account
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-50/40 border border-emerald-100 rounded-xl space-y-2">
                  <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Included Modules Summary</h3>
                  <ul className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-[11px] font-medium text-slate-600 font-mono">
                    <li className="flex items-center gap-1.5 text-emerald-850">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      <span>1. Orders</span>
                    </li>
                    <li className="flex items-center gap-1.5 text-emerald-850">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      <span>2. Yarn Inventory</span>
                    </li>
                    <li className="flex items-center gap-1.5 text-emerald-850">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      <span>3. Job Cards</span>
                    </li>
                    <li className="flex items-center gap-1.5 text-emerald-850">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      <span>4. Production logs</span>
                    </li>
                    <li className="flex items-center gap-1.5 text-emerald-850">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      <span>5. Dispatches</span>
                    </li>
                    <li className="flex items-center gap-1.5 text-emerald-850">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      <span>6. Billed Invoices</span>
                    </li>
                    <li className="flex items-center gap-1.5 text-emerald-850">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      <span>7. Machinery</span>
                    </li>
                    <li className="flex items-center gap-1.5 text-emerald-850">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      <span>8. Partner Factories</span>
                    </li>
                    <li className="col-span-2 flex items-center gap-1.5 text-emerald-850">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      <span>9. Operator & Users Security Registry</span>
                    </li>
                  </ul>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl flex flex-col justify-between">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Sync Target Info</h3>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Clicking the Sync database button creates a brand-new Spreadsheet in your Google Drive with 9 distinct tabs corresponding to each module dataset.
                    </p>
                  </div>

                  <div className="pt-3">
                    <button
                      disabled={isSyncing}
                      onClick={handleSyncDatabase}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-indigo-400 rounded-xl text-xs font-semibold shadow-xs cursor-pointer active:scale-98 transition-all"
                    >
                      {isSyncing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading datasets...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Synchronize All Data to Sheets
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Success Result view */}
              {syncResult && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3.5 animate-fadeIn">
                  <div className="flex gap-2.5">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-emerald-950 font-bold text-sm">Database Export Successful!</h4>
                      <p className="text-xs text-emerald-700 leading-relaxed font-medium">
                        Created Google Spreadsheet successfully! All 9 business modules database tables are published inside separate spreadsheets.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <a
                      href={syncResult.spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-650 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Open Google Sheet
                    </a>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(syncResult.spreadsheetUrl);
                        alert("Google Spreadsheet location URL link copied to clipboard!");
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-emerald-250 hover:bg-emerald-50 text-emerald-850 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      Copy Sheet Link
                    </button>
                  </div>
                </div>
              )}

              {/* Quick Troubleshooting Guide to locate Sheets */}
              <div className="p-4 bg-amber-50/50 border border-amber-200/60 rounded-xl space-y-3.5">
                <div className="flex gap-2">
                  <HelpCircle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Can't Find Your Synced Sheets?</h4>
                    <p className="text-xs text-amber-855 leading-relaxed font-medium text-amber-800">
                      Every time you sync, we create a fresh, full spreadsheet in the specific Google Drive with which you logged in: <span className="font-bold underline text-amber-950">{currentUser.email}</span>.
                    </p>
                  </div>
                </div>

                <div className="text-[11px] text-amber-800/90 pl-6 space-y-2 list-none">
                  <div className="flex items-start gap-1.5">
                    <span className="text-amber-600 font-bold">•</span>
                    <p>Verify that your current browser tab is visiting Google Drive/Sheets while authenticated as <strong className="text-amber-950">{currentUser.email}</strong>. If you have multiple Google accounts, they might default to a different profile.</p>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-amber-600 font-bold">•</span>
                    <p>All created files begin with the prefix <strong className="text-amber-950 font-bold">"Proplaex ERP Master Database"</strong>.</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pl-6 pt-1">
                  <a
                    href="https://drive.google.com/drive/search?q=Proplaex"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-650 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    Search Drive for 'Proplaex'
                  </a>
                  <a
                    href="https://docs.google.com/spreadsheets"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-250 hover:bg-amber-50 text-amber-900 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    Go to Google Sheets
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Success Result view for Webhook Sync */}
      {syncResult && syncMode === "webhook" && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3.5 animate-fadeIn">
          <div className="flex gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-emerald-950 font-bold text-sm text-emerald-900">Database Export Successful (Shared URL Mode)!</h4>
              <p className="text-xs text-emerald-700 leading-relaxed font-semibold">
                Successfully pushed data to the shared spreadsheet using your custom Google Apps Script endpoint! All 9 sheets have been updated.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <a
              href={syncResult.spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open Google Sheet
            </a>
            <button
              onClick={() => {
                navigator.clipboard.writeText(syncResult.spreadsheetUrl);
                alert("Google Sheet Web link copied!");
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-800 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
            >
              Copy Sheet Link
            </button>
          </div>
        </div>
      )}

      {/* Unified History List section */}
      {syncHistory.length > 0 && (
        <div className="p-4 border border-slate-150 rounded-xl bg-slate-50/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Recent Synced Sheets History ({syncHistory.length})
              </h4>
            </div>
            <button
              onClick={clearHistory}
              className="text-[10px] text-slate-400 hover:text-red-500 font-semibold cursor-pointer transition-colors"
            >
              Clear history list
            </button>
          </div>

          <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto pr-1">
            {syncHistory.map((historyItem, index) => (
              <div key={historyItem.spreadsheetId + index} className="py-2 flex items-center justify-between gap-4 text-xs">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="font-semibold text-slate-800 truncate" title={historyItem.title}>
                    {historyItem.title}
                  </p>
                  <p className="text-[10px] font-mono text-slate-400">
                    ID: {historyItem.spreadsheetId.substring(0, 12)}... • 
                    {new Date(historyItem.timestamp).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-2 select-none shrink-0">
                  <a
                    href={historyItem.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 rounded font-medium transition-colors cursor-pointer text-[11px]"
                  >
                    Open Sheet
                  </a>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(historyItem.spreadsheetUrl);
                      alert("Spreadsheet link copied!");
                    }}
                    className="p-1 px-1.5 text-slate-400 hover:text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 rounded transition-colors text-[10px] cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Critical Error view */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-150 rounded-xl flex gap-2.5 animate-fadeIn text-red-900">
          <AlertCircle className="h-5 w-5 text-red-650 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm">Synchronizing Failure</h4>
            <p className="text-xs text-red-750 font-medium leading-relaxed">
              {errorMsg}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

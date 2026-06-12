import React, { useState, useEffect } from "react";
import { useAppState } from "../context/AppContext";
import { initAuth, googleSignIn, logoutGoogle, getAccessToken } from "../utils/firebaseAuth";
import { createAndPopulateSpreadsheet, SyncResult } from "../utils/googleSheetsService";
import { 
  FileSpreadsheet, Loader2, Sparkles, LogOut, CheckCircle2, 
  AlertCircle, ExternalLink, HelpCircle, Copy, Check, Settings, Key, Globe, ChevronDown, ChevronUp
} from "lucide-react";

export default function GoogleSheetsSync() {
  const state = useAppState();
  const isSuperadmin = state.currentUser?.userId?.toLowerCase() === "superadmin";

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [syncHistory, setSyncHistory] = useState<Array<{ spreadsheetId: string; spreadsheetUrl: string; title: string; timestamp: string }>>([]);

  // Self-Managed Custom Client ID configuration states
  const [customClientId, setCustomClientId] = useState<string>("");
  const isSavedClient = !!state.googleClientId;
  const [showConfigPanel, setShowConfigPanel] = useState<boolean>(false);
  const [activeConfigTab, setActiveConfigTab] = useState<"webhook" | "oauth">("webhook");
  const [webhookUrlInput, setWebhookUrlInput] = useState<string>("");
  const [copiedAppscript, setCopiedAppscript] = useState<boolean>(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState<boolean>(false);
  const [testWebhookResult, setTestWebhookResult] = useState<string | null>(null);

  // Sync custom client ID and webhook local state with cloud state
  useEffect(() => {
    if (state.googleClientId) {
      setCustomClientId(state.googleClientId);
    }
  }, [state.googleClientId]);

  useEffect(() => {
    if (state.sheetsWebhookUrl) {
      setWebhookUrlInput(state.sheetsWebhookUrl);
    }
  }, [state.sheetsWebhookUrl]);

  // Load from localStorage on mount and initialize Firebase or Custom OAuth state
  useEffect(() => {
    const saved = localStorage.getItem("proplaex_google_sheets_history");
    if (saved) {
      try {
        setSyncHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse sync history", e);
      }
    }

    // Process Custom Google OAuth callback inside URL hash
    const hash = window.location.hash;
    const directToken = localStorage.getItem("proplaex_google_oauth_token");
    const directUser = localStorage.getItem("proplaex_google_oauth_user");

    if (hash && hash.includes("access_token")) {
      try {
        const hashStr = hash.startsWith("#") ? hash.substring(1) : hash;
        const params = new URLSearchParams(hashStr);
        const token = params.get("access_token");
        if (token) {
          setAccessToken(token);
          localStorage.setItem("proplaex_google_oauth_token", token);
          
          const profile = {
            displayName: "ERP Master Domain Account",
            email: "Authorized with Self-Managed Client ID",
            photoURL: "https://www.svgrepo.com/show/475656/google-color.svg"
          };
          localStorage.setItem("proplaex_google_oauth_user", JSON.stringify(profile));
          setCurrentUser(profile);
          setIsInitializing(false);
          
          // Clear URL hash cleanly without forcing a page reload
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
          return;
        }
      } catch (err) {
        console.error("Failed to extract Custom OAuth from hash", err);
      }
    }

    // Restore self-managed login tokens if they exist
    if (directToken && directUser) {
      setAccessToken(directToken);
      try {
        setCurrentUser(JSON.parse(directUser));
      } catch (e) {
        setCurrentUser({
          displayName: "ERP Master Domain Account",
          email: "Authorized with Self-Managed Client ID",
          photoURL: "https://www.svgrepo.com/show/475656/google-color.svg"
        });
      }
      setIsInitializing(false);
      return;
    }

    // Fallback to Firebase Google popup Auth for preview domains
    const unsubscribe = initAuth(
      (user, token) => {
        if (!localStorage.getItem("proplaex_google_oauth_token")) {
          setCurrentUser(user);
          setAccessToken(token);
        }
        setIsInitializing(false);
      },
      () => {
        if (!localStorage.getItem("proplaex_google_oauth_token")) {
          setCurrentUser(null);
          setAccessToken(null);
        }
        setIsInitializing(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setErrorMsg(null);
    setSyncResult(null);

    // If Custom Google OAuth Client ID is registered, trigger the standard Client-Side OAuth redirect flow
    const savedClientId = state.googleClientId?.trim();
    if (savedClientId) {
      try {
        setIsSyncing(true);
        // Ensure redirect endpoint redirects directly back to this same active route
        const redirectUri = window.location.origin + window.location.pathname;
        const scopes = [
          "https://www.googleapis.com/auth/spreadsheets",
          "https://www.googleapis.com/auth/drive.file"
        ].join(" ");

        const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${encodeURIComponent(savedClientId)}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&response_type=token` +
          `&scope=${encodeURIComponent(scopes)}` +
          `&prompt=consent`;

        // Direct browser address redirection
        window.location.href = oauthUrl;
      } catch (err: any) {
        console.error("Direct Custom Google login redirect failed:", err);
        setErrorMsg("Failed to initiate custom Google OAuth channel. Verify Client ID configuration format.");
        setIsSyncing(false);
      }
      return;
    }

    // Default Firebase Sign-in flow (only succeeds on run.app/localhost whitelisted environments)
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setAccessToken(res.accessToken);
      }
    } catch (err: any) {
      console.error("Default sign-in failed:", err);
      setErrorMsg(err?.message || "Google Authentication failed. Please try again.");
    }
  };

  const handleLogout = async () => {
    try {
      // Clear Custom Google OAuth session cache
      localStorage.removeItem("proplaex_google_oauth_token");
      localStorage.removeItem("proplaex_google_oauth_user");
      
      // Default Firebase session signout
      await logoutGoogle();
      setCurrentUser(null);
      setAccessToken(null);
      setSyncResult(null);
    } catch (err: any) {
      console.error("Sign-out failed:", err);
    }
  };

  const handleSaveClientId = (e: React.FormEvent) => {
    e.preventDefault();
    const id = customClientId.trim();
    if (!id) {
      alert("Please enter a valid Google OAuth Client ID!");
      return;
    }
    if (!id.endsWith(".apps.googleusercontent.com")) {
      alert("Invalid Client ID format. It should look like: 'xxxxxx.apps.googleusercontent.com'. Double-check your Google Cloud Console.");
      return;
    }

    state.updateGoogleClientId(id);
    alert("Successfully configured Master Client ID! You can now log in safely using your private Google API Access channel.");
  };

  const handleClearClientId = () => {
    if (window.confirm("Revert connection to defaults? This will erase your custom Client ID and disconnect any current active Google Sheets session.")) {
      state.updateGoogleClientId("");
      localStorage.removeItem("proplaex_google_oauth_token");
      localStorage.removeItem("proplaex_google_oauth_user");
      setCustomClientId("");
      setCurrentUser(null);
      setAccessToken(null);
      setSyncResult(null);
    }
  };

  const handleSaveWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    const url = webhookUrlInput.trim();
    if (!url) {
      alert("Please enter a valid Google Apps Script Web App URL!");
      return;
    }
    if (!url.startsWith("https://script.google.com/")) {
      alert("Invalid Web App Webhook URL. It must begin with: 'https://script.google.com/'");
      return;
    }

    state.updateSheetsWebhookUrl(url);
    alert("Successfully activated Google Sheets background sync webhook! All system updates are now fully synchronized instantly in real-time.");
  };

  const handleClearWebhook = () => {
    if (window.confirm("Disconnect and clear your Sheets Background Sync Webhook URL?")) {
      state.updateSheetsWebhookUrl("");
      setWebhookUrlInput("");
      setTestWebhookResult(null);
    }
  };

  const handleTestWebhook = async () => {
    const url = webhookUrlInput.trim();
    if (!url || !url.startsWith("https://script.google.com/")) {
      alert("Please configure and save a valid Google Web App URL (beginning with https://script.google.com/) before running the connection test!");
      return;
    }

    setIsTestingWebhook(true);
    setTestWebhookResult(null);
    try {
      const payload = {
        orders: state.orders,
        yarnTransactions: state.yarnTransactions,
        machinePlans: state.machinePlans,
        productionLogs: state.productionLogs,
        deliveryChallans: state.deliveryChallans,
        billRecords: state.billRecords,
        machines: state.machines,
        factories: state.factories,
        machineStatusMap: state.machineStatusMap,
        users: state.users
      };

      const res = await fetch(url, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const raw = await res.json();
        if (raw.status === "success") {
          setTestWebhookResult("Success! Connection successfully established and database synchronized elegantly.");
        } else {
          setTestWebhookResult(`Failed: Subscript responded with: ${raw.message || "Unknown error"}`);
        }
      } else {
        setTestWebhookResult(`Failed to connect (HTTP status: ${res.status}). Verify your script is authorized and deployed for 'Anyone'.`);
      }
    } catch (e: any) {
      console.error(e);
      setTestWebhookResult(`Connection failed: ${e.message || e}. Double-check that Web App CORS options are configured for 'Anyone' access.`);
    } finally {
      setIsTestingWebhook(false);
    }
  };

  // Synchronize Master Tables to Google Spreadsheet
  const handleSyncDatabase = async () => {
    const token = accessToken || (await getAccessToken());
    if (!token) {
      setErrorMsg("Authorization expired. Please click Sign-in first before starting data synchronization.");
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

      // Save to local spreadsheet database list
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
      console.error("Google Sheets sync aborted:", err);
      setErrorMsg(err?.message || "Critical error exporting data tables to Google Sheets.");
    } finally {
      setIsSyncing(false);
    }
  };

  const clearHistory = () => {
    if (window.confirm("Clear list history? This will NOT delete any actual spreadsheets saved inside your personal Google Drive.")) {
      setSyncHistory([]);
      localStorage.removeItem("proplaex_google_sheets_history");
    }
  };

  const isCustomDomain = !window.location.hostname.includes("run.app") && !window.location.hostname.includes("localhost");

  if (isInitializing) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-3 min-h-[220px]">
         <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
         <p className="text-sm text-slate-500 font-medium font-sans">Initializing Google Sheets Integration Services...</p>
      </div>
    );
  }

  return (
    <div id="google-sheets-sync-container" className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 space-y-5 shadow-xs">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/50 shrink-0 shadow-xs">
            <FileSpreadsheet className="h-5.5 w-5.5" />
          </div>
          <div>
            <h2 className="text-slate-950 font-bold text-base tracking-tight font-sans">Google Sheets Sync Engine</h2>
            <p className="text-xs text-slate-400 mt-0.5 font-medium font-sans">Export structured tables, production metrics, and master databases directly into Google Sheets</p>
          </div>
        </div>

        {/* Integration Setup Toggle Button */}
        {isSuperadmin && (
          <button
            onClick={() => setShowConfigPanel(!showConfigPanel)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-semibold select-none cursor-pointer duration-150 transition-all ${
              showConfigPanel 
                ? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700" 
                : "bg-slate-50 border-slate-200 hover:bg-slate-100/80 text-slate-700"
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Connection Settings</span>
            {showConfigPanel ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {/* Dynamic Alert for Live Custom URL (Vercel) */}
      {isCustomDomain && !isSavedClient && (
        <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2 animate-fadeIn text-slate-800">
          <div className="flex gap-2.5">
            <Globe className="h-4.5 w-4.5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-indigo-950 font-bold text-xs">Live Hosting Optimization Detected</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                You are currently running and viewing this application on your live custom domain: <span className="font-mono bg-indigo-100/50 text-indigo-700 font-bold px-1 rounded">{window.location.origin}</span>.
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Standard Google Sign-In is restricted for third-party domains in this system-managed Firebase sandbox. To authorize and link your Google Account successfully here, please configure your own **Google Client ID** in <strong>Connection Settings</strong> above. It takes less than 1 minute to setup!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Google Developer OAuth or Webhook Configuration Panel */}
      {isSuperadmin && showConfigPanel && (
        <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-5 animate-fadeIn">
          <div className="flex items-start justify-between border-b border-slate-200/60 pb-3">
            <div className="flex items-start gap-2 text-slate-800">
              <Settings className="h-4.5 w-4.5 text-indigo-600 shrink-0 mt-0.5 animate-spin-slow" />
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Configure Centralized Synced Connection Channel</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Settings entered here are secured centrally in the cloud database & applied to all devices automatically.</p>
              </div>
            </div>
          </div>

          {/* Navigation tab selector */}
          <div className="flex border-b border-slate-200 scrollbar-none overflow-x-auto">
            <button
              onClick={() => setActiveConfigTab("webhook")}
              className={`py-2 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all ${
                activeConfigTab === "webhook"
                  ? "border-emerald-500 text-emerald-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Globe className="h-4 w-4 text-emerald-500" />
              Option A: Apps Script Webhook (Recommended)
            </button>
            <button
              onClick={() => setActiveConfigTab("oauth")}
              className={`py-2 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all ${
                activeConfigTab === "oauth"
                  ? "border-indigo-500 text-indigo-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Key className="h-4 w-4 text-indigo-500" />
              Option B: OAuth login (Client ID)
            </button>
          </div>

          {activeConfigTab === "webhook" ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50/40 border border-emerald-100 rounded-xl space-y-1 text-xs">
                <h4 className="text-emerald-950 font-bold">Why use Apps Script Webhook?</h4>
                <p className="text-[11px] text-emerald-800 leading-relaxed font-semibold">
                  This is the absolute <strong>easiest & best setup for public domains (like Vercel)</strong>. It requires <strong>ZERO Google logins or popup panels</strong>. Instead, our system executes a clean JSON sync directly to your personal Google Sheet automatically in the background whenever any data changes!
                </p>
              </div>

              {/* Webhook Input form */}
              <form onSubmit={handleSaveWebhook} className="space-y-3">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider font-mono">
                    Google Apps Script Published Web App URL
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="url"
                      value={webhookUrlInput}
                      onChange={(e) => setWebhookUrlInput(e.target.value)}
                      placeholder="e.g. https://script.google.com/macros/s/xxxxxxxxxxxx/exec"
                      className="flex-1 p-2.5 border border-slate-250 bg-white rounded-lg text-xs font-mono placeholder:text-slate-400 shadow-3xs"
                    />

                    <div className="flex gap-2 shrink-0">
                      {state.sheetsWebhookUrl ? (
                        <button
                          type="button"
                          onClick={handleClearWebhook}
                          className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100/90 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                        >
                          Disconnect
                        </button>
                      ) : (
                        <button
                          type="submit"
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-3xs cursor-pointer transition-all active:scale-98"
                        >
                          Connect Web App
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleTestWebhook}
                        disabled={isTestingWebhook || !webhookUrlInput}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold transition-all disabled:cursor-not-allowed"
                      >
                        {isTestingWebhook ? "Testing..." : "Test Connection"}
                      </button>
                    </div>
                  </div>
                </div>

                {testWebhookResult && (
                  <div className={`p-3 rounded-lg text-[11px] font-semibold border ${
                    testWebhookResult.startsWith("Success")
                      ? "bg-emerald-50 text-emerald-800 border-emerald-150"
                      : "bg-red-50 text-red-800 border-red-150"
                  }`}>
                    {testWebhookResult}
                  </div>
                )}
              </form>

              {/* Apps Script Guide Container */}
              <div className="bg-white border border-slate-200/80 p-4 rounded-xl space-y-3.5 max-h-[300px] overflow-y-auto">
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <span>⚡</span> 30-Second Webhook Setup Instructions:
                  </h4>
                  <ol className="list-decimal pl-4 text-[11px] text-slate-600 space-y-1.5 font-semibold">
                    <li>Create a brand-new Spreadsheet in your personal Google Drive account.</li>
                    <li>Inside the Sheet, go to the top menu and select <strong>Extensions &gt; Apps Script</strong>.</li>
                    <li>Erase any pre-populated code template inside the editor and paste the code block below.</li>
                    <li>Click <strong>Save</strong> (floppy disk icon), then click <strong>Deploy &gt; New deployment</strong>.</li>
                    <li>In the "Select type" gear, select <strong>Web app</strong>:
                      <ul className="list-disc pl-4 mt-0.5 space-y-0.5 text-slate-500 text-[10.5px]">
                        <li><strong>Execute as:</strong> Choose <code>Me (your Google email account)</code></li>
                        <li><strong>Who has access:</strong> Choose <code>Anyone</code> (This allows anonymous CORS postings from Vercel)</li>
                      </ul>
                    </li>
                    <li>Click <strong>Deploy</strong>, copy the generated Web App URL, paste it inside the field above, and click <strong>Connect Web App!</strong></li>
                  </ol>
                </div>

                {/* Copyable code box */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Apps Script Sync Code</span>
                    <button
                      onClick={() => {
                        const scriptCode = `function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    var titlePrefix = "Proplanex ERP Master Database";
    var dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MMM dd, yyyy, hh:mm a");
    ss.setName(titlePrefix + " - Live " + dateStr);

    // 1. ORDERS
    var ordersHeaders = [
      "Order No", "Receive Date", "Factory Name", "Factory Order", "Fabric Type", 
      "Dia x GG", "Color", "Finish GSM", "Finish Dia", "Factory Job No", 
      "Rate (BDT)", "Required Qty (Kg)", "Status", "Remarks", 
      "Yarn 1 YC", "Yarn 1 Lot", "Yarn 1 Spinner", "Yarn 1 S/L", 
      "Yarn 2 YC", "Yarn 2 Lot", "Yarn 2 Spinner", "Yarn 2 S/L", 
      "Yarn 3 YC", "Yarn 3 Lot", "Yarn 3 Spinner", "Yarn 3 S/L", 
      "Yarn 4 YC", "Yarn 4 Lot", "Yarn 4 Spinner", "Yarn 4 S/L"
    ];
    var ordersRows = [];
    if (payload.orders && payload.orders.length) {
      payload.orders.forEach(function(o) {
        var yarns = o.yarns || [];
        var y1 = yarns[0] || { yc: "", lot: "", spinner: "", sl: "" };
        var y2 = yarns[1] || { yc: "", lot: "", spinner: "", sl: "" };
        var y3 = yarns[2] || { yc: "", lot: "", spinner: "", sl: "" };
        var y4 = yarns[3] || { yc: "", lot: "", spinner: "", sl: "" };
        ordersRows.push([
          o.orderNo, o.receiveDate, o.factoryName, o.factoryOrder, o.fabricType, 
          o.diaGG, o.color, o.finishGSM, o.finishDia, o.factoryJobNo, 
          o.rate, o.requiredQty, o.status, o.remarks,
          y1.yc, y1.lot, y1.spinner, y1.sl,
          y2.yc, y2.lot, y2.spinner, y2.sl,
          y3.yc, y3.lot, y3.spinner, y3.sl,
          y4.yc, y4.lot, y4.spinner, y4.sl
        ]);
      });
    }
    writeToSheet(ss, "Orders", ordersHeaders, ordersRows);

    // 2. YARN TRANSACTIONS
    var yarnHeaders = ["Transaction ID", "Order No", "Date", "Mode", "Yarn Count (YC)", "Lot No", "Spinner", "Quantity (Kg)"];
    var yarnRows = [];
    if (payload.yarnTransactions && payload.yarnTransactions.length) {
      payload.yarnTransactions.forEach(function(tx) {
        yarnRows.push([tx.id, tx.orderNo, tx.date, tx.mode, tx.yc, tx.lot, tx.spinner, tx.qty]);
      });
    }
    writeToSheet(ss, "Yarn Transactions", yarnHeaders, yarnRows);

    // 3. JOB CARDS
    var planningHeaders = ["Job Card No", "Order No", "Plan Date", "Machine No", "Planned Qty (Kg)"];
    var planningRows = [];
    if (payload.machinePlans && payload.machinePlans.length) {
      payload.machinePlans.forEach(function(p) {
        planningRows.push([p.jobCardNo, p.orderNo, p.planDate, p.machineNo, p.plannedQty]);
      });
    }
    writeToSheet(ss, "Job Cards (Planning)", planningHeaders, planningRows);

    // 4. PRODUCTION LOGS
    var productionHeaders = ["Log ID", "Date", "Order No", "Job Card No", "Machine No", "Shift", "Net Production Qty (Kg)"];
    var productionRows = [];
    if (payload.productionLogs && payload.productionLogs.length) {
      payload.productionLogs.forEach(function(l) {
        productionRows.push([l.id, l.date, l.orderNo, l.jobCardNo, l.machineNo, l.shift, l.qty]);
      });
    }
    writeToSheet(ss, "Production Logs", productionHeaders, productionRows);

    // 5. DELIVERY CHALLANS
    var deliveryHeaders = [
      "Challan No", "Challan Date", "Factory Name", "Truck No", "Driver Name", 
      "Delivery Type", "Item - Order No", "Item - Cargo/Rolls", "Item - Weight (Kg)", "Item Info"
    ];
    var deliveryRows = [];
    if (payload.deliveryChallans && payload.deliveryChallans.length) {
      payload.deliveryChallans.forEach(function(ch) {
        if (ch.type === "Grey Fabric Delivery" && ch.greyItems && ch.greyItems.length) {
          ch.greyItems.forEach(function(item) {
            deliveryRows.push([
              ch.challanNo, ch.date, ch.factoryName, ch.truckNo, ch.driverName, ch.type,
              item.orderNo, "Roll " + item.roll, item.qty, "Knit Fabric Cargo"
            ]);
          });
        } else if (ch.type === "Yarn Return" && ch.yarnItems && ch.yarnItems.length) {
          ch.yarnItems.forEach(function(item) {
            deliveryRows.push([
              ch.challanNo, ch.date, ch.factoryName, ch.truckNo, ch.driverName, ch.type,
              item.orderNo, "Bag " + item.bag, item.qty, item.yc + " | Lot " + item.lot + " | Spin " + item.spinner
            ]);
          });
        } else {
          deliveryRows.push([
            ch.challanNo, ch.date, ch.factoryName, ch.truckNo, ch.driverName, ch.type,
            "", "", 0, "No item detail lines"
          ]);
        }
      });
    }
    writeToSheet(ss, "Delivery Challans", deliveryHeaders, deliveryRows);

    // 6. BILLED INVOICES
    var billingHeaders = [
      "Invoice ID", "Date", "Factory Name", "Total Amount (BDT)", "Taka In Words", 
      "Detail - Challan No", "Detail - Order No", "Detail - Factory Order", 
      "Detail - Factory Job No", "Detail - Fabric Type", "Detail - Qty (Kg)", 
      "Detail - Rate (BDT)", "Detail - Subtotal (BDT)"
    ];
    var billingRows = [];
    if (payload.billRecords && payload.billRecords.length) {
      payload.billRecords.forEach(function(b) {
        if (b.items && b.items.length) {
          b.items.forEach(function(item) {
            billingRows.push([
              b.id, b.date, b.factoryName, b.totalAmount, b.takaInWords,
              item.challanNo, item.orderNo, item.factoryOrder, item.factoryJobNo, 
              item.fabricType, item.qty, item.rate, item.amount
            ]);
          });
        } else {
          billingRows.push([
            b.id, b.date, b.factoryName, b.totalAmount, b.takaInWords,
            "", "", "", "", "", 0, 0, 0
          ]);
        }
      });
    }
    writeToSheet(ss, "Billed Invoices", billingHeaders, billingRows);

    // 7. KNITTING MACHINES
    var machineHeaders = [
      "Machine No", "Dia", "GG", "Machine Type", "Knit Type", 
      "Brand", "Origin", "RPM", "Feeder", "Code", "Efficiency (%)", 
      "Capacity Per Day (Kg)", "Current Machine Status Check"
    ];
    var machineRows = [];
    if (payload.machines && payload.machines.length) {
      var statusMap = payload.machineStatusMap || {};
      payload.machines.forEach(function(m) {
        var stat = statusMap[m.machineNo] || "Available";
        machineRows.push([
          m.machineNo, m.dia, m.gg, m.machineType || "Single Jersey", m.fabricType || "SJ",
          m.brand || "", m.origin || "", m.rpm || "", m.feeder || "", m.code || "", m.efficiency || "",
          m.capacityPerDay || "", stat
        ]);
      });
    }
    writeToSheet(ss, "Knitting Machines", machineHeaders, machineRows);

    // 8. PARTNER FACTORIES
    var factoryHeaders = ["Factory Name", "Responsible Person", "Designation", "Phone", "Email", "Location Address"];
    var factoryRows = [];
    if (payload.factories && payload.factories.length) {
      payload.factories.forEach(function(f) {
        factoryRows.push([f.name, f.responsiblePerson || "", f.designation || "", f.phone || "", f.email || "", f.address]);
      });
    }
    writeToSheet(ss, "Partner Factories", factoryHeaders, factoryRows);

    // 9. REGISTERED USERS
    var userHeaders = ["User ID", "Full Name", "Role Designation", "Allowed Modules Authorization", "Joined/Created Date"];
    var userRows = [];
    if (payload.users && payload.users.length) {
      payload.users.forEach(function(u) {
        var modPerms = [];
        if (u.permissions) {
          for (var k in u.permissions) {
            if (u.permissions[k]) {
              modPerms.push(k);
            }
          }
        }
        userRows.push([u.userId, u.name, u.role, modPerms.join(", "), u.joinedDate || ""]);
      });
    }
    writeToSheet(ss, "Registered Users", userHeaders, userRows);

    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Synchronized " + Date.now() }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function writeToSheet(ss, sheetName, headers, rows) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    sheet.clear();
  }
  
  var grid = [headers];
  if (rows && rows.length) {
    grid = grid.concat(rows);
  }
  sheet.getRange(1, 1, grid.length, headers.length).setValues(grid);
  
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground("#f1f5f9")
    .setFontWeight("bold")
    .setFontColor("#334155");
}`;
                        navigator.clipboard.writeText(scriptCode);
                        setCopiedAppscript(true);
                        setTimeout(() => setCopiedAppscript(false), 2000);
                      }}
                      className="px-2.5 py-1 text-[10px] bg-slate-100 border hover:bg-slate-200 text-slate-700 font-bold rounded cursor-pointer select-none transition-all flex items-center gap-1 shrink-0"
                    >
                      {copiedAppscript ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span>Code Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 text-slate-500" />
                          <span>Copy Script Code</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-900 border text-emerald-400 rounded-lg text-[10px] font-mono overflow-x-auto max-h-56 select-all font-medium leading-normal whitespace-pre">
                    {`// See script contents by clicking copy script button...`}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveClientId} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider font-mono">
                  Google Cloud Console OAuth 2.0 Web Client ID
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    disabled={isSavedClient}
                    value={customClientId}
                    onChange={(e) => setCustomClientId(e.target.value)}
                    placeholder="e.g. xxxxxxxxxxxx-xxxxxxxxxxxxxxxx.apps.googleusercontent.com"
                    className="flex-1 p-2.5 border border-slate-250 bg-white rounded-lg text-xs font-mono placeholder:text-slate-400 disabled:bg-slate-100 disabled:text-slate-500 shadow-3xs"
                  />
                  
                  {isSavedClient ? (
                    <button
                      type="button"
                      onClick={handleClearClientId}
                      className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:border-red-300 rounded-lg text-xs font-semibold cursor-pointer shrink-0 transition-colors"
                    >
                      Clear Credentials
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-xs font-bold shadow-3xs cursor-pointer shrink-0 transition-all active:scale-98"
                    >
                      Save & Activate
                    </button>
                  )}
                </div>
              </div>

              {/* Instruction manual box */}
              <div className="bg-white border border-slate-200/80 p-3.5 rounded-lg text-[11px] text-slate-600 space-y-2 max-h-56 overflow-y-auto pr-1">
                <p className="font-bold text-slate-900 flex items-center gap-1">
                  <span>🔧</span> Step-by-Step Google Developer Whitelisting Guide:
                </p>
                <ol className="list-decimal pl-4 space-y-1.5 font-medium">
                  <li>
                    Open the official{" "}
                    <a 
                      href="https://console.cloud.google.com/" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-indigo-600 hover:text-indigo-800 underline font-semibold inline-flex items-center gap-0.5"
                    >
                      Google Cloud Console <ExternalLink className="h-3 w-3" />
                    </a>{" "}
                    using your Google account.
                  </li>
                  <li>
                    Search for <strong>APIs & Services</strong>. Go to <strong>Enabled APIs & Services</strong>, click <i>"+ Enable APIs"</i> and search/turn ON <strong>Google Sheets API</strong> & <strong>Google Drive API</strong>.
                  </li>
                  <li>
                    Go to <strong>OAuth Consent Screen</strong>:
                    <ul className="list-disc pl-4 mt-0.5 space-y-0.5 scale-95 text-slate-500">
                      <li>Choose <strong>External</strong> app type.</li>
                      <li>Add your email address in the developer contact forms.</li>
                      <li>Add scopes: <code>.../auth/spreadsheets</code> and <code>.../auth/drive.file</code>.</li>
                      <li>In <strong>Test users</strong> page, add your Google account email as authorized test user!</li>
                    </ul>
                  </li>
                  <li>
                    Go to <strong>Credentials</strong> &gt; click <strong>+ Create Credentials</strong> &gt; and select <strong>OAuth Client ID</strong>.
                  </li>
                  <li>Under Application Type, select <strong>Web application</strong>.</li>
                  <li>
                    Add URI under <strong>Authorized JavaScript origins</strong>:
                    <code className="bg-slate-100 border text-slate-850 p-0.5 px-1 rounded ml-1 font-mono text-[10px] select-all font-bold">
                      {window.location.origin}
                    </code>
                  </li>
                  <li>
                    Add URI under <strong>Authorized redirect URIs</strong> (exact same format with trailing slash):
                    <code className="bg-slate-100 border text-slate-850 p-0.5 px-1 rounded ml-1 font-mono text-[10px] select-all font-bold">
                      {window.location.origin}/
                    </code>
                  </li>
                  <li>Click <strong>Create</strong>, copy the generated client ID string from Google, and paste it into the form above!</li>
                </ol>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Main Authentication Card container UI */}
      <div className="space-y-6 animate-fadeIn">
        {currentUser && (
          <div className="flex items-center justify-between p-3.5 bg-emerald-50/50 border border-emerald-200/50 rounded-xl text-xs font-medium">
            <div className="flex items-center gap-2">
              <img 
                src={currentUser.photoURL || "https://www.svgrepo.com/show/475656/google-color.svg"} 
                alt={currentUser.displayName || "Google User"} 
                className="h-6 w-6 rounded-full border border-emerald-200"
                referrerPolicy="no-referrer"
              />
              <div className="space-y-0.5">
                <p className="font-bold text-slate-800">Authorized Master Session</p>
                <p className="text-[10px] text-slate-500 font-medium font-mono">{currentUser.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-red-650 hover:bg-red-50 hover:text-red-700 border border-red-150 rounded-lg transition-colors cursor-pointer text-[11px] font-bold"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </button>
          </div>
        )}

        {!currentUser ? (
          state.sheetsWebhookUrl ? (
            <div className="flex flex-col items-center justify-center text-center p-8 space-y-5 bg-emerald-50/20 rounded-xl border border-dashed border-emerald-300">
              <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 animate-pulse">
                <Globe className="h-5 w-5 animate-spin-slow" />
              </div>
              <div className="max-w-md space-y-2 flex flex-col items-center">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-850 uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping"></span>
                  Live Background Auto-Sync Channel Active
                </div>
                <h4 className="text-slate-900 font-bold text-sm font-sans">You are Completely Connected!</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  Because your <strong>Apps Script Webhook (Option A)</strong> is fully connected, your live ERP database tables sync directly inside your personal Google Sheet in the background instantly!
                </p>
                <p className="text-[10px] text-emerald-800 leading-relaxed font-bold bg-emerald-100/40 p-2 px-3 rounded-lg border border-emerald-250/50 mt-1">
                  ⚠️ Google Account OAuth Sign-In is NOT required. Your connection operates autonomously.
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleTestWebhook}
                  disabled={isTestingWebhook}
                  className="px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all shadow-3xs cursor-pointer flex items-center gap-1.5 hover:scale-[1.02] active:scale-98"
                >
                  {isTestingWebhook ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Synchronizing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      Force Manual Sync
                    </>
                  )}
                </button>
                {isSuperadmin && (
                  <button
                    onClick={() => setShowConfigPanel(true)}
                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer hover:border-slate-300 transition-colors"
                  >
                    Configure Channels
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 space-y-5 bg-slate-50/55 rounded-xl border border-dashed border-slate-205">
              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <Globe className="h-5 w-5" />
              </div>
              <div className="max-w-md space-y-2">
                <p className="text-slate-800 font-semibold text-sm">Action Required: Authorize Google Drive Channel</p>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  {isSavedClient 
                    ? "Your Self-Managed connection client is configured! Click below to authorize Google Drive & sheets creation directly on Vercel."
                    : "Sync tables inside your individual Drive. Direct security auth tokens expire automatically every hour under Google terms."
                  }
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
                {isSavedClient ? "Authenticate Connection Profile" : "Sign in with Google Account"}
              </button>
            </div>
          )
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
                  <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
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

                <div className="flex flex-wrap gap-2 pt-1 font-sans">
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
            <div className="p-4 bg-amber-50/50 border border-amber-200/60 rounded-xl space-y-3">
              <div className="flex gap-2">
                <HelpCircle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Can't Find Your Synced Sheets?</h4>
                  <p className="text-xs text-amber-855 leading-relaxed font-medium text-amber-850">
                    Every time you sync, we create a fresh, full spreadsheet in Google Drive under the current logged in account profile.
                  </p>
                </div>
              </div>

              <div className="text-[11px] text-amber-800/90 pl-6 space-y-2 list-none">
                <div className="flex items-start gap-1.5">
                  <span className="text-amber-600 font-bold">•</span>
                  <p>All created files begin with the prefix <strong className="text-amber-950 font-bold">"Proplaex ERP Master Database"</strong>.</p>
                </div>
                {currentUser && currentUser.email && (
                  <div className="flex items-start gap-1.5">
                    <span className="text-amber-600 font-bold">•</span>
                    <p>Current auth status channel: <strong className="text-amber-950 font-semibold">{currentUser.displayName || "Manager"}</strong> ({currentUser.email})</p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pl-6 pt-1 font-sans">
                <a
                  href="https://drive.google.com/drive/search?q=Proplaex"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
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

      {/* Critical Error view */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-150 rounded-xl flex gap-2.5 animate-fadeIn text-red-900">
          <AlertCircle className="h-5 w-5 text-red-650 shrink-0 mt-0.5" />
          <div className="space-y-1.5 w-full">
            <h4 className="font-bold text-sm">Synchronizing Failure</h4>
            {errorMsg.includes("unauthorized-domain") ? (
              <div className="space-y-3 text-xs text-red-850">
                <p className="font-semibold leading-relaxed">
                  Firebase Authentication has restricted Google Sign-In because this environment's preview domain is not in your authorized list.
                </p>
                <div className="bg-white/80 rounded-lg p-3 border border-red-100/60 text-slate-800 space-y-2">
                  <p className="font-bold text-[11px] text-slate-900">Why are you seeing this?</p>
                  <p className="text-[11px] text-slate-700 leading-relaxed font-semibold">
                    This sandbox Firebase project is provisioned directly through Google AI Studio. 
                    Consequently, your personal Google Account is configured as a collaborator but does not have the administrative <strong>Owner privileges</strong> required to add custom domains in the Firebase Console settings.
                  </p>
                  <div className="p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-lg text-slate-850">
                    <p className="font-bold text-[10.5px] text-indigo-950 flex items-center gap-1">
                      <span>💡</span> Solution For Custom Domains (Vercel):
                    </p>
                    <p className="text-[10.5px] text-slate-600 mt-1 leading-relaxed">
                      Click the **Connection Settings** button at the top of this panel, create your own free Google Client ID, paste it, and you'll be able to sign in instantly on Vercel or any other domain!
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-red-750 font-medium leading-relaxed font-semibold">
                {errorMsg}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

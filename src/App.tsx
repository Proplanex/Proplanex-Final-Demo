/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { AppProvider, useAppState } from "./context/AppContext";
import OrderStatus from "./components/OrderStatus";
import YarnInventory from "./components/YarnInventory";
import PlanningFile from "./components/PlanningFile";
import ProductionUpdate from "./components/ProductionUpdate";
import DeliveryModule from "./components/DeliveryModule";
import BillingSection from "./components/BillingSection";
import SettingsSection from "./components/Settings";
import AdminPanel from "./components/AdminPanel";
import LoginScreen from "./components/LoginScreen";
import MachineLoad from "./components/MachineLoad";
import { 
  Building2, Layers, Cpu, Compass, Truck, CreditCard, Settings, 
  Clock, LogOut, ShieldAlert, ShieldCheck, User, Users,
  Menu, X
} from "lucide-react";

function AppContent() {
  const { 
    currentUser, logoutUser, isExpired, trialDays, trialExpirationDate, companyProfile, factories, isQuotaExceeded, poweredByProfile, retryCloudSync
  } = useAppState();

  const [activeTab, setActiveTab] = useState<string>("orders");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [systemTime, setSystemTime] = useState("");

  // Live Digital Clock updating every second
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setSystemTime(d.toLocaleDateString() + " " + d.toLocaleTimeString());
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Defined modules navigation
  const modulesList = [
    { id: "orders", label: "Order Status" },
    { id: "yarn", label: "Yarn Inventory" },
    { id: "planning", label: "Planning File" },
    { id: "production", label: "Production Update" },
    { id: "delivery", label: "Delivery Module" },
    { id: "billing", label: "Billing Section" },
    { id: "machineload", label: "Machine Load" },
    { id: "settings", label: "Settings Portal" },
    { id: "admin", label: "Admin Panel" }
  ];

  // Auto-redirect if tab is hidden for logged-in user
  useEffect(() => {
    if (!currentUser) return;
    const permissions = currentUser.permissions;
    const currentPermission = permissions[activeTab as keyof typeof permissions];

    if (currentPermission === "Hide" || !currentPermission) {
      // Find first visible tab
      const firstVisible = modulesList.find(m => permissions[m.id as keyof typeof permissions] !== "Hide");
      if (firstVisible) {
        setActiveTab(firstVisible.id);
      }
    }
  }, [currentUser]);

  // Handle Logged Out state
  if (!currentUser) {
    return <LoginScreen />;
  }

  // Handle Expired State (blocks everything except superadmin renewal)
  const isSuperadmin = currentUser.userId.toLowerCase() === "superadmin";
  if (isExpired && !isSuperadmin) {
    return <LoginScreen isExpiredRecovery={true} />;
  }

  // Determine permissions
  const pOrders = currentUser.permissions.orders;
  const pYarn = currentUser.permissions.yarn;
  const pPlanning = currentUser.permissions.planning;
  const pProduction = currentUser.permissions.production;
  const pDelivery = currentUser.permissions.delivery;
  const pBilling = currentUser.permissions.billing;
  const pMachineLoad = currentUser.permissions.machineload;
  const pSettings = currentUser.permissions.settings;
  const pAdmin = currentUser.permissions.admin;

  const renderActiveModule = () => {
    switch (activeTab) {
      case "orders":
        return <OrderStatus readOnly={pOrders === "Read Only"} />;
      case "yarn":
        return <YarnInventory readOnly={pYarn === "Read Only"} />;
      case "planning":
        return <PlanningFile readOnly={pPlanning === "Read Only"} />;
      case "production":
        return <ProductionUpdate readOnly={pProduction === "Read Only"} />;
      case "delivery":
        return <DeliveryModule readOnly={pDelivery === "Read Only"} />;
      case "billing":
        return <BillingSection readOnly={pBilling === "Read Only"} />;
      case "machineload":
        return <MachineLoad readOnly={pMachineLoad === "Read Only"} />;
      case "settings":
        return <SettingsSection readOnly={pSettings === "Read Only"} />;
      case "admin":
        return <AdminPanel />;
      default:
        return <p className="text-sm p-4 italic text-slate-400">Loading module gateway...</p>;
    }
  };

  return (
    <div id="pro_app_root" className="h-screen overflow-hidden bg-[#f8fafc] text-slate-750 font-sans flex flex-col md:flex-row print:bg-white print:text-black print:h-auto print:overflow-visible">
      {/* LEFT SIDEBAR NAVIGATION - RESPONSIVE HAMBURGER MENU ON MOBILE */}
      <nav id="pro_nav" className="no-print sticky top-0 z-45 w-full md:w-60 bg-slate-900 flex flex-col border-b md:border-b-0 md:border-r border-slate-800 shrink-0 select-none shadow-md md:shadow-none">
        {/* Top Header Row: always visible, acts as horizontal brand header on mobile */}
        <div className="p-4 md:p-6 flex items-center justify-between md:block shrink-0 border-b md:border-b-0 border-slate-800/60">
          <div className="flex items-center justify-between w-full md:mb-4">
            <div className="flex flex-col">
              <h1 className="text-white font-bold text-base md:text-lg tracking-tight leading-none bg-linear-to-r from-white to-slate-200 bg-clip-text text-transparent">
                {companyProfile.name ? companyProfile.name.trim().split(" ")[0].toUpperCase() : "PROPLANEX"}
              </h1>
              <span className="text-[9px] text-indigo-400 font-semibold tracking-widest mt-1 uppercase">LIVE STATUS</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[9px] bg-emerald-950/80 text-emerald-400 font-bold px-1.5 py-0.5 rounded border border-emerald-900/50 shrink-0 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></span>
                ACTIVE
              </span>
              {/* Mobile Hamburger Toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer active:scale-95"
                title="Toggle Menu"
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* BRAND COMPANY LOGO OVERRIDE - desktop always visible */}
          <div className="hidden md:flex bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex-col items-center justify-center gap-2 text-center mt-4">
            {companyProfile.logoUrl ? (
              <img 
                src={companyProfile.logoUrl} 
                alt="Company Logo" 
                className="h-12 max-w-full object-contain filter brightness-110"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="h-10 w-10 rounded-lg bg-indigo-600/25 flex items-center justify-center text-white font-bold text-sm">
                PX
              </span>
            )}
            <div>
              <p className="text-white text-xs font-bold font-mono tracking-tight uppercase truncate max-w-[140px]">{companyProfile.name}</p>
              <p className="text-[8px] text-slate-400 italic max-w-[140px] truncate">{companyProfile.tagline}</p>
            </div>
          </div>
        </div>

        {/* Collapsible content (Hidden on Mobile unless Open, Always shown on Desktop) */}
        <div className={`flex-1 flex-col ${isMobileMenuOpen ? "flex pb-4" : "hidden md:flex"} md:pb-0 overflow-y-auto`}>
          {/* Mobile-only Company Logo banner if open */}
          {isMobileMenuOpen && (
            <div className="px-4 py-2 md:hidden">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
                {companyProfile.logoUrl ? (
                  <img 
                    src={companyProfile.logoUrl} 
                    alt="Company Logo" 
                    className="h-9 w-auto object-contain filter brightness-110"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="h-8 w-8 rounded bg-indigo-600/25 flex items-center justify-center text-white font-bold text-xs shrink-0 font-sans">
                    PX
                  </span>
                )}
                <div className="truncate text-left">
                  <p className="text-white text-xs font-bold font-mono tracking-tight uppercase truncate">{companyProfile.name}</p>
                  <p className="text-[8px] text-slate-400 italic truncate">{companyProfile.tagline}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Items list */}
          <div className="px-4 py-2 space-y-1.5 overflow-y-auto md:flex-1">
            {modulesList.map((m) => {
              const perm = currentUser.permissions[m.id as keyof typeof currentUser.permissions];
              if (perm === "Hide") return null;

              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setActiveTab(m.id);
                    setIsMobileMenuOpen(false); // Close menu on select
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
                    activeTab === m.id 
                      ? "bg-indigo-600 text-white font-medium shadow-sm border border-indigo-500/25" 
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${activeTab === m.id ? "bg-white" : "bg-slate-600"}`}></div>
                    <span className="text-xs font-semibold">{m.label}</span>
                  </div>
                  {perm === "Read Only" && (
                    <span className="text-[8px] uppercase font-mono px-1 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 leading-none scale-90">
                      R-O
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Authenticated user profile panel */}
          <div className="p-4 border-t border-slate-800/80 space-y-3 bg-slate-950/40 mt-auto shadow-inner text-left">
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
              <Clock className="h-3.5 w-3.5 text-indigo-400" />
              <span className="truncate">{systemTime || "Synchronizing..."}</span>
            </div>

            <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-slate-800">
              <div className="flex items-center space-x-2 truncate">
                <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-xs text-white uppercase font-bold">
                  {currentUser.userId.substring(0, 2)}
                </div>
                <div className="truncate">
                  <p className="text-[11px] text-white font-bold font-mono truncate max-w-[90px]">{currentUser.userId}</p>
                  <p className="text-[8px] text-slate-400 font-semibold tracking-wide uppercase">
                    {currentUser.userId.toLowerCase() === "superadmin" ? "SUPERADMIN" : "OPERATOR"}
                  </p>
                </div>
              </div>

              <button
                onClick={logoutUser}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-400 cursor-pointer transition-colors"
                title="Logout Session"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* MAIN INNER CONTAINER */}
      <main className="flex-1 flex flex-col h-full md:min-h-screen overflow-hidden print:overflow-visible">
        {/* HEADER BAR - HIDDEN ON PRINT */}
        <header className="no-print h-auto min-h-16 py-3 bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 md:px-8 shrink-0 select-none gap-3 sm:gap-0">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2 flex-wrap">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0"></span>
            <span className="hidden md:inline">PROPLANEX HUB / </span>
            <span className="text-indigo-650 font-mono text-[11px] normal-case bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 truncate max-w-[280px] sm:max-w-none">
              {activeTab === "orders" ? "Master Orders Status Window" : 
               activeTab === "yarn" ? "Yarn Inventory Stocks & Lots" : 
               activeTab === "planning" ? "Production Planning Cards" : 
               activeTab === "production" ? "Active Knitting Production Logs" : 
               activeTab === "delivery" ? "Gatepass & Delivery Registers" : 
               activeTab === "billing" ? "Commercial Invoicing Accounts" : 
               activeTab === "machineload" ? "Knitting Load Status Checker" : 
               activeTab === "settings" ? "App & Profile Configurations" : "Account Access Matrix List"}
            </span>
          </div>

          <div className="flex items-center space-x-4 text-xs font-semibold self-end sm:self-auto">
            {/* Display Active partners count KPI if requested */}
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1 text-slate-500">
              <span className="text-[10px]">Active Partners:</span>
              <strong className="text-slate-800 font-mono text-xs">{factories.length}</strong>
            </div>

            {trialExpirationDate && (
              <div className="flex items-center gap-1 bg-rose-50 text-rose-700 px-3 py-1 rounded-lg border border-rose-100 font-mono text-[10px] animate-pulse">
                <ShieldCheck className="h-3.5 w-3.5 text-rose-600" />
                <span>Expires: {trialExpirationDate}</span>
              </div>
            )}
            
            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">NODE SECURED</span>
          </div>
        </header>

        {/* INNER VIEW CONTENT SCROLL CONTAINER */}
        <div id="pro_main" className="p-6 md:p-8 space-y-6 flex-1 overflow-y-auto bg-[#f8fafc] print:bg-white print:p-0">
          {isQuotaExceeded && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-medium max-w-full leading-relaxed no-print shadow-sm">
              <div className="space-y-1">
                <strong className="text-amber-900 block font-bold text-sm">⚠️ Cloud Sync Quota Exceeded (Free Tier)</strong>
                <p className="text-amber-800/80">
                  The application has temporarily reached its daily Firestore writing quotas. Do not worry! All changes are being safely saved locally in your browser's persistent database. Real-time central repository sync will reset and resume automatically tomorrow.
                </p>
                <p className="text-slate-500 font-normal">
                  Detailed quota limits can be checked under the **Spark** plan column in the **Enterprise edition** section of{" "}
                  <a href="https://firebase.google.com/pricing#cloud-firestore" target="_blank" rel="noopener noreferrer" className="underline hover:text-indigo-650 font-bold">firebase.google.com/pricing</a>.
                </p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  type="button"
                  onClick={retryCloudSync}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl text-center text-xs transition-all duration-150 shadow-sm whitespace-nowrap active:scale-95 cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>Retry Sync</span> 🔄
                </button>
                <a
                  href="https://console.firebase.google.com/project/yarling-tributary-npwwt/firestore/databases/ai-studio-217663a1-6d18-4e57-8b8e-16475a1b7911/data?openUpgradeDialog=true"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded-xl text-center text-xs transition-all duration-150 shadow-sm whitespace-nowrap inline-block hover:scale-102"
                >
                  Upgrade Database 🚀
                </a>
              </div>
            </div>
          )}
          {renderActiveModule()}

          {/* FOOTER STRIP */}
          <div className="no-print flex justify-between items-center pt-8 border-t border-slate-250 text-[#94a3b8] font-bold text-[9px] font-mono tracking-wider select-none">
            <div className="flex items-center gap-2">
              {poweredByProfile?.logoUrl && (
                <img 
                  src={poweredByProfile.logoUrl} 
                  alt="Dev Logo" 
                  className="h-4.5 w-auto object-contain shrink-0 filter brightness-110 opacity-75 grayscale hover:grayscale-0 transition-all"
                  referrerPolicy="no-referrer"
                />
              )}
              <p className="italic uppercase">
                {poweredByProfile?.slogan || companyProfile.tagline || "100% EXPORT ORIENTED COMPANY"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <p className="font-bold uppercase">
                POWERED BY {poweredByProfile?.name || companyProfile.name || "PROPLANEX APPARELS"}
              </p>
              {poweredByProfile?.qrCodeUrl && (
                <img 
                  src={poweredByProfile.qrCodeUrl} 
                  alt="Token Scan" 
                  className="h-4.5 w-4.5 object-contain shrink-0 border border-slate-200 p-0.5 rounded bg-white opacity-75 hover:opacity-100 transition-all"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

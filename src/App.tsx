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
  Clock, LogOut, ShieldAlert, ShieldCheck, User, Users
} from "lucide-react";

function AppContent() {
  const { 
    currentUser, logoutUser, isExpired, trialDays, trialExpirationDate, companyProfile, factories
  } = useAppState();

  const [activeTab, setActiveTab] = useState<string>("orders");
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
    <div id="pro_app_root" className="min-h-screen bg-[#f8fafc] text-slate-750 font-sans flex flex-col md:flex-row print:bg-white print:text-black">
      {/* LEFT SIDEBAR NAVIGATION - HIDDEN ON PRINT */}
      <nav id="pro_nav" className="no-print w-full md:w-60 bg-slate-900 flex flex-col border-b md:border-b-0 md:border-r border-slate-800 shrink-0 select-none">
        {/* Logo Brand Header */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-1.5 justify-between">
            <div className="flex flex-col">
              <h1 className="text-white font-bold text-lg tracking-tight leading-none">PROPLAEX</h1>
              <span className="text-[9px] text-indigo-400 font-medium tracking-wide mt-1 uppercase">LIVE STATUS</span>
            </div>
            <span className="text-[9px] bg-emerald-950/80 text-emerald-400 font-bold px-1.5 py-0.5 rounded border border-emerald-900/50 shrink-0 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></span>
              ACTIVE
            </span>
          </div>

          {/* BRAND COMPANY LOGO OVERRIDE */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col items-center justify-center gap-2 text-center">
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

        {/* Navigation Items list */}
        <div className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          {modulesList.map((m) => {
            const perm = currentUser.permissions[m.id as keyof typeof currentUser.permissions];
            if (perm === "Hide") return null;

            return (
              <button
                key={m.id}
                onClick={() => setActiveTab(m.id)}
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
        <div className="p-4 border-t border-slate-800/80 space-y-3 bg-slate-950/40">
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
      </nav>

      {/* MAIN INNER CONTAINER */}
      <main className="flex-1 flex flex-col h-full min-h-screen overflow-hidden print:overflow-visible">
        {/* HEADER BAR - HIDDEN ON PRINT */}
        <header className="no-print h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 select-none">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>PROPLANEX HUB / </span>
            <span className="text-indigo-650 font-mono text-[11px] normal-case bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
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

          <div className="flex items-center space-x-4 text-xs font-semibold">
            {/* Display Active partners count KPI if requested */}
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1 text-slate-500">
              <span className="text-[10px]">Active Partners:</span>
              <strong className="text-slate-800 font-mono text-xs">{factories.length}</strong>
            </div>

            {trialExpirationDate && (
              <div className="hidden lg:flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg border border-indigo-100 font-mono text-[10px]">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Expires: {trialExpirationDate}</span>
              </div>
            )}
            
            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">NODE SECURED</span>
          </div>
        </header>

        {/* INNER VIEW CONTENT SCROLL CONTAINER */}
        <div id="pro_main" className="p-6 md:p-8 space-y-6 flex-1 overflow-y-auto bg-[#f8fafc] print:bg-white print:p-0">
          {renderActiveModule()}

          {/* FOOTER STRIP */}
          <div className="no-print flex justify-between items-center pt-8 border-t border-slate-250 text-[#94a3b8] font-bold text-[9px] font-mono tracking-wider select-none">
            <p className="italic uppercase">{companyProfile.tagline || "Precious Planning ● Synchronized Production ● Next Gen Intelligence"}</p>
            <p className="font-bold">POWERED BY {companyProfile.name || "PROPLANEX"}</p>
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

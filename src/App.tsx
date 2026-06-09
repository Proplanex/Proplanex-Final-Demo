/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { AppProvider } from "./context/AppContext";
import OrderStatus from "./components/OrderStatus";
import YarnInventory from "./components/YarnInventory";
import PlanningFile from "./components/PlanningFile";
import ProductionUpdate from "./components/ProductionUpdate";
import DeliveryModule from "./components/DeliveryModule";
import BillingSection from "./components/BillingSection";
import SettingsSection from "./components/Settings";
import { 
  Building2, Layers, Cpu, Compass, Truck, CreditCard, Settings, 
  Clock, ExternalLink, Moon, Sparkles 
} from "lucide-react";

export default function App() {
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

  // Set page print classes based on open previews
  const renderActiveModule = () => {
    switch (activeTab) {
      case "orders":
        return <OrderStatus />;
      case "yarn":
        return <YarnInventory />;
      case "planning":
        return <PlanningFile />;
      case "production":
        return <ProductionUpdate />;
      case "delivery":
        return <DeliveryModule />;
      case "billing":
        return <BillingSection />;
      case "settings":
        return <SettingsSection />;
      default:
        return <OrderStatus />;
    }
  };

  return (
    <AppProvider>
      <div id="pro_app_root" className="min-h-screen bg-[#f8fafc] text-slate-750 font-sans flex flex-col md:flex-row print:bg-white print:text-black">
        {/* LEFT SIDEBAR NAVIGATION - HIDDEN ON PRINT */}
        <nav id="pro_nav" className="no-print w-full md:w-60 bg-slate-900 flex flex-col border-b md:border-b-0 md:border-r border-slate-800 shrink-0 select-none">
          {/* Logo Brand Header */}
          <div className="p-6">
            <div className="flex items-center gap-1.5">
              <h1 className="text-white font-bold text-xl tracking-tight uppercase">PROPLANEX</h1>
              <span className="text-[10px] bg-slate-800 text-indigo-400 font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-widest border border-slate-750 shrink-0">v2.5</span>
            </div>
            <p className="text-slate-400 text-[10px] uppercase tracking-widest mt-1">Next Gen Intelligence</p>
          </div>

          {/* Navigation Items list */}
          <div className="flex-1 px-4 space-y-1.5 overflow-y-auto">
            {/* W/Orders Tab */}
            <button
              onClick={() => setActiveTab("orders")}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 ${
                activeTab === "orders" 
                  ? "bg-indigo-600 text-white font-medium" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${activeTab === "orders" ? "bg-white" : "bg-slate-600"}`}></div>
              <span className="text-xs font-medium">Order Status</span>
            </button>

            {/* Yarn Stocks Tab */}
            <button
              onClick={() => setActiveTab("yarn")}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 ${
                activeTab === "yarn" 
                  ? "bg-indigo-600 text-white font-medium" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${activeTab === "yarn" ? "bg-white" : "bg-slate-600"}`}></div>
              <span className="text-xs font-medium">Yarn Inventory</span>
            </button>

            {/* Planning & Job Cards Tab */}
            <button
              onClick={() => setActiveTab("planning")}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 ${
                activeTab === "planning" 
                  ? "bg-indigo-600 text-white font-medium" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${activeTab === "planning" ? "bg-white" : "bg-slate-600"}`}></div>
              <span className="text-xs font-medium">Planning File</span>
            </button>

            {/* Knitting Logs Tab */}
            <button
              onClick={() => setActiveTab("production")}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 ${
                activeTab === "production" 
                  ? "bg-indigo-600 text-white font-medium" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${activeTab === "production" ? "bg-white" : "bg-slate-600"}`}></div>
              <span className="text-xs font-medium">Production Update</span>
            </button>

            {/* Gatepass Challans Tab */}
            <button
              onClick={() => setActiveTab("delivery")}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 ${
                activeTab === "delivery" 
                  ? "bg-indigo-600 text-white font-medium" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${activeTab === "delivery" ? "bg-white" : "bg-slate-600"}`}></div>
              <span className="text-xs font-medium">Delivery Module</span>
            </button>

            {/* Commercial Bill Tab */}
            <button
              onClick={() => setActiveTab("billing")}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 ${
                activeTab === "billing" 
                  ? "bg-indigo-600 text-white font-medium" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${activeTab === "billing" ? "bg-white" : "bg-slate-600"}`}></div>
              <span className="text-xs font-medium">Billing Section</span>
            </button>

            {/* Settings Tab */}
            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 ${
                activeTab === "settings" 
                  ? "bg-indigo-600 text-white font-medium" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${activeTab === "settings" ? "bg-white" : "bg-slate-600"}`}></div>
              <span className="text-xs font-medium">Settings Portal</span>
            </button>
          </div>

          {/* Admin panel footer profile */}
          <div className="p-4 border-t border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
              <Clock className="h-3.5 w-3.5 text-indigo-400" />
              <span className="truncate">{systemTime || "Connecting..."}</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center text-[10px] text-white">AD</div>
              <div>
                <p className="text-xs text-white font-semibold">Admin Panel</p>
                <p className="text-[10px] text-slate-500">v4.2.0-master</p>
              </div>
            </div>
          </div>
        </nav>

        {/* MAIN INNER CONTAINER */}
        <main className="flex-1 flex flex-col h-full min-h-screen overflow-hidden print:overflow-visible">
          {/* HEADER BAR - HIDDEN ON PRINT */}
          <header className="no-print h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
            <div className="text-sm font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span>PropLanex Portal Dashboard / </span>
              <span className="text-indigo-650 font-mono normal-case">
                {activeTab === "orders" ? "Master Orders Status" : 
                 activeTab === "yarn" ? "Yarn Inventory Stocks" : 
                 activeTab === "planning" ? "Planning & Job Cards File" : 
                 activeTab === "production" ? "Daily Production Updates" : 
                 activeTab === "delivery" ? "Gatepass & Deliveries" : 
                 activeTab === "billing" ? "Commercial Invoicing Accounts" : "System Settings"}
              </span>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-widest hidden lg:inline">Status: Secure Sandbox Node</span>
            </div>
          </header>

          {/* INNER VIEW CONTENT SCROLL CONTAINER */}
          <div id="pro_main" className="p-6 md:p-8 space-y-6 flex-1 overflow-y-auto bg-[#f8fafc] print:bg-white print:p-0">
            {renderActiveModule()}

            {/* FOOTER STRIP */}
            <div className="no-print flex justify-between items-center pt-8 border-t border-slate-250 text-[#94a3b8] font-semibold text-[10px]">
              <p className="italic">Precious Planning ● Synchronized Production ● Next Gen Intelligence</p>
              <p className="font-bold">POWERED BY PROPLANEX</p>
            </div>
          </div>
        </main>
      </div>
    </AppProvider>
  );
}


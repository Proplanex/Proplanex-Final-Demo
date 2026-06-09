import React, { useState } from "react";
import { useAppState } from "../context/AppContext";
import { Settings, Plus, Trash2, ShieldAlert, CheckCircle, HelpCircle } from "lucide-react";

export default function SettingsSection() {
  const { 
    companyProfile, updateCompanyProfile,
    machines, addMachine, deleteMachine,
    factories, addFactory, deleteFactory 
  } = useAppState();

  // Company profile values
  const [profileName, setProfileName] = useState(companyProfile.name);
  const [profileTagline, setProfileTagline] = useState(companyProfile.tagline);
  const [profileAddress, setProfileAddress] = useState(companyProfile.address);
  const [profilePhoneEmail, setProfilePhoneEmail] = useState(companyProfile.phoneEmail);
  const [profileMsg, setProfileMsg] = useState("");

  // Machine form parameters
  const [newMachNo, setNewMachNo] = useState("");
  const [newMachDia, setNewMachDia] = useState("");
  const [newMachGG, setNewMachGG] = useState("");

  // Factory form parameters
  const [newFactName, setNewFactName] = useState("");
  const [newFactAddress, setNewFactAddress] = useState("");

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      alert("Company Name is mandatory.");
      return;
    }
    updateCompanyProfile({
      name: profileName,
      tagline: profileTagline,
      address: profileAddress,
      phoneEmail: profilePhoneEmail
    });
    setProfileMsg("Company Profile updated successfully!");
    setTimeout(() => setProfileMsg(""), 3000);
  };

  const handleAddMachine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMachNo.trim() || !newMachDia || !newMachGG) {
      alert("Please fill in all machine details (Name/Number, Dia, Gauge)");
      return;
    }
    addMachine({
      machineNo: newMachNo,
      dia: Number(newMachDia),
      gg: Number(newMachGG)
    });
    setNewMachNo("");
    setNewMachDia("");
    setNewMachGG("");
  };

  const handleAddFactory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFactName.trim() || !newFactAddress.trim()) {
      alert("Please enter both Factory Partner Name and Address.");
      return;
    }
    addFactory({
      name: newFactName,
      address: newFactAddress
    });
    setNewFactName("");
    setNewFactAddress("");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* LEFT COLUMN: COMPANY PROFILE & POLICIES (col-span-5) */}
      <div className="col-span-1 lg:col-span-5 space-y-6">
        {/* Profile Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-slate-800 font-sans font-semibold">
            <Settings className="h-5 w-5 text-sky-600" />
            <h3 className="text-sm">My Company Profile Details</h3>
          </div>
          <p className="text-xs text-slate-400">Configure parameters printed on active Job Cards, dispatches, commercial invoices, and receipts.</p>

          <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-500 mb-1">Company legal Name</label>
              <input
                type="text"
                className="w-full p-2 border border-slate-200 rounded-lg font-semibold"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Slogan / Core Tagline</label>
              <input
                type="text"
                className="w-full p-2 border border-slate-200 rounded-lg text-slate-550"
                value={profileTagline}
                onChange={(e) => setProfileTagline(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Corporate Address Location</label>
              <textarea
                className="w-full p-2 border border-slate-200 rounded-lg text-slate-550 resize-none"
                rows={2}
                value={profileAddress}
                onChange={(e) => setProfileAddress(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Official phone & Contact Emails</label>
              <input
                type="text"
                className="w-full p-2 border border-slate-200 rounded-lg text-slate-550"
                value={profilePhoneEmail}
                onChange={(e) => setProfilePhoneEmail(e.target.value)}
              />
            </div>

            {profileMsg && (
              <div className="p-2 bg-emerald-50 text-emerald-800 text-[11px] rounded-lg border border-emerald-100 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> {profileMsg}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 rounded-xl cursor-pointer"
            >
              Update Company Settings
            </button>
          </form>
        </div>

        {/* Security Warning Panel */}
        <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 space-y-2.5 text-xs text-amber-900 leading-relaxed">
          <div className="flex items-center gap-1.5 font-semibold text-amber-850">
            <ShieldAlert className="h-4.5 w-4.5" />
            <span>Statutory Audit Regulations</span>
          </div>
          <p className="text-[11px] opacity-85">
            Manual override parameters remain subject to regulatory logs. Completing order contracts locks active planning, production, yarn dispatches, and delivery gates immediately. Alterations demand auditor confirmations.
          </p>
        </div>
      </div>

      {/* RIGHT COLUMN: MACHINES & FACTORIES CONFIG (col-span-7) */}
      <div className="col-span-1 lg:col-span-12 lg:col-span-7 space-y-6">
        
        {/* Machine Summary Configuration */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <div>
            <h3 className="font-sans font-semibold text-slate-800 text-sm">Machine Summary & Specifications</h3>
            <p className="text-xs text-slate-400 mt-1">Configure diameter and feed gauge configs for knitting machine arrays on the floor.</p>
          </div>

          <form onSubmit={handleAddMachine} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs items-end bg-slate-50 p-3 rounded-xl border border-slate-150">
            <div>
              <label className="block text-slate-500 mb-1">M/C No / ID</label>
              <input
                type="text"
                required
                className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                placeholder="e.g. M-111"
                value={newMachNo}
                onChange={(e) => setNewMachNo(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Diameter (Dia Inches)</label>
              <input
                type="number"
                required
                className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                placeholder="e.g. 44"
                value={newMachDia}
                onChange={(e) => setNewMachDia(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Gauge (GG Ratio)</label>
              <input
                type="number"
                required
                className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                placeholder="e.g. 18"
                value={newMachGG}
                onChange={(e) => setNewMachGG(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="h-4 w-4" /> Add M/C
            </button>
          </form>

          {/* Machine List Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[170px] overflow-y-auto pr-1">
            {machines.map((mach, idx) => (
              <div key={idx} className="p-2.5 bg-white border border-slate-150 rounded-xl flex items-center justify-between hover:border-slate-300 transition-colors shadow-3xs">
                <div>
                  <span className="font-mono font-bold text-slate-805 text-xs leading-none">{mach.machineNo}</span>
                  <span className="text-[10px] text-slate-400 block font-mono mt-0.5">{mach.dia} Dia x {mach.gg} GG</span>
                </div>
                <button
                  onClick={() => deleteMachine(mach.machineNo)}
                  className="p-1 text-slate-350 hover:text-red-500 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Running Factories Partners */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <div>
            <h3 className="font-sans font-semibold text-slate-800 text-sm">Running Factories Partners Registry</h3>
            <p className="text-xs text-slate-400 mt-1">Configure manufacturing partner stations for shipment dispatches and address filters.</p>
          </div>

          <form onSubmit={handleAddFactory} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 text-xs items-end bg-slate-50 p-3 rounded-xl border border-slate-150">
            <div className="sm:col-span-5">
              <label className="block text-slate-500 mb-1">Factory Name</label>
              <input
                type="text"
                required
                className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                placeholder="e.g. Apex Textiles"
                value={newFactName}
                onChange={(e) => setNewFactName(e.target.value)}
              />
            </div>
            <div className="sm:col-span-5">
              <label className="block text-slate-500 mb-1">Factory Address Details</label>
              <input
                type="text"
                required
                className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                placeholder="e.g. Gazipur, Bangladesh"
                value={newFactAddress}
                onChange={(e) => setNewFactAddress(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="sm:col-span-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="h-4 w-4" /> partner
            </button>
          </form>

          {/* Factories List */}
          <div className="space-y-2 max-h-[175px] overflow-y-auto pr-1">
            {factories.map((fac, idx) => (
              <div key={idx} className="p-3 bg-white border border-slate-150 rounded-xl flex items-center justify-between shadow-3xs">
                <div className="text-xs space-y-0.5">
                  <span className="font-semibold text-slate-800 block text-[11px]">{fac.name}</span>
                  <span className="text-slate-400 text-[10px] leading-tight block">{fac.address}</span>
                </div>
                <button
                  onClick={() => deleteFactory(fac.name)}
                  className="p-1 hover:bg-slate-50 rounded-lg text-slate-350 hover:text-red-500 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

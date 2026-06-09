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

  // Machine filter parameters
  const [filterNo, setFilterNo] = useState("");
  const [filterDia, setFilterDia] = useState("");
  const [filterGG, setFilterGG] = useState("");

  // Machine form modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalMachNo, setModalMachNo] = useState("");
  const [modalMachineType, setModalMachineType] = useState("Single Jersey");
  const [modalFabricType, setModalFabricType] = useState("SJ");
  const [modalBrand, setModalBrand] = useState("");
  const [modalOrigin, setModalOrigin] = useState("");
  const [modalRPM, setModalRPM] = useState("");
  const [modalDia, setModalDia] = useState("");
  const [modalGG, setModalGG] = useState("");
  const [modalFeeder, setModalFeeder] = useState("");

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

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalMachNo.trim() || !modalDia || !modalGG) {
      alert("Please fill in required machine details (Name, Dia, Gauge)");
      return;
    }
    addMachine({
      machineNo: modalMachNo.trim(),
      dia: Number(modalDia),
      gg: Number(modalGG),
      machineType: modalMachineType,
      fabricType: modalFabricType,
      brand: modalBrand.trim() || undefined,
      origin: modalOrigin.trim() || undefined,
      rpm: modalRPM ? Number(modalRPM) : undefined,
      feeder: modalFeeder ? Number(modalFeeder) : undefined
    });
    setShowAddModal(false);
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

          <form onSubmit={(e) => e.preventDefault()} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs items-end bg-slate-50 p-3 rounded-xl border border-slate-150">
            <div>
              <label className="block text-slate-500 mb-1">Filter M/C No / ID</label>
              <input
                type="text"
                className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                placeholder="Search No..."
                value={filterNo}
                onChange={(e) => setFilterNo(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Filter Dia (Inches)</label>
              <input
                type="text"
                className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                placeholder="Search Dia..."
                value={filterDia}
                onChange={(e) => setFilterDia(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Filter Gauge (GG)</label>
              <input
                type="text"
                className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                placeholder="Search GG..."
                value={filterGG}
                onChange={(e) => setFilterGG(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setModalMachNo("");
                setModalBrand("");
                setModalOrigin("");
                setModalRPM("");
                setModalDia("");
                setModalGG("");
                setModalFeeder("");
                setShowAddModal(true);
              }}
              className="bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="h-4 w-4" /> Add M/C
            </button>
          </form>

          {/* Machine List Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
            {(() => {
              const filtered = machines.filter(m => {
                const matchNo = m.machineNo.toLowerCase().includes(filterNo.toLowerCase());
                const matchDia = filterDia === "" || String(m.dia).includes(filterDia);
                const matchGG = filterGG === "" || String(m.gg).includes(filterGG);
                return matchNo && matchDia && matchGG;
              });

              if (filtered.length === 0) {
                return (
                  <div className="col-span-full text-center py-6 text-slate-400 italic">
                    No matching knitting machines found on floor.
                  </div>
                );
              }

              return filtered.map((mach, idx) => (
                <div key={idx} className="p-2.5 bg-white border border-slate-150 rounded-xl flex items-center justify-between hover:border-slate-300 transition-colors shadow-3xs">
                  <div className="space-y-0.5 max-w-[80%]">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="font-mono font-bold text-slate-800 text-xs leading-none">{mach.machineNo}</span>
                      {mach.brand && (
                        <span className="text-[9px] font-semibold bg-slate-100 text-slate-600 px-1 rounded truncate max-w-[65px]" title={mach.brand}>
                          {mach.brand}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      {mach.dia} Dia x {mach.gg} GG
                    </span>
                    {(mach.machineType || mach.fabricType) && (
                      <span className="text-[9px] text-sky-600 font-medium block truncate max-w-full">
                        {mach.machineType ? `${mach.machineType}` : ""} {mach.fabricType ? `(${mach.fabricType})` : ""}
                      </span>
                    )}
                    {(mach.origin || mach.rpm || mach.feeder) && (
                      <span className="text-[8px] text-slate-400 font-mono block truncate max-w-full">
                        {mach.origin ? `${mach.origin} ` : ""}{mach.rpm ? `@${mach.rpm}RPM ` : ""}{mach.feeder ? `| F:${mach.feeder}` : ""}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => deleteMachine(mach.machineNo)}
                    className="p-1 text-slate-350 hover:text-red-500 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ));
            })()}
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

      {/* ADD MACHINE MODAL POPUP */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-250 shadow-2xl max-w-sm w-full p-5 space-y-4 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-sans font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Settings className="h-4.5 w-4.5 text-sky-600" /> Add Knitting Machine Spec
              </h3>
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-650 font-bold text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-500 font-medium mb-1">M/C No / ID *</label>
                  <input
                    type="text"
                    required
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono placeholder-slate-350"
                    placeholder="e.g. M-111"
                    value={modalMachNo}
                    onChange={(e) => setModalMachNo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-medium mb-1">Machine Type *</label>
                  <select
                    className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                    value={modalMachineType}
                    onChange={(e) => setModalMachineType(e.target.value)}
                  >
                    <option value="Single Jersey">Single Jersey</option>
                    <option value="Double Jersey">Double Jersey</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Fabric Type Capability *</label>
                <select
                  className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                  value={modalFabricType}
                  onChange={(e) => setModalFabricType(e.target.value)}
                >
                  <option value="RIB">RIB</option>
                  <option value="Interlock">Interlock</option>
                  <option value="SJ">SJ</option>
                  <option value="Fleece">Fleece</option>
                  <option value="Auto Stripe SJ">Auto Stripe SJ</option>
                  <option value="Double Jersey Auto Stripe">Double Jersey Auto Stripe</option>
                  <option value="Single Jersey Jacquard">Single Jersey Jacquard</option>
                  <option value="Double Jersey Jacquard">Double Jersey Jacquard</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-500 font-medium mb-1">Machine Brand</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-slate-200 rounded-lg placeholder-slate-350"
                    placeholder="e.g. Fukuhara"
                    value={modalBrand}
                    onChange={(e) => setModalBrand(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-medium mb-1">Machine Origin</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-slate-200 rounded-lg placeholder-slate-350"
                    placeholder="e.g. Japan"
                    value={modalOrigin}
                    onChange={(e) => setModalOrigin(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-500 font-medium mb-1">Dia (Inches) *</label>
                  <input
                    type="number"
                    required
                    className="w-full p-2 border border-slate-200 rounded-lg placeholder-slate-350"
                    placeholder="e.g. 34"
                    value={modalDia}
                    onChange={(e) => setModalDia(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-medium mb-1">Gauge (GG) *</label>
                  <input
                    type="number"
                    required
                    className="w-full p-2 border border-slate-200 rounded-lg placeholder-slate-350"
                    placeholder="e.g. 24"
                    value={modalGG}
                    onChange={(e) => setModalGG(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-500 font-medium mb-1">RPM Speed</label>
                  <input
                    type="number"
                    className="w-full p-2 border border-slate-200 rounded-lg placeholder-slate-350"
                    placeholder="e.g. 25"
                    value={modalRPM}
                    onChange={(e) => setModalRPM(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-medium mb-1">Feeder Count</label>
                  <input
                    type="number"
                    className="w-full p-2 border border-slate-200 rounded-lg placeholder-slate-350"
                    placeholder="e.g. 96"
                    value={modalFeeder}
                    onChange={(e) => setModalFeeder(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 border border-slate-200 text-slate-600 font-bold py-2 rounded-lg hover:bg-slate-50 cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 rounded-lg cursor-pointer text-center"
                >
                  Save Machine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

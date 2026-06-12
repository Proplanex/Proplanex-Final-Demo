import React, { useState } from "react";
import { useAppState } from "../context/AppContext";
import GoogleSheetsSync from "./GoogleSheetsSync";
import { 
  Settings, Plus, Trash2, ShieldAlert, CheckCircle, Search, 
  Image, Factory, Phone, Mail, MapPin, User, Activity, Edit3
} from "lucide-react";
import { MachineConfig, RunningFactory } from "../types";

interface SettingsProps {
  readOnly?: boolean;
}

export default function SettingsSection({ readOnly = false }: SettingsProps) {
  const { 
    companyProfile, updateCompanyProfile,
    machines, addMachine, deleteMachine,
    factories, addFactory, deleteFactory,
    canCurrentUserDeleteData 
  } = useAppState();

  // Company profile states
  const [profileName, setProfileName] = useState(companyProfile.name || "");
  const [profileTagline, setProfileTagline] = useState(companyProfile.tagline || "");
  const [profileAddress, setProfileAddress] = useState(companyProfile.address || "");
  const [profilePhone, setProfilePhone] = useState(companyProfile.phone || "");
  const [profileEmail, setProfileEmail] = useState(companyProfile.email || "");
  const [profileLogoUrl, setProfileLogoUrl] = useState(companyProfile.logoUrl || "");
  const [profileMsg, setProfileMsg] = useState("");

  // Machine Search Filter controls
  const [filterNoInput, setFilterNoInput] = useState("");
  const [filterDiaInput, setFilterDiaInput] = useState("");
  const [filterGGInput, setFilterGGInput] = useState("");

  // Applied filter state (filters only update when search is clicked)
  const [appliedFilters, setAppliedFilters] = useState({
    no: "",
    dia: "",
    gg: ""
  });

  // Machine Add Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState<"Single Jersey" | "Double Jersey">("Single Jersey");
  const [modalKnitType, setModalKnitType] = useState("SJ");
  const [modalBrand, setModalBrand] = useState("");
  const [modalOrigin, setModalOrigin] = useState("");
  const [modalCode, setModalCode] = useState("");
  const [modalMachNo, setModalMachNo] = useState("");
  const [modalRPM, setModalRPM] = useState("");
  const [modalDia, setModalDia] = useState("");
  const [modalGG, setModalGG] = useState("");
  const [modalFeeder, setModalFeeder] = useState("");
  const [modalEfficiency, setModalEfficiency] = useState("");
  const [modalCapacity, setModalCapacity] = useState("");

  // Factory Modal popup state
  const [showFactoryModal, setShowFactoryModal] = useState(false);
  const [facName, setFacName] = useState("");
  const [facLocation, setFacLocation] = useState("");
  const [facPerson, setFacPerson] = useState("");
  const [facDesignation, setFacDesignation] = useState("");
  const [facPhone, setFacPhone] = useState("");
  const [facEmail, setFacEmail] = useState("");

  // Handle Logo Upload as Base64 Data URL
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 700) {
      alert("Image is too large! Please choose a file smaller than 700KB to ensure smooth database backup synchronization.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setProfileLogoUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) {
      alert("You are in Read Only mode. Cannot modify settings.");
      return;
    }
    if (!profileName.trim()) {
      alert("Company Name is required!");
      return;
    }

    updateCompanyProfile({
      name: profileName,
      tagline: profileTagline,
      address: profileAddress,
      phoneEmail: `Phone: ${profilePhone} | Email: ${profileEmail}`,
      phone: profilePhone,
      email: profileEmail,
      logoUrl: profileLogoUrl
    });

    setProfileMsg("Company Profile updated successfully!");
    setTimeout(() => setProfileMsg(""), 3000);
  };

  const handleMachineSearchClick = () => {
    setAppliedFilters({
      no: filterNoInput,
      dia: filterDiaInput,
      gg: filterGGInput
    });
  };

  const handleMachineResetClick = () => {
    setFilterNoInput("");
    setFilterDiaInput("");
    setFilterGGInput("");
    setAppliedFilters({ no: "", dia: "", gg: "" });
  };

  // Dynamically update Knit Type when Machine Type changes, of high design standard
  const handleMachineTypeChange = (type: "Single Jersey" | "Double Jersey") => {
    setModalType(type);
    if (type === "Single Jersey") {
      setModalKnitType("SJ");
    } else {
      setModalKnitType("RIB");
    }
  };

  const handleAddMachineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    if (!modalMachNo.trim() || !modalDia || !modalGG) {
      alert("Machine No, Dia and Gauge are required fields.");
      return;
    }

    const newMachine: MachineConfig = {
      machineNo: modalMachNo.trim(),
      dia: Number(modalDia),
      gg: Number(modalGG),
      machineType: modalType,
      fabricType: modalKnitType,
      brand: modalBrand.trim() || undefined,
      origin: modalOrigin.trim() || undefined,
      code: modalCode.trim() || undefined,
      rpm: modalRPM ? Number(modalRPM) : undefined,
      feeder: modalFeeder ? Number(modalFeeder) : undefined,
      efficiency: modalEfficiency ? Number(modalEfficiency) : undefined,
      capacityPerDay: modalCapacity ? Number(modalCapacity) : undefined
    };

    addMachine(newMachine);
    setShowAddModal(false);

    // Reset machine form states
    setModalMachNo("");
    setModalBrand("");
    setModalOrigin("");
    setModalCode("");
    setModalRPM("");
    setModalDia("");
    setModalGG("");
    setModalFeeder("");
    setModalEfficiency("");
    setModalCapacity("");
  };

  const handleAddFactorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    if (!facName.trim() || !facLocation.trim()) {
      alert("Factory Name and Address are required!");
      return;
    }

    const newFactory: RunningFactory = {
      name: facName.trim(),
      address: facLocation.trim(),
      responsiblePerson: facPerson.trim() || undefined,
      designation: facDesignation.trim() || undefined,
      phone: facPhone.trim() || undefined,
      email: facEmail.trim() || undefined
    };

    addFactory(newFactory);
    setShowFactoryModal(false);

    // Reset factory form
    setFacName("");
    setFacLocation("");
    setFacPerson("");
    setFacDesignation("");
    setFacPhone("");
    setFacEmail("");
  };

  // Filtered Machines calculated on applied filter state
  const filteredMachines = machines.filter(m => {
    const matchNo = m.machineNo.toLowerCase().includes(appliedFilters.no.toLowerCase());
    const matchDia = appliedFilters.dia === "" || String(m.dia).includes(appliedFilters.dia);
    const matchGG = appliedFilters.gg === "" || String(m.gg).includes(appliedFilters.gg);
    return matchNo && matchDia && matchGG;
  });

  return (
    <div className="space-y-6">
      
      {/* Read Only Access Alert Indicator */}
      {readOnly && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-800 text-xs shadow-3xs leading-relaxed animate-pulse">
          <ShieldAlert className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold uppercase tracking-wide text-[10px] font-mono">Access Level: Read-Only Channel</p>
            <p className="opacity-80 mt-0.5">Your user account credentials operate on Read-Only access for Settings section. Creating machines, updating registries, and changing profiles is restricted.</p>
          </div>
        </div>
      )}

      {/* Google Sheets Sync Integration Panel */}
      <GoogleSheetsSync />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: COMPANY PROFILE EDIT (col-span-12 or col-span-5) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-100 shadow-3xs space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
            <Edit3 className="h-4.5 w-4.5 text-indigo-600" />
            <div>
              <h3 className="font-sans font-bold text-slate-800 text-sm">My Company Profile</h3>
              <p className="text-[11px] text-slate-400">Configure core factory credentials displayed on all bills and challans.</p>
            </div>
          </div>

          {profileMsg && (
            <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-emerald-600 animate-bounce" />
              <span>{profileMsg}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            {/* Logo upload field */}
            <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-150 flex flex-col sm:flex-row items-center gap-4">
              <div className="h-16 w-16 rounded-xl border border-slate-200 overflow-hidden bg-white flex items-center justify-center relative shadow-3xs shrink-0 select-none">
                {profileLogoUrl ? (
                  <img 
                    src={profileLogoUrl} 
                    alt="Company Logo Preview" 
                    className="h-full w-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Image className="h-6 w-6 text-slate-400" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">Company Logo Upload</label>
                <input
                  type="file"
                  accept="image/*"
                  disabled={readOnly}
                  onChange={handleLogoChange}
                  className="block text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer disabled:opacity-50"
                />
                <p className="text-[9px] text-slate-400">Supported formats: JPG, PNG, SG. Max size 2MB</p>
              </div>
            </div>

            <div>
              <label className="block text-slate-500 mb-1 font-semibold">Company Name *</label>
              <input
                type="text"
                required
                disabled={readOnly}
                placeholder="PROPLANEX APPARELS"
                className="w-full p-2.5 border border-slate-200 rounded-lg bg-white disabled:bg-slate-50 disabled:text-slate-400 font-bold"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1 font-semibold">Company Tagline (Logo Subtitle)</label>
              <input
                type="text"
                disabled={readOnly}
                placeholder="Precious Planning ● Synchronized Production ● Next Gen Intelligence"
                className="w-full p-2.5 border border-slate-200 rounded-lg bg-white disabled:bg-slate-50 disabled:text-slate-400 italic"
                value={profileTagline}
                onChange={(e) => setProfileTagline(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1 font-semibold">Company Address *</label>
              <textarea
                required
                disabled={readOnly}
                rows={2}
                placeholder="Enter workspace address..."
                className="w-full p-2.5 border border-slate-200 rounded-lg bg-white disabled:bg-slate-50 disabled:text-slate-400 resize-none"
                value={profileAddress}
                onChange={(e) => setProfileAddress(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Phone Number</label>
                <input
                  type="text"
                  disabled={readOnly}
                  placeholder="+880 2 8931234"
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-white disabled:bg-slate-50 disabled:text-slate-400 font-mono"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Email Address</label>
                <input
                  type="email"
                  disabled={readOnly}
                  placeholder="production@proplanex.com"
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-white disabled:bg-slate-50 disabled:text-slate-400"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={readOnly}
              className="w-full bg-indigo-600 hover:bg-indigo-750 text-white font-bold py-2.5 rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-center"
            >
              Update Company Profile
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: MACHINES & FACTORIES CONFIG (col-span-12 or col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Machine Summary & Specifications Configuration */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-3xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-50 pb-3">
              <div>
                <h3 className="font-sans font-bold text-slate-800 text-sm">Machine Summary Registry</h3>
                <p className="text-[11px] text-slate-400">Define specifications, codes, performance levels, and speeds of knitting machines.</p>
              </div>
              <button
                type="button"
                disabled={readOnly}
                onClick={() => setShowAddModal(true)}
                className="bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[11px] font-bold py-1.5 px-3 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="h-4.5 w-4.5" /> Add Machine
              </button>
            </div>

            {/* Searching Filters Form */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs items-end bg-slate-50/50 p-3.5 rounded-xl border border-slate-150">
              <div>
                <label className="block text-slate-400 mb-1 font-mono text-[9px] uppercase tracking-wide">M/C No / ID</label>
                <input
                  type="text"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                  placeholder="e.g. M-101"
                  value={filterNoInput}
                  onChange={(e) => setFilterNoInput(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-mono text-[9px] uppercase tracking-wide">Dia (Inches)</label>
                <input
                  type="text"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                  placeholder="e.g. 34"
                  value={filterDiaInput}
                  onChange={(e) => setFilterDiaInput(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-mono text-[9px] uppercase tracking-wide">Gauge (GG)</label>
                <input
                  type="text"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg"
                  placeholder="e.g. 24"
                  value={filterGGInput}
                  onChange={(e) => setFilterGGInput(e.target.value)}
                />
              </div>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={handleMachineSearchClick}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-3 rounded-lg flex-1 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Search className="h-3.5 w-3.5" /> Filter
                </button>
                <button
                  type="button"
                  onClick={handleMachineResetClick}
                  className="bg-slate-205 hover:bg-slate-300 text-slate-600 font-bold py-2.5 px-2 rounded-lg cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Machine List Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
              {filteredMachines.length === 0 ? (
                <div className="col-span-full text-center py-8 text-slate-400 italic text-xs">
                  No matching knitting machines registered or filtered.
                </div>
              ) : (
                filteredMachines.map((mach, idx) => (
                  <div key={idx} className="p-3 bg-white border border-slate-150 rounded-xl hover:border-slate-300 transition-colors shadow-3xs space-y-2 relative select-none">
                    
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-slate-900 text-xs leading-none">{mach.machineNo}</span>
                          {mach.code && (
                            <span className="text-[8px] font-mono bg-slate-100 text-slate-500 px-1 py-0.5 rounded">
                              Code: {mach.code}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold block">
                          {mach.dia} Dia x {mach.gg} GG
                        </span>
                      </div>
                      
                      {!readOnly && canCurrentUserDeleteData() && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete machine ${mach.machineNo}?`)) {
                              deleteMachine(mach.machineNo);
                            }
                          }}
                          className="p-1 text-slate-300 hover:text-red-500 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 border-t border-slate-50 pt-2 text-[9px] font-mono text-slate-500">
                      <div>
                        <span className="text-slate-400 uppercase text-[8px] font-bold block">M/C Type:</span>
                        <p className="text-slate-700 truncate font-semibold font-sans">{mach.machineType || "Single Jersey"}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 uppercase text-[8px] font-bold block">Knit Type:</span>
                        <p className="text-sky-600 truncate font-semibold font-sans">{mach.fabricType || "N/A"}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1 bg-slate-50 p-1.5 rounded-lg text-[8px] font-mono text-slate-400">
                      <div className="text-center">
                        <p className="text-slate-600 font-bold leading-none">{mach.rpm || "-"}</p>
                        <span className="mt-0.5 block scale-90">RPM</span>
                      </div>
                      <div className="text-center border-x border-slate-200">
                        <p className="text-emerald-600 font-semibold leading-none">{mach.efficiency ? `${mach.efficiency}%` : "-"}</p>
                        <span className="mt-0.5 block scale-90">EFF.</span>
                      </div>
                      <div className="text-center">
                        <p className="text-indigo-600 font-bold leading-none">{mach.capacityPerDay ? `${mach.capacityPerDay}k` : "-"}</p>
                        <span className="mt-0.5 block scale-90">CAP/D</span>
                      </div>
                    </div>

                    {mach.brand && (
                      <p className="text-[8px] text-slate-400 truncate pt-1 border-t border-slate-100">
                        Brand: <span className="text-slate-600 font-semibold font-sans">{mach.brand}</span>
                        {mach.origin ? ` (${mach.origin})` : ""}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Running Factories Registry */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-3xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-50 pb-3">
              <div>
                <h3 className="font-sans font-bold text-slate-800 text-sm">Running Factories Registry</h3>
                <p className="text-[11px] text-slate-400">Manage external manufacturing partner centers, locations, and representatives.</p>
              </div>
              <button
                type="button"
                disabled={readOnly}
                onClick={() => setShowFactoryModal(true)}
                className="bg-indigo-650 hover:bg-indigo-750 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[11px] font-bold py-1.5 px-3 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="h-4.5 w-4.5" /> Add Factory
              </button>
            </div>

            {/* Factories Ledger Table */}
            <div className="overflow-x-auto border border-slate-150 rounded-xl select-none">
              <table className="w-full text-left text-xs text-slate-700 min-w-[600px] table-auto border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-mono text-[9px] text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3.5">Factory Name</th>
                    <th className="py-2.5 px-2">Responsible Person</th>
                    <th className="py-2.5 px-2">Contacts</th>
                    <th className="py-2.5 px-2">Location</th>
                    {!readOnly && <th className="py-2.5 px-3 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {factories.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 italic">No partners registered.</td>
                    </tr>
                  ) : (
                    factories.map((fac, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/40">
                        <td className="py-3 px-3.5 font-semibold text-slate-900">{fac.name}</td>
                        <td className="py-3 px-2">
                          {fac.responsiblePerson ? (
                            <div>
                              <p className="font-medium text-slate-850">{fac.responsiblePerson}</p>
                              {fac.designation && <p className="text-[9px] text-slate-400 italic font-mono">{fac.designation}</p>}
                            </div>
                          ) : (
                            <span className="text-slate-350 italic">-</span>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          <div className="space-y-0.5 text-[10px] font-mono text-slate-500">
                            {fac.phone && <p className="flex items-center gap-0.5"><Phone className="h-2.5 w-2.5 text-slate-400" /> {fac.phone}</p>}
                            {fac.email && <p className="flex items-center gap-0.5"><Mail className="h-2.5 w-2.5 text-slate-400" /> {fac.email}</p>}
                            {!fac.phone && !fac.email && <span className="text-slate-350 italic">-</span>}
                          </div>
                        </td>
                        <td className="py-3 px-2 max-w-[150px] truncate" title={fac.address}>{fac.address}</td>
                        {!readOnly && canCurrentUserDeleteData() && (
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete factory ${fac.name}?`)) {
                                  deleteFactory(fac.name);
                                }
                              }}
                              className="p-1 text-slate-300 hover:text-red-500 hover:bg-slate-50 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

      {/* ADD MACHINE SPECIFICATION POPUP MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in select-none">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-sans font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Settings className="h-4.5 w-4.5 text-indigo-600 animate-spin" />
                <span>Knitting Machine Specification Setup</span>
              </h3>
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMachineSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Machine Type *</label>
                  <select
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-white font-medium"
                    value={modalType}
                    onChange={(e) => handleMachineTypeChange(e.target.value as any)}
                  >
                    <option value="Single Jersey">Single Jersey</option>
                    <option value="Double Jersey">Double Jersey</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Knit Type (Knit Spec) *</label>
                  <select
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-white font-medium"
                    value={modalKnitType}
                    onChange={(e) => setModalKnitType(e.target.value)}
                  >
                    {modalType === "Single Jersey" ? (
                      <>
                        <option value="SJ">SJ</option>
                        <option value="Fleece">Fleece</option>
                        <option value="Auto Stripe SJ">Auto Stripe SJ</option>
                        <option value="Jacquard SJ">Jacquard SJ</option>
                      </>
                    ) : (
                      <>
                        <option value="RIB">RIB</option>
                        <option value="Interlock">Interlock</option>
                        <option value="Double Jersey Auto Stripe">Double Jersey Auto Stripe</option>
                        <option value="Double Jersey Jacquard">Double Jersey Jacquard</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Machine Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MC-01"
                    className="w-full p-2.5 border border-slate-200 rounded-lg placeholder-slate-400"
                    value={modalCode}
                    onChange={(e) => setModalCode(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Machine No / ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. M-11"
                    className="w-full p-2.5 border border-slate-200 rounded-lg placeholder-slate-400 font-mono"
                    value={modalMachNo}
                    onChange={(e) => setModalMachNo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Machine Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. Fukuhara"
                    className="w-full p-2.5 border border-slate-200 rounded-lg placeholder-slate-400"
                    value={modalBrand}
                    onChange={(e) => setModalBrand(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Machine Origin</label>
                  <input
                    type="text"
                    placeholder="e.g. Japan"
                    className="w-full p-2.5 border border-slate-200 rounded-lg placeholder-slate-400"
                    value={modalOrigin}
                    onChange={(e) => setModalOrigin(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Dia (Inches) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 34"
                    className="w-full p-2.5 border border-slate-200 rounded-lg placeholder-slate-400"
                    value={modalDia}
                    onChange={(e) => setModalDia(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Gauge (GG) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 24"
                    className="w-full p-2.5 border border-slate-200 rounded-lg placeholder-slate-400"
                    value={modalGG}
                    onChange={(e) => setModalGG(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3.5">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">RPM Speed</label>
                  <input
                    type="number"
                    placeholder="25"
                    className="w-full p-2.5 border border-slate-200 rounded-lg placeholder-slate-400"
                    value={modalRPM}
                    onChange={(e) => setModalRPM(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">No. Of Feeder</label>
                  <input
                    type="number"
                    placeholder="96"
                    className="w-full p-2.5 border border-slate-200 rounded-lg placeholder-slate-400"
                    value={modalFeeder}
                    onChange={(e) => setModalFeeder(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Efficiency (%)</label>
                  <input
                    type="number"
                    placeholder="85"
                    className="w-full p-2.5 border border-slate-200 rounded-lg placeholder-slate-400"
                    value={modalEfficiency}
                    onChange={(e) => setModalEfficiency(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Capacity/Day (Kg)</label>
                  <input
                    type="number"
                    placeholder="350"
                    className="w-full p-2.5 border border-slate-200 rounded-lg placeholder-slate-400"
                    value={modalCapacity}
                    onChange={(e) => setModalCapacity(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-3.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 border border-slate-200 text-slate-600 font-semibold py-2.5 rounded-xl hover:bg-slate-50 cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl cursor-pointer text-center"
                >
                  Register Machine System
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD FACTORY PARTNER POPUP MODAL */}
      {showFactoryModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in select-none">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-sans font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Factory className="h-4.5 w-4.5 text-indigo-600" />
                <span>Partner Factory Configuration</span>
              </h3>
              <button 
                type="button"
                onClick={() => setShowFactoryModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddFactorySubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-500 font-semibold mb-1">Factory Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Spinning & Knitting Mills"
                  className="w-full p-2.5 border border-slate-200 rounded-lg placeholder-slate-400"
                  value={facName}
                  onChange={(e) => setFacName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Responsible Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Raison Ahmed"
                    className="w-full p-2.5 border border-slate-200 rounded-lg placeholder-slate-400"
                    value={facPerson}
                    onChange={(e) => setFacPerson(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Fabric Manager"
                    className="w-full p-2.5 border border-slate-200 rounded-lg placeholder-slate-400"
                    value={facDesignation}
                    onChange={(e) => setFacDesignation(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+880 1711222333"
                    className="w-full p-2.5 border border-slate-200 rounded-lg placeholder-slate-350 font-mono"
                    value={facPhone}
                    onChange={(e) => setFacPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="manager@apex.com"
                    className="w-full p-2.5 border border-slate-200 rounded-lg placeholder-slate-350"
                    value={facEmail}
                    onChange={(e) => setFacEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Location Address *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Kaliakoir, Gazipur, Bangladesh"
                  className="w-full p-2.5 border border-slate-200 rounded-lg placeholder-slate-400 resize-none"
                  value={facLocation}
                  onChange={(e) => setFacLocation(e.target.value)}
                />
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowFactoryModal(false)}
                  className="flex-1 border border-slate-200 text-slate-600 font-semibold py-2.5 rounded-xl hover:bg-slate-50 cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-750 text-white font-bold py-2.5 rounded-xl cursor-pointer text-center"
                >
                  Save Partner Station
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

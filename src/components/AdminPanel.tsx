import React, { useState } from "react";
import { useAppState } from "../context/AppContext";
import { 
  Users, Plus, Trash2, Shield, Key, Eye, Lock, Edit, Check, CheckCircle2, UserCheck, Upload, QrCode, Award
} from "lucide-react";
import { AppUser, ModulePermissions } from "../types";

export default function AdminPanel() {
  const { 
    users, currentUser, addUser, deleteUser, changeUserPassword, 
    updateUserPermissions, trialDays, trialExpirationDate, updateTrialLimit,
    poweredByProfile, updatePoweredByProfile, canCurrentUserDeleteData 
  } = useAppState();

  const [newUserId, setNewUserId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPermissions, setNewPermissions] = useState<ModulePermissions>({
    orders: "Read/Write",
    yarn: "Read/Write",
    planning: "Read/Write",
    production: "Read/Write",
    delivery: "Read/Write",
    billing: "Read/Write",
    settings: "Read/Write",
    admin: "Hide",
    machineload: "Read/Write"
  });

  const [selectedUserForEdit, setSelectedUserForEdit] = useState<AppUser | null>(null);
  const [editPassword, setEditPassword] = useState("");
  const [actionMsg, setActionMsg] = useState("");

  const [poweredName, setPoweredName] = useState(poweredByProfile?.name || "");
  const [poweredSlogan, setPoweredSlogan] = useState(poweredByProfile?.slogan || "");
  const [poweredLogoUrl, setPoweredLogoUrl] = useState(poweredByProfile?.logoUrl || "");
  const [poweredQrUrl, setPoweredQrUrl] = useState(poweredByProfile?.qrCodeUrl || "");

  const isSuperAdmin = currentUser?.userId.toLowerCase() === "superadmin";

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserId.trim() || !newPassword) {
      alert("Please fill in User ID and password!");
      return;
    }
    
    const newUser: AppUser = {
      userId: newUserId.trim(),
      password: newPassword,
      permissions: { ...newPermissions }
    };

    addUser(newUser);
    setNewUserId("");
    setNewPassword("");
    // reset permissions
    setNewPermissions({
      orders: "Read/Write",
      yarn: "Read/Write",
      planning: "Read/Write",
      production: "Read/Write",
      delivery: "Read/Write",
      billing: "Read/Write",
      settings: "Read/Write",
      admin: "Hide",
      machineload: "Read/Write"
    });

    setActionMsg("User created successfully!");
    setTimeout(() => setActionMsg(""), 3000);
  };

  const handleUpdatePassword = (userId: string) => {
    const newPsw = prompt(`Enter new password for ${userId}:`);
    if (newPsw === null) return; // cancel
    if (!newPsw.trim()) {
      alert("Password cannot be blank!");
      return;
    }
    changeUserPassword(userId, newPsw.trim());
    setActionMsg(`Password for ${userId} updated!`);
    setTimeout(() => setActionMsg(""), 3000);
  };

  const handlePermissionChange = (userId: string, module: keyof ModulePermissions, val: "Read Only" | "Read/Write" | "Hide") => {
    const userToEdit = users.find(u => u.userId.toLowerCase() === userId.toLowerCase());
    if (!userToEdit) return;

    if (userId.toLowerCase() === "admin@proplanex.com" && module === "admin" && val !== "Read/Write") {
      alert("Cannot restrict the core administrator from their own Admin Panel!");
      return;
    }

    const updatedPermissions = {
      ...userToEdit.permissions,
      [module]: val
    };

    updateUserPermissions(userId, updatedPermissions);
    setActionMsg(`Updated permissions for ${userId}!`);
    setTimeout(() => setActionMsg(""), 2000);
  };

  const handleSetTrial = (days: string) => {
    updateTrialLimit(days);
    setActionMsg(`Workspace working limit set to ${days}!`);
    setTimeout(() => setActionMsg(""), 3000);
  };

  const handlePoweredByLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024 * 2) {
      alert("Image is too large! Please choose a file smaller than 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPoweredLogoUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePoweredByQrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024 * 2) {
      alert("Image is too large! Please choose a file smaller than 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPoweredQrUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSavePoweredBy = (e: React.FormEvent) => {
    e.preventDefault();
    updatePoweredByProfile({
      name: poweredName.trim(),
      slogan: poweredSlogan.trim(),
      logoUrl: poweredLogoUrl,
      qrCodeUrl: poweredQrUrl
    });
    setActionMsg("Developer 'Powered By' branding updated successfully!");
    setTimeout(() => setActionMsg(""), 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* SUPERADMIN TRIAL CONTROL BAR */}
      {isSuperAdmin && (
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-6 rounded-2xl border border-indigo-700/30 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-800 pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-400" />
              <div>
                <h3 className="font-bold text-sm tracking-tight">Super Administrator Control Center</h3>
                <p className="text-[10px] text-indigo-300">Set and renew custom workspace working limit limits.</p>
              </div>
            </div>
            
            <div className="text-right text-xs">
              <span className="text-indigo-300 font-mono">Current Limit: </span>
              <strong className="text-emerald-400 font-mono uppercase bg-emerald-950/50 px-2.5 py-1 rounded border border-emerald-900/60 ml-1">{trialDays}</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Limit Selector options */}
            <div className="md:col-span-8">
              <label className="block text-[10px] text-indigo-200 uppercase tracking-widest font-mono font-bold mb-2">Select working Authorization Period</label>
              <div className="flex flex-wrap gap-2">
                {["1 Day", "3 Days", "7 Days", "15 Days", "30 Days", "No Limit"].map((opt) => {
                  const isActive = trialDays === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => handleSetTrial(opt)}
                      className={`text-xs px-3.5 py-2 rounded-xl font-semibold cursor-pointer transition-all ${
                        isActive
                          ? "bg-indigo-600 text-white border border-indigo-450 shadow-sm"
                          : "bg-slate-950/60 hover:bg-slate-950 text-slate-300 border border-slate-800"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-4 bg-slate-950/40 border border-slate-800 p-3 rounded-xl text-xs font-mono">
              <p className="text-slate-400">Expiration Status:</p>
              <p className="text-white mt-1">
                {trialExpirationDate ? (
                  <>
                    Active Until: <strong className="text-indigo-400">{trialExpirationDate}</strong>
                  </>
                ) : (
                  <strong className="text-emerald-400">UNRESTRICTED RUNTIME</strong>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* POWERED BY BRANDING SECTION - ONLY VISIBLE TO SUPERADMIN */}
      {isSuperAdmin && (
        <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-indigo-600 animate-pulse" />
              <div>
                <h3 className="font-bold text-sm text-slate-850">Technical Developer 'Powered By' Print Settings</h3>
                <p className="text-[10px] text-slate-400">Configure signature software licensing, company logo, and scan validation QR codes.</p>
              </div>
            </div>
            <span className="text-[9px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded font-bold uppercase tracking-wider self-start sm:self-auto shadow-3xs">
              Superadmin Restricted Gate
            </span>
          </div>

          <form onSubmit={handleSavePoweredBy} className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Left Side of Footer */}
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-150 space-y-4">
                <div className="flex items-center gap-1.5 border-b border-slate-200/50 pb-2">
                  <span className="text-xs font-bold text-slate-700 tracking-wide uppercase font-mono">“Left Side of the Footer” Layout</span>
                </div>
                
                {/* Company Logo Upload & Preview */}
                <div className="space-y-3">
                  <label className="block text-[11px] font-bold text-slate-700">Logo Upload</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white border border-slate-200 rounded-lg flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-3xs">
                      {poweredLogoUrl ? (
                        <img src={poweredLogoUrl} alt="Logo preview" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono italic">No Logo</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handlePoweredByLogoChange} 
                        className="text-[11px] text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-750 cursor-pointer"
                      />
                      <p className="text-[9px] text-slate-400 mt-1">Recommended: Base64 compatible format, max size 2MB.</p>
                    </div>
                  </div>
                </div>

                {/* Company Name & Slogan */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Company Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. PROPLANEX SOFTWARE LTD"
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg placeholder-slate-400 font-semibold text-slate-800 focus:outline-indigo-650"
                      value={poweredName}
                      onChange={(e) => setPoweredName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Slogan</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Engineered by Proplanex Technologies Co."
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg placeholder-slate-400 text-slate-750 focus:outline-indigo-650"
                      value={poweredSlogan}
                      onChange={(e) => setPoweredSlogan(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Key Scan Qr Code Upload */}
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-150 space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-1.5 border-b border-slate-200/50 pb-2">
                    <span className="text-xs font-bold text-slate-700 tracking-wide uppercase font-mono">“Right Side” Layout</span>
                  </div>

                  {/* QR Code Upload & Preview */}
                  <div className="space-y-3">
                    <label className="block text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <QrCode className="h-3.5 w-3.5 text-indigo-500" />
                      <span>QR Code Scan Upload</span>
                    </label>
                    
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-white border border-slate-200 rounded-lg flex items-center justify-center p-1.5 overflow-hidden shrink-0 shadow-3xs">
                        {poweredQrUrl ? (
                          <img src={poweredQrUrl} alt="QR Code Preview" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono italic">No QR</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handlePoweredByQrChange} 
                          className="text-[11px] text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-750 cursor-pointer"
                        />
                        <p className="text-[9px] text-slate-400 mt-1 font-sans">Upload your company scanner verification or registration QR asset.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-lg text-xs leading-relaxed text-slate-650 space-y-1 mt-2 lg:mt-0">
                  <p className="font-semibold text-indigo-800">Dynamic Signature Binding</p>
                  <p className="text-[10px] text-slate-500 text-justify">
                    Once updated and saved, these custom items dynamically compile in real time on the footer section of every printable and exportable document.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button 
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-6 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-[0.98] transition-all"
              >
                <Upload className="h-3.5 w-3.5 animate-bounce" />
                <span>Update Developer Branding & Print Footers</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FEEDBACK STATUS ALERT */}
      {actionMsg && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 flex items-center gap-1.5 text-xs font-mono font-bold">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 animate-bounce" />
          <span>{actionMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* ADD MEMBER USER FORM (col-span-4) */}
        <div className="xl:col-span-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs space-y-4">
          <div className="flex items-center gap-2 text-slate-850 font-bold text-sm border-b border-slate-50 pb-3">
            <Plus className="h-4.5 w-4.5 text-indigo-600" />
            <h3>Add New Member Account</h3>
          </div>

          <form onSubmit={handleAddUser} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-500 mb-1 font-semibold">User ID *</label>
              <input
                type="text"
                required
                placeholder="e.g. user@proplanex.com"
                className="w-full p-2.5 border border-slate-200 rounded-lg placeholder-slate-400"
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1 font-semibold">Security Password *</label>
              <input
                type="text"
                required
                placeholder="Assign a password"
                className="w-full p-2.5 border border-slate-200 rounded-lg placeholder-slate-400 font-mono"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            {/* Default Permission Set for new users */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-150/65 space-y-2.5">
              <p className="text-[10px] font-mono font-bold text-indigo-600 uppercase tracking-widest">Initial Module Access Permissions</p>
              
                {Object.keys(newPermissions).map((moduleKey) => {
                  const k = moduleKey as keyof ModulePermissions;
                  const label = 
                    k === "orders" ? "Order Status" :
                    k === "yarn" ? "Yarn Inventory" :
                    k === "planning" ? "Planning File" :
                    k === "production" ? "Production Update" :
                    k === "delivery" ? "Delivery Section" :
                    k === "billing" ? "Billing Section" :
                    k === "settings" ? "Settings Portal" :
                    k === "machineload" ? "Machine Load" : "Admin Panel";

                return (
                  <div key={k} className="flex items-center justify-between gap-2 border-b border-slate-200/50 pb-1.5 last:border-b-0 last:pb-0">
                    <span className="text-[11px] font-medium text-slate-600">{label}</span>
                    <select
                      className="bg-white border border-slate-200 p-1 rounded font-mono text-[10px]"
                      value={newPermissions[k]}
                      onChange={(e) => {
                        setNewPermissions(prev => ({
                          ...prev,
                          [k]: e.target.value as any
                        }));
                      }}
                    >
                      <option value="Read/Write">Read/Write</option>
                      <option value="Read Only">Read Only</option>
                      <option value="Hide">Hide</option>
                    </select>
                  </div>
                );
              })}
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl cursor-pointer"
            >
              Add User Member
            </button>
          </form>
        </div>

        {/* REGISTERED USERS LIST & DETAILED PERMISSION TABLE (col-span-8) */}
        <div className="xl:col-span-8 bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs space-y-4">
          <div className="flex items-center gap-2 text-slate-850 font-bold text-sm border-b border-slate-100 pb-3">
            <Users className="h-4.5 w-4.5 text-indigo-600" />
            <h3>Registered User Accounts & Access Matrix</h3>
          </div>

          <div className="overflow-x-auto border border-slate-150 rounded-xl">
            <table className="w-full text-left text-xs text-slate-700 border-collapse table-auto min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono uppercase text-[9px] tracking-wider">
                  <th className="py-2.5 px-3">User ID</th>
                  <th className="py-2.5 px-2">Password</th>
                  <th className="py-2.5 px-2 text-center">Module Permissions Grid</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {users.map((usr) => {
                  const isPrimaryAdmin = usr.userId.toLowerCase() === "admin@proplanex.com";
                  return (
                    <tr key={usr.userId} className="hover:bg-slate-50/40">
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{usr.userId}</span>
                          {isPrimaryAdmin && (
                            <span className="text-[8px] bg-sky-200 text-sky-800 font-mono font-bold uppercase rounded px-1.5 py-0.5" title="Administrator access">
                              ADMINISTRATOR
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2 font-mono text-slate-600">
                        <div className="flex items-center gap-1">
                          <span>{usr.password}</span>
                          <button
                            onClick={() => handleUpdatePassword(usr.userId)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 cursor-pointer"
                            title="Edit Password"
                          >
                            <Key className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        {/* Nested grid of permissions */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100/50 text-[10px] font-mono">
                          {Object.keys(usr.permissions).map((mk) => {
                            const mod = mk as keyof ModulePermissions;
                            const level = usr.permissions[mod];
                            const label = 
                              mod === "orders" ? "Orders" :
                              mod === "yarn" ? "Yarn" :
                              mod === "planning" ? "Planning" :
                              mod === "production" ? "Production" :
                              mod === "delivery" ? "Delivery" :
                              mod === "billing" ? "Billing" :
                              mod === "settings" ? "Settings" : 
                              mod === "machineload" ? "Load" : "Admin";

                            return (
                              <div key={mod} className="flex flex-col items-center justify-between border-r border-slate-200 last:border-r-0 px-1 py-0.5">
                                <span className="text-[9px] text-slate-400 font-bold uppercase">{label}</span>
                                <select
                                  value={level}
                                  onChange={(e) => handlePermissionChange(usr.userId, mod, e.target.value as any)}
                                  className={`p-0 bg-transparent text-[9px] font-bold py-0.5 rounded cursor-pointer ${
                                    level === "Read/Write" ? "text-emerald-700" : level === "Read Only" ? "text-amber-700" : "text-red-600"
                                  }`}
                                >
                                  <option value="Read/Write">R/W</option>
                                  <option value="Read Only">R-O</option>
                                  <option value="Hide">Hide</option>
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          disabled={isPrimaryAdmin || !canCurrentUserDeleteData()}
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete user registry for ${usr.userId}?`)) {
                              deleteUser(usr.userId);
                            }
                          }}
                          className={`p-2 rounded-lg cursor-pointer ${
                            (isPrimaryAdmin || !canCurrentUserDeleteData())
                              ? "text-slate-355 pointer-events-none opacity-50" 
                              : "text-slate-400 hover:text-red-500 hover:bg-slate-50"
                          }`}
                          title={isPrimaryAdmin ? "Cannot delete Primary System Admin" : !canCurrentUserDeleteData() ? "Only Admin/Superadmin can delete users" : "Delete user"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
      
    </div>
  );
}

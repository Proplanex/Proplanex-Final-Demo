import React, { useState } from "react";
import { useAppState } from "../context/AppContext";
import { Shield, Lock, Eye, EyeOff, Sparkles, AlertCircle } from "lucide-react";

interface LoginScreenProps {
  isExpiredRecovery?: boolean;
}

export default function LoginScreen({ isExpiredRecovery = false }: LoginScreenProps) {
  const { loginUser, trialDays, trialExpirationDate, isExpired } = useAppState();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim() || !password) {
      setErrorMsg("Please fill in both User ID and password.");
      return;
    }

    if ((isExpiredRecovery || isExpired) && userId.toLowerCase() !== "superadmin") {
      setErrorMsg("Your trial session has been expired");
      return;
    }

    const success = loginUser(userId.trim(), password);
    if (!success) {
      if ((isExpiredRecovery || isExpired) && userId.toLowerCase() !== "superadmin") {
        setErrorMsg("Your trial session has been expired");
      } else {
        setErrorMsg("Invalid User ID or Password. Please try again.");
      }
    } else {
      setErrorMsg("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Decorative vector background */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.08),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(14,165,233,0.05),transparent_50%)] pointer-events-none" />

      {/* Login Container */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-8 relative z-10 transition-all duration-300">
        
        {/* Branding header */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400 mb-2">
            <Shield className="h-7 w-7" />
          </div>
          <h2 className="text-white text-2xl font-bold tracking-tight uppercase flex items-center justify-center gap-2">
            PROPLANEX <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-mono font-bold px-1.5 py-0.5 rounded tracking-widest border border-indigo-500/30">SECURE</span>
          </h2>
          <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold">
            {isExpiredRecovery ? "Workspace Recalibration Node" : "Harnessing Production Accuracy"}
          </p>
        </div>

        {(isExpiredRecovery || isExpired) && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-6 text-red-300 text-xs flex items-start gap-2.5 leading-relaxed">
            <AlertCircle className="h-4.5 w-4.5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">License Working Limit Exceeded</p>
              <p className="opacity-80 mt-0.5">Your trial session has been expired. Please contact with your supplier to renew the session.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          {/* User ID Field */}
          <div className="space-y-1.5">
            <label className="block text-[10px] text-slate-400 font-mono uppercase tracking-wider font-bold">User Identifier</label>
            <div className="relative">
              <input
                type="text"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-xs text-white placeholder-slate-650 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden font-mono transition-all"
                placeholder={isExpiredRecovery ? "superadmin" : "e.g. admin@proplanex.com"}
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <label className="block text-[10px] text-slate-400 font-mono uppercase tracking-wider font-bold">Secure Access Keys</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-4 pr-11 text-xs text-white placeholder-slate-650 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden font-mono transition-all"
                placeholder={isExpiredRecovery ? "Proplanex@Raihan" : "••••••••••••"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="text-[11px] font-semibold text-red-400 bg-red-950/35 border border-red-900/50 p-2.5 rounded-lg flex items-center gap-1.5 animate-pulse">
              <p>⚠️ {errorMsg}</p>
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-bold py-3 text-xs rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>{isExpiredRecovery ? "Authenticate & Renew" : "Request Portal Logging"}</span>
          </button>
        </form>


      </div>

      <div className="mt-6 text-slate-550 text-[9px] font-mono tracking-widest text-center">
        PROPLANEX APPARELS WORKSPACE SYSTEM &copy; 2026. ALL RIGHTS RESERVED.
      </div>
    </div>
  );
}

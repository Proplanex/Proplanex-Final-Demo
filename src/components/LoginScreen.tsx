import React, { useState } from "react";
import { useAppState } from "../context/AppContext";
import { Shield, Lock, Eye, EyeOff, Sparkles, AlertCircle, Loader2 } from "lucide-react";

interface LoginScreenProps {
  isExpiredRecovery?: boolean;
}

export default function LoginScreen({ isExpiredRecovery = false }: LoginScreenProps) {
  const { loginUser, trialDays, trialExpirationDate, isExpired, isLoginScreenReady, isCloudLoaded, retryCloudSync, companyProfile } = useAppState();
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
          {companyProfile?.logoUrl ? (
            <div className="flex justify-center mb-4">
              <img 
                src={companyProfile.logoUrl} 
                alt={`${companyProfile.name || "Company"} Logo`} 
                className="h-16 w-auto max-w-[180px] object-contain rounded-xl shadow-lg border border-slate-800 p-1 bg-slate-950/40"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400 mb-2">
              <Shield className="h-7 w-7" />
            </div>
          )}
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

        {!isLoginScreenReady ? (
          <div className="space-y-6 py-4 text-center select-none">
            {/* Custom SVG Digging Animation */}
            <div className="relative w-full h-36 flex items-center justify-center overflow-hidden bg-slate-950/60 rounded-2xl border border-slate-800/80 p-4 shadow-inner shadow-indigo-950/20">
              <style>{`
                @keyframes swing-pickaxe {
                  0%, 100% { transform: rotate(0deg); }
                  50% { transform: rotate(-55deg); }
                }
                @keyframes dig-ground {
                  0%, 100% { transform: translateY(0); }
                  50% { transform: translateY(2px); }
                }
                @keyframes block-scroll {
                  0% { transform: translateX(110px); opacity: 0; }
                  10% { opacity: 1; }
                  90% { opacity: 1; }
                  100% { transform: translateX(-110px); opacity: 0; }
                }
                @keyframes spark-fly-1 {
                  0% { transform: translate(0, 0) scale(1); opacity: 0; }
                  30% { opacity: 1; }
                  100% { transform: translate(-35px, -35px) scale(0); opacity: 0; }
                }
                @keyframes spark-fly-2 {
                  0% { transform: translate(0, 0) scale(1); opacity: 0; }
                  30% { opacity: 1; }
                  100% { transform: translate(15px, -30px) scale(0); opacity: 0; }
                }
                @keyframes spark-fly-3 {
                  0% { transform: translate(0, 0) scale(1); opacity: 0; }
                  30% { opacity: 1; }
                  100% { transform: translate(-10px, -45px) scale(0); opacity: 0; }
                }
                .animate-swing {
                  animation: swing-pickaxe 0.7s infinite ease-in-out;
                  transform-origin: 32px 35px;
                }
                .animate-dig-body {
                  animation: dig-ground 0.7s infinite ease-in-out;
                }
                .animate-block-1 {
                  animation: block-scroll 2s infinite linear;
                }
                .animate-block-2 {
                  animation: block-scroll 2s infinite linear;
                  animation-delay: 0.65s;
                }
                .animate-block-3 {
                  animation: block-scroll 2s infinite linear;
                  animation-delay: 1.3s;
                }
                .animate-spark-1 {
                  animation: spark-fly-1 0.7s infinite ease-out;
                }
                .animate-spark-2 {
                  animation: spark-fly-2 0.7s infinite ease-out;
                  animation-delay: 0.1s;
                }
                .animate-spark-3 {
                  animation: spark-fly-3 0.7s infinite ease-out;
                  animation-delay: 0.2s;
                }
              `}</style>

              {/* Sky and ambient background */}
              <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/20 via-slate-950/40 to-slate-950/90"></div>
              
              {/* Retro Digging Landscape */}
              <div className="relative w-64 h-28 flex items-end justify-center">
                {/* Soil conveyor scrolling in */}
                <div className="absolute left-1/2 bottom-2 w-[220px] h-6 overflow-hidden -translate-x-1/2 border-b border-indigo-950/50">
                  {/* Block 1 */}
                  <div className="animate-block-1 absolute bottom-0 flex flex-col items-center">
                    <div className="w-5 h-5 bg-amber-800/70 border border-amber-900 rounded flex items-center justify-center">
                      <div className="w-1 h-1 bg-amber-900/80 rounded-full"></div>
                    </div>
                  </div>
                  {/* Block 2 */}
                  <div className="animate-block-2 absolute bottom-0 flex flex-col items-center">
                    <div className="w-5 h-5 bg-amber-800/70 border border-amber-900 rounded flex items-center justify-center">
                      <div className="w-1 h-1 bg-amber-900/80 rounded-full"></div>
                    </div>
                  </div>
                  {/* Block 3 */}
                  <div className="animate-block-3 absolute bottom-0 flex flex-col items-center">
                    <div className="w-5 h-5 bg-amber-700/80 border border-amber-900 rounded flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded rotate-45 animate-pulse"></div>
                    </div>
                  </div>
                </div>

                {/* Retro Miner SVG character */}
                <div className="relative z-10 mr-12 mb-2 flex items-end">
                  <svg className="w-14 h-14 animate-dig-body" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Yellow Hard Hat */}
                    <path d="M16 28 C16 18, 48 18, 48 28 Z" fill="#FBBF24" />
                    <rect x="28" y="19" width="8" height="4" fill="#F59E0B" rx="1" />
                    <circle cx="32" cy="21" r="2" fill="#FFF" className="animate-pulse" />
                    
                    {/* Retro Face */}
                    <rect x="22" y="28" width="20" height="14" fill="#FED7AA" rx="2" />
                    {/* Eye */}
                    <rect x="34" y="32" width="3" height="3" fill="#1E293B" />
                    {/* Retro Mustache */}
                    <rect x="36" y="35" width="6" height="3" fill="#78350F" />
                    
                    {/* Blue Shirt */}
                    <rect x="20" y="42" width="24" height="16" fill="#4F46E5" rx="3" />
                    {/* Red Overalls */}
                    <rect x="24" y="45" width="16" height="13" fill="#EF4444" />
                    <rect x="26" y="42" width="3" height="3" fill="#EF4444" />
                    <rect x="35" y="42" width="3" height="3" fill="#EF4444" />
                    
                    {/* Arm Rigged */}
                    <path d="M38 46 Q46 44, 44 38" stroke="#4F46E5" strokeWidth="5" strokeLinecap="round" />
                    
                    {/* swinging pickaxe */}
                    <g className="animate-swing">
                      <line x1="32" y1="35" x2="52" y2="15" stroke="#78350F" strokeWidth="3" strokeLinecap="round" />
                      <path d="M46 11 C49 14, 53 19, 56 22 L51 27 C48 24, 44 19, 41 16 Z" fill="#94A3B8" />
                      <path d="M52 15 L54 13 C56 11, 59 13, 58 16 L56 18 Z" fill="#64748B" />
                    </g>
                  </svg>
                </div>

                {/* Flying sparks from impact */}
                <div className="absolute left-[54%] bottom-6 z-20">
                  <div className="animate-spark-1 absolute w-1.5 h-1.5 bg-indigo-400 rotate-45 rounded-sm"></div>
                  <div className="animate-spark-2 absolute w-1 h-1 bg-amber-400 rounded-full"></div>
                  <div className="animate-spark-3 absolute w-2 h-2 bg-white rotate-45 rounded-sm"></div>
                </div>

                {/* Target Block being mined */}
                <div className="absolute left-[52%] bottom-2 z-10">
                  <div className="w-7 h-7 bg-indigo-950/40 border border-indigo-500/50 rounded flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-indigo-500/10 animate-pulse"></div>
                    <div className="w-2.5 h-2.5 bg-indigo-400 rounded-sm rotate-45 animate-bounce"></div>
                  </div>
                </div>
              </div>
            </div>
              
            <div className="space-y-2">
              <p className="text-white text-xs font-bold font-mono tracking-wider uppercase">SECURE PORTAL HANDSHAKE</p>
              <p className="text-slate-400 text-[10px] uppercase tracking-wider leading-relaxed max-w-xs mx-auto">
                Establishing secure encrypted handshake with central database nodes to synchronize active registries...
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={retryCloudSync}
                className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 font-mono font-bold py-2.5 text-[10px] rounded-xl cursor-pointer transition-all uppercase tracking-wider flex items-center justify-center gap-1.5"
              >
                <Loader2 className="h-3 w-3 animate-spin text-indigo-400" />
                <span>Retry Connection handshake</span>
              </button>
            </div>
          </div>
        ) : (
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
              disabled={!isCloudLoaded}
              className={`w-full ${!isCloudLoaded ? "bg-indigo-950/80 text-slate-400 border border-indigo-900/30 cursor-wait" : "bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white cursor-pointer"} font-bold py-3 text-xs rounded-xl transition-all flex items-center justify-center gap-2`}
            >
              {!isCloudLoaded ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                  <span className="font-mono text-[10px] uppercase tracking-wider">Synchronizing registers...</span>
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5" />
                  <span>{isExpiredRecovery ? "Authenticate & Renew" : "Request Portal Logging"}</span>
                </>
              )}
            </button>
          </form>
        )}


      </div>

      <div className="mt-6 text-slate-550 text-[9px] font-mono tracking-widest text-center">
        PROPLANEX APPARELS WORKSPACE SYSTEM &copy; 2026. ALL RIGHTS RESERVED.
      </div>
    </div>
  );
}

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export interface ToastMessage {
  id: string;
  message: string;
  type: "success" | "error" | "info";
  duration: number;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

export default function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  return (
    <div id="pro_toast_root" className="fixed bottom-6 right-6 z-100 flex flex-col gap-3 max-w-sm w-full pointer-events-none select-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: () => void; key?: React.Key }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, toast.duration);
    return () => clearTimeout(timer);
  }, [toast.duration, onDismiss]);

  const config = {
    success: {
      bg: "bg-slate-900/95 border-emerald-500/30 text-emerald-400 shadow-emerald-950/20",
      icon: <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400 shrink-0 mt-0.5" />,
      progressBg: "bg-emerald-500",
      title: "Success Confirmation",
    },
    error: {
      bg: "bg-slate-900/95 border-rose-500/30 text-rose-400 shadow-rose-950/20",
      icon: <AlertCircle className="h-4.5 w-4.5 text-rose-400 shrink-0 mt-0.5" />,
      progressBg: "bg-rose-500",
      title: "Operation Failed",
    },
    info: {
      bg: "bg-slate-900/95 border-indigo-500/30 text-indigo-400 shadow-indigo-950/20",
      icon: <Info className="h-4.5 w-4.5 text-indigo-400 shrink-0 mt-0.5" />,
      progressBg: "bg-indigo-500",
      title: "Information",
    },
  }[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className={`pointer-events-auto flex flex-col w-full overflow-hidden rounded-xl border border-slate-800 backdrop-blur-md shadow-lg ${config.bg}`}
    >
      <div className="p-3.5 flex items-start gap-3">
        {config.icon}
        <div className="flex-1 min-w-0">
          <p className="text-white text-[10px] font-bold font-mono tracking-wider uppercase mb-0.5">
            {config.title}
          </p>
          <p className="text-slate-300 text-xs font-medium leading-relaxed break-words">
            {toast.message}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-slate-500 hover:text-slate-300 rounded-lg p-1 transition-colors cursor-pointer shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      
      {/* Dynamic Progress Bar */}
      <div className="w-full h-[2.5px] bg-slate-950/40">
        <motion.div
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: toast.duration / 1000, ease: "linear" }}
          className={`h-full ${config.progressBg}`}
        />
      </div>
    </motion.div>
  );
}

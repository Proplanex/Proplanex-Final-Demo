import React, { useEffect } from "react";
import { Order, ProductionLog } from "../types";
import { Printer, X } from "lucide-react";
import { useAppState } from "../context/AppContext";
import JsBarcode from "jsbarcode";

// Custom helper to generate barcode via jsbarcode inside an SVG
const BarcodeImage: React.FC<{ value: string; height?: number; width?: number }> = ({ value, height = 20, width = 1.1 }) => {
  const svgRef = React.useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: "CODE128",
          height: height,
          width: width,
          displayValue: false,
          margin: 0,
          background: "transparent",
        });
      } catch (err) {
        console.error("Barcode generation error:", err);
      }
    }
  }, [value, height, width]);

  return (
    <div className="flex justify-center items-center py-0.5">
      <svg ref={svgRef} className="max-w-full h-7" />
    </div>
  );
};

interface ProductionStickerProps {
  log: ProductionLog;
  onClose: () => void;
}

export default function ProductionSticker({ log, onClose }: ProductionStickerProps) {
  const { orders, productionLogs, currentUser } = useAppState();

  // Find associated order
  const matchedOrder = orders.find(o => o.orderNo === log.orderNo);

  // Helper to calculate roll index / roll number
  const getRollDetails = () => {
    const matchingLogs = productionLogs.filter(l => l.jobCardNo === log.jobCardNo);
    const matchedIdx = matchingLogs.findIndex(l => l.id === log.id);
    const rollIndex = matchedIdx === -1 ? (matchingLogs.length + 1) : (matchedIdx + 1);
    const seqStr = String(rollIndex).padStart(2, "0");
    return `${log.jobCardNo}_${seqStr}`;
  };

  const rollNo = getRollDetails();
  const opName = currentUser ? currentUser.userId.split("@")[0].toUpperCase() : "OPERATOR";
  const operatorText = `${opName}-${log.machineNo}`;

  // Order properties with fallback
  const fabricType = matchedOrder?.fabricType || "Twill Jersey";
  const knitType = matchedOrder?.knitType || "Blade Open";
  const factoryJobNo = matchedOrder?.factoryJobNo || "EKL-05-34x34,70";
  const factoryOrder = matchedOrder?.factoryOrder || "264712-FBR";
  const factoryName = matchedOrder?.factoryName || "Tommy Hilfiger";
  const color = matchedOrder?.color || "BLACK";
  const finishGSM = matchedOrder?.finishGSM || 210;
  const finishDia = matchedOrder?.finishDia || 40;

  // Yarn properties with fallback
  const firstYarn = matchedOrder?.yarns?.[0];
  const yarnCount = firstYarn?.yc || "40s BCI PIMA";
  const yarnSpinner = firstYarn?.spinner || "PRECOT";
  const yarnLot = firstYarn?.lot || "256860";
  const stitchLength = firstYarn?.sl || "1.75";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto printable-sticker-modal">
      
      {/* Dynamic PRINT override stylesheet specifically for thermal sticker label printers (2.50in x 1.90in) */}
      <style>{`
        @media print {
          /* Hide normal screen app layout */
          #pro_app_root, #pro_nav, header, #pro_main, .no-print, button, .editor-panel {
            display: none !important;
          }
          /* Show ONLY the sticker container on white background */
          body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .printable-sticker-modal {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            backdrop-filter: none !important;
            border: none !important;
            box-shadow: none !important;
          }
          .sticker-card {
            width: 2.5in !important;
            height: 1.9in !important;
            border: none !important;
            box-shadow: none !important;
            margin: 0 auto !important;
            padding: 0.05in !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            page-break-after: always !important;
            background: white !important;
          }
          /* Ensure crisp black rendering and scaled down text */
          .sticker-text {
            color: #000000 !important;
            font-family: "Courier New", Courier, monospace !important;
            font-weight: bold !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl border border-slate-300 shadow-2xl max-w-sm w-full p-5 no-print flex flex-col items-center">
        
        <div className="flex items-center justify-between w-full border-b border-slate-150 pb-3 mb-4">
          <h4 className="font-sans font-bold text-slate-800 text-xs flex items-center gap-1.5">
            <Printer className="h-4 w-4 text-indigo-500" />
            <span>Reprint Thermal Sticker (2.50" x 1.90")</span>
          </h4>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Live Sticker Preview Box (2.50" x 1.90" aspect ratio) */}
        <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 w-full flex justify-center mb-4">
          <div className="bg-white text-black p-2 shadow-md w-[280px] h-[213px] border border-slate-300 rounded-md flex flex-col justify-between text-left font-mono sticker-card text-[9px] leading-tight select-none">
            
            {/* Row 1: Factory Job No + Knit Type */}
            <div className="text-[10px] font-black tracking-tight leading-none uppercase flex justify-between border-b border-black/10 pb-0.5 sticker-text">
              <span className="truncate max-w-[130px]">{factoryJobNo}</span>
              <span className="text-[9px] truncate max-w-[110px]">{knitType}</span>
            </div>

            {/* Row 2: Barcode */}
            <div className="w-full text-center">
              <BarcodeImage value={rollNo} height={20} width={1.1} />
            </div>

            {/* Row 3: Barcode value + Contract / Order Reference */}
            <div className="text-[9px] font-bold tracking-tighter leading-none uppercase flex justify-between sticker-text">
              <span className="truncate max-w-[140px]">{rollNo}</span>
              <span className="truncate max-w-[100px]">{factoryOrder}</span>
            </div>

            {/* Row 4: Weight, Fabric Type, Stitch Length */}
            <div className="text-[9px] font-bold leading-none uppercase flex justify-between border-t border-dashed border-black/20 pt-0.5 sticker-text">
              <span>W:{log.qty.toFixed(3)} Kg</span>
              <span className="max-w-[110px] truncate text-center">{fabricType}</span>
              <span>S/L:{stitchLength}</span>
            </div>

            {/* Row 5: Factory Order Ref, Factory Name */}
            <div className="text-[9px] font-bold leading-none uppercase flex justify-between sticker-text">
              <span>{factoryOrder}</span>
              <span className="max-w-[120px] truncate text-right">{factoryName}</span>
            </div>

            {/* Row 6: Color, GSM, Machine Brand */}
            <div className="text-[9px] font-bold leading-none uppercase flex justify-between sticker-text">
              <span>{color}</span>
              <span>{finishGSM} GSM</span>
              <span>Norsel</span>
            </div>

            {/* Row 7: Operator & Machine No, Shift, Date Time */}
            <div className="text-[8px] font-bold leading-none uppercase flex justify-between sticker-text border-t border-dotted border-black/20 pt-0.5">
              <span>{operatorText}</span>
              <span>SHIFT {log.shift}</span>
              <span className="text-[7.5px]">{log.date}</span>
            </div>

            {/* Row 8: Finish Dia, Yarn Count, Spinner, Lot */}
            <div className="text-[8px] font-bold leading-none uppercase flex justify-between bg-black/5 p-0.5 rounded sticker-text">
              <span>D:{finishDia}</span>
              <span className="max-w-[80px] truncate">{yarnCount}</span>
              <span className="max-w-[50px] truncate">{yarnSpinner}</span>
              <span>L:{yarnLot}</span>
            </div>

          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 w-full">
          <button
            onClick={handlePrint}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-700/10"
          >
            <Printer className="h-4 w-4" />
            <span>Print Sticker</span>
          </button>
          <button
            onClick={onClose}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 px-5 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}

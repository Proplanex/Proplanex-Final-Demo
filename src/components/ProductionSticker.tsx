import React, { useEffect, useState } from "react";
import { Order, ProductionLog } from "../types";
import { Printer, X, Settings, HelpCircle, AlertCircle } from "lucide-react";
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

  // Load custom dimensions from localStorage with robust fallbacks
  const [width, setWidth] = useState<number>(() => {
    const saved = localStorage.getItem("sticker_width");
    return saved ? parseFloat(saved) : 2.50;
  });
  const [height, setHeight] = useState<number>(() => {
    const saved = localStorage.getItem("sticker_height");
    return saved ? parseFloat(saved) : 1.90;
  });
  const [fontScale, setFontScale] = useState<number>(() => {
    const saved = localStorage.getItem("sticker_font_scale");
    return saved ? parseFloat(saved) : 1.0;
  });

  // Save changes to localStorage to sync with the main log popup
  useEffect(() => {
    localStorage.setItem("sticker_width", width.toString());
    localStorage.setItem("sticker_height", height.toString());
    localStorage.setItem("sticker_font_scale", fontScale.toString());
  }, [width, height, fontScale]);

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
      
      {/* Dynamic PRINT override stylesheet tailored for the user's custom thermal sticker label size */}
      <style>{`
        @media print {
          /* Hide non-printable panels completely from layout */
          #pro_nav, header, .no-print, button, .editor-panel, .settings-panel {
            display: none !important;
          }
          /* Reset root containers to be transparent/un-styled with no extra spacing or flow height */
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            height: auto !important;
            min-height: 0 !important;
          }
          #pro_app_root, #pro_main, .printable-sticker-modal {
            display: block !important;
            position: static !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            border: none !important;
            box-shadow: none !important;
          }
          /* Remove layout/shadow constraints from the main modal container */
          .printable-sticker-modal > div {
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            width: auto !important;
            max-width: none !important;
            height: auto !important;
          }
          /* Render ONLY the sticker card precisely at the top-left */
          .sticker-card {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${width}in !important;
            height: ${height}in !important;
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0.05in !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
            background: #ffffff !important;
            font-size: ${9 * fontScale}px !important;
            line-height: 1.1 !important;
          }
          /* Ensure crisp black rendering and scaled down text */
          .sticker-text {
            color: #000000 !important;
            font-family: "Courier New", Courier, monospace !important;
            font-weight: bold !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl border border-slate-300 shadow-2xl max-w-4xl w-full p-6 flex flex-col md:flex-row gap-6 print:border-none print:shadow-none print:p-0 print:m-0 print:bg-transparent">
        
        {/* Left Column: Dimensions Tuning & Silent Printing Guide */}
        <div className="flex-1 space-y-5 no-print">
          <div className="flex items-center justify-between border-b border-slate-150 pb-3">
            <h4 className="font-sans font-bold text-slate-800 text-sm flex items-center gap-2">
              <Settings className="h-4 w-4 text-indigo-500" />
              <span>Label Size & Driver Tuning</span>
            </h4>
          </div>

          {/* Preset options */}
          <div className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-100/60 space-y-2">
            <span className="text-[10px] font-mono text-indigo-600 font-bold uppercase tracking-wider block">Standard Label Presets</span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => { setWidth(2.50); setHeight(1.90); }}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border transition-all cursor-pointer text-center ${
                  width === 2.50 && height === 1.90
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                2.50" x 1.90" (ERP)
              </button>
              <button
                type="button"
                onClick={() => { setWidth(3.00); setHeight(2.00); }}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border transition-all cursor-pointer text-center ${
                  width === 3.00 && height === 2.00
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                3.00" x 2.00"
              </button>
              <button
                type="button"
                onClick={() => { setWidth(4.00); setHeight(3.00); }}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border transition-all cursor-pointer text-center ${
                  width === 4.00 && height === 3.00
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                4.00" x 3.00"
              </button>
            </div>
          </div>

          {/* Manual controllers */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Width (in)</label>
              <input
                type="number"
                step="0.05"
                min="1.0"
                max="6.0"
                value={width}
                onChange={(e) => setWidth(parseFloat(e.target.value) || 2.50)}
                className="w-full p-2 border border-slate-200 rounded-lg text-xs font-mono text-center font-bold text-slate-800 bg-slate-50 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Height (in)</label>
              <input
                type="number"
                step="0.05"
                min="1.0"
                max="6.0"
                value={height}
                onChange={(e) => setHeight(parseFloat(e.target.value) || 1.90)}
                className="w-full p-2 border border-slate-200 rounded-lg text-xs font-mono text-center font-bold text-slate-800 bg-slate-50 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Font Scale</label>
              <input
                type="number"
                step="0.05"
                min="0.5"
                max="2.0"
                value={fontScale}
                onChange={(e) => setFontScale(parseFloat(e.target.value) || 1.0)}
                className="w-full p-2 border border-slate-200 rounded-lg text-xs font-mono text-center font-bold text-slate-800 bg-slate-50 focus:bg-white"
              />
            </div>
          </div>

          {/* Help Manual section: Standard Browser Printing Guide */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
            <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="h-3.5 w-3.5 text-indigo-600" />
              <span>Configuring Your Thermal Printer in Chrome</span>
            </h5>
            <div className="text-[11px] text-slate-600 space-y-2 leading-relaxed font-sans">
              <p>
                Web browsers require the print preview window to safely select your physical printer and paper size. Once configured the first time, Google Chrome remembers these settings for one-click printing in the future!
              </p>
              <ol className="list-decimal list-inside space-y-1.5 pl-1 text-[10.5px]">
                <li>Click <strong>Print Sticker</strong>. In the print dialog, select your physical thermal label printer as the <strong>Destination</strong>.</li>
                <li>Expand <strong>More Settings</strong> in the sidebar.</li>
                <li>Set the <strong>Paper Size</strong> to match your label (e.g. <span className="font-semibold text-slate-800">{width.toFixed(2)}" x {height.toFixed(2)}"</span>, or create a custom size in your printer driver preferences if not listed).</li>
                <li>Set <strong>Margins</strong> to <strong>None</strong> and uncheck <strong>Headers and Footers</strong> to prevent extra blank spaces.</li>
                <li>Click Print. Chrome will save these settings for subsequent stickers so you only have to press Enter!</li>
              </ol>
              <div className="flex items-start gap-1.5 bg-amber-50 border border-amber-100 p-2 rounded-lg text-[10px] text-amber-800 mt-1">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>Make sure your printer driver's default preferences are matched to <strong>{width.toFixed(2)}" x {height.toFixed(2)}"</strong> so it cuts correctly.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Sticker Preview (2.50" x 1.90" aspect ratio, non-editable) */}
        <div className="w-full md:w-[320px] flex flex-col items-center justify-between border-t md:border-t-0 md:border-l border-slate-200 pt-6 md:pt-0 md:pl-6 print:border-none print:p-0 print:m-0 print:w-auto print:h-auto">
          <div className="flex items-center justify-between w-full mb-3 no-print">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">Live Preview</span>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1 rounded-lg transition-colors cursor-pointer md:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Actual Scaled Down Sticker Box */}
          <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 w-full flex justify-center mb-5 print-bg-transparent print:p-0 print:m-0 print:border-none print:bg-transparent">
            <div 
              style={{
                fontSize: `${9 * fontScale}px`,
              }}
              className="bg-white text-black p-2 shadow-md w-[280px] h-[213px] border border-slate-300 rounded-md flex flex-col justify-between text-left font-mono sticker-card leading-tight select-none"
            >
              
              {/* Row 1: Factory Job No + Knit Type */}
              <div className="font-black tracking-tight leading-none uppercase flex justify-between border-b border-black/10 pb-0.5 sticker-text" style={{ fontSize: `${10 * fontScale}px` }}>
                <span className="truncate max-w-[130px]">{factoryJobNo}</span>
                <span className="truncate max-w-[110px]" style={{ fontSize: `${9 * fontScale}px` }}>{knitType}</span>
              </div>

              {/* Row 2: Barcode */}
              <div className="w-full text-center">
                <BarcodeImage value={rollNo} height={20} width={1.1} />
              </div>

              {/* Row 3: Barcode value + Contract / Order Reference */}
              <div className="font-bold tracking-tighter leading-none uppercase flex justify-between sticker-text" style={{ fontSize: `${9 * fontScale}px` }}>
                <span className="truncate max-w-[140px]">{rollNo}</span>
                <span className="truncate max-w-[100px]">{factoryOrder}</span>
              </div>

              {/* Row 4: Weight, Fabric Type, Stitch Length */}
              <div className="font-bold leading-none uppercase flex justify-between border-t border-dashed border-black/20 pt-0.5 sticker-text" style={{ fontSize: `${9 * fontScale}px` }}>
                <span>W:{log.qty.toFixed(3)} Kg</span>
                <span className="max-w-[110px] truncate text-center">{fabricType}</span>
                <span>S/L:{stitchLength}</span>
              </div>

              {/* Row 5: Factory Order Ref, Factory Name */}
              <div className="font-bold leading-none uppercase flex justify-between sticker-text" style={{ fontSize: `${9 * fontScale}px` }}>
                <span>{factoryOrder}</span>
                <span className="max-w-[120px] truncate text-right">{factoryName}</span>
              </div>

              {/* Row 6: Color, GSM, Machine Brand */}
              <div className="font-bold leading-none uppercase flex justify-between sticker-text" style={{ fontSize: `${9 * fontScale}px` }}>
                <span>{color}</span>
                <span>{finishGSM} GSM</span>
                <span>Norsel</span>
              </div>

              {/* Row 7: Operator & Machine No, Shift, Date Time */}
              <div className="font-bold leading-none uppercase flex justify-between sticker-text border-t border-dotted border-black/20 pt-0.5" style={{ fontSize: `${8 * fontScale}px` }}>
                <span>{operatorText}</span>
                <span>SHIFT {log.shift}</span>
                <span style={{ fontSize: `${7.5 * fontScale}px` }}>{log.date}</span>
              </div>

              {/* Row 8: Finish Dia, Yarn Count, Spinner, Lot */}
              <div className="font-bold leading-none uppercase flex justify-between bg-black/5 p-0.5 rounded sticker-text" style={{ fontSize: `${8 * fontScale}px` }}>
                <span>D:{finishDia}</span>
                <span className="max-w-[80px] truncate">{yarnCount}</span>
                <span className="max-w-[50px] truncate">{yarnSpinner}</span>
                <span>L:{yarnLot}</span>
              </div>

            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 w-full no-print">
            <button
              onClick={handlePrint}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-700/10"
            >
              <Printer className="h-4 w-4" />
              <span>Print Sticker</span>
            </button>
            <button
              onClick={onClose}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 px-5 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Close Dialog
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}

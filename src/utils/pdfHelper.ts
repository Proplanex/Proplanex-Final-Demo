import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

/**
 * Parses percent or regular numeric values.
 */
const parseVal = (str: string, maxVal: number = 1) => {
  const s = str.trim();
  if (s.endsWith("%")) {
    return (parseFloat(s) / 100) * maxVal;
  }
  return parseFloat(s);
};

/**
 * Accurately converts OKLCH color values to RGB fallback numbers.
 */
function oklchToRgb(lVal: number, cVal: number, hVal: number): [number, number, number] {
  // Convert Hue from degrees to radians
  const hRad = (hVal * Math.PI) / 180;
  const a = cVal * Math.cos(hRad);
  const b = cVal * Math.sin(hRad);

  const l_ = lVal + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = lVal - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = lVal - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bVal = -0.0041960863 * l - 0.7034186147 * m + 1.7076146940 * s;

  const f = (c: number) => {
    const clamped = Math.max(0, Math.min(1, c));
    return clamped <= 0.0031308
      ? 12.92 * clamped
      : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  };

  return [
    Math.round(f(r) * 255),
    Math.round(f(g) * 255),
    Math.round(f(bVal) * 255)
  ];
}

/**
 * Replaces oklch(...) matches in CSS text with rgb(...) or rgba(...).
 */
export const replaceOklchInString = (cssText: string): string => {
  return cssText.replace(/oklch\(([^)]+)\)/g, (match, inner) => {
    try {
      const parts = inner.trim().split(/[\s,]+/);
      if (parts.length >= 3) {
        let lStr = parts[0];
        let cStr = parts[1];
        let hStr = parts[2];
        let alphaStr = "";

        if (parts.length >= 4) {
          if (parts[3] === "/") {
            alphaStr = parts[4] || "";
          } else if (parts[3].startsWith("/")) {
            alphaStr = parts[3].substring(1);
          } else {
            alphaStr = parts[3];
          }
        } else if (inner.includes("/")) {
          const splitSlash = inner.split("/");
          const afterSlash = splitSlash[1] ? splitSlash[1].trim() : "";
          if (afterSlash) {
            alphaStr = afterSlash;
          }
        }

        const lVal = parseVal(lStr, 1);
        const cVal = parseVal(cStr, 1);

        let hVal = 0;
        hStr = hStr.toLowerCase();
        if (hStr.endsWith("deg")) {
          hVal = parseFloat(hStr);
        } else if (hStr.endsWith("rad")) {
          hVal = (parseFloat(hStr) * 180) / Math.PI;
        } else if (hStr.endsWith("grad")) {
          hVal = (parseFloat(hStr) * 360) / 400;
        } else if (hStr.endsWith("turn")) {
          hVal = parseFloat(hStr) * 360;
        } else {
          hVal = parseFloat(hStr);
        }

        if (isNaN(lVal) || isNaN(cVal) || isNaN(hVal)) {
          return "rgb(100, 116, 139)"; // Neutral slate grey
        }

        const [r, g, b] = oklchToRgb(lVal, cVal, hVal);

        if (alphaStr && !alphaStr.startsWith("var")) {
          const alphaVal = parseVal(alphaStr, 1);
          return `rgba(${r}, ${g}, ${b}, ${isNaN(alphaVal) ? 1 : alphaVal})`;
        }
        return `rgb(${r}, ${g}, ${b})`;
      }
    } catch (e) {
      console.warn("Error parsing oklch color:", match, e);
    }
    return "rgb(100, 116, 139)";
  });
};

/**
 * High-quality PDF downloader utilizing element canvas image generation in jsPDF.
 */
export const downloadElementAsPdf = async (elementId: string, filename: string) => {
  let originalScrollX = 0;
  let originalScrollY = 0;
  try {
    // 1. Wait a moment to ensure state changes/renders are fully painted
    await new Promise((resolve) => setTimeout(resolve, 300));

    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id ${elementId} not found`);
    }

    const pdfFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;

    // 2. Temporarily scroll the window to the top to prevent scroll offset issues in html2canvas
    originalScrollX = window.scrollX;
    originalScrollY = window.scrollY;
    window.scrollTo(0, 0);

    // 3. Generate high-resolution canvas with CORS configuration and taint protection
    const canvas = await html2canvas(element, {
      scale: 2, // 2x scale for high resolution crisp rendering
      useCORS: true,
      allowTaint: false, // CRITICAL: Setting this to false prevents tainted canvases when using cross-origin images (like custom logo/QR server), allowing canvas.toDataURL() to output the graphics correctly instead of empty/blank!
      logging: false,
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: 0,
      onclone: (clonedDoc: Document) => {
        // Correct OKLCH style elements
        const styles = clonedDoc.getElementsByTagName("style");
        for (let i = 0; i < styles.length; i++) {
          const style = styles[i];
          if (style.innerHTML && style.innerHTML.includes("oklch")) {
            style.innerHTML = replaceOklchInString(style.innerHTML);
          }
        }

        // Correct inline OKLCH style attributes
        const allElements = clonedDoc.getElementsByTagName("*");
        for (let i = 0; i < allElements.length; i++) {
          const el = allElements[i];
          const styleAttr = el.getAttribute("style");
          if (styleAttr && styleAttr.includes("oklch")) {
            el.setAttribute("style", replaceOklchInString(styleAttr));
          }
        }
      }
    });

    // Restore scroll position immediately after canvas generation completes
    window.scrollTo(originalScrollX, originalScrollY);

    const imgData = canvas.toDataURL("image/jpeg", 0.95);

    // 3. Create PDF file (Standard Letter size: 8.5 x 11 inches)
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "in",
      format: "letter"
    });

    const pageWidth = 8.5;
    const pageHeight = 11;
    const margin = 0.3; // matches initial 0.3in margins
    const contentWidth = pageWidth - (margin * 2); // 7.9 in

    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // Maintain natural aspect ratio of the captured canvas element
    const contentHeight = (imgHeight * contentWidth) / imgWidth;

    let heightLeft = contentHeight;
    let position = margin;

    // Render the canvas on the first page
    pdf.addImage(imgData, "JPEG", margin, position, contentWidth, contentHeight, undefined, "FAST");
    heightLeft -= (pageHeight - (margin * 2));

    // Handle seamless multi-page paging
    while (heightLeft > 0) {
      position = heightLeft - contentHeight + margin;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", margin, position, contentWidth, contentHeight, undefined, "FAST");
      heightLeft -= (pageHeight - (margin * 2));
    }

    // Save output PDF file
    pdf.save(pdfFilename);
  } catch (error) {
    try {
      window.scrollTo(originalScrollX, originalScrollY);
    } catch (_) {}
    console.error("PDF generation failed:", error);
    throw error;
  }
};

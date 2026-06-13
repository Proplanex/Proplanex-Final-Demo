/**
 * Dynamically loads html2pdf.js from CDN and exports a download utility.
 */
export const loadHtml2Pdf = () => {
  return new Promise<any>((resolve, reject) => {
    if ((window as any).html2pdf) {
      resolve((window as any).html2pdf);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    script.onload = () => resolve((window as any).html2pdf);
    script.onerror = (err) => reject(err);
    document.body.appendChild(script);
  });
};

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

export const downloadElementAsPdf = async (elementId: string, filename: string) => {
  try {
    // 1. Wait a moment to ensure that any state changes/modals are fully painted
    await new Promise((resolve) => setTimeout(resolve, 250));

    const html2pdf = await loadHtml2Pdf();
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id ${elementId} not found`);
    }

    // Configure options for a polished look matching A4/Letter layout
    const opt = {
      margin:       [0.3, 0.3, 0.3, 0.3], // top, left, bottom, right
      filename:     filename.endsWith(".pdf") ? filename : `${filename}.pdf`,
      image:        { type: "jpeg", quality: 0.98 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true, 
        letterRendering: true,
        scrollX: 0,
        scrollY: 0,
        // Intercept cloned tree and filter oklch styles
        onclone: (clonedDoc: Document) => {
          // Preprocess all style elements in the clone
          const styles = clonedDoc.getElementsByTagName("style");
          for (let i = 0; i < styles.length; i++) {
            const style = styles[i];
            if (style.innerHTML && style.innerHTML.includes("oklch")) {
              style.innerHTML = replaceOklchInString(style.innerHTML);
            }
          }

          // Preprocess style attributes in individual elements
          const allElements = clonedDoc.getElementsByTagName("*");
          for (let i = 0; i < allElements.length; i++) {
            const el = allElements[i];
            const styleAttr = el.getAttribute("style");
            if (styleAttr && styleAttr.includes("oklch")) {
              el.setAttribute("style", replaceOklchInString(styleAttr));
            }
          }
        }
      },
      jsPDF:        { unit: "in", format: "letter", orientation: "portrait" }
    };

    await html2pdf().set(opt).from(element).save();
  } catch (error) {
    console.error("PDF generation failed:", error);
    throw error;
  }
};

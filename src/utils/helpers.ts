import * as XLSX from "xlsx";
import { CompanyProfile, MachineConfig, RunningFactory, Order, YarnTransaction } from "../types";

export function numberToWords(num: number): string {
  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  if (integerPart === 0 && decimalPart === 0) return "Zero Taka Only";

  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertLessThanThousand(n: number): string {
    if (n === 0) return "";
    let str = "";
    if (n >= 100) {
      str += a[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n >= 20) {
      str += b[Math.floor(n / 10)] + " ";
      n %= 10;
    }
    if (n > 0) {
      str += a[n] + " ";
    }
    return str.trim();
  }

  // South-Asian/Indian numbering layout (Crore, Lakh, Thousand, Hundred) is more standard for Taka, but standard decimal is also clean.
  // Here is a standard system that converts up to Lakhs and Crores, which is ideal for Taka.
  function convertToIndianWords(n: number): string {
    if (n === 0) return "";
    let str = "";
    
    const crore = Math.floor(n / 10000000);
    n %= 10000000;
    const lakh = Math.floor(n / 100000);
    n %= 100000;
    const thousand = Math.floor(n / 1000);
    n %= 1000;

    if (crore > 0) {
      str += convertLessThanThousand(crore) + " Crore ";
    }
    if (lakh > 0) {
      str += convertLessThanThousand(lakh) + " Lakh ";
    }
    if (thousand > 0) {
      str += convertLessThanThousand(thousand) + " Thousand ";
    }
    if (n > 0) {
      str += convertLessThanThousand(n);
    }
    return str.trim();
  }

  let totalStr = convertToIndianWords(integerPart) + " Taka";
  totalStr = totalStr.trim();

  if (decimalPart > 0) {
    totalStr += " and " + convertLessThanThousand(decimalPart) + " Paisa";
  }

  return totalStr + " Only";
}

export function downloadTableAsExcel(data: any[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

// Default Configuration and Live State Pre-population
export const defaultCompanyProfile: CompanyProfile = {
  name: "PROPLANEX APPARELS",
  tagline: "Precious Planning ● Synchronized Production ● Next Gen Intelligence",
  address: "Sectors-4, Road 18, Uttara Commercial Area, Dhaka - 1230",
  phoneEmail: "Phone: +880 2 8931234 | Email: production@proplanex.com"
};

export const defaultMachines: MachineConfig[] = [
  { machineNo: "M-101", dia: 34, gg: 18 },
  { machineNo: "M-102", dia: 34, gg: 24 },
  { machineNo: "M-103", dia: 36, gg: 18 },
  { machineNo: "M-104", dia: 36, gg: 24 },
  { machineNo: "M-105", dia: 38, gg: 18 },
  { machineNo: "M-106", dia: 40, gg: 18 },
  { machineNo: "M-107", dia: 40, gg: 20 },
  { machineNo: "M-108", dia: 44, gg: 18 },
  { machineNo: "M-109", dia: 44, gg: 20 },
  { machineNo: "M-110", dia: 44, gg: 18 }
];

export const defaultFactories: RunningFactory[] = [
  { name: "Apex Spinning & Knitting Mills", address: "Kaliakoir, Gazipur, Bangladesh" },
  { name: "DBL Group (Fabric Division)", address: "Mawna, Sreepur, Gazipur" },
  { name: "Viyellatex Ltd.", address: "Tongi Industrial Area, Gazipur" },
  { name: "Ha-Meem Textiles", address: "Narayanganj, Dhaka" },
  { name: "Interstoff Apparels", address: "Chandra, Gazipur" }
];

export const defaultOrders: Order[] = [
  {
    orderNo: "PRO0001",
    receiveDate: "2026-06-01",
    factoryName: "Apex Spinning & Knitting Mills",
    factoryOrder: "FO-9831",
    fabricType: "100% Cotton Single Jersey",
    diaGG: "44 x 18",
    color: "Navy Blue",
    finishGSM: 160,
    finishDia: 44,
    factoryJobNo: "JOB-4412",
    rate: 120, // rate per kg
    requiredQty: 2500,
    remarks: "Yarn lot demands tension checking on start.",
    status: "Running",
    yarns: [
      { yc: "30s Combed", lot: "RE-5421", spinner: "Square Yarns", sl: "3.20" },
      { yc: "20s Carded", lot: "CD-1092", spinner: "Pankaj Spinners", sl: "2.90" },
      { yc: "", lot: "", spinner: "", sl: "" },
      { yc: "", lot: "", spinner: "", sl: "" }
    ]
  },
  {
    orderNo: "PRO0002",
    receiveDate: "2026-06-03",
    factoryName: "DBL Group (Fabric Division)",
    factoryOrder: "DBL-K827",
    fabricType: "Cotton Elastane 1x1 Rib",
    diaGG: "40 x 18",
    color: "Heather Gray",
    finishGSM: 220,
    finishDia: 40,
    factoryJobNo: "JOB-8822",
    rate: 145,
    requiredQty: 1800,
    remarks: "Maintain soft handfeel finish instructions.",
    status: "Running",
    yarns: [
      { yc: "40s Combed Yarn", lot: "SQ-9081", spinner: "Square Spinners", sl: "2.85" },
      { yc: "20D Spandex", lot: "SP-4421", spinner: "Creora Spandex", sl: "1.10" },
      { yc: "", lot: "", spinner: "", sl: "" },
      { yc: "", lot: "", spinner: "", sl: "" }
    ]
  },
  {
    orderNo: "PRO0003",
    receiveDate: "2026-06-05",
    factoryName: "Viyellatex Ltd.",
    factoryOrder: "VT-051",
    fabricType: "Polyester Interlock Heavy",
    diaGG: "36 x 24",
    color: "Crimson Red",
    finishGSM: 280,
    finishDia: 36,
    factoryJobNo: "JOB-1191",
    rate: 110,
    requiredQty: 1200,
    remarks: "High speed tension feed requested.",
    status: "Pending",
    yarns: [
      { yc: "75D/72F DTY Polyester", lot: "PL-0091", spinner: "Sinobright", sl: "3.10" },
      { yc: "", lot: "", spinner: "", sl: "" },
      { yc: "", lot: "", spinner: "", sl: "" },
      { yc: "", lot: "", spinner: "", sl: "" }
    ]
  }
];

export const defaultYarnTransactions: YarnTransaction[] = [
  {
    id: "YT-001",
    orderNo: "PRO0001",
    date: "2026-06-02",
    mode: "Received",
    yc: "30s Combed",
    lot: "RE-5421",
    spinner: "Square Yarns",
    qty: 2600
  },
  {
    id: "YT-002",
    orderNo: "PRO0002",
    date: "2026-06-04",
    mode: "Received",
    yc: "40s Combed Yarn",
    lot: "SQ-9081",
    spinner: "Square Spinners",
    qty: 1900
  },
  {
    id: "YT-003",
    orderNo: "PRO0002",
    date: "2026-06-04",
    mode: "Received",
    yc: "20D Spandex",
    lot: "SP-4421",
    spinner: "Creora Spandex",
    qty: 150
  }
];

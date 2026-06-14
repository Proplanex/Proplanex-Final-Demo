export interface YarnItem {
  yc: string;
  lot: string;
  spinner: string;
  sl: string;
}

export interface Order {
  orderNo: string;
  receiveDate: string;
  factoryName: string;
  factoryOrder: string;
  fabricType: string;
  diaGG: string; // e.g. "44 x 18"
  color: string;
  finishGSM: number;
  finishDia: number;
  knitType?: "Needle Open" | "Blade Open" | "Tube" | "";
  factoryJobNo: string;
  rate: number;
  requiredQty: number;
  yarns: YarnItem[]; // 4 yarn lines
  remarks: string;
  status: "Pending" | "Running" | "Hold" | "Production Done" | "Complete";
  statusOverride?: boolean;
}

export interface YarnTransaction {
  id: string;
  orderNo: string;
  date: string;
  mode: "Received" | "Returned";
  yc: string;
  lot: string;
  spinner: string;
  qty: number;
}

export interface MachinePlan {
  id: string;
  orderNo: string;
  planDate: string;
  machineNo: string;
  plannedQty: number;
  jobCardNo: string;
}

export interface ProductionLog {
  id: string;
  date: string;
  orderNo: string;
  jobCardNo: string;
  machineNo: string;
  shift: "A" | "B" | "C";
  qty: number;
}

export interface GreyDeliveryItem {
  orderNo: string;
  roll: number;
  qty: number;
}

export interface YarnReturnItem {
  orderNo: string;
  yc: string;
  lot: string;
  spinner: string;
  bag: number;
  qty: number;
}

export interface DeliveryChallan {
  challanNo: string; // same as gatepass number
  date: string;
  factoryName: string;
  truckNo: string;
  driverName: string;
  type: "Grey Fabric Delivery" | "Yarn Return";
  greyItems?: GreyDeliveryItem[];
  yarnItems?: YarnReturnItem[];
}

export interface BillItem {
  challanNo: string;
  orderNo: string;
  factoryOrder: string;
  factoryJobNo: string;
  fabricType: string;
  qty: number;
  rate: number;
  amount: number;
}

export interface BillRecord {
  id: string; // bill number
  date: string;
  factoryName: string;
  items: BillItem[];
  totalAmount: number;
  takaInWords: string;
}

// Settings
export interface CompanyProfile {
  name: string;
  tagline: string;
  address: string;
  phoneEmail: string; // for compatibility
  logoUrl?: string; // base64 string
  phone?: string;
  email?: string;
}

export interface PoweredByProfile {
  name: string;
  slogan: string;
  logoUrl?: string; // base64 string
  qrCodeUrl?: string; // base64 string
}

export interface MachineConfig {
  machineNo: string;
  dia: number;
  gg: number;
  machineType?: string;
  fabricType?: string; // Knit Type
  brand?: string;
  origin?: string;
  rpm?: number;
  feeder?: number;
  code?: string;
  efficiency?: number;
  capacityPerDay?: number;
}

export interface RunningFactory {
  name: string;
  address: string; // location
  responsiblePerson?: string;
  designation?: string;
  phone?: string;
  email?: string;
}

export interface ModulePermissions {
  orders: "Read Only" | "Read/Write" | "Hide";
  yarn: "Read Only" | "Read/Write" | "Hide";
  planning: "Read Only" | "Read/Write" | "Hide";
  production: "Read Only" | "Read/Write" | "Hide";
  delivery: "Read Only" | "Read/Write" | "Hide";
  billing: "Read Only" | "Read/Write" | "Hide";
  settings: "Read Only" | "Read/Write" | "Hide";
  admin: "Read Only" | "Read/Write" | "Hide";
  machineload: "Read Only" | "Read/Write" | "Hide";
}

export interface AppUser {
  userId: string;
  password: string;
  permissions: ModulePermissions;
}

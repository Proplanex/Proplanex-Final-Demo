import { Order, YarnTransaction, MachinePlan, ProductionLog, DeliveryChallan, BillRecord, MachineConfig, RunningFactory, AppUser } from "../types";

export interface SyncDataParams {
  orders: Order[];
  yarnTransactions: YarnTransaction[];
  machinePlans: MachinePlan[];
  productionLogs: ProductionLog[];
  deliveryChallans: DeliveryChallan[];
  billRecords: BillRecord[];
  machines: MachineConfig[];
  factories: RunningFactory[];
  machineStatusMap: Record<string, string>;
  users: AppUser[];
}

export interface SyncResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

export async function createAndPopulateSpreadsheet(
  token: string,
  data: SyncDataParams,
  titlePrefix: string = "Proplaex Hub Database"
): Promise<SyncResult> {
  const currentDateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  
  const title = `${titlePrefix} - Sync ${currentDateStr}`;

  // 1. Create a brand-new Spreadsheet with 9 sheets
  const createResponse = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        title: title,
      },
      sheets: [
        { properties: { title: "Orders" } },
        { properties: { title: "Yarn Transactions" } },
        { properties: { title: "Job Cards (Planning)" } },
        { properties: { title: "Production Logs" } },
        { properties: { title: "Delivery Challans" } },
        { properties: { title: "Billed Invoices" } },
        { properties: { title: "Knitting Machines" } },
        { properties: { title: "Partner Factories" } },
        { properties: { title: "Registered Users" } },
      ],
    }),
  });

  if (!createResponse.ok) {
    const errText = await createResponse.text();
    throw new Error(`Failed to create Google Spreadsheet: ${errText}`);
  }

  const spreadsheet = await createResponse.json();
  const spreadsheetId = spreadsheet.spreadsheetId;
  const spreadsheetUrl = spreadsheet.spreadsheetUrl;

  // 2. Prepare grid arrays for the 9 tabs
  const valueRanges: any[] = [];

  // Sheet 1: Orders
  const ordersHeaders = [
    "Order No", "Receive Date", "Factory Name", "Factory Order", "Fabric Type", 
    "Dia x GG", "Color", "Finish GSM", "Finish Dia", "Factory Job No", 
    "Rate (BDT)", "Required Qty (Kg)", "Status", "Remarks", 
    "Yarn 1 YC", "Yarn 1 Lot", "Yarn 1 Spinner", "Yarn 1 S/L", 
    "Yarn 2 YC", "Yarn 2 Lot", "Yarn 2 Spinner", "Yarn 2 S/L", 
    "Yarn 3 YC", "Yarn 3 Lot", "Yarn 3 Spinner", "Yarn 3 S/L", 
    "Yarn 4 YC", "Yarn 4 Lot", "Yarn 4 Spinner", "Yarn 4 S/L"
  ];
  const ordersRows = data.orders.map(o => {
    const yarns = o.yarns || [];
    const y1 = yarns[0] || { yc: "", lot: "", spinner: "", sl: "" };
    const y2 = yarns[1] || { yc: "", lot: "", spinner: "", sl: "" };
    const y3 = yarns[2] || { yc: "", lot: "", spinner: "", sl: "" };
    const y4 = yarns[3] || { yc: "", lot: "", spinner: "", sl: "" };
    return [
      o.orderNo, o.receiveDate, o.factoryName, o.factoryOrder, o.fabricType, 
      o.diaGG, o.color, o.finishGSM, o.finishDia, o.factoryJobNo, 
      o.rate, o.requiredQty, o.status, o.remarks,
      y1.yc, y1.lot, y1.spinner, y1.sl,
      y2.yc, y2.lot, y2.spinner, y2.sl,
      y3.yc, y3.lot, y3.spinner, y3.sl,
      y4.yc, y4.lot, y4.spinner, y4.sl
    ];
  });
  valueRanges.push({
    range: "'Orders'!A1",
    values: [ordersHeaders, ...ordersRows],
  });

  // Sheet 2: Yarn Transactions
  const yarnHeaders = ["Transaction ID", "Order No", "Date", "Mode", "Yarn Count (YC)", "Lot No", "Spinner", "Quantity (Kg)"];
  const yarnRows = data.yarnTransactions.map(tx => [
    tx.id, tx.orderNo, tx.date, tx.mode, tx.yc, tx.lot, tx.spinner, tx.qty
  ]);
  valueRanges.push({
    range: "'Yarn Transactions'!A1",
    values: [yarnHeaders, ...yarnRows],
  });

  // Sheet 3: Job Cards (Planning)
  const planningHeaders = ["Job Card No", "Order No", "Plan Date", "Machine No", "Planned Qty (Kg)"];
  const planningRows = data.machinePlans.map(p => [
    p.jobCardNo, p.orderNo, p.planDate, p.machineNo, p.plannedQty
  ]);
  valueRanges.push({
    range: "'Job Cards (Planning)'!A1",
    values: [planningHeaders, ...planningRows],
  });

  // Sheet 4: Production Logs
  const productionHeaders = ["Log ID", "Date", "Order No", "Job Card No", "Machine No", "Shift", "Net Production Qty (Kg)"];
  const productionRows = data.productionLogs.map(l => [
    l.id, l.date, l.orderNo, l.jobCardNo, l.machineNo, l.shift, l.qty
  ]);
  valueRanges.push({
    range: "'Production Logs'!A1",
    values: [productionHeaders, ...productionRows],
  });

  // Sheet 5: Delivery Challans
  const deliveryHeaders = [
    "Challan No", "Challan Date", "Factory Name", "Truck No", "Driver Name", 
    "Delivery Type", "Item - Order No", "Item - Cargo/Rolls", "Item - Weight (Kg)", "Item Info"
  ];
  const deliveryRows: any[] = [];
  data.deliveryChallans.forEach(ch => {
    if (ch.type === "Grey Fabric Delivery" && ch.greyItems?.length) {
      ch.greyItems.forEach(item => {
        deliveryRows.push([
          ch.challanNo, ch.date, ch.factoryName, ch.truckNo, ch.driverName, ch.type,
          item.orderNo, `Roll ${item.roll}`, item.qty, "Knit Fabric Cargo"
        ]);
      });
    } else if (ch.type === "Yarn Return" && ch.yarnItems?.length) {
      ch.yarnItems.forEach(item => {
        deliveryRows.push([
          ch.challanNo, ch.date, ch.factoryName, ch.truckNo, ch.driverName, ch.type,
          item.orderNo, `Bag ${item.bag}`, item.qty, `${item.yc} | Lot ${item.lot} | Spin ${item.spinner}`
        ]);
      });
    } else {
      deliveryRows.push([
        ch.challanNo, ch.date, ch.factoryName, ch.truckNo, ch.driverName, ch.type,
        "", "", 0, "No item detail lines"
      ]);
    }
  });
  valueRanges.push({
    range: "'Delivery Challans'!A1",
    values: [deliveryHeaders, ...deliveryRows],
  });

  // Sheet 6: Billed Invoices
  const billingHeaders = [
    "Invoice ID", "Date", "Factory Name", "Total Amount (BDT)", "Taka In Words", 
    "Detail - Challan No", "Detail - Order No", "Detail - Factory Order", 
    "Detail - Factory Job No", "Detail - Fabric Type", "Detail - Qty (Kg)", 
    "Detail - Rate (BDT)", "Detail - Subtotal (BDT)"
  ];
  const billingRows: any[] = [];
  data.billRecords.forEach(b => {
    if (b.items?.length) {
      b.items.forEach(item => {
        billingRows.push([
          b.id, b.date, b.factoryName, b.totalAmount, b.takaInWords,
          item.challanNo, item.orderNo, item.factoryOrder, item.factoryJobNo, 
          item.fabricType, item.qty, item.rate, item.amount
        ]);
      });
    } else {
      billingRows.push([
        b.id, b.date, b.factoryName, b.totalAmount, b.takaInWords,
        "", "", "", "", "", 0, 0, 0
      ]);
    }
  });
  valueRanges.push({
    range: "'Billed Invoices'!A1",
    values: [billingHeaders, ...billingRows],
  });

  // Sheet 7: Knitting Machines
  const machineHeaders = [
    "Machine No", "Dia", "GG", "Machine Type", "Knit Type", 
    "Brand", "Origin", "RPM", "Feeder", "Code", "Efficiency (%)", 
    "Capacity Per Day (Kg)", "Current Machine Status Check"
  ];
  const machineRows = data.machines.map(m => [
    m.machineNo, m.dia, m.gg, m.machineType || "Circular", m.fabricType || "Knit", 
    m.brand || "—", m.origin || "—", m.rpm || 0, m.feeder || 0, m.code || "—", 
    m.efficiency ? `${m.efficiency}%` : "—", m.capacityPerDay || 0, 
    data.machineStatusMap[m.machineNo] || "Available"
  ]);
  valueRanges.push({
    range: "'Knitting Machines'!A1",
    values: [machineHeaders, ...machineRows],
  });

  // Sheet 8: Partner Factories
  const factoryHeaders = ["Factory Name", "Factory Address (Location)", "Responsible Person", "Designation", "Phone", "Email"];
  const factoryRows = data.factories.map(f => [
    f.name, f.address, f.responsiblePerson || "—", f.designation || "—", f.phone || "—", f.email || "—"
  ]);
  valueRanges.push({
    range: "'Partner Factories'!A1",
    values: [factoryHeaders, ...factoryRows],
  });

  // Sheet 9: Registered Users
  const userHeaders = ["User ID", "Orders Permission", "Yarn Permission", "Planning Permission", "Production Permission", "Delivery Permission", "Billing Permission", "Machine Load", "Settings Permission", "Admin Panel"];
  const userRows = data.users.map(u => [
    u.userId, u.permissions.orders, u.permissions.yarn, u.permissions.planning, u.permissions.production, u.permissions.delivery, u.permissions.billing, u.permissions.machineload, u.permissions.settings, u.permissions.admin
  ]);
  valueRanges.push({
    range: "'Registered Users'!A1",
    values: [userHeaders, ...userRows],
  });

  // 3. Batch Update all worksheets in a single request
  const batchResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      valueInputOption: "USER_ENTERED",
      data: valueRanges,
    }),
  });

  if (!batchResponse.ok) {
    const errText = await batchResponse.text();
    throw new Error(`Failed to update google sheet values: ${errText}`);
  }

  return {
    spreadsheetId,
    spreadsheetUrl: spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
  };
}

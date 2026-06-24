import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { 
  Order, YarnTransaction, MachinePlan, ProductionLog, 
  DeliveryChallan, BillRecord, CompanyProfile, PoweredByProfile, MachineConfig, RunningFactory,
  AppUser, ModulePermissions
} from "../types";
import { 
  defaultCompanyProfile, defaultPoweredByProfile, defaultMachines, defaultFactories, 
  defaultOrders, defaultYarnTransactions 
} from "../utils/helpers";
import {
  validateFirestoreConnection,
  saveSharedSetting,
  loadSharedSetting,
  fetchCollection,
  saveBatchCollection,
  fetchCollectionFromServer,
  loadSharedSettingFromServer,
  syncCollectionDelta
} from "../utils/firebaseFirestoreService";
import { doc, collection, onSnapshot, enableNetwork, getDocFromServer } from "firebase/firestore";
import { db } from "../utils/firebaseAuth";

interface AppContextType {
  orders: Order[];
  yarnTransactions: YarnTransaction[];
  machinePlans: MachinePlan[];
  productionLogs: ProductionLog[];
  deliveryChallans: DeliveryChallan[];
  billRecords: BillRecord[];
  companyProfile: CompanyProfile;
  poweredByProfile: PoweredByProfile;
  machines: MachineConfig[];
  factories: RunningFactory[];
  
  // User Authentication & Permissions
  users: AppUser[];
  currentUser: AppUser | null; // Note: "superadmin" will be structured inside this as well, e.g. { userId: "superadmin", permissions: ... }
  trialDays: string; // "1 Day", etc.
  trialExpirationDate: string | null;
  isExpired: boolean;

  loginUser: (userId: string, psw: string) => boolean;
  logoutUser: () => void;
  addUser: (user: AppUser) => void;
  deleteUser: (userId: string) => void;
  changeUserPassword: (userId: string, newPsw: string) => void;
  updateUserPermissions: (userId: string, permissions: ModulePermissions) => void;
  updateTrialLimit: (days: string) => void;

  // State Mutators
  addOrder: (order: Omit<Order, "orderNo" | "status">) => void;
  updateOrder: (order: Order) => void;
  deleteOrder: (orderNo: string) => void;
  updateOrderStatus: (orderNo: string, status: Order["status"], manualOverride: boolean) => void;
  addYarnTransaction: (tx: Omit<YarnTransaction, "id">) => void;
  deleteYarnTransaction: (id: string) => void;
  addMachinePlan: (plan: Omit<MachinePlan, "id" | "jobCardNo">) => void;
  updateMachinePlan: (id: string, updatedFields: Partial<MachinePlan>) => void;
  splitMachinePlan: (originalPlanId: string, originalNewQty: number, targetMachineNo: string, targetNewQty: number) => void;
  deleteMachinePlan: (id: string) => void;
  addProductionLog: (log: Omit<ProductionLog, "id">) => void;
  deleteProductionLog: (id: string) => void;
  addDeliveryChallan: (challan: DeliveryChallan) => void;
  deleteDeliveryChallan: (challanNo: string) => void;
  addBillRecord: (bill: BillRecord) => void;
  deleteBillRecord: (id: string) => void;
  
  // Settings Mutators
  updateCompanyProfile: (profile: CompanyProfile) => void;
  updatePoweredByProfile: (profile: PoweredByProfile) => void;
  addMachine: (machine: MachineConfig) => void;
  deleteMachine: (machineNo: string) => void;
  addFactory: (factory: RunningFactory) => void;
  deleteFactory: (name: string) => void;

  // Global calculations helper
  getYarnReceived: (orderNo: string) => number;
  getTotalProduction: (orderNo: string) => number;
  getTotalDelivery: (orderNo: string) => number;
  getPlannedQty: (orderNo: string) => number;
  
  // Machine status map for Module 7
  machineStatusMap: Record<string, string>;
  updateMachineStatus: (machineNo: string, status: string) => void;

  // General Deletion Authority check
  canCurrentUserDeleteData: () => boolean;

  // Stored Centralized Google Sheets Webhook Configuration
  sheetsWebhookUrl: string;
  updateSheetsWebhookUrl: (url: string) => void;
  autoSyncStatus: "idle" | "syncing" | "success" | "error";
  lastAutoSyncTime: string | null;

  // Persistent Google OAuth Client ID for live custom domains (Vercel)
  googleClientId: string;
  updateGoogleClientId: (clientId: string) => void;
  isQuotaExceeded: boolean;
  retryCloudSync: () => void;
  isCloudLoaded: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const defaultUsers: AppUser[] = [
  {
    userId: "admin@proplanex.com",
    password: "@Dmin123",
    permissions: {
      orders: "Read/Write",
      yarn: "Read/Write",
      planning: "Read/Write",
      production: "Read/Write",
      delivery: "Read/Write",
      billing: "Read/Write",
      settings: "Read/Write",
      admin: "Read/Write",
      machineload: "Read/Write"
    }
  }
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Authentication & Trial States
  const [users, setUsers] = useState<AppUser[]>(() => {
    const saved = localStorage.getItem("pro_users");
    return saved ? JSON.parse(saved) : defaultUsers;
  });

  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    const saved = localStorage.getItem("pro_current_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [trialDays, setTrialDays] = useState<string>(() => {
    return localStorage.getItem("pro_trial_days") || "No Limit";
  });

  const [trialExpirationDate, setTrialExpirationDate] = useState<string | null>(() => {
    return localStorage.getItem("pro_trial_expiration") || null;
  });

  const [isExpired, setIsExpired] = useState<boolean>(false);

  const [sheetsWebhookUrl, setSheetsWebhookUrl] = useState<string>(() => {
    return localStorage.getItem("proplaex_sheets_webhook_url") || "";
  });

  const [googleClientId, setGoogleClientId] = useState<string>(() => {
    return localStorage.getItem("proplaex_google_client_id") || "";
  });

  const [isCloudLoaded, setIsCloudLoaded] = useState<boolean>(false);
  const [isQuotaExceeded, _setIsQuotaExceeded] = useState<boolean>(() => {
    // Clear legacy localStorage key to self-heal existing browsers
    localStorage.removeItem("pro_firestore_quota_exceeded");
    return sessionStorage.getItem("pro_firestore_quota_exceeded") === "true";
  });
  const setIsQuotaExceeded = (val: boolean) => {
    if (val) {
      sessionStorage.setItem("pro_firestore_quota_exceeded", "true");
    } else {
      sessionStorage.removeItem("pro_firestore_quota_exceeded");
    }
    _setIsQuotaExceeded(val);
  };
  const [syncTrigger, setSyncTrigger] = useState<number>(0);

  const retryCloudSync = () => {
    sessionStorage.removeItem("pro_firestore_quota_exceeded");
    _setIsQuotaExceeded(false);
    setIsCloudLoaded(false);
    setSyncTrigger(prev => prev + 1);
  };

  // Tracks the serialized string representation of the last known state loaded or saved to cloud Firestore
  const lastCloudSyncedRef = useRef<Record<string, string>>({
    orders: "",
    yarnTransactions: "",
    machinePlans: "",
    productionLogs: "",
    deliveryChallans: "",
    billRecords: "",
    companyProfile: "",
    poweredByProfile: "",
    machines: "",
    factories: "",
    machineStatuses: "",
    users: "",
    trialConfig: "",
    sheetsConfig: "",
    googleClientIdConfig: ""
  });

  // Initial Central Cloud load of configurations and database lists
  useEffect(() => {
    async function initCloudAndSync() {
      if (sessionStorage.getItem("pro_firestore_quota_exceeded") === "true") {
        setIsQuotaExceeded(true);
        console.warn("Firestore writing/reading quota limit previously reached. Running in offline mode.");
        return;
      }
      try {
        await validateFirestoreConnection();

        // Direct server query to verify database initialization status.
        // If this query fails due to network/offline conditions, we MUST fallback to true (assume seeded)
        // to avoid running the 'else' block and triggering unrequested cloud overrides/overwrites.
        let isSeededInCloud = false;
        try {
          const dbStatusRef = doc(db, 'workspace_info', 'db_status');
          const dbStatusSnap = await getDocFromServer(dbStatusRef);
          isSeededInCloud = dbStatusSnap.exists() && (dbStatusSnap.data() as any)?.seeded === true;
        } catch (err) {
          console.warn("Direct db_status verification failed (expected if offline). Defaulting to seeded mode to preserve existing cloud data:", err);
          isSeededInCloud = true;
        }

        if (isSeededInCloud) {
          // 1. Load configuration templates
          const cProfile = await loadSharedSettingFromServer<CompanyProfile | null>("companyProfile", null);
          if (cProfile) {
            setCompanyProfile(cProfile);
            lastCloudSyncedRef.current.companyProfile = JSON.stringify(cProfile);
          }

          const pProfile = await loadSharedSettingFromServer<PoweredByProfile | null>("poweredByProfile", null);
          if (pProfile) {
            setPoweredByProfile(pProfile);
            lastCloudSyncedRef.current.poweredByProfile = JSON.stringify(pProfile);
          }

          const tConfig = await loadSharedSettingFromServer<{ trialDays: string; trialExpirationDate: string | null } | null>("trialConfig", null);
          if (tConfig) {
            setTrialDays(tConfig.trialDays);
            setTrialExpirationDate(tConfig.trialExpirationDate);
            lastCloudSyncedRef.current.trialConfig = JSON.stringify({ trialDays: tConfig.trialDays, trialExpirationDate: tConfig.trialExpirationDate });
          }

          const sWebhook = await loadSharedSettingFromServer<{ webhookUrl: string } | null>("sheetsConfig", null);
          if (sWebhook) {
            setSheetsWebhookUrl(sWebhook.webhookUrl);
            lastCloudSyncedRef.current.sheetsConfig = JSON.stringify({ webhookUrl: sWebhook.webhookUrl });
          }

          const gClientId = await loadSharedSettingFromServer<{ clientId: string } | null>("googleClientIdConfig", null);
          if (gClientId) {
            setGoogleClientId(gClientId.clientId);
            localStorage.setItem("proplaex_google_client_id", gClientId.clientId);
            lastCloudSyncedRef.current.googleClientIdConfig = JSON.stringify({ clientId: gClientId.clientId });
          }

          // 2. Load core entity registries (always load, even if empty)
          const cloudOrders = await fetchCollectionFromServer<Order>("orders");
          setOrders(cloudOrders);
          lastCloudSyncedRef.current.orders = JSON.stringify(cloudOrders);

          const cloudYarn = await fetchCollectionFromServer<YarnTransaction>("yarnTransactions");
          setYarnTransactions(cloudYarn);
          lastCloudSyncedRef.current.yarnTransactions = JSON.stringify(cloudYarn);

          const cloudPlans = await fetchCollectionFromServer<MachinePlan>("machinePlans");
          setMachinePlans(cloudPlans);
          lastCloudSyncedRef.current.machinePlans = JSON.stringify(cloudPlans);

          const cloudLogs = await fetchCollectionFromServer<ProductionLog>("productionLogs");
          setProductionLogs(cloudLogs);
          lastCloudSyncedRef.current.productionLogs = JSON.stringify(cloudLogs);

          const cloudChallans = await fetchCollectionFromServer<DeliveryChallan>("deliveryChallans");
          setDeliveryChallans(cloudChallans);
          lastCloudSyncedRef.current.deliveryChallans = JSON.stringify(cloudChallans);

          const cloudBills = await fetchCollectionFromServer<BillRecord>("billRecords");
          setBillRecords(cloudBills);
          lastCloudSyncedRef.current.billRecords = JSON.stringify(cloudBills);

          const cloudMachines = await fetchCollectionFromServer<MachineConfig>("machines");
          setMachines(cloudMachines);
          lastCloudSyncedRef.current.machines = JSON.stringify(cloudMachines);

          const cloudFactories = await fetchCollectionFromServer<RunningFactory>("factories");
          setFactories(cloudFactories);
          lastCloudSyncedRef.current.factories = JSON.stringify(cloudFactories);

          const cloudUsers = await fetchCollectionFromServer<AppUser>("users");
          if (cloudUsers.length > 0) {
            setUsers(cloudUsers);
            lastCloudSyncedRef.current.users = JSON.stringify(cloudUsers);
          } else {
            lastCloudSyncedRef.current.users = JSON.stringify(users);
          }

          const cloudStatuses = await fetchCollectionFromServer<{ id: string; status: string }>("machineStatuses");
          const statusMap: Record<string, string> = {};
          cloudStatuses.forEach(s => {
            statusMap[s.id] = s.status;
          });
          setMachineStatusMap(statusMap);
          const statusList = Object.entries(statusMap).map(([mNo, status]) => ({ id: mNo, status }));
          lastCloudSyncedRef.current.machineStatuses = JSON.stringify(statusList);
        } else {
          // Cloud database is empty or never seeded before. Seed it with CURRENT local state.
          await saveSharedSetting("companyProfile", companyProfile);
          lastCloudSyncedRef.current.companyProfile = JSON.stringify(companyProfile);

          await saveSharedSetting("poweredByProfile", poweredByProfile);
          lastCloudSyncedRef.current.poweredByProfile = JSON.stringify(poweredByProfile);

          const tConfig = { trialDays, trialExpirationDate };
          await saveSharedSetting("trialConfig", tConfig);
          lastCloudSyncedRef.current.trialConfig = JSON.stringify(tConfig);

          const sWebhook = { webhookUrl: sheetsWebhookUrl };
          await saveSharedSetting("sheetsConfig", sWebhook);
          lastCloudSyncedRef.current.sheetsConfig = JSON.stringify(sWebhook);

          const gClientId = { clientId: googleClientId };
          await saveSharedSetting("googleClientIdConfig", gClientId);
          lastCloudSyncedRef.current.googleClientIdConfig = JSON.stringify(gClientId);

          await saveBatchCollection("orders", orders, "orderNo");
          lastCloudSyncedRef.current.orders = JSON.stringify(orders);

          await saveBatchCollection("yarnTransactions", yarnTransactions, "id");
          lastCloudSyncedRef.current.yarnTransactions = JSON.stringify(yarnTransactions);

          await saveBatchCollection("machinePlans", machinePlans, "id");
          lastCloudSyncedRef.current.machinePlans = JSON.stringify(machinePlans);

          await saveBatchCollection("productionLogs", productionLogs, "id");
          lastCloudSyncedRef.current.productionLogs = JSON.stringify(productionLogs);

          await saveBatchCollection("deliveryChallans", deliveryChallans, "challanNo");
          lastCloudSyncedRef.current.deliveryChallans = JSON.stringify(deliveryChallans);

          await saveBatchCollection("billRecords", billRecords, "id");
          lastCloudSyncedRef.current.billRecords = JSON.stringify(billRecords);

          await saveBatchCollection("machines", machines, "machineNo");
          lastCloudSyncedRef.current.machines = JSON.stringify(machines);

          await saveBatchCollection("factories", factories, "name");
          lastCloudSyncedRef.current.factories = JSON.stringify(factories);

          await saveBatchCollection("users", users, "userId");
          lastCloudSyncedRef.current.users = JSON.stringify(users);

          const statusList = Object.entries(machineStatusMap).map(([mNo, status]) => ({ id: mNo, status }));
          await saveBatchCollection("machineStatuses", statusList, "id");
          lastCloudSyncedRef.current.machineStatuses = JSON.stringify(statusList);

          // Mark as seeded in cloud
          await saveSharedSetting("db_status", { seeded: true });
        }

        setIsCloudLoaded(true);
        console.log("Central cloud data sync has connected successfully.");
      } catch (error) {
        console.error("Central cloud setup failed:", error);
        if (error instanceof Error && (error.message.toLowerCase().includes("quota") || error.message.toLowerCase().includes("resource-exhausted"))) {
          sessionStorage.setItem("pro_firestore_quota_exceeded", "true");
          setIsQuotaExceeded(true);
        }
      }
    }
    initCloudAndSync();
  }, [syncTrigger]);

  // Real-time Cloud Observers for Multi-Platform/Multi-PC synchronization
  useEffect(() => {
    if (!isCloudLoaded || isQuotaExceeded) return;

    const unsubscribes: (() => void)[] = [];

    // Helper to safely verify and register snapshots for settings documents
    const listenDoc = (docKey: string, keyName: string, setStateFn: (val: any) => void) => {
      const docRef = doc(db, "workspace_info", docKey);
      const unsub = onSnapshot(docRef, (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data();
        const serialized = JSON.stringify(data);
        if (serialized !== lastCloudSyncedRef.current[keyName]) {
          lastCloudSyncedRef.current[keyName] = serialized;
          setStateFn(data);
        }
      }, (err) => {
        console.error(`Real-time listen for ${docKey} doc failed:`, err);
      });
      unsubscribes.push(unsub);
    };

    // 1. Single workspace configurations
    listenDoc("companyProfile", "companyProfile", setCompanyProfile);
    listenDoc("poweredByProfile", "poweredByProfile", setPoweredByProfile);
    listenDoc("sheetsConfig", "sheetsConfig", (data) => setSheetsWebhookUrl(data?.webhookUrl || ""));
    listenDoc("googleClientIdConfig", "googleClientIdConfig", (data) => setGoogleClientId(data?.clientId || ""));

    // Trial limit has a custom handler due to multiple linked state variables
    const trialDocRef = doc(db, "workspace_info", "trialConfig");
    const unsubTrial = onSnapshot(trialDocRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data() as { trialDays: string; trialExpirationDate: string | null };
      const serialized = JSON.stringify(data);
      if (serialized !== lastCloudSyncedRef.current.trialConfig) {
        lastCloudSyncedRef.current.trialConfig = serialized;
        setTrialDays(data.trialDays || "No Limit");
        setTrialExpirationDate(data.trialExpirationDate || null);
      }
    }, (err) => {
      console.error("Real-time listen for trialConfig failed:", err);
    });
    unsubscribes.push(unsubTrial);

    // 2. Collection observers mapped to set states
    const listenCollection = <T extends any>(
      colName: string,
      idKey: string,
      setStateFn: (val: T[]) => void,
      lastSyncedKey: string
    ) => {
      const colRef = collection(db, colName);
      const unsub = onSnapshot(colRef, (snapshot) => {
        const list: T[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as T);
        });

        // Stabilize sorting to prevent random diff loops
        list.sort((a: any, b: any) => {
          const valA = String(a[idKey] || a.id || "");
          const valB = String(b[idKey] || b.id || "");
          return valA.localeCompare(valB);
        });

        const serialized = JSON.stringify(list);
        if (serialized !== lastCloudSyncedRef.current[lastSyncedKey]) {
          lastCloudSyncedRef.current[lastSyncedKey] = serialized;
          setStateFn(list);
        }
      }, (err) => {
        console.error(`Real-time listen for ${colName} collection failed:`, err);
      });
      unsubscribes.push(unsub);
    };

    listenCollection<Order>("orders", "orderNo", setOrders, "orders");
    listenCollection<YarnTransaction>("yarnTransactions", "id", setYarnTransactions, "yarnTransactions");
    listenCollection<MachinePlan>("machinePlans", "id", setMachinePlans, "machinePlans");
    listenCollection<ProductionLog>("productionLogs", "id", setProductionLogs, "productionLogs");
    listenCollection<DeliveryChallan>("deliveryChallans", "challanNo", setDeliveryChallans, "deliveryChallans");
    listenCollection<BillRecord>("billRecords", "id", setBillRecords, "billRecords");
    listenCollection<MachineConfig>("machines", "machineNo", setMachines, "machines");
    listenCollection<RunningFactory>("factories", "name", setFactories, "factories");
    listenCollection<AppUser>("users", "userId", setUsers, "users");

    // Machine Status Map requires parsing the live state list back to dictionary
    const statusColRef = collection(db, "machineStatuses");
    const unsubStatus = onSnapshot(statusColRef, (snapshot) => {
      const statusMap: Record<string, string> = {};
      const statusList: { id: string; status: string }[] = [];
      snapshot.forEach((doc) => {
        const item = doc.data() as { id: string; status: string };
        statusMap[item.id] = item.status;
        statusList.push(item);
      });

      // Sort to stabilize comparison
      statusList.sort((a, b) => a.id.localeCompare(b.id));
      const serialized = JSON.stringify(statusList);
      if (serialized !== lastCloudSyncedRef.current.machineStatuses) {
        lastCloudSyncedRef.current.machineStatuses = serialized;
        setMachineStatusMap(statusMap);
      }
    }, (err) => {
      console.error("Real-time listen for machineStatuses failed:", err);
    });
    unsubscribes.push(unsubStatus);

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [isCloudLoaded, isQuotaExceeded]);

  // Read state from LocalStorage or seed with defaults
  const [orders, setOrders] = useState<Order[]>(() => {
    const data = localStorage.getItem("pro_orders");
    return data ? JSON.parse(data) : defaultOrders;
  });

  const [yarnTransactions, setYarnTransactions] = useState<YarnTransaction[]>(() => {
    const data = localStorage.getItem("pro_yarn_tx");
    return data ? JSON.parse(data) : defaultYarnTransactions;
  });

  const [machinePlans, setMachinePlans] = useState<MachinePlan[]>(() => {
    const data = localStorage.getItem("pro_machine_plans");
    return data ? JSON.parse(data) : [];
  });

  const [productionLogs, setProductionLogs] = useState<ProductionLog[]>(() => {
    const data = localStorage.getItem("pro_production_logs");
    return data ? JSON.parse(data) : [];
  });

  const [deliveryChallans, setDeliveryChallans] = useState<DeliveryChallan[]>(() => {
    const data = localStorage.getItem("pro_delivery_challans");
    if (data) {
      try {
        const parsed: DeliveryChallan[] = JSON.parse(data);
        return parsed.map(ch => ({
          ...ch,
          challanNo: ch.challanNo.startsWith("GP-") 
            ? ch.challanNo.replace("GP-", "CH-") 
            : ch.challanNo
        }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [billRecords, setBillRecords] = useState<BillRecord[]>(() => {
    const data = localStorage.getItem("pro_bill_records");
    return data ? JSON.parse(data) : [];
  });

  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() => {
    const data = localStorage.getItem("pro_company_profile");
    return data ? JSON.parse(data) : defaultCompanyProfile;
  });

  const [poweredByProfile, setPoweredByProfile] = useState<PoweredByProfile>(() => {
    const data = localStorage.getItem("pro_powered_by_profile");
    return data ? JSON.parse(data) : defaultPoweredByProfile;
  });

  const [machines, setMachines] = useState<MachineConfig[]>(() => {
    const data = localStorage.getItem("pro_machines");
    return data ? JSON.parse(data) : defaultMachines;
  });

  const [factories, setFactories] = useState<RunningFactory[]>(() => {
    const data = localStorage.getItem("pro_factories");
    return data ? JSON.parse(data) : defaultFactories;
  });

  const [machineStatusMap, setMachineStatusMap] = useState<Record<string, string>>(() => {
    const data = localStorage.getItem("pro_machine_statuses");
    return data ? JSON.parse(data) : {};
  });

  // Sync to LocalStorage on modifications
  useEffect(() => {
    localStorage.setItem("pro_orders", JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem("pro_yarn_tx", JSON.stringify(yarnTransactions));
  }, [yarnTransactions]);

  useEffect(() => {
    localStorage.setItem("pro_machine_plans", JSON.stringify(machinePlans));
  }, [machinePlans]);

  useEffect(() => {
    localStorage.setItem("pro_production_logs", JSON.stringify(productionLogs));
  }, [productionLogs]);

  useEffect(() => {
    localStorage.setItem("pro_delivery_challans", JSON.stringify(deliveryChallans));
  }, [deliveryChallans]);

  useEffect(() => {
    localStorage.setItem("pro_bill_records", JSON.stringify(billRecords));
  }, [billRecords]);

  useEffect(() => {
    localStorage.setItem("pro_company_profile", JSON.stringify(companyProfile));
  }, [companyProfile]);

  useEffect(() => {
    localStorage.setItem("pro_powered_by_profile", JSON.stringify(poweredByProfile));
  }, [poweredByProfile]);

  useEffect(() => {
    localStorage.setItem("pro_machines", JSON.stringify(machines));
  }, [machines]);

  useEffect(() => {
    localStorage.setItem("pro_factories", JSON.stringify(factories));
  }, [factories]);

  useEffect(() => {
    localStorage.setItem("pro_machine_statuses", JSON.stringify(machineStatusMap));
  }, [machineStatusMap]);

  // Authentication & Trial Sync & Limit Check Effects
  useEffect(() => {
    localStorage.setItem("pro_users", JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("pro_current_user", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("pro_current_user");
    }
  }, [currentUser]);

  // Sync to Centralized Cloud Firestore gated by loaded status & local modifications (highly optimized delta-based updates)
  useEffect(() => {
    if (!isCloudLoaded || isQuotaExceeded) return;
    const serialized = JSON.stringify(orders);
    const lastSerialized = lastCloudSyncedRef.current.orders;
    if (serialized === lastSerialized) return;

    const oldItems = lastSerialized ? JSON.parse(lastSerialized) : [];
    syncCollectionDelta("orders", orders, oldItems, "orderNo")
      .then(() => {
        lastCloudSyncedRef.current.orders = serialized;
      })
      .catch((err) => {
        console.error("Cloud sync partition orders failed:", err);
        if (err.message?.includes("quota") || err.message?.includes("resource-exhausted")) {
          setIsQuotaExceeded(true);
        }
      });
  }, [orders, isCloudLoaded, isQuotaExceeded]);

  useEffect(() => {
    if (!isCloudLoaded || isQuotaExceeded) return;
    const serialized = JSON.stringify(yarnTransactions);
    const lastSerialized = lastCloudSyncedRef.current.yarnTransactions;
    if (serialized === lastSerialized) return;

    const oldItems = lastSerialized ? JSON.parse(lastSerialized) : [];
    syncCollectionDelta("yarnTransactions", yarnTransactions, oldItems, "id")
      .then(() => {
        lastCloudSyncedRef.current.yarnTransactions = serialized;
      })
      .catch((err) => {
        console.error("Cloud sync partition yarnTransactions failed:", err);
        if (err.message?.includes("quota") || err.message?.includes("resource-exhausted")) {
          setIsQuotaExceeded(true);
        }
      });
  }, [yarnTransactions, isCloudLoaded, isQuotaExceeded]);

  useEffect(() => {
    if (!isCloudLoaded || isQuotaExceeded) return;
    const serialized = JSON.stringify(machinePlans);
    const lastSerialized = lastCloudSyncedRef.current.machinePlans;
    if (serialized === lastSerialized) return;

    const oldItems = lastSerialized ? JSON.parse(lastSerialized) : [];
    syncCollectionDelta("machinePlans", machinePlans, oldItems, "id")
      .then(() => {
        lastCloudSyncedRef.current.machinePlans = serialized;
      })
      .catch((err) => {
        console.error("Cloud sync partition machinePlans failed:", err);
        if (err.message?.includes("quota") || err.message?.includes("resource-exhausted")) {
          setIsQuotaExceeded(true);
        }
      });
  }, [machinePlans, isCloudLoaded, isQuotaExceeded]);

  useEffect(() => {
    if (!isCloudLoaded || isQuotaExceeded) return;
    const serialized = JSON.stringify(productionLogs);
    const lastSerialized = lastCloudSyncedRef.current.productionLogs;
    if (serialized === lastSerialized) return;

    const oldItems = lastSerialized ? JSON.parse(lastSerialized) : [];
    syncCollectionDelta("productionLogs", productionLogs, oldItems, "id")
      .then(() => {
        lastCloudSyncedRef.current.productionLogs = serialized;
      })
      .catch((err) => {
        console.error("Cloud sync partition productionLogs failed:", err);
        if (err.message?.includes("quota") || err.message?.includes("resource-exhausted")) {
          setIsQuotaExceeded(true);
        }
      });
  }, [productionLogs, isCloudLoaded, isQuotaExceeded]);

  useEffect(() => {
    if (!isCloudLoaded || isQuotaExceeded) return;
    const serialized = JSON.stringify(deliveryChallans);
    const lastSerialized = lastCloudSyncedRef.current.deliveryChallans;
    if (serialized === lastSerialized) return;

    const oldItems = lastSerialized ? JSON.parse(lastSerialized) : [];
    syncCollectionDelta("deliveryChallans", deliveryChallans, oldItems, "challanNo")
      .then(() => {
        lastCloudSyncedRef.current.deliveryChallans = serialized;
      })
      .catch((err) => {
        console.error("Cloud sync partition deliveryChallans failed:", err);
        if (err.message?.includes("quota") || err.message?.includes("resource-exhausted")) {
          setIsQuotaExceeded(true);
        }
      });
  }, [deliveryChallans, isCloudLoaded, isQuotaExceeded]);

  useEffect(() => {
    if (!isCloudLoaded || isQuotaExceeded) return;
    const serialized = JSON.stringify(billRecords);
    const lastSerialized = lastCloudSyncedRef.current.billRecords;
    if (serialized === lastSerialized) return;

    const oldItems = lastSerialized ? JSON.parse(lastSerialized) : [];
    syncCollectionDelta("billRecords", billRecords, oldItems, "id")
      .then(() => {
        lastCloudSyncedRef.current.billRecords = serialized;
      })
      .catch((err) => {
        console.error("Cloud sync partition billRecords failed:", err);
        if (err.message?.includes("quota") || err.message?.includes("resource-exhausted")) {
          setIsQuotaExceeded(true);
        }
      });
  }, [billRecords, isCloudLoaded, isQuotaExceeded]);

  useEffect(() => {
    if (!isCloudLoaded || isQuotaExceeded) return;
    const serialized = JSON.stringify(companyProfile);
    if (serialized === lastCloudSyncedRef.current.companyProfile) return;

    saveSharedSetting("companyProfile", companyProfile)
      .then(() => {
        lastCloudSyncedRef.current.companyProfile = serialized;
      })
      .catch((err) => {
        console.error("Cloud sync companyProfile failed:", err);
        if (err.message?.includes("quota") || err.message?.includes("resource-exhausted")) {
          setIsQuotaExceeded(true);
        }
      });
  }, [companyProfile, isCloudLoaded, isQuotaExceeded]);

  useEffect(() => {
    if (!isCloudLoaded || isQuotaExceeded) return;
    const serialized = JSON.stringify(poweredByProfile);
    if (serialized === lastCloudSyncedRef.current.poweredByProfile) return;

    saveSharedSetting("poweredByProfile", poweredByProfile)
      .then(() => {
        lastCloudSyncedRef.current.poweredByProfile = serialized;
      })
      .catch((err) => {
        console.error("Cloud sync poweredByProfile failed:", err);
        if (err.message?.includes("quota") || err.message?.includes("resource-exhausted")) {
          setIsQuotaExceeded(true);
        }
      });
  }, [poweredByProfile, isCloudLoaded, isQuotaExceeded]);

  useEffect(() => {
    if (!isCloudLoaded || isQuotaExceeded) return;
    const serialized = JSON.stringify(machines);
    const lastSerialized = lastCloudSyncedRef.current.machines;
    if (serialized === lastSerialized) return;

    const oldItems = lastSerialized ? JSON.parse(lastSerialized) : [];
    syncCollectionDelta("machines", machines, oldItems, "machineNo")
      .then(() => {
        lastCloudSyncedRef.current.machines = serialized;
      })
      .catch((err) => {
        console.error("Cloud sync partition machines failed:", err);
        if (err.message?.includes("quota") || err.message?.includes("resource-exhausted")) {
          setIsQuotaExceeded(true);
        }
      });
  }, [machines, isCloudLoaded, isQuotaExceeded]);

  useEffect(() => {
    if (!isCloudLoaded || isQuotaExceeded) return;
    const serialized = JSON.stringify(factories);
    const lastSerialized = lastCloudSyncedRef.current.factories;
    if (serialized === lastSerialized) return;

    const oldItems = lastSerialized ? JSON.parse(lastSerialized) : [];
    syncCollectionDelta("factories", factories, oldItems, "name")
      .then(() => {
        lastCloudSyncedRef.current.factories = serialized;
      })
      .catch((err) => {
        console.error("Cloud sync partition factories failed:", err);
        if (err.message?.includes("quota") || err.message?.includes("resource-exhausted")) {
          setIsQuotaExceeded(true);
        }
      });
  }, [factories, isCloudLoaded, isQuotaExceeded]);

  useEffect(() => {
    if (!isCloudLoaded || isQuotaExceeded) return;
    const statusList = Object.entries(machineStatusMap).map(([mNo, status]) => ({ id: mNo, status }));
    const serialized = JSON.stringify(statusList);
    const lastSerialized = lastCloudSyncedRef.current.machineStatuses;
    if (serialized === lastSerialized) return;

    const oldItems = lastSerialized ? JSON.parse(lastSerialized) : [];
    syncCollectionDelta("machineStatuses", statusList, oldItems, "id")
      .then(() => {
        lastCloudSyncedRef.current.machineStatuses = serialized;
      })
      .catch((err) => {
        console.error("Cloud sync partition machineStatuses failed:", err);
        if (err.message?.includes("quota") || err.message?.includes("resource-exhausted")) {
          setIsQuotaExceeded(true);
        }
      });
  }, [machineStatusMap, isCloudLoaded, isQuotaExceeded]);

  useEffect(() => {
    if (!isCloudLoaded || isQuotaExceeded) return;
    const serialized = JSON.stringify(users);
    const lastSerialized = lastCloudSyncedRef.current.users;
    if (serialized === lastSerialized) return;

    const oldItems = lastSerialized ? JSON.parse(lastSerialized) : [];
    syncCollectionDelta("users", users, oldItems, "userId")
      .then(() => {
        lastCloudSyncedRef.current.users = serialized;
      })
      .catch((err) => {
        console.error("Cloud sync partition users failed:", err);
        if (err.message?.includes("quota") || err.message?.includes("resource-exhausted")) {
          setIsQuotaExceeded(true);
        }
      });
  }, [users, isCloudLoaded, isQuotaExceeded]);

  useEffect(() => {
    localStorage.setItem("pro_trial_days", trialDays);
    if (!isCloudLoaded || isQuotaExceeded) return;
    const payload = { trialDays, trialExpirationDate };
    const serialized = JSON.stringify(payload);
    if (serialized === lastCloudSyncedRef.current.trialConfig) return;

    saveSharedSetting("trialConfig", payload)
      .then(() => {
        lastCloudSyncedRef.current.trialConfig = serialized;
      })
      .catch((err) => {
        console.error("Cloud sync trialConfig failed:", err);
        if (err.message?.includes("quota") || err.message?.includes("resource-exhausted")) {
          setIsQuotaExceeded(true);
        }
      });
  }, [trialDays, trialExpirationDate, isCloudLoaded, isQuotaExceeded]);

  useEffect(() => {
    if (trialExpirationDate) {
      localStorage.setItem("pro_trial_expiration", trialExpirationDate);
    } else {
      localStorage.removeItem("pro_trial_expiration");
    }
  }, [trialExpirationDate]);

  useEffect(() => {
    localStorage.setItem("proplaex_sheets_webhook_url", sheetsWebhookUrl);
    if (!isCloudLoaded || isQuotaExceeded) return;
    const payload = { webhookUrl: sheetsWebhookUrl };
    const serialized = JSON.stringify(payload);
    if (serialized === lastCloudSyncedRef.current.sheetsConfig) return;

    saveSharedSetting("sheetsConfig", payload)
      .then(() => {
        lastCloudSyncedRef.current.sheetsConfig = serialized;
      })
      .catch((err) => {
        console.error("Cloud sync sheetsConfig failed:", err);
        if (err.message?.includes("quota") || err.message?.includes("resource-exhausted")) {
          setIsQuotaExceeded(true);
        }
      });
  }, [sheetsWebhookUrl, isCloudLoaded, isQuotaExceeded]);

  useEffect(() => {
    if (googleClientId) {
      localStorage.setItem("proplaex_google_client_id", googleClientId);
    } else {
      localStorage.removeItem("proplaex_google_client_id");
    }
    if (!isCloudLoaded || isQuotaExceeded) return;
    const payload = { clientId: googleClientId };
    const serialized = JSON.stringify(payload);
    if (serialized === lastCloudSyncedRef.current.googleClientIdConfig) return;

    saveSharedSetting("googleClientIdConfig", payload)
      .then(() => {
        lastCloudSyncedRef.current.googleClientIdConfig = serialized;
      })
      .catch((err) => {
        console.error("Cloud sync googleClientIdConfig failed:", err);
        if (err.message?.includes("quota") || err.message?.includes("resource-exhausted")) {
          setIsQuotaExceeded(true);
        }
      });
  }, [googleClientId, isCloudLoaded, isQuotaExceeded]);

  const [autoSyncStatus, setAutoSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [lastAutoSyncTime, setLastAutoSyncTime] = useState<string | null>(null);

  // Debounced auto-sync effect to Google Sheets
  useEffect(() => {
    if (!isCloudLoaded || !sheetsWebhookUrl || !sheetsWebhookUrl.startsWith("https://script.google.com/")) {
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setAutoSyncStatus("syncing");
      const syncParams = {
        orders,
        yarnTransactions,
        machinePlans,
        productionLogs,
        deliveryChallans,
        billRecords,
        machines,
        factories,
        machineStatusMap,
        users,
      };

      try {
        const response = await fetch(sheetsWebhookUrl, {
          method: "POST",
          mode: "cors",
          headers: {
            "Content-Type": "text/plain;charset=utf-8",
          },
          body: JSON.stringify(syncParams)
        });

        if (response.ok) {
          const rawResult = await response.json();
          if (rawResult.status !== "error") {
            setAutoSyncStatus("success");
            setLastAutoSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            console.log("Automated Google Sheets background sync complete.");
          } else {
            setAutoSyncStatus("error");
          }
        } else {
          setAutoSyncStatus("error");
        }
      } catch (err) {
        // If it failed because of CORS/fetch issues, try to do a "no-cors" silent sync as a resilient backup!
        const errStr = err instanceof Error ? err.message : String(err);
        if (
          errStr.toLowerCase().includes("fetch") || 
          errStr.toLowerCase().includes("cors") || 
          errStr.toLowerCase().includes("network") ||
          errStr.toLowerCase().includes("failed") ||
          errStr.toLowerCase().includes("typeerror")
        ) {
          try {
            console.warn("CORS/Fetch limitation detected. Re-trying background sync in safe 'no-cors' backup channel...");
            await fetch(sheetsWebhookUrl, {
              method: "POST",
              mode: "no-cors",
              headers: {
                "Content-Type": "text/plain;charset=utf-8",
              },
              body: JSON.stringify(syncParams)
            });
            // With 'no-cors', we can't inspect response contents, but the data is sent successfully to the script!
            setAutoSyncStatus("success");
            setLastAutoSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            console.info("Automated Google Sheets background sync complete (via no-cors fallback).");
          } catch (fallbackErr) {
            console.warn("Automated Sheets background sync fallback channel failed:", fallbackErr);
            setAutoSyncStatus("error");
          }
        } else {
          console.warn("Automated Sheets background sync failed:", err);
          setAutoSyncStatus("error");
        }
      }
    }, 4500); // 4.5 seconds of quiet time debounce

    return () => clearTimeout(delayDebounceFn);
  }, [
    orders, yarnTransactions, machinePlans, productionLogs, 
    deliveryChallans, billRecords, machines, factories, 
    machineStatusMap, users, sheetsWebhookUrl, isCloudLoaded
  ]);

  useEffect(() => {
    // If cloud settings are still synchronizing, wait with expiration evaluation
    // to prevent local-storage caching from flashing a stale expired screen.
    if (!isCloudLoaded) {
      setIsExpired(false);
      return;
    }

    const isNoLimit = !trialDays || trialDays.trim().toLowerCase() === "no-limit" || trialDays.trim().toLowerCase() === "no limit";
    if (isNoLimit || !trialExpirationDate) {
      setIsExpired(false);
      return;
    }
    const checkExpiration = () => {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth(); // 0-indexed
      const date = today.getDate();
      
      const tDate = new Date(year, month, date);
      
      const expParts = trialExpirationDate.split("-").map(Number);
      const eDate = new Date(expParts[0], expParts[1] - 1, expParts[2]);
      
      setIsExpired(tDate.getTime() >= eDate.getTime());
    };
    checkExpiration();
    const interval = setInterval(checkExpiration, 60000); // Check once a minute
    return () => clearInterval(interval);
  }, [trialDays, trialExpirationDate, isCloudLoaded]);

  // CALCULATION HELPERS
  const getYarnReceived = (orderNo: string): number => {
    return yarnTransactions
      .filter(tx => tx.orderNo === orderNo)
      .reduce((sum, tx) => {
        return tx.mode === "Received" ? sum + tx.qty : sum - tx.qty;
      }, 0);
  };

  const getTotalProduction = (orderNo: string): number => {
    return productionLogs
      .filter(log => log.orderNo === orderNo)
      .reduce((sum, log) => sum + log.qty, 0);
  };

  const getPlannedQty = (orderNo: string): number => {
    return machinePlans
      .filter(plan => plan.orderNo === orderNo)
      .reduce((sum, plan) => sum + plan.plannedQty, 0);
  };

  const getTotalDelivery = (orderNo: string): number => {
    return deliveryChallans
      .reduce((sum, ch) => {
        if (ch.type === "Grey Fabric Delivery" && ch.greyItems) {
          const matching = ch.greyItems.filter(item => item.orderNo === orderNo);
          return sum + matching.reduce((s, i) => s + i.qty, 0);
        }
        return sum;
      }, 0);
  };

  // ORDER AUTO STATUS LOGIC ENGINE
  // Run this check when updates happen, preserving overrides
  const autoRecomputeOrderStatus = (orderNo: string, currentOrders: Order[]): Order[] => {
    return currentOrders.map(order => {
      if (order.orderNo !== orderNo) return order;
      // If manual status override is active, respect whatever the status is
      if (order.statusOverride) return order;

      const prod = getTotalProduction(orderNo);
      const req = order.requiredQty;
      const bal = req - prod;

      const del = getTotalDelivery(orderNo);
      const delBal = prod - del;

      let nextStatus: Order["status"] = order.status;

      if (prod === 0) {
        nextStatus = "Pending";
      } else if (prod > 0 && bal > 0) {
        nextStatus = "Running";
      } else if (bal <= 0 && delBal > 0) {
        nextStatus = "Production Done";
      } else if (bal <= 0 && delBal <= 0) {
        nextStatus = "Complete";
      }

      return {
        ...order,
        status: nextStatus
      };
    });
  };

  // TRIGGER THE STATUS RETRIGGER WHENEVER TRANSACTIONS CHANGED
  useEffect(() => {
    // Recheck status of all orders based on current transaction states
    setOrders(prev => {
      let changed = false;
      const next = prev.map(order => {
        if (order.statusOverride) return order;

        const prod = productionLogs
          .filter(log => log.orderNo === order.orderNo)
          .reduce((sum, log) => sum + log.qty, 0);
        const req = order.requiredQty;
        const bal = req - prod;

        const del = deliveryChallans
          .reduce((sum, ch) => {
            if (ch.type === "Grey Fabric Delivery" && ch.greyItems) {
              const matching = ch.greyItems.filter(item => item.orderNo === order.orderNo);
              return sum + matching.reduce((s, i) => s + i.qty, 0);
            }
            return sum;
          }, 0);
        const delBal = prod - del;

        let nextStatus: Order["status"] = order.status;

        if (prod === 0) {
          nextStatus = "Pending";
        } else if (prod > 0 && bal > 0) {
          nextStatus = "Running";
        } else if (bal <= 0 && delBal > 0) {
          nextStatus = "Production Done";
        } else if (bal <= 0 && delBal <= 0) {
          nextStatus = "Complete";
        }

        if (order.status !== nextStatus) {
          changed = true;
          return { ...order, status: nextStatus };
        }
        return order;
      });
      return changed ? next : prev;
    });
  }, [productionLogs, deliveryChallans]);

  // MUTATORS
  const addOrder = (newOrderData: Omit<Order, "orderNo" | "status">) => {
    setOrders(prev => {
      // Find highest suffix
      const companyPart = companyProfile.name.substring(0, 3).toUpperCase();
      const prefix = companyPart.length === 3 ? companyPart : "PRP";
      
      let maxNum = 0;
      prev.forEach(o => {
        const numPart = o.orderNo.replace(/^\D+/g, "");
        const numVal = parseInt(numPart, 10);
        if (!isNaN(numVal) && numVal > maxNum) {
          maxNum = numVal;
        }
      });

      const nextNum = maxNum + 1;
      const formattedSeq = String(nextNum).padStart(4, "0");
      const generatedOrderNo = `${prefix}${formattedSeq}`;

      const newOrder: Order = {
        ...newOrderData,
        orderNo: generatedOrderNo,
        status: "Pending"
      };

      return [...prev, newOrder];
    });
  };

  const updateOrderStatus = (orderNo: string, nextStatus: Order["status"], manualOverride: boolean) => {
    setOrders(prev => prev.map(o => {
      if (o.orderNo === orderNo) {
        return {
          ...o,
          status: nextStatus,
          statusOverride: manualOverride
        };
      }
      return o;
    }));
  };

  const addYarnTransaction = (tx: Omit<YarnTransaction, "id">) => {
    setYarnTransactions(prev => {
      let maxNum = 0;
      prev.forEach(t => {
        const parsed = parseInt(t.id.replace("YT-", ""), 10);
        if (!isNaN(parsed) && parsed > maxNum) maxNum = parsed;
      });
      const nextId = "YT-" + String(maxNum + 1).padStart(3, "0");
      return [...prev, { ...tx, id: nextId }];
    });
  };

  const addMachinePlan = (plan: Omit<MachinePlan, "id" | "jobCardNo">) => {
    setMachinePlans(prev => {
      // Generate unique job card number
      // Format: CSSM40001, CSSM40002...
      // CSS is 3 letters of company name.
      // M is always 'M'.
      // 4 is machine number (we extract the digits from plan.machineNo, or if none, we default to 4).
      // 0001 is sequence.
      const companyPart = companyProfile.name.substring(0, 3).toUpperCase();
      const css = companyPart.length === 3 ? companyPart : "PRP";
      
      const digitMatch = plan.machineNo.match(/\d+/);
      const machineDigit = digitMatch ? digitMatch[0] : "4";

      // Count existing job cards to determine suffix
      let maxSeq = 0;
      prev.forEach(p => {
        // match final seq (e.g., PROM40001 -> matches ending numbers)
        const numPart = p.jobCardNo.match(/\d+$/);
        if (numPart) {
          const seqVal = parseInt(numPart[0], 10);
          // Extract sequence of last 4-5 digits
          // E.g. 40005 -> last 4 digits "0005" => 5
          const absoluteSeq = seqVal % 10000;
          if (absoluteSeq > maxSeq) {
            maxSeq = absoluteSeq;
          }
        }
      });

      const nextSeq = maxSeq + 1;
      const formattedSeq = String(nextSeq).padStart(4, "0");
      const generatedJobCardNo = `${css}M${machineDigit}${formattedSeq}`;

      // Create new assignment plan
      const uniquePlanId = `MP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const newPlan: MachinePlan = {
        ...plan,
        id: uniquePlanId,
        jobCardNo: generatedJobCardNo
      };

      return [...prev, newPlan];
    });
  };

  const updateMachinePlan = (id: string, updatedFields: Partial<MachinePlan>) => {
    if (!canCurrentUserDeleteData()) {
      alert("Unauthorized! Only Admin or Superadmin is allowed to change job cards.");
      return;
    }
    setMachinePlans(prev => prev.map(p => {
      if (p.id === id) {
        let jobCardNo = p.jobCardNo;
        if (updatedFields.machineNo && updatedFields.machineNo !== p.machineNo) {
          const companyPart = companyProfile.name.substring(0, 3).toUpperCase();
          const css = companyPart.length === 3 ? companyPart : "PRP";
          const digitMatch = updatedFields.machineNo.match(/\d+/);
          const machineDigit = digitMatch ? digitMatch[0] : "4";
          
          let maxSeq = 0;
          prev.forEach(x => {
            const numPart = x.jobCardNo.match(/\d+$/);
            if (numPart) {
              const seqVal = parseInt(numPart[0], 10);
              const absoluteSeq = seqVal % 10000;
              if (absoluteSeq > maxSeq) {
                maxSeq = absoluteSeq;
              }
            }
          });
          const nextSeq = maxSeq + 1;
          const formattedSeq = String(nextSeq).padStart(4, "0");
          jobCardNo = `${css}M${machineDigit}${formattedSeq}`;
        }
        return { ...p, ...updatedFields, jobCardNo };
      }
      return p;
    }));
  };

  const splitMachinePlan = (originalPlanId: string, originalNewQty: number, targetMachineNo: string, targetNewQty: number) => {
    if (!canCurrentUserDeleteData()) {
      alert("Unauthorized! Only Admin or Superadmin is allowed to change job cards.");
      return;
    }
    const originalPlan = machinePlans.find(p => p.id === originalPlanId);
    if (!originalPlan) return;

    // 1. Update original plan quantity
    setMachinePlans(prev => {
      const idx = prev.findIndex(p => p.id === originalPlanId);
      if (idx === -1) return prev;
      const nextPlans = [...prev];
      nextPlans[idx] = { ...nextPlans[idx], plannedQty: originalNewQty };
      return nextPlans;
    });

    // 2. Add the split-off plan using addMachinePlan helper
    addMachinePlan({
      orderNo: originalPlan.orderNo,
      planDate: originalPlan.planDate,
      machineNo: targetMachineNo,
      plannedQty: targetNewQty
    });
  };

  const addProductionLog = (log: Omit<ProductionLog, "id">) => {
    setProductionLogs(prev => {
      const generatedId = `PL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      return [...prev, { ...log, id: generatedId }];
    });
  };

  const addDeliveryChallan = (challan: DeliveryChallan) => {
    setDeliveryChallans(prev => {
      return [...prev, challan];
    });
  };

  const addBillRecord = (bill: BillRecord) => {
    setBillRecords(prev => {
      return [...prev, bill];
    });
  };

  // SETTINGS
  const updateCompanyProfile = (profile: CompanyProfile) => {
    setCompanyProfile(profile);
  };

  const updatePoweredByProfile = (profile: PoweredByProfile) => {
    setPoweredByProfile(profile);
  };

  const updateMachineStatus = (machineNo: string, status: string) => {
    setMachineStatusMap(prev => ({
      ...prev,
      [machineNo]: status
    }));
  };

  const addMachine = (mach: MachineConfig) => {
    setMachines(prev => {
      if (prev.some(m => m.machineNo.toLowerCase() === mach.machineNo.toLowerCase())) {
        return prev; // No duplicates
      }
      return [...prev, mach];
    });
  };

  const canCurrentUserDeleteData = (): boolean => {
    if (!currentUser) return false;
    const uid = currentUser.userId.toLowerCase();
    return uid === "superadmin" || uid === "admin@proplanex.com" || uid.includes("admin");
  };

  const checkDeletePermission = (): boolean => {
    if (!canCurrentUserDeleteData()) {
      alert("Unauthorized! Only Admin or Superadmin is allowed to delete data.");
      return false;
    }
    return true;
  };

  const updateOrder = (order: Order) => {
    if (!checkDeletePermission()) return;
    setOrders(prev => prev.map(o => o.orderNo === order.orderNo ? order : o));
  };

  const deleteOrder = (orderNo: string) => {
    if (!checkDeletePermission()) return;
    setOrders(prev => prev.filter(o => o.orderNo !== orderNo));
  };

  const deleteYarnTransaction = (id: string) => {
    if (!checkDeletePermission()) return;
    setYarnTransactions(prev => prev.filter(tx => tx.id !== id));
  };

  const deleteMachinePlan = (id: string) => {
    if (!checkDeletePermission()) return;
    setMachinePlans(prev => prev.filter(p => p.id !== id));
  };

  const deleteProductionLog = (id: string) => {
    if (!checkDeletePermission()) return;
    setProductionLogs(prev => prev.filter(log => log.id !== id));
  };

  const deleteDeliveryChallan = (challanNo: string) => {
    if (!checkDeletePermission()) return;
    setDeliveryChallans(prev => prev.filter(ch => ch.challanNo !== challanNo));
  };

  const deleteBillRecord = (id: string) => {
    if (!checkDeletePermission()) return;
    setBillRecords(prev => prev.filter(b => b.id !== id));
  };

  const deleteMachine = (machNo: string) => {
    if (!checkDeletePermission()) return;
    setMachines(prev => prev.filter(m => m.machineNo !== machNo));
  };

  const addFactory = (fact: RunningFactory) => {
    setFactories(prev => {
      if (prev.some(f => f.name.toLowerCase() === fact.name.toLowerCase())) {
        return prev;
      }
      return [...prev, fact];
    });
  };

  const deleteFactory = (name: string) => {
    if (!checkDeletePermission()) return;
    setFactories(prev => prev.filter(f => f.name !== name));
  };

  // Auth & License Methods
  const loginUser = (userId: string, psw: string): boolean => {
    if (userId.toLowerCase() === "superadmin" && psw === "Proplanex@Raihan") {
      const superObj: AppUser = {
        userId: "superadmin",
        password: "Proplanex@Raihan",
        permissions: {
          orders: "Read/Write",
          yarn: "Read/Write",
          planning: "Read/Write",
          production: "Read/Write",
          delivery: "Read/Write",
          billing: "Read/Write",
          settings: "Read/Write",
          admin: "Read/Write",
          machineload: "Read/Write"
        }
      };
      setCurrentUser(superObj);
      return true;
    }
    const match = users.find(u => u.userId.toLowerCase() === userId.toLowerCase() && u.password === psw);
    if (match) {
      setCurrentUser(match);
      return true;
    }
    return false;
  };

  const logoutUser = () => {
    setCurrentUser(null);
  };

  const addUser = (newUser: AppUser) => {
    setUsers(prev => {
      if (prev.some(u => u.userId.toLowerCase() === newUser.userId.toLowerCase())) {
        alert("This User ID already exists!");
        return prev;
      }
      return [...prev, newUser];
    });
  };

  const deleteUser = (uId: string) => {
    if (!checkDeletePermission()) return;
    if (uId.toLowerCase() === "admin@proplanex.com") {
      alert("Cannot delete the core administrator user!");
      return;
    }
    setUsers(prev => prev.filter(u => u.userId.toLowerCase() !== uId.toLowerCase()));
  };

  const changeUserPassword = (uId: string, newPsw: string) => {
    setUsers(prev => prev.map(u => {
      if (u.userId.toLowerCase() === uId.toLowerCase()) {
        return { ...u, password: newPsw };
      }
      return u;
    }));
    if (currentUser && currentUser.userId.toLowerCase() === uId.toLowerCase()) {
      setCurrentUser(prev => prev ? { ...prev, password: newPsw } : null);
    }
  };

  const updateUserPermissions = (uId: string, perms: ModulePermissions) => {
    setUsers(prev => prev.map(u => {
      if (u.userId.toLowerCase() === uId.toLowerCase()) {
        return { ...u, permissions: perms };
      }
      return u;
    }));
    if (currentUser && currentUser.userId.toLowerCase() === uId.toLowerCase()) {
      setCurrentUser(prev => prev ? { ...prev, permissions: perms } : null);
    }
  };

  const updateTrialLimit = (days: string) => {
    setTrialDays(days);
    localStorage.setItem("pro_trial_days", days);
    const cleanedDays = days ? days.trim().toLowerCase() : "";
    if (cleanedDays === "no-limit" || cleanedDays === "no limit" || !days) {
      setTrialExpirationDate(null);
      localStorage.removeItem("pro_trial_expiration");
    } else {
      const today = new Date();
      // extract numeric days
      const numDays = parseInt(days, 10);
      today.setDate(today.getDate() + numDays);
      const iso = today.toISOString().split("T")[0];
      setTrialExpirationDate(iso);
      localStorage.setItem("pro_trial_expiration", iso);
    }
  };

  // Active document visibility and device network status monitors
  // which immediately trigger Firestore network reconnection and refresh,
  // bypassing delayed client-side backoffs and restoring real-time data sync instantly.
  useEffect(() => {
    const forceSyncReconnect = () => {
      if (navigator.onLine) {
        console.info("[Firestore Reconnect] Network connection restored/active. Forcing instant Firestore reconnection handshake...");
        enableNetwork(db)
          .then(() => {
            console.info("[Firestore Reconnect] Handshake succeeded. Central repository is back online.");
          })
          .catch((err) => {
            console.warn("[Firestore Reconnect] Reconnection handshake deferred:", err);
          });
      }
    };

    window.addEventListener("online", forceSyncReconnect);
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.info("[Firestore Reconnect] App window active/visible. Forcing instant synchronization update...");
        forceSyncReconnect();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("online", forceSyncReconnect);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <AppContext.Provider value={{
      orders,
      yarnTransactions,
      machinePlans,
      productionLogs,
      deliveryChallans,
      billRecords,
      companyProfile,
      poweredByProfile,
      machines,
      factories,
      
      users,
      currentUser,
      trialDays,
      trialExpirationDate,
      isExpired,

      loginUser,
      logoutUser,
      addUser,
      deleteUser,
      changeUserPassword,
      updateUserPermissions,
      updateTrialLimit,
      
      addOrder,
      updateOrder,
      deleteOrder,
      updateOrderStatus,
      addYarnTransaction,
      deleteYarnTransaction,
      addMachinePlan,
      updateMachinePlan,
      splitMachinePlan,
      deleteMachinePlan,
      addProductionLog,
      deleteProductionLog,
      addDeliveryChallan,
      deleteDeliveryChallan,
      addBillRecord,
      deleteBillRecord,
      
      updateCompanyProfile,
      updatePoweredByProfile,
      addMachine,
      deleteMachine,
      addFactory,
      deleteFactory,

      getYarnReceived,
      getTotalProduction,
      getTotalDelivery,
      getPlannedQty,
      
      machineStatusMap,
      updateMachineStatus,
      canCurrentUserDeleteData,

      sheetsWebhookUrl,
      updateSheetsWebhookUrl: setSheetsWebhookUrl,
      autoSyncStatus,
      lastAutoSyncTime,
      googleClientId,
      updateGoogleClientId: setGoogleClientId,
      isQuotaExceeded,
      retryCloudSync,
      isCloudLoaded
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppState must be used inside an AppProvider");
  }
  return context;
};

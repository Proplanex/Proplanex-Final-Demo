import React, { createContext, useContext, useState, useEffect } from "react";
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
  saveBatchCollection
} from "../utils/firebaseFirestoreService";

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
  deleteOrder: (orderNo: string) => void;
  updateOrderStatus: (orderNo: string, status: Order["status"], manualOverride: boolean) => void;
  addYarnTransaction: (tx: Omit<YarnTransaction, "id">) => void;
  deleteYarnTransaction: (id: string) => void;
  addMachinePlan: (plan: Omit<MachinePlan, "id" | "jobCardNo">) => void;
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

  const [isCloudLoaded, setIsCloudLoaded] = useState<boolean>(false);

  // Initial Central Cloud load of configurations and database lists
  useEffect(() => {
    async function initCloudAndSync() {
      try {
        await validateFirestoreConnection();

        // 1. Load configuration templates
        const cProfile = await loadSharedSetting<CompanyProfile | null>("companyProfile", null);
        if (cProfile) setCompanyProfile(cProfile);

        const pProfile = await loadSharedSetting<PoweredByProfile | null>("poweredByProfile", null);
        if (pProfile) setPoweredByProfile(pProfile);

        const tConfig = await loadSharedSetting<{ trialDays: string; trialExpirationDate: string | null } | null>("trialConfig", null);
        if (tConfig) {
          setTrialDays(tConfig.trialDays);
          setTrialExpirationDate(tConfig.trialExpirationDate);
        }

        const sWebhook = await loadSharedSetting<{ webhookUrl: string } | null>("sheetsConfig", null);
        if (sWebhook) {
          setSheetsWebhookUrl(sWebhook.webhookUrl);
        }

        // 2. Load core entity registries
        const cloudOrders = await fetchCollection<Order>("orders");
        if (cloudOrders.length > 0) setOrders(cloudOrders);

        const cloudYarn = await fetchCollection<YarnTransaction>("yarnTransactions");
        if (cloudYarn.length > 0) setYarnTransactions(cloudYarn);

        const cloudPlans = await fetchCollection<MachinePlan>("machinePlans");
        if (cloudPlans.length > 0) setMachinePlans(cloudPlans);

        const cloudLogs = await fetchCollection<ProductionLog>("productionLogs");
        if (cloudLogs.length > 0) setProductionLogs(cloudLogs);

        const cloudChallans = await fetchCollection<DeliveryChallan>("deliveryChallans");
        if (cloudChallans.length > 0) setDeliveryChallans(cloudChallans);

        const cloudBills = await fetchCollection<BillRecord>("billRecords");
        if (cloudBills.length > 0) setBillRecords(cloudBills);

        const cloudMachines = await fetchCollection<MachineConfig>("machines");
        if (cloudMachines.length > 0) setMachines(cloudMachines);

        const cloudFactories = await fetchCollection<RunningFactory>("factories");
        if (cloudFactories.length > 0) setFactories(cloudFactories);

        const cloudUsers = await fetchCollection<AppUser>("users");
        if (cloudUsers.length > 0) setUsers(cloudUsers);

        const cloudStatuses = await fetchCollection<{ id: string; status: string }>("machineStatuses");
        if (cloudStatuses.length > 0) {
          const statusMap: Record<string, string> = {};
          cloudStatuses.forEach(s => {
            statusMap[s.id] = s.status;
          });
          setMachineStatusMap(statusMap);
        }

        setIsCloudLoaded(true);
        console.log("Central cloud data sync has connected successfully.");
      } catch (error) {
        console.error("Central cloud setup failed:", error);
      }
    }
    initCloudAndSync();
  }, []);

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

  // Sync to Centralized Cloud Firestore gated by loaded status
  useEffect(() => {
    if (!isCloudLoaded) return;
    saveBatchCollection("orders", orders, "orderNo");
  }, [orders, isCloudLoaded]);

  useEffect(() => {
    if (!isCloudLoaded) return;
    saveBatchCollection("yarnTransactions", yarnTransactions, "id");
  }, [yarnTransactions, isCloudLoaded]);

  useEffect(() => {
    if (!isCloudLoaded) return;
    saveBatchCollection("machinePlans", machinePlans, "id");
  }, [machinePlans, isCloudLoaded]);

  useEffect(() => {
    if (!isCloudLoaded) return;
    saveBatchCollection("productionLogs", productionLogs, "id");
  }, [productionLogs, isCloudLoaded]);

  useEffect(() => {
    if (!isCloudLoaded) return;
    saveBatchCollection("deliveryChallans", deliveryChallans, "challanNo");
  }, [deliveryChallans, isCloudLoaded]);

  useEffect(() => {
    if (!isCloudLoaded) return;
    saveBatchCollection("billRecords", billRecords, "id");
  }, [billRecords, isCloudLoaded]);

  useEffect(() => {
    if (!isCloudLoaded) return;
    saveSharedSetting("companyProfile", companyProfile);
  }, [companyProfile, isCloudLoaded]);

  useEffect(() => {
    if (!isCloudLoaded) return;
    saveSharedSetting("poweredByProfile", poweredByProfile);
  }, [poweredByProfile, isCloudLoaded]);

  useEffect(() => {
    if (!isCloudLoaded) return;
    saveBatchCollection("machines", machines, "machineNo");
  }, [machines, isCloudLoaded]);

  useEffect(() => {
    if (!isCloudLoaded) return;
    saveBatchCollection("factories", factories, "name");
  }, [factories, isCloudLoaded]);

  useEffect(() => {
    if (!isCloudLoaded) return;
    const statusList = Object.entries(machineStatusMap).map(([mNo, status]) => ({ id: mNo, status }));
    saveBatchCollection("machineStatuses", statusList, "id");
  }, [machineStatusMap, isCloudLoaded]);

  useEffect(() => {
    if (!isCloudLoaded) return;
    saveBatchCollection("users", users, "userId");
  }, [users, isCloudLoaded]);

  useEffect(() => {
    localStorage.setItem("pro_trial_days", trialDays);
    if (!isCloudLoaded) return;
    saveSharedSetting("trialConfig", { trialDays, trialExpirationDate });
  }, [trialDays, trialExpirationDate, isCloudLoaded]);

  useEffect(() => {
    if (trialExpirationDate) {
      localStorage.setItem("pro_trial_expiration", trialExpirationDate);
    } else {
      localStorage.removeItem("pro_trial_expiration");
    }
  }, [trialExpirationDate]);

  useEffect(() => {
    localStorage.setItem("proplaex_sheets_webhook_url", sheetsWebhookUrl);
    if (!isCloudLoaded) return;
    saveSharedSetting("sheetsConfig", { webhookUrl: sheetsWebhookUrl });
  }, [sheetsWebhookUrl, isCloudLoaded]);

  const [autoSyncStatus, setAutoSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [lastAutoSyncTime, setLastAutoSyncTime] = useState<string | null>(null);

  // Debounced auto-sync effect to Google Sheets
  useEffect(() => {
    if (!isCloudLoaded || !sheetsWebhookUrl || !sheetsWebhookUrl.startsWith("https://script.google.com/")) {
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setAutoSyncStatus("syncing");
      try {
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
        console.error("Automated Sheets background sync failed:", err);
        setAutoSyncStatus("error");
      }
    }, 4500); // 4.5 seconds of quiet time debounce

    return () => clearTimeout(delayDebounceFn);
  }, [
    orders, yarnTransactions, machinePlans, productionLogs, 
    deliveryChallans, billRecords, machines, factories, 
    machineStatusMap, users, sheetsWebhookUrl, isCloudLoaded
  ]);

  useEffect(() => {
    if (trialDays === "No Limit" || !trialExpirationDate) {
      setIsExpired(false);
      return;
    }
    const checkExpiration = () => {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const todayParts = todayStr.split("-").map(Number);
      const expParts = trialExpirationDate.split("-").map(Number);
      
      const tDate = new Date(todayParts[0], todayParts[1] - 1, todayParts[2]);
      const eDate = new Date(expParts[0], expParts[1] - 1, expParts[2]);
      setIsExpired(tDate.getTime() > eDate.getTime());
    };
    checkExpiration();
    const interval = setInterval(checkExpiration, 60000); // Check once a minute
    return () => clearInterval(interval);
  }, [trialDays, trialExpirationDate]);

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
    if (days === "No Limit") {
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
      deleteOrder,
      updateOrderStatus,
      addYarnTransaction,
      deleteYarnTransaction,
      addMachinePlan,
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
      lastAutoSyncTime
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

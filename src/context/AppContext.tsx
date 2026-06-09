import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  Order, YarnTransaction, MachinePlan, ProductionLog, 
  DeliveryChallan, BillRecord, CompanyProfile, MachineConfig, RunningFactory 
} from "../types";
import { 
  defaultCompanyProfile, defaultMachines, defaultFactories, 
  defaultOrders, defaultYarnTransactions 
} from "../utils/helpers";

interface AppContextType {
  orders: Order[];
  yarnTransactions: YarnTransaction[];
  machinePlans: MachinePlan[];
  productionLogs: ProductionLog[];
  deliveryChallans: DeliveryChallan[];
  billRecords: BillRecord[];
  companyProfile: CompanyProfile;
  machines: MachineConfig[];
  factories: RunningFactory[];
  
  // State Mutators
  addOrder: (order: Omit<Order, "orderNo" | "status">) => void;
  updateOrderStatus: (orderNo: string, status: Order["status"], manualOverride: boolean) => void;
  addYarnTransaction: (tx: Omit<YarnTransaction, "id">) => void;
  addMachinePlan: (plan: Omit<MachinePlan, "id" | "jobCardNo">) => void;
  addProductionLog: (log: Omit<ProductionLog, "id">) => void;
  addDeliveryChallan: (challan: DeliveryChallan) => void;
  addBillRecord: (bill: BillRecord) => void;
  
  // Settings Mutators
  updateCompanyProfile: (profile: CompanyProfile) => void;
  addMachine: (machine: MachineConfig) => void;
  deleteMachine: (machineNo: string) => void;
  addFactory: (factory: RunningFactory) => void;
  deleteFactory: (name: string) => void;

  // Global calculations helper
  getYarnReceived: (orderNo: string) => number;
  getTotalProduction: (orderNo: string) => number;
  getTotalDelivery: (orderNo: string) => number;
  getPlannedQty: (orderNo: string) => number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
    return data ? JSON.parse(data) : [];
  });

  const [billRecords, setBillRecords] = useState<BillRecord[]>(() => {
    const data = localStorage.getItem("pro_bill_records");
    return data ? JSON.parse(data) : [];
  });

  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() => {
    const data = localStorage.getItem("pro_company_profile");
    return data ? JSON.parse(data) : defaultCompanyProfile;
  });

  const [machines, setMachines] = useState<MachineConfig[]>(() => {
    const data = localStorage.getItem("pro_machines");
    return data ? JSON.parse(data) : defaultMachines;
  });

  const [factories, setFactories] = useState<RunningFactory[]>(() => {
    const data = localStorage.getItem("pro_factories");
    return data ? JSON.parse(data) : defaultFactories;
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
    localStorage.setItem("pro_machines", JSON.stringify(machines));
  }, [machines]);

  useEffect(() => {
    localStorage.setItem("pro_factories", JSON.stringify(factories));
  }, [factories]);

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

  const addMachine = (mach: MachineConfig) => {
    setMachines(prev => {
      if (prev.some(m => m.machineNo.toLowerCase() === mach.machineNo.toLowerCase())) {
        return prev; // No duplicates
      }
      return [...prev, mach];
    });
  };

  const deleteMachine = (machNo: string) => {
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
    setFactories(prev => prev.filter(f => f.name !== name));
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
      machines,
      factories,
      
      addOrder,
      updateOrderStatus,
      addYarnTransaction,
      addMachinePlan,
      addProductionLog,
      addDeliveryChallan,
      addBillRecord,
      
      updateCompanyProfile,
      addMachine,
      deleteMachine,
      addFactory,
      deleteFactory,

      getYarnReceived,
      getTotalProduction,
      getTotalDelivery,
      getPlannedQty
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

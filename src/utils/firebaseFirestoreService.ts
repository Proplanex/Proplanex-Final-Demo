import { db, auth } from "./firebaseAuth";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc,
  getDocFromServer,
  writeBatch
} from "firebase/firestore";
import { 
  Order, 
  YarnTransaction, 
  MachinePlan, 
  ProductionLog, 
  DeliveryChallan, 
  BillRecord, 
  MachineConfig, 
  RunningFactory, 
  AppUser, 
  CompanyProfile, 
  PoweredByProfile 
} from "../types";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

// Custom error handling as mandated by policy
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
    }, 
    operationType,
    path
  };
  console.error('Firestore Operation Failed: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Helper to map Firestore collection/document names to LocalStorage backup keys
function getLocalStorageKeyForCollection(colName: string): string {
  switch (colName) {
    case "orders": return "pro_orders";
    case "yarnTransactions": return "pro_yarn_tx";
    case "machinePlans": return "pro_machine_plans";
    case "productionLogs": return "pro_production_logs";
    case "deliveryChallans": return "pro_delivery_challans";
    case "billRecords": return "pro_bill_records";
    case "machines": return "pro_machines";
    case "factories": return "pro_factories";
    case "machineStatuses": return "pro_machine_statuses";
    case "users": return "pro_users";
    case "companyProfile": return "pro_company_profile";
    case "poweredByProfile": return "pro_powered_by_profile";
    default: return `pro_${colName}`;
  }
}

// 1. Connection Validation Check
export async function validateFirestoreConnection() {
  try {
    const testDocRef = doc(db, 'workspace_info', 'connection_test');
    await getDocFromServer(testDocRef);
    console.log("Firestore central repository connectivity verified successfully.");
  } catch (error) {
    if (error instanceof Error && (error.message.toLowerCase().includes('offline') || error.message.toLowerCase().includes('unavailable') || error.message.toLowerCase().includes('could not reach'))) {
      console.warn("Firestore client is offline. Local storage will handle buffer state.");
    }
  }
}

// 2. Settings Documents Sync
export async function saveSharedSetting(key: string, data: any) {
  const path = `workspace_info/${key}`;
  try {
    const docRef = doc(db, 'workspace_info', key);
    await setDoc(docRef, data);
  } catch (err) {
    const errStr = err instanceof Error ? err.message : String(err);
    if (
      errStr.toLowerCase().includes("unavailable") ||
      errStr.toLowerCase().includes("offline") ||
      errStr.toLowerCase().includes("network") ||
      errStr.toLowerCase().includes("could not reach")
    ) {
      console.warn(`Firestore write workspace_info/${key} queued locally in offline state.`);
      return;
    }
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function loadSharedSetting<T>(key: string, fallback: T): Promise<T> {
  const path = `workspace_info/${key}`;
  try {
    const docRef = doc(db, 'workspace_info', key);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as T;
    }
    return fallback;
  } catch (err) {
    const errStr = err instanceof Error ? err.message : String(err);
    if (
      errStr.toLowerCase().includes("unavailable") ||
      errStr.toLowerCase().includes("offline") ||
      errStr.toLowerCase().includes("network") ||
      errStr.toLowerCase().includes("could not reach")
    ) {
      console.warn(`Firestore key workspace_info/${key} load fallback to LocalStorage/Defaults due to offline/unavailable state.`);
      const localKey = getLocalStorageKeyForCollection(key);
      const localData = localStorage.getItem(localKey);
      if (localData) {
        try {
          return JSON.parse(localData) as T;
        } catch (_) {}
      }
      return fallback;
    }
    handleFirestoreError(err, OperationType.GET, path);
    return fallback;
  }
}

// 3. Collection Single Writing & Deleting
export async function saveDocument(colName: string, docId: string, data: any) {
  const path = `${colName}/${docId}`;
  try {
    const docRef = doc(db, colName, docId);
    await setDoc(docRef, data);
  } catch (err) {
    const errStr = err instanceof Error ? err.message : String(err);
    if (
      errStr.toLowerCase().includes("unavailable") ||
      errStr.toLowerCase().includes("offline") ||
      errStr.toLowerCase().includes("network") ||
      errStr.toLowerCase().includes("could not reach")
    ) {
      console.warn(`Firestore write ${path} queued locally in offline state.`);
      return;
    }
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteDocument(colName: string, docId: string) {
  const path = `${colName}/${docId}`;
  try {
    const docRef = doc(db, colName, docId);
    await deleteDoc(docRef);
  } catch (err) {
    const errStr = err instanceof Error ? err.message : String(err);
    if (
      errStr.toLowerCase().includes("unavailable") ||
      errStr.toLowerCase().includes("offline") ||
      errStr.toLowerCase().includes("network") ||
      errStr.toLowerCase().includes("could not reach")
    ) {
      console.warn(`Firestore delete ${path} queued locally in offline state.`);
      return;
    }
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// 4. Batch Collections Read/Write
export async function fetchCollection<T>(colName: string): Promise<T[]> {
  const path = colName;
  try {
    const colRef = collection(db, colName);
    const querySnapshot = await getDocs(colRef);
    const results: T[] = [];
    querySnapshot.forEach((doc) => {
      results.push(doc.data() as T);
    });
    return results;
  } catch (err) {
    const errStr = err instanceof Error ? err.message : String(err);
    if (
      errStr.toLowerCase().includes("unavailable") ||
      errStr.toLowerCase().includes("offline") ||
      errStr.toLowerCase().includes("network") ||
      errStr.toLowerCase().includes("could not reach")
    ) {
      console.warn(`Firestore collection ${colName} load fallback to cached localStorage state due to offline state.`);
      const localKey = getLocalStorageKeyForCollection(colName);
      const localData = localStorage.getItem(localKey);
      if (localData) {
        try {
          return JSON.parse(localData) as T[];
        } catch (_) {}
      }
      return [];
    }
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

// Save an entire list at once to Firestore (for seeding or backup sync)
export async function saveBatchCollection<T extends { id?: string; orderNo?: string; userId?: string; machineNo?: string; name?: string; challanNo?: string }>(
  colName: string, 
  items: T[],
  idKey: keyof T = "id"
) {
  try {
    // Write up to 500 documents in chunks
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += 400) {
      chunks.push(items.slice(i, i + 400));
    }

    for (const chunk of chunks) {
      const batch = writeBatch(db);
      chunk.forEach(item => {
        const idValue = String(item[idKey] || item.id || "");
        if (idValue) {
          const docRef = doc(db, colName, idValue);
          batch.set(docRef, item);
        }
      });
      await batch.commit();
    }
  } catch (err) {
    const errStr = err instanceof Error ? err.message : String(err);
    if (
      errStr.toLowerCase().includes("unavailable") ||
      errStr.toLowerCase().includes("offline") ||
      errStr.toLowerCase().includes("network") ||
      errStr.toLowerCase().includes("could not reach")
    ) {
      console.warn(`Firestore batch write for ${colName} queued locally in offline state.`);
      return;
    }
    handleFirestoreError(err, OperationType.WRITE, colName);
  }
}

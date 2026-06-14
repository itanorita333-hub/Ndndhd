import { useSyncExternalStore, useCallback } from "react";

type QueryResult<T> = {
  data: T | null;
  isLoading: boolean;
  error: unknown | null;
};

type MutationResult = {
  mutate: (variables?: any, options?: any) => void;
  isPending: boolean;
};

// ─── Simple reactive store ───────────────────────────────────────────────────
function createStore<T>(initial: T) {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    setState: (next: T | ((prev: T) => T)) => {
      state = typeof next === "function" ? (next as (p: T) => T)(state) : next;
      listeners.forEach((l) => l());
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

// ─── Mock data ───────────────────────────────────────────────────────────────
const MOCK_MACHINES = [
  { id: "VM-001", name: "Machine A - Lobby", location: "Main Lobby", status: "active", lastRefill: "2026-06-13T09:00:00Z" },
  { id: "VM-002", name: "Machine B - Floor 2", location: "2nd Floor Breakroom", status: "active", lastRefill: "2026-06-12T14:30:00Z" },
  { id: "VM-003", name: "Machine C - Cafeteria", location: "Cafeteria", status: "needs_refill", lastRefill: "2026-06-10T08:00:00Z" },
  { id: "VM-004", name: "Machine D - Warehouse", location: "Warehouse", status: "needs_refill", lastRefill: "2026-06-09T11:00:00Z" },
  { id: "VM-005", name: "Machine E - Reception", location: "Reception", status: "active", lastRefill: "2026-06-14T07:00:00Z" },
];

const MOCK_SLOTS: Record<string, any[]> = {
  "VM-001": [
    { id: 1, slotLabel: "A1", productName: "Energy Bar", productCode: "EB-01", capacity: 10, currentInventory: 8, minStock: 2 },
    { id: 2, slotLabel: "A2", productName: "Bottled Water", productCode: "BW-01", capacity: 12, currentInventory: 5, minStock: 3 },
    { id: 3, slotLabel: "B1", productName: "Soda Can", productCode: "SC-01", capacity: 10, currentInventory: 0, minStock: 2 },
    { id: 4, slotLabel: "B2", productName: "Chips", productCode: "CH-01", capacity: 8, currentInventory: 6, minStock: 2 },
  ],
  "VM-002": [
    { id: 5, slotLabel: "A1", productName: "Coffee", productCode: "CF-01", capacity: 15, currentInventory: 12, minStock: 3 },
    { id: 6, slotLabel: "A2", productName: "Tea", productCode: "TE-01", capacity: 15, currentInventory: 9, minStock: 3 },
    { id: 7, slotLabel: "B1", productName: "Juice", productCode: "JU-01", capacity: 10, currentInventory: 2, minStock: 2 },
  ],
  "VM-003": [
    { id: 8, slotLabel: "A1", productName: "Sandwich", productCode: "SW-01", capacity: 8, currentInventory: 1, minStock: 2 },
    { id: 9, slotLabel: "A2", productName: "Salad", productCode: "SL-01", capacity: 8, currentInventory: 0, minStock: 2 },
    { id: 10, slotLabel: "B1", productName: "Yogurt", productCode: "YG-01", capacity: 10, currentInventory: 0, minStock: 2 },
  ],
  "VM-004": [
    { id: 11, slotLabel: "A1", productName: "Protein Bar", productCode: "PB-01", capacity: 10, currentInventory: 1, minStock: 2 },
    { id: 12, slotLabel: "A2", productName: "Sports Drink", productCode: "SD-01", capacity: 12, currentInventory: 0, minStock: 3 },
  ],
  "VM-005": [
    { id: 13, slotLabel: "A1", productName: "Mineral Water", productCode: "MW-01", capacity: 20, currentInventory: 18, minStock: 4 },
    { id: 14, slotLabel: "A2", productName: "Green Tea", productCode: "GT-01", capacity: 15, currentInventory: 14, minStock: 3 },
    { id: 15, slotLabel: "B1", productName: "Nut Mix", productCode: "NM-01", capacity: 10, currentInventory: 9, minStock: 2 },
  ],
};

// ─── Reactive stores ─────────────────────────────────────────────────────────

// activeSession per machine: Record<machineId, session | null>
const activeSessionStore = createStore<Record<string, any | null>>({});

// dashboard summary
const dashboardStore = createStore({
  totalMachines: 5,
  activeMachines: 3,
  machinesNeedingRefill: 2,
  totalRefillsToday: 1,
  recentRefills: [
    { id: "r1", machineId: "VM-005", refillerName: "Alex Johnson", startTime: "2026-06-14T07:00:00Z", status: "completed" },
    { id: "r2", machineId: "VM-001", refillerName: "Sam Lee", startTime: "2026-06-13T09:00:00Z", status: "completed" },
    { id: "r3", machineId: "VM-002", refillerName: "Jordan Rivera", startTime: "2026-06-12T14:30:00Z", status: "completed" },
  ],
});

// ─── Query key helpers ────────────────────────────────────────────────────────
export const getGetMachineQueryKey = (machineId?: string | null) => ["getMachine", machineId];
export const getListMachineSlotsQueryKey = (machineId?: string | null) => ["listMachineSlots", machineId];
export const getListWastageReportsQueryKey = (machineId?: string | null) => ["listWastageReports", machineId];
export const getListTemperatureLogsQueryKey = (machineId?: string | null) => ["listTemperatureLogs", machineId];
export const getGetDashboardSummaryQueryKey = () => ["getDashboardSummary"];
export const getListMachinesQueryKey = () => ["listMachines"];
export const getGetActiveRefillSessionQueryKey = (machineId?: string | null) => ["getActiveRefillSession", machineId];

// ─── Query hooks ──────────────────────────────────────────────────────────────
export function useGetMachine(machineId?: string | null, _options?: any): QueryResult<any> {
  const machine = machineId ? (MOCK_MACHINES.find((m) => m.id === machineId) ?? null) : null;
  return { data: machine, isLoading: false, error: null };
}

export function useListMachineSlots(machineId?: string | null, _options?: any): QueryResult<any[]> {
  const slots = machineId ? (MOCK_SLOTS[machineId] ?? []) : [];
  return { data: slots, isLoading: false, error: null };
}

export function useListWastageReports(_machineId?: string | null, _options?: any): QueryResult<any[]> {
  return { data: [], isLoading: false, error: null };
}

export function useListTemperatureLogs(_machineId?: string | null, _options?: any): QueryResult<any[]> {
  return { data: [], isLoading: false, error: null };
}

export function useListMachines(_options?: any): QueryResult<any[]> {
  return { data: MOCK_MACHINES, isLoading: false, error: null };
}

export function useGetDashboardSummary(_options?: any): QueryResult<any> {
  const data = useSyncExternalStore(
    dashboardStore.subscribe,
    dashboardStore.getState,
    dashboardStore.getState,
  );
  return { data, isLoading: false, error: null };
}

export function useGetActiveRefillSession(machineId?: string | null, _options?: any): QueryResult<any> {
  const sessions = useSyncExternalStore(
    activeSessionStore.subscribe,
    activeSessionStore.getState,
    activeSessionStore.getState,
  );
  const session = machineId ? (sessions[machineId] ?? null) : null;
  return { data: session ? { session } : null, isLoading: false, error: null };
}

// ─── Mutation hooks ───────────────────────────────────────────────────────────
export function useCreateWastageReport(): MutationResult {
  const mutate = useCallback((_variables?: any, options?: any) => {
    options?.onSuccess?.();
  }, []);
  return { mutate, isPending: false };
}

export function useCreateTemperatureLog(): MutationResult {
  const mutate = useCallback((_variables?: any, options?: any) => {
    options?.onSuccess?.();
  }, []);
  return { mutate, isPending: false };
}

export function useStartRefillSession(): MutationResult {
  const mutate = useCallback((variables?: any, options?: any) => {
    const machineId = variables?.machineId;
    if (!machineId) {
      options?.onError?.();
      return;
    }
    const newSession = {
      id: `session-${Date.now()}`,
      machineId,
      refillerName: variables?.data?.refillerName ?? "Field Tech",
      startTime: new Date().toISOString(),
      status: "active",
    };
    activeSessionStore.setState((prev) => ({ ...prev, [machineId]: newSession }));
    // Update dashboard refills today count
    dashboardStore.setState((prev) => ({
      ...prev,
      totalRefillsToday: prev.totalRefillsToday + 1,
    }));
    options?.onSuccess?.();
  }, []);
  return { mutate, isPending: false };
}

export function useSubmitRefillSession(): MutationResult {
  const mutate = useCallback((variables?: any, options?: any) => {
    const machineId = variables?.machineId;
    if (!machineId) {
      options?.onError?.();
      return;
    }
    // Clear the active session
    activeSessionStore.setState((prev) => ({ ...prev, [machineId]: null }));
    options?.onSuccess?.();
  }, []);
  return { mutate, isPending: false };
}

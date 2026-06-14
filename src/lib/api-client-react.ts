type QueryResult<T> = {
  data: T | null;
  isLoading: boolean;
  error: unknown | null;
};

type MutationResult = {
  mutate: (variables?: any, options?: any) => void;
  isPending: boolean;
};

const emptyArray: any[] = [];
const noOpMutate = (_variables?: any, options?: any) => {
  options?.onSuccess?.();
};

export const getGetMachineQueryKey = (machineId?: string | null) => ["getMachine", machineId];
export const getListMachineSlotsQueryKey = (machineId?: string | null) => ["listMachineSlots", machineId];
export const getListWastageReportsQueryKey = (machineId?: string | null) => ["listWastageReports", machineId];
export const getListTemperatureLogsQueryKey = (machineId?: string | null) => ["listTemperatureLogs", machineId];
export const getGetDashboardSummaryQueryKey = () => ["getDashboardSummary"];
export const getListMachinesQueryKey = () => ["listMachines"];
export const getGetActiveRefillSessionQueryKey = (machineId?: string | null) => ["getActiveRefillSession", machineId];

const MOCK_MACHINES = [
  { id: "VM-001", name: "Machine A - Lobby", location: "Main Lobby", status: "active", lastRefill: "2026-06-13T09:00:00Z" },
  { id: "VM-002", name: "Machine B - Floor 2", location: "2nd Floor Breakroom", status: "active", lastRefill: "2026-06-12T14:30:00Z" },
  { id: "VM-003", name: "Machine C - Cafeteria", location: "Cafeteria", status: "needs_refill", lastRefill: "2026-06-10T08:00:00Z" },
  { id: "VM-004", name: "Machine D - Warehouse", location: "Warehouse", status: "needs_refill", lastRefill: "2026-06-09T11:00:00Z" },
  { id: "VM-005", name: "Machine E - Reception", location: "Reception", status: "active", lastRefill: "2026-06-14T07:00:00Z" },
];

const MOCK_DASHBOARD_SUMMARY = {
  totalMachines: 5,
  activeMachines: 3,
  machinesNeedingRefill: 2,
  totalRefillsToday: 1,
  recentRefills: [
    { id: "r1", machineId: "VM-005", refillerName: "Alex Johnson", startTime: "2026-06-14T07:00:00Z", status: "completed" },
    { id: "r2", machineId: "VM-001", refillerName: "Sam Lee", startTime: "2026-06-13T09:00:00Z", status: "completed" },
    { id: "r3", machineId: "VM-002", refillerName: "Jordan Rivera", startTime: "2026-06-12T14:30:00Z", status: "completed" },
  ],
};

const MOCK_SLOTS: Record<string, any[]> = {
  "VM-001": [
    { slotId: "A1", itemName: "Energy Bar", capacity: 10, currentStock: 8, minStock: 2 },
    { slotId: "A2", itemName: "Bottled Water", capacity: 12, currentStock: 5, minStock: 3 },
    { slotId: "B1", itemName: "Soda Can", capacity: 10, currentStock: 0, minStock: 2 },
    { slotId: "B2", itemName: "Chips", capacity: 8, currentStock: 6, minStock: 2 },
  ],
  "VM-002": [
    { slotId: "A1", itemName: "Coffee", capacity: 15, currentStock: 12, minStock: 3 },
    { slotId: "A2", itemName: "Tea", capacity: 15, currentStock: 9, minStock: 3 },
    { slotId: "B1", itemName: "Juice", capacity: 10, currentStock: 2, minStock: 2 },
  ],
  "VM-003": [
    { slotId: "A1", itemName: "Sandwich", capacity: 8, currentStock: 1, minStock: 2 },
    { slotId: "A2", itemName: "Salad", capacity: 8, currentStock: 0, minStock: 2 },
    { slotId: "B1", itemName: "Yogurt", capacity: 10, currentStock: 0, minStock: 2 },
  ],
};

export function useGetMachine(machineId?: string | null, _options?: any): QueryResult<any> {
  const machine = MOCK_MACHINES.find((m) => m.id === machineId) ?? null;
  return { data: machine, isLoading: false, error: null };
}

export function useListMachineSlots(machineId?: string | null, _options?: any): QueryResult<any[]> {
  const slots = machineId ? (MOCK_SLOTS[machineId] ?? emptyArray) : emptyArray;
  return { data: slots, isLoading: false, error: null };
}

export function useListWastageReports(_machineId?: string | null, _options?: any): QueryResult<any[]> {
  return { data: emptyArray, isLoading: false, error: null };
}

export function useListTemperatureLogs(_machineId?: string | null, _options?: any): QueryResult<any[]> {
  return { data: emptyArray, isLoading: false, error: null };
}

export function useListMachines(_options?: any): QueryResult<any[]> {
  return { data: MOCK_MACHINES, isLoading: false, error: null };
}

export function useGetDashboardSummary(_options?: any): QueryResult<any> {
  return { data: MOCK_DASHBOARD_SUMMARY, isLoading: false, error: null };
}

export function useGetActiveRefillSession(_machineId?: string | null, _options?: any): QueryResult<any> {
  return { data: null, isLoading: false, error: null };
}

export function useCreateWastageReport(): MutationResult {
  return { mutate: noOpMutate, isPending: false };
}

export function useCreateTemperatureLog(): MutationResult {
  return { mutate: noOpMutate, isPending: false };
}

export function useStartRefillSession(): MutationResult {
  return { mutate: noOpMutate, isPending: false };
}

export function useSubmitRefillSession(): MutationResult {
  return { mutate: noOpMutate, isPending: false };
}

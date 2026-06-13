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

const baseQueryResult = { data: null, isLoading: false, error: null };

export function useGetMachine(_machineId?: string | null, _options?: any): QueryResult<any> {
  return { ...baseQueryResult };
}

export function useListMachineSlots(_machineId?: string | null, _options?: any): QueryResult<any[]> {
  return { data: emptyArray, isLoading: false, error: null };
}

export function useListWastageReports(_machineId?: string | null, _options?: any): QueryResult<any[]> {
  return { data: emptyArray, isLoading: false, error: null };
}

export function useListTemperatureLogs(_machineId?: string | null, _options?: any): QueryResult<any[]> {
  return { data: emptyArray, isLoading: false, error: null };
}

export function useListMachines(_options?: any): QueryResult<any[]> {
  return { data: emptyArray, isLoading: false, error: null };
}

export function useGetDashboardSummary(_options?: any): QueryResult<any> {
  return { ...baseQueryResult };
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

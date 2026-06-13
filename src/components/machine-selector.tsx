import { useListMachines, getListMachinesQueryKey } from "@workspace/api-client-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";

interface MachineSelectorProps {
  currentMachineId: string;
  basePath: string;
}

export function MachineSelector({ currentMachineId, basePath }: MachineSelectorProps) {
  const [_, setLocation] = useLocation();
  const { data: machines, isLoading } = useListMachines({
    query: { queryKey: getListMachinesQueryKey() }
  });

  if (isLoading) {
    return <div className="h-10 w-[200px] bg-muted animate-pulse rounded-md" />;
  }

  if (!machines || machines.length === 0) {
    return <div className="text-sm text-muted-foreground">No machines available</div>;
  }

  return (
    <Select 
      value={currentMachineId} 
      onValueChange={(value) => setLocation(`${basePath}/${value}`)}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select a machine" />
      </SelectTrigger>
      <SelectContent>
        {machines.map((machine) => (
          <SelectItem key={machine.id} value={machine.id}>
            {machine.name} ({machine.id})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

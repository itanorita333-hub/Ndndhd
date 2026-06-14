import { useGetMachine, getGetMachineQueryKey, useListMachineSlots, getListMachineSlotsQueryKey } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { MachineSelector } from "@/components/machine-selector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { MachineTabs } from "@/components/machine-tabs";

export default function StockTake() {
  const { machineId } = useParams<{ machineId: string }>();
  
  const { data: machine, isLoading: isMachineLoading } = useGetMachine(machineId, {
    query: { enabled: !!machineId, queryKey: getGetMachineQueryKey(machineId) }
  });

  const { data: slots, isLoading: isSlotsLoading } = useListMachineSlots(machineId, {
    query: { enabled: !!machineId, queryKey: getListMachineSlotsQueryKey(machineId) }
  });

  const isLoading = isMachineLoading || isSlotsLoading;

  if (isLoading) {
    return <div className="p-8 space-y-6"><Skeleton className="h-10 w-full max-w-md" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!machine) {
    return <div className="p-8 text-center"><AlertCircle className="mx-auto h-10 w-10 text-muted-foreground mb-4" /><h2>Machine not found</h2></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Stock Take: {machine.name}</h1>
          <p className="text-muted-foreground">{machine.location}</p>
        </div>
        <MachineSelector currentMachineId={machineId} basePath="/stock-take" />
      </div>

      <MachineTabs machineId={machineId} activeTab="stock-take" />

      <Card>
        <CardHeader>
          <CardTitle>Current Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          {slots && slots.length > 0 ? (
            <div className="space-y-6">
              {slots.map(slot => {
                const fillPercentage = (slot.currentInventory / slot.capacity) * 100;
                let colorClass = "bg-primary";
                if (fillPercentage < 20) colorClass = "bg-destructive";
                else if (fillPercentage < 50) colorClass = "bg-amber-500";

                return (
                  <div key={slot.id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{slot.slotLabel} - {slot.productName || 'Empty'}</span>
                      <span className="text-muted-foreground">
                        {slot.currentInventory} / {slot.capacity}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className={`${colorClass} h-full`} style={{ width: `${fillPercentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No slots configured for this machine.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

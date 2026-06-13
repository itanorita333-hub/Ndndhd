import { useGetMachine, getGetMachineQueryKey, useListMachineSlots, getListMachineSlotsQueryKey, useGetActiveRefillSession, getGetActiveRefillSessionQueryKey, useStartRefillSession, useSubmitRefillSession } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { MachineSelector } from "@/components/machine-selector";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Play, Save } from "lucide-react";
import { MachineTabs } from "@/components/machine-tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNowStrict } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SlotFormState {
  stockIn: number;
  overflow: number;
  stockOut: number;
}

export default function RefillService() {
  const { machineId } = useParams<{ machineId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [elapsedTime, setElapsedTime] = useState<string>("");
  const [slotValues, setSlotValues] = useState<Record<number, SlotFormState>>({});
  
  const { data: machine, isLoading: isMachineLoading } = useGetMachine(machineId, {
    query: { enabled: !!machineId, queryKey: getGetMachineQueryKey(machineId) }
  });

  const { data: slots, isLoading: isSlotsLoading } = useListMachineSlots(machineId, {
    query: { enabled: !!machineId, queryKey: getListMachineSlotsQueryKey(machineId) }
  });

  const { data: activeSessionData, isLoading: isActiveSessionLoading } = useGetActiveRefillSession(machineId, {
    query: { enabled: !!machineId, queryKey: getGetActiveRefillSessionQueryKey(machineId) }
  });

  const activeSession = activeSessionData?.session;

  const startSession = useStartRefillSession();
  const submitSession = useSubmitRefillSession();

  // Initialize form state — functional update avoids needing slotValues in deps
  useEffect(() => {
    if (!slots) return;
    setSlotValues(prev => {
      if (Object.keys(prev).length > 0) return prev;
      const initialValues: Record<number, SlotFormState> = {};
      slots.forEach(slot => {
        initialValues[slot.id] = { stockIn: 0, overflow: 0, stockOut: 0 };
      });
      return initialValues;
    });
  }, [slots]);

  // Update elapsed time
  useEffect(() => {
    if (!activeSession?.startTime) return;

    const interval = setInterval(() => {
      setElapsedTime(formatDistanceToNowStrict(new Date(activeSession.startTime)));
    }, 1000);

    // Initial update
    setElapsedTime(formatDistanceToNowStrict(new Date(activeSession.startTime)));

    return () => clearInterval(interval);
  }, [activeSession?.startTime]);

  const handleStartRefill = () => {
    startSession.mutate(
      { machineId, data: { refillerName: "Field Tech" } },
      {
        onSuccess: () => {
          toast({ title: "Refill session started" });
          queryClient.invalidateQueries({ queryKey: getGetActiveRefillSessionQueryKey(machineId) });
        },
        onError: () => {
          toast({ title: "Failed to start session", variant: "destructive" });
        }
      }
    );
  };

  const isTooEarly = useMemo(() => {
    if (!activeSession?.startTime) return true;
    const startTime = new Date(activeSession.startTime).getTime();
    const now = new Date().getTime();
    return (now - startTime) < 5 * 60 * 1000; // 5 minutes
  }, [activeSession?.startTime, elapsedTime]); // Dependency on elapsedTime to re-evaluate

  const handleSubmit = () => {
    if (!activeSession) return;
    
    if (isTooEarly) {
      toast({ title: "Cannot submit yet", description: "A refill session must be open for at least 5 minutes to ensure accurate inventory taking.", variant: "destructive" });
      return;
    }

    const items = Object.entries(slotValues).map(([slotId, values]) => ({
      slotId: parseInt(slotId, 10),
      stockIn: values.stockIn,
      overflow: values.overflow,
      stockOut: values.stockOut
    }));

    submitSession.mutate(
      { machineId, sessionId: activeSession.id, data: { items } },
      {
        onSuccess: () => {
          toast({ title: "Refill session submitted successfully" });
          queryClient.invalidateQueries({ queryKey: getGetActiveRefillSessionQueryKey(machineId) });
          queryClient.invalidateQueries({ queryKey: getListMachineSlotsQueryKey(machineId) });
          setSlotValues({}); // Reset after submit
        },
        onError: () => {
          toast({ title: "Failed to submit session", variant: "destructive" });
        }
      }
    );
  };

  const handleFullStockOut = () => {
    if (!slots) return;
    setSlotValues(prev => {
      const newValues = { ...prev };
      slots.forEach(slot => {
        if (newValues[slot.id]) {
          newValues[slot.id] = { ...newValues[slot.id], stockOut: slot.currentInventory };
        }
      });
      return newValues;
    });
    toast({ title: "All current inventory marked as stock out" });
  };

  const updateSlotValue = useCallback((slotId: number, field: keyof SlotFormState, value: string) => {
    const numValue = parseInt(value, 10) || 0;
    setSlotValues(prev => ({
      ...prev,
      [slotId]: {
        ...prev[slotId],
        [field]: numValue
      }
    }));
  }, []);

  const isLoading = isMachineLoading || isSlotsLoading || isActiveSessionLoading;

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
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Refill Service: {machine.name}</h1>
          <p className="text-muted-foreground">{machine.location}</p>
        </div>
        <MachineSelector currentMachineId={machineId} basePath="/refill-service" />
      </div>

      <MachineTabs machineId={machineId} activeTab="refill-service" />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <div>
            <CardTitle>Refill Session</CardTitle>
            <CardDescription>
              {activeSession ? `Session started ${elapsedTime} ago` : 'No active session'}
            </CardDescription>
          </div>
          {!activeSession ? (
            <Button onClick={handleStartRefill} disabled={startSession.isPending}>
              <Play className="mr-2 h-4 w-4" />
              {startSession.isPending ? "Starting..." : "Start Refill"}
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={submitSession.isPending || isTooEarly}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Save className="mr-2 h-4 w-4" />
              {submitSession.isPending ? "Submitting..." : "Submit Session"}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {activeSession && isTooEarly && (
            <Alert className="mb-4 bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-900">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription>
                Must spend at least 5 minutes on refill to ensure quality. You can submit in {isTooEarly ? "a few minutes" : "now"}.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Inventory Updates</h3>
            {activeSession && (
              <Button variant="outline" size="sm" onClick={handleFullStockOut}>
                Full Stock Out
              </Button>
            )}
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">Slot</TableHead>
                  <TableHead className="text-center">Product</TableHead>
                  <TableHead className="text-center">Current</TableHead>
                  <TableHead className="text-center">Capacity</TableHead>
                  <TableHead className="text-center w-24">Stock In</TableHead>
                  <TableHead className="text-center w-24">Overflow</TableHead>
                  <TableHead className="text-center w-24">Stock Out</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slots && slots.length > 0 ? (
                  slots.map((slot) => (
                    <TableRow key={slot.id} className={!activeSession ? "opacity-50 pointer-events-none" : ""}>
                      <TableCell className="text-center font-medium">{slot.slotLabel}</TableCell>
                      <TableCell className="text-center">
                        <div className="line-clamp-1">{slot.productName || 'Empty'}</div>
                        <div className="text-xs text-muted-foreground">{slot.productCode}</div>
                      </TableCell>
                      <TableCell className="text-center">{slot.currentInventory}</TableCell>
                      <TableCell className="text-center">{slot.capacity}</TableCell>
                      <TableCell className="text-center">
                        <Input 
                          type="number" 
                          min="0"
                          value={slotValues[slot.id]?.stockIn || 0}
                          onChange={(e) => updateSlotValue(slot.id, 'stockIn', e.target.value)}
                          disabled={!activeSession}
                          className="h-8 text-center"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Input 
                          type="number" 
                          min="0"
                          value={slotValues[slot.id]?.overflow || 0}
                          onChange={(e) => updateSlotValue(slot.id, 'overflow', e.target.value)}
                          disabled={!activeSession}
                          className="h-8 text-center"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Input 
                          type="number" 
                          min="0"
                          value={slotValues[slot.id]?.stockOut || 0}
                          onChange={(e) => updateSlotValue(slot.id, 'stockOut', e.target.value)}
                          disabled={!activeSession}
                          className="h-8 text-center"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No slots found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

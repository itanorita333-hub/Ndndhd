import { useGetMachine, getGetMachineQueryKey, useListMachineSlots, getListMachineSlotsQueryKey, useGetActiveRefillSession, getGetActiveRefillSessionQueryKey, useStartRefillSession, useSubmitRefillSession } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { MachineSelector } from "@/components/machine-selector";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Play, Save, Pause, PlayCircle } from "lucide-react";
import { MachineTabs } from "@/components/machine-tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNowStrict } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface SlotFormState {
  stockIn: number;
  overflow: number;
  stockOut: number;
}

interface DraftData {
  machineId: string;
  sessionId: string;
  slotValues: Record<number, SlotFormState>;
  savedAt: number;
}

const DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 1 day

function getDraftKey(machineId: string) {
  return `refill-draft-${machineId}`;
}

function saveDraft(machineId: string, sessionId: string, slotValues: Record<number, SlotFormState>) {
  const draft: DraftData = { machineId, sessionId, slotValues, savedAt: Date.now() };
  try {
    localStorage.setItem(getDraftKey(machineId), JSON.stringify(draft));
  } catch {}
}

function loadDraft(machineId: string): DraftData | null {
  try {
    const raw = localStorage.getItem(getDraftKey(machineId));
    if (!raw) return null;
    const draft: DraftData = JSON.parse(raw);
    if (Date.now() - draft.savedAt > DRAFT_TTL_MS) {
      localStorage.removeItem(getDraftKey(machineId));
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

function clearDraft(machineId: string) {
  try {
    localStorage.removeItem(getDraftKey(machineId));
  } catch {}
}

export default function RefillService() {
  const { machineId } = useParams<{ machineId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [elapsedTime, setElapsedTime] = useState<string>("");
  const [slotValues, setSlotValues] = useState<Record<number, SlotFormState>>({});
  const [isPaused, setIsPaused] = useState(false);
  const [showEmptySlots, setShowEmptySlots] = useState(true);
  const [hasDraft, setHasDraft] = useState(false);

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

  // On mount: check for a saved draft and restore if present
  useEffect(() => {
    if (!machineId) return;
    const draft = loadDraft(machineId);
    if (draft) {
      setHasDraft(true);
    }
  }, [machineId]);

  // Initialize form state from draft or fresh defaults
  useEffect(() => {
    if (!slots || !machineId) return;
    setSlotValues(prev => {
      if (Object.keys(prev).length > 0) return prev;

      // Try restoring from saved draft first
      const draft = loadDraft(machineId);
      if (draft) {
        return draft.slotValues;
      }

      const initialValues: Record<number, SlotFormState> = {};
      slots.forEach(slot => {
        initialValues[slot.id] = { stockIn: 0, overflow: 0, stockOut: 0 };
      });
      return initialValues;
    });
  }, [slots, machineId]);

  // Update elapsed time
  useEffect(() => {
    if (!activeSession?.startTime) return;
    const interval = setInterval(() => {
      setElapsedTime(formatDistanceToNowStrict(new Date(activeSession.startTime)));
    }, 1000);
    setElapsedTime(formatDistanceToNowStrict(new Date(activeSession.startTime)));
    return () => clearInterval(interval);
  }, [activeSession?.startTime]);

  // Auto-save to draft whenever slotValues change while session is active
  useEffect(() => {
    if (!machineId || !activeSession || Object.keys(slotValues).length === 0) return;
    saveDraft(machineId, activeSession.id, slotValues);
  }, [slotValues, machineId, activeSession]);

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
    return (now - startTime) < 5 * 60 * 1000;
  }, [activeSession?.startTime, elapsedTime]);

  const handlePause = () => {
    if (!activeSession || !machineId) return;
    saveDraft(machineId, activeSession.id, slotValues);
    setIsPaused(true);
    toast({
      title: "Session paused",
      description: "Your progress has been saved. It will be kept for 24 hours.",
    });
  };

  const handleContinue = () => {
    setIsPaused(false);
    toast({ title: "Session resumed", description: "Your saved progress has been restored." });
  };

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
          clearDraft(machineId!);
          setHasDraft(false);
          setIsPaused(false);
          queryClient.invalidateQueries({ queryKey: getGetActiveRefillSessionQueryKey(machineId) });
          queryClient.invalidateQueries({ queryKey: getListMachineSlotsQueryKey(machineId) });
          setSlotValues({});
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
      [slotId]: { ...prev[slotId], [field]: numValue }
    }));
  }, []);

  const isLoading = isMachineLoading || isSlotsLoading || isActiveSessionLoading;
  const inputsDisabled = !activeSession || isPaused;

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
          <h1 className="text-xl font-bold tracking-tight text-foreground">Refill Service: {machine.name}</h1>
          <p className="text-muted-foreground">{machine.location}</p>
        </div>
        <MachineSelector currentMachineId={machineId} basePath="/refill-service" />
      </div>

      <MachineTabs machineId={machineId} activeTab="refill-service" />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div>
              <CardTitle>Refill Session</CardTitle>
              <CardDescription>
                {activeSession
                  ? isPaused
                    ? `Session paused — started ${elapsedTime} ago`
                    : `Session active — started ${elapsedTime} ago`
                  : "No active session"}
              </CardDescription>
            </div>
            {activeSession && isPaused && (
              <Badge variant="outline" className="border-amber-400 text-amber-600 dark:text-amber-400">
                Paused
              </Badge>
            )}
            {activeSession && !isPaused && (
              <Badge variant="outline" className="border-emerald-500 text-emerald-600 dark:text-emerald-400">
                Active
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Restored draft notice */}
          {hasDraft && activeSession && (
            <Alert className="bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950/50 dark:text-blue-200 dark:border-blue-900">
              <div className="flex items-start gap-2">
                <PlayCircle className="mt-0.5 h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="leading-snug">
                  Previous session data was restored from your saved draft.
                </AlertDescription>
              </div>
            </Alert>
          )}

          {/* 5-min warning */}
          {activeSession && !isPaused && isTooEarly && (
            <Alert className="bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-900">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="leading-snug">
                  Must spend at least 5 minutes on refill to ensure quality.
                </AlertDescription>
              </div>
            </Alert>
          )}

          {/* Paused notice */}
          {isPaused && (
            <Alert className="bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-900">
              <div className="flex items-start gap-2">
                <Pause className="mt-0.5 h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="leading-snug">
                  Session is paused. Your data is saved locally for up to 24 hours. Press <strong>Continue</strong> to resume.
                </AlertDescription>
              </div>
            </Alert>
          )}

          {/* Table toolbar */}
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Inventory Updates</h3>
            {activeSession && !isPaused && (
              <Button variant="outline" size="sm" onClick={handleFullStockOut}>
                Full Stock Out
              </Button>
            )}
          </div>

          {/* Inventory table */}
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
                    <TableRow key={slot.id} className={inputsDisabled ? "opacity-50 pointer-events-none" : ""}>
                      <TableCell className="text-center font-medium">{slot.slotLabel}</TableCell>
                      <TableCell className="text-center">
                        <div className="line-clamp-1">{slot.productName || "Empty"}</div>
                        <div className="text-xs text-muted-foreground">{slot.productCode}</div>
                      </TableCell>
                      <TableCell className="text-center">{slot.currentInventory}</TableCell>
                      <TableCell className="text-center">{slot.capacity}</TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          min="0"
                          value={
                            inputsDisabled
                              ? String(slotValues[slot.id]?.stockIn ?? 0)
                              : slotValues[slot.id]?.stockIn === 0
                              ? ""
                              : String(slotValues[slot.id]?.stockIn ?? "")
                          }
                          placeholder={inputsDisabled ? "0" : "0"}
                          onChange={(e) => updateSlotValue(slot.id, "stockIn", e.target.value)}
                          onFocus={() => setShowEmptySlots(false)}
                          disabled={inputsDisabled}
                          className={`h-8 text-center placeholder:text-muted-foreground ${inputsDisabled ? "border border-border" : ""}`}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          min="0"
                          value={
                            inputsDisabled
                              ? String(slotValues[slot.id]?.overflow ?? 0)
                              : slotValues[slot.id]?.overflow === 0
                              ? ""
                              : String(slotValues[slot.id]?.overflow ?? "")
                          }
                          placeholder={inputsDisabled ? "0" : "0"}
                          onChange={(e) => updateSlotValue(slot.id, "overflow", e.target.value)}
                          onFocus={() => setShowEmptySlots(false)}
                          disabled={inputsDisabled}
                          className={`h-8 text-center placeholder:text-muted-foreground ${inputsDisabled ? "border border-border" : ""}`}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          min="0"
                          value={
                            inputsDisabled
                              ? String(slotValues[slot.id]?.stockOut ?? 0)
                              : slotValues[slot.id]?.stockOut === 0
                              ? ""
                              : String(slotValues[slot.id]?.stockOut ?? "")
                          }
                          placeholder={inputsDisabled ? "0" : "0"}
                          onChange={(e) => updateSlotValue(slot.id, "stockOut", e.target.value)}
                          onFocus={() => setShowEmptySlots(false)}
                          disabled={inputsDisabled}
                          className={`h-8 text-center placeholder:text-muted-foreground ${inputsDisabled ? "border border-border" : ""}`}
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

          {/* Action buttons below table */}
          <div className="flex items-center justify-between pt-2">
            <div />

            {/* Right: Pause / Continue, Start Refill / Submit Session */}
            <div className="flex items-center gap-2">
              {activeSession && !isPaused && (
                <Button variant="outline" onClick={handlePause}>
                  <Pause className="mr-2 h-4 w-4" />
                  Pause
                </Button>
              )}
              {activeSession && isPaused && (
                <Button variant="outline" onClick={handleContinue} className="border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950">
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Continue
                </Button>
              )}
              {!activeSession && (
                <Button onClick={handleStartRefill} disabled={startSession.isPending}>
                  <Play className="mr-2 h-4 w-4" />
                  {startSession.isPending ? "Starting..." : "Start Refill"}
                </Button>
              )}
              {activeSession && (
                <Button
                  onClick={handleSubmit}
                  disabled={submitSession.isPending || isTooEarly || isPaused}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {submitSession.isPending ? "Submitting..." : "Submit Session"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

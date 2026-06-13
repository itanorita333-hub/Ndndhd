import { useGetMachine, getGetMachineQueryKey, useListTemperatureLogs, getListTemperatureLogsQueryKey, useCreateTemperatureLog } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { MachineSelector } from "@/components/machine-selector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Thermometer } from "lucide-react";
import { MachineTabs } from "@/components/machine-tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

const formSchema = z.object({
  temperature: z.coerce.number().min(-50).max(100),
  notes: z.string().optional(),
});

export default function TemperatureLog() {
  const { machineId } = useParams<{ machineId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: machine, isLoading: isMachineLoading } = useGetMachine(machineId, {
    query: { enabled: !!machineId, queryKey: getGetMachineQueryKey(machineId) }
  });

  const { data: logs, isLoading: isLogsLoading } = useListTemperatureLogs(machineId, {
    query: { enabled: !!machineId, queryKey: getListTemperatureLogsQueryKey(machineId) }
  });

  const createLog = useCreateTemperatureLog();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      temperature: 0,
      notes: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createLog.mutate(
      { machineId, data: values },
      {
        onSuccess: () => {
          toast({ title: "Temperature logged successfully" });
          form.reset();
          queryClient.invalidateQueries({ queryKey: getListTemperatureLogsQueryKey(machineId) });
        },
        onError: () => {
          toast({ title: "Failed to log temperature", variant: "destructive" });
        }
      }
    );
  }

  const isLoading = isMachineLoading || isLogsLoading;

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
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Temperature Log: {machine.name}</h1>
          <p className="text-muted-foreground">{machine.location}</p>
        </div>
        <MachineSelector currentMachineId={machineId} basePath="/temperature-log" />
      </div>

      <MachineTabs machineId={machineId} activeTab="temperature-log" />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Thermometer className="h-5 w-5" />
              Record Temperature
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="temperature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temperature (°C)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Any anomalies?" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={createLog.isPending}>
                  {createLog.isPending ? "Saving..." : "Log Temperature"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Past Logs</CardTitle>
          </CardHeader>
          <CardContent>
            {logs && logs.length > 0 ? (
              <div className="space-y-4">
                {logs.map((log) => (
                  <div key={log.id} className="flex justify-between items-center p-3 border rounded-md">
                    <div>
                      <div className="font-semibold text-lg">{log.temperature}°C</div>
                      {log.notes && <div className="text-sm text-muted-foreground mt-1">{log.notes}</div>}
                    </div>
                    <div className="text-xs text-muted-foreground text-right">
                      <div>{format(new Date(log.recordedAt), "MMM d, yyyy")}</div>
                      <div>{format(new Date(log.recordedAt), "h:mm a")}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No temperature logs found.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

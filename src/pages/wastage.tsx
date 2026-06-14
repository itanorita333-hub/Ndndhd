import { useGetMachine, getGetMachineQueryKey, useListMachineSlots, getListMachineSlotsQueryKey, useListWastageReports, getListWastageReportsQueryKey, useCreateWastageReport } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { MachineSelector } from "@/components/machine-selector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Trash2 } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

const formSchema = z.object({
  slotId: z.coerce.number().min(1, "Please select a slot"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  reason: z.string().min(3, "Reason is required"),
});

export default function WastageReport() {
  const { machineId } = useParams<{ machineId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: machine, isLoading: isMachineLoading } = useGetMachine(machineId, {
    query: { enabled: !!machineId, queryKey: getGetMachineQueryKey(machineId) }
  });

  const { data: slots, isLoading: isSlotsLoading } = useListMachineSlots(machineId, {
    query: { enabled: !!machineId, queryKey: getListMachineSlotsQueryKey(machineId) }
  });

  const { data: reports, isLoading: isReportsLoading } = useListWastageReports(machineId, {
    query: { enabled: !!machineId, queryKey: getListWastageReportsQueryKey(machineId) }
  });

  const createReport = useCreateWastageReport();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      slotId: 0,
      quantity: 1,
      reason: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createReport.mutate(
      { machineId, data: values },
      {
        onSuccess: () => {
          toast({ title: "Wastage reported successfully" });
          form.reset();
          queryClient.invalidateQueries({ queryKey: getListWastageReportsQueryKey(machineId) });
        },
        onError: () => {
          toast({ title: "Failed to report wastage", variant: "destructive" });
        }
      }
    );
  }

  const isLoading = isMachineLoading || isSlotsLoading || isReportsLoading;

  if (isLoading) {
    return <div className="p-8 space-y-6"><Skeleton className="h-10 w-full max-w-md" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!machine) {
    return <div className="p-8 text-center"><AlertCircle className="mx-auto h-10 w-10 text-muted-foreground mb-4" /><h2>Machine not found</h2></div>;
  }

  const reasons = [
    "Expired",
    "Damaged Packaging",
    "Defective Product",
    "Jammed in Machine",
    "Other"
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Wastage Report: {machine.name}</h1>
          <p className="text-muted-foreground">{machine.location}</p>
        </div>
        <MachineSelector currentMachineId={machineId} basePath="/wastage" />
      </div>

      <MachineTabs machineId={machineId} activeTab="wastage" />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Report Wastage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="slotId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slot / Product</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value ? field.value.toString() : ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select product slot" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {slots?.map((slot) => (
                            <SelectItem key={slot.id} value={slot.id.toString()}>
                              {slot.slotLabel} - {slot.productName || 'Empty'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select reason" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {reasons.map((reason) => (
                              <SelectItem key={reason} value={reason}>
                                {reason}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <Button type="submit" variant="destructive" className="w-full" disabled={createReport.isPending}>
                  {createReport.isPending ? "Submitting..." : "Submit Wastage Report"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
          </CardHeader>
          <CardContent>
            {reports && reports.length > 0 ? (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report.id} className="flex justify-between items-start p-3 border rounded-md">
                    <div>
                      <div className="font-medium text-destructive">
                        {report.quantity}x {report.productName || report.slotLabel}
                      </div>
                      <div className="text-sm font-medium mt-1">{report.reason}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Slot {report.slotLabel}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground text-right">
                      <div>{format(new Date(report.reportedAt), "MMM d, yyyy")}</div>
                      <div>{format(new Date(report.reportedAt), "h:mm a")}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No recent wastage reports.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

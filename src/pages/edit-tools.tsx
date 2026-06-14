import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useLocation } from "wouter";

export default function EditTools() {
  const [location] = useLocation();

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Edit Tools</h1>
          <p className="text-sm text-muted-foreground">View and configure tools for edit mode workflows.</p>
        </div>
        <div className="rounded-full border border-border px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {location}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Edit Tools</CardTitle>
          <CardDescription>These tools will appear in sidebar edit mode.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Use these controls to toggle editor capabilities and preview the edit mode toolbar.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-md border border-border bg-background p-3">
              <div className="text-sm font-semibold">Layout editor</div>
              <div className="text-xs text-muted-foreground">Rearrange sidebar groups and page sections.</div>
            </div>
            <div className="rounded-md border border-border bg-background p-3">
              <div className="text-sm font-semibold">Visibility controls</div>
              <div className="text-xs text-muted-foreground">Show or hide edit mode components.</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useLocation } from "wouter";

export default function EditSidebar() {
  const [location] = useLocation();

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sidebar Editor</h1>
          <p className="text-sm text-muted-foreground">Customize the sidebar section layout and labels for edit mode.</p>
        </div>
        <div className="rounded-full border border-border px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {location}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Sidebar Sections</CardTitle>
          <CardDescription>Use this screen to manage which edit controls appear in the sidebar while edit mode is active.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This page is a placeholder for the sidebar editor. You can add, remove, or re-order edit tools here.
          </p>
          <ul className="space-y-2 text-sm">
            <li className="rounded-md border border-border bg-background p-3">Configure section labels</li>
            <li className="rounded-md border border-border bg-background p-3">Toggle edit tool visibility</li>
            <li className="rounded-md border border-border bg-background p-3">Re-order sidebar groups</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

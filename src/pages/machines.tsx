import { useListMachines, getListMachinesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, useSearch } from "wouter";
import { format } from "date-fns";
import { MapPin, Box, AlertCircle, CheckCircle2, Route, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

function needsRefill(lastRefillAt: string | null | undefined): boolean {
  if (!lastRefillAt) return true;
  return Date.now() - new Date(lastRefillAt).getTime() > 24 * 60 * 60 * 1000;
}

export default function MachinesList() {
  const { data: machines, isLoading } = useListMachines({
    query: { queryKey: getListMachinesQueryKey() },
  });

  const search = useSearch();
  const params = new URLSearchParams(search);
  const activeRoute = params.get("route");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter machines by search query
  const filteredMachines = machines
    ? machines.filter((m) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          m.name?.toLowerCase().includes(q) ||
          m.id?.toLowerCase().includes(q) ||
          m.location?.toLowerCase().includes(q)
        );
      })
    : [];

  // Group filtered machines by route
  const routeGroups = filteredMachines.reduce<Record<string, typeof filteredMachines>>(
    (acc, m) => {
      const r = m.route ?? "Unassigned";
      if (!acc[r]) acc[r] = [];
      acc[r].push(m);
      return acc;
    },
    {}
  );

  const routeNames = Object.keys(routeGroups).sort();

  // If a route filter is active, only show that route
  const visibleRoutes = activeRoute
    ? routeNames.filter((r) => r === activeRoute)
    : routeNames;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Refill Service
          </h1>
          <p className="text-muted-foreground mt-1">
            {activeRoute
              ? `Showing machines in ${activeRoute}`
              : "All routes — select a route from the sidebar to filter"}
          </p>
        </div>

        {/* Search bar */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Route tabs (only when not filtered) */}
      {!activeRoute && !isLoading && routeNames.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {routeNames.map((routeName) => {
            const count = routeGroups[routeName].filter((m) =>
              needsRefill(m.lastRefillAt)
            ).length;
            return (
              <Link key={routeName} href={`/machines?route=${encodeURIComponent(routeName)}`}>
                <Badge
                  variant="outline"
                  className="cursor-pointer px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                >
                  <Route className="size-3 mr-1.5" />
                  {routeName}
                  {count > 0 && (
                    <span className="ml-2 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold leading-none text-destructive-foreground">
                      {count}
                    </span>
                  )}
                </Badge>
              </Link>
            );
          })}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <div className="h-5 w-48 rounded bg-muted animate-pulse" />
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2].map((j) => (
                  <Card key={j} className="animate-pulse h-48" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {visibleRoutes.map((routeName) => {
            const routeMachines = routeGroups[routeName];
            const refillCount = routeMachines.filter((m) => needsRefill(m.lastRefillAt)).length;

            return (
              <section key={routeName}>
                {/* Route heading */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Route className="size-4 text-muted-foreground" />
                    <h2 className="text-lg font-semibold">{routeName}</h2>
                  </div>
                  {refillCount > 0 ? (
                    <Badge variant="destructive" className="rounded-full">
                      <AlertCircle className="size-3 mr-1" />
                      {refillCount} need refill
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="rounded-full">
                      <CheckCircle2 className="size-3 mr-1 text-emerald-500" />
                      All refilled
                    </Badge>
                  )}
                  <div className="flex-1 border-t ml-2" />
                </div>

                {/* Machines grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {routeMachines.map((machine) => {
                    const refill = needsRefill(machine.lastRefillAt);
                    return (
                      <Card
                        key={machine.id}
                        className={`flex flex-col transition-shadow hover:shadow-md ${
                          refill ? "border-destructive/30" : ""
                        }`}
                      >
                        <CardHeader className="pb-3 border-b">
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0">
                              <CardTitle className="text-base leading-tight">{machine.name}</CardTitle>
                              <CardDescription className="text-xs font-mono mt-0.5">
                                {machine.id}
                              </CardDescription>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <Badge
                                variant={
                                  machine.status === "active"
                                    ? "default"
                                    : machine.status === "maintenance"
                                    ? "destructive"
                                    : "secondary"
                                }
                                className={
                                  machine.status === "active"
                                    ? "bg-emerald-500 hover:bg-emerald-600"
                                    : ""
                                }
                              >
                                {machine.status}
                              </Badge>
                              {refill && (
                                <Badge variant="outline" className="border-destructive text-destructive text-[10px]">
                                  Needs Refill
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 flex-1 flex flex-col justify-between">
                          <div className="space-y-2 mb-4">
                            <div className="flex items-start gap-2 text-sm">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                              <span className="text-sm">{machine.location}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Box className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{machine.totalSlots || 0} Slots</span>
                            </div>
                            <div className="text-xs text-muted-foreground pt-1">
                              Last refill:{" "}
                              {machine.lastRefillAt
                                ? format(new Date(machine.lastRefillAt), "d MMM yyyy, h:mm a")
                                : <span className="text-destructive font-medium">Never</span>}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Link href={`/refill-service/${machine.id}`}>
                              <Button
                                variant={refill ? "default" : "outline"}
                                className="w-full"
                                size="sm"
                              >
                                Refill
                              </Button>
                            </Link>
                            <Link href={`/stock-take/${machine.id}`}>
                              <Button variant="outline" className="w-full" size="sm">
                                Stock Take
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {visibleRoutes.length === 0 && (
            <div className="text-center py-16 bg-card rounded-lg border border-dashed">
              {searchQuery ? (
                <>
                  <Search className="mx-auto size-8 text-muted-foreground mb-3" />
                  <p className="font-medium">No machines found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    No results for "{searchQuery}". Try a different name or location.
                  </p>
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mt-3 text-sm text-primary hover:underline"
                  >
                    Clear search
                  </button>
                </>
              ) : (
                <p className="text-muted-foreground">No routes found.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

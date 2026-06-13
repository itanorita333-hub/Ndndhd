import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Truck,
  ClipboardList,
  Thermometer,
  Trash2,
  ChevronsUpDown,
  Activity,
  Sun,
  Moon,
  Route,
  ChevronRight,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useListMachines } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

const MACHINE_SECTIONS = [
  { id: "refill-service", label: "Refill Service", icon: Truck, prefix: "/refill-service/" },
  { id: "stock-take", label: "Stock Take", icon: ClipboardList, prefix: "/stock-take/" },
  { id: "temperature-log", label: "Temperature Log", icon: Thermometer, prefix: "/temperature-log/" },
  { id: "wastage", label: "Wastage Report", icon: Trash2, prefix: "/wastage/" },
];

function needsRefill(lastRefillAt: string | null | undefined): boolean {
  if (!lastRefillAt) return true;
  return Date.now() - new Date(lastRefillAt).getTime() > 24 * 60 * 60 * 1000;
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <SidebarMenuButton
      onClick={toggleTheme}
      tooltip={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className="w-full"
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
      <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
    </SidebarMenuButton>
  );
}

function AppSidebar() {
  const [location] = useLocation();
  const { data: machines } = useListMachines();

  const activeMachineId = MACHINE_SECTIONS.reduce<string | null>((found, s) => {
    if (found) return found;
    if (location.startsWith(s.prefix)) return location.slice(s.prefix.length).split("/")[0];
    return null;
  }, null);

  // Group machines by route
  const routeGroups = machines
    ? machines.reduce<Record<string, typeof machines>>((acc, m) => {
        const r = m.route ?? "Unassigned";
        if (!acc[r]) acc[r] = [];
        acc[r].push(m);
        return acc;
      }, {})
    : {};

  const routeNames = Object.keys(routeGroups).sort();

  // Detect current route filter from URL
  const searchParams = new URLSearchParams(location.includes("?") ? location.split("?")[1] : "");
  const activeRouteName = searchParams.get("route");

  const isRefillServiceSection =
    location === "/machines" ||
    location.startsWith("/machines?") ||
    MACHINE_SECTIONS.some((s) => location.startsWith(s.prefix));

  return (
    <Sidebar collapsible="offcanvas">
      {/* Header / Logo */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Activity className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold text-sm">FM Vending</span>
                  <span className="text-xs text-muted-foreground">Management</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Dashboard */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/"}
                  tooltip="Dashboard"
                >
                  <Link href="/">
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Refill Service — collapsible with routes */}
              <Collapsible
                defaultOpen={isRefillServiceSection}
                className="group/refill"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={isRefillServiceSection}
                      tooltip="Refill Service"
                    >
                      <Route />
                      <span>Refill Service</span>
                      <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/refill:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>

                  {/* Total machines needing refill badge */}
                  {machines && (() => {
                    const total = machines.filter((m) => needsRefill(m.lastRefillAt)).length;
                    return total > 0 ? (
                      <SidebarMenuBadge className="bg-destructive text-destructive-foreground rounded-full px-1.5 text-[10px] font-bold">
                        {total}
                      </SidebarMenuBadge>
                    ) : null;
                  })()}

                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {routeNames.map((routeName) => {
                        const routeMachines = routeGroups[routeName];
                        const refillCount = routeMachines.filter((m) =>
                          needsRefill(m.lastRefillAt)
                        ).length;
                        const href = `/machines?route=${encodeURIComponent(routeName)}`;
                        const isActive = activeRouteName === routeName;

                        return (
                          <SidebarMenuSubItem key={routeName}>
                            <SidebarMenuSubButton asChild isActive={isActive}>
                              <Link href={href}>
                                <span className="truncate">{routeName}</span>
                                {refillCount > 0 && (
                                  <span className="ml-auto shrink-0 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold leading-none text-destructive-foreground">
                                    {refillCount}
                                  </span>
                                )}
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Machine Operations — shown when a machine is selected */}
        {activeMachineId && (
          <SidebarGroup>
            <SidebarGroupLabel>Machine — {activeMachineId}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {MACHINE_SECTIONS.map((section) => {
                  const href = `${section.prefix}${activeMachineId}`;
                  const isActive = location.startsWith(section.prefix + activeMachineId);
                  return (
                    <SidebarMenuItem key={section.id}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={section.label}>
                        <Link href={href}>
                          <section.icon />
                          <span>{section.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* All Machines — collapsible list */}
        {machines && machines.length > 0 && (
          <SidebarGroup>
            <Collapsible defaultOpen={!!activeMachineId} className="group/collapsible">
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center justify-between">
                  All Machines
                  <ChevronsUpDown className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {machines.map((machine) => {
                      const href = `/refill-service/${machine.id}`;
                      const isActive = activeMachineId === machine.id;
                      return (
                        <SidebarMenuItem key={machine.id}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            tooltip={`${machine.id} — ${machine.location}`}
                          >
                            <Link href={href}>
                              <span
                                className={cn(
                                  "flex size-5 shrink-0 items-center justify-center rounded text-[10px] font-bold",
                                  machine.status === "active"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : machine.status === "maintenance"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                {machine.id.slice(-3)}
                              </span>
                              <div className="flex flex-col leading-none min-w-0">
                                <span className="truncate text-sm font-medium">{machine.id}</span>
                                <span className="truncate text-xs text-muted-foreground">{machine.location}</span>
                              </div>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <ThemeToggle />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

function PageHeader() {
  const [location] = useLocation();
  const { data: machines } = useListMachines();

  const activeMachineId = MACHINE_SECTIONS.reduce<string | null>((found, s) => {
    if (found) return found;
    if (location.startsWith(s.prefix)) return location.slice(s.prefix.length).split("/")[0];
    return null;
  }, null);

  const activeMachine = machines?.find((m) => m.id === activeMachineId);
  const activeSection = MACHINE_SECTIONS.find((s) =>
    location.startsWith(s.prefix + activeMachineId)
  );

  const searchParams = new URLSearchParams(
    location.includes("?") ? location.split("?")[1] : ""
  );
  const activeRouteName = searchParams.get("route");

  const breadcrumbs: { label: string; href?: string }[] = [];

  if (location === "/") {
    breadcrumbs.push({ label: "Dashboard" });
  } else if (location.startsWith("/machines")) {
    breadcrumbs.push({ label: "Refill Service", href: "/machines" });
    if (activeRouteName) breadcrumbs.push({ label: activeRouteName });
  } else if (activeMachineId) {
    breadcrumbs.push({ label: "Refill Service", href: "/machines" });
    if (activeMachine)
      breadcrumbs.push({
        label: activeMachine.id,
        href: `/refill-service/${activeMachineId}`,
      });
    if (activeSection) breadcrumbs.push({ label: activeSection.label });
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {crumb.href ? (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </span>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}

function SidebarBackdrop() {
  const { open, setOpen, isMobile } = useSidebar();
  if (!open || isMobile) return null;
  return (
    <div
      className="fixed inset-0 z-[9]"
      onClick={() => setOpen(false)}
      aria-hidden
    />
  );
}

export function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarBackdrop />
      <SidebarInset>
        <PageHeader />
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

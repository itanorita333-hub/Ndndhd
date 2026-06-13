import { Link } from "wouter";
import { cn } from "@/lib/utils";

interface MachineTabsProps {
  machineId: string;
  activeTab: 'refill-service' | 'stock-take' | 'temperature-log' | 'wastage';
}

export function MachineTabs({ machineId, activeTab }: MachineTabsProps) {
  const tabs = [
    { id: 'refill-service', label: 'Refill Service', href: `/refill-service/${machineId}` },
    { id: 'stock-take', label: 'Stock Take', href: `/stock-take/${machineId}` },
    { id: 'temperature-log', label: 'Temperature Log', href: `/temperature-log/${machineId}` },
    { id: 'wastage', label: 'Wastage Report', href: `/wastage/${machineId}` },
  ];

  return (
    <div className="flex border-b">
      {tabs.map((tab) => (
        <Link key={tab.id} href={tab.href}>
          <div
            className={cn(
              "px-4 py-2 font-medium text-sm border-b-2 transition-colors cursor-pointer",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
            )}
          >
            {tab.label}
          </div>
        </Link>
      ))}
    </div>
  );
}

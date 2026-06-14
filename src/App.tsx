import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { ThemeProvider } from "@/components/theme-provider";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/dashboard";
import MachinesList from "@/pages/machines";
import RefillService from "@/pages/refill-service";
import StockTake from "@/pages/stock-take";
import TemperatureLog from "@/pages/temperature-log";
import WastageReport from "@/pages/wastage";
import EditSidebar from "@/pages/edit-sidebar";
import EditTools from "@/pages/edit-tools";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/machines" component={MachinesList} />
        <Route path="/refill-service/:machineId" component={RefillService} />
        <Route path="/stock-take/:machineId" component={StockTake} />
        <Route path="/temperature-log/:machineId" component={TemperatureLog} />
        <Route path="/wastage/:machineId" component={WastageReport} />
        <Route path="/edit-sidebar" component={EditSidebar} />
        <Route path="/edit-tools" component={EditTools} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;

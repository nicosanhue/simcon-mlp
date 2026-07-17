import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import DataEntry from "./pages/DataEntry";
import History from "./pages/History";
import Assets from "./pages/Assets";
import AdminSettings from "./pages/AdminSettings";
import EquipmentTree from "./pages/EquipmentTree";
import WorkOrders from "./pages/WorkOrders";
import NotFound from "./pages/NotFound";
import LubricacionEquipos from "./pages/LubricacionEquipos";
import Reports from "./pages/Reports";
import StcTemperatura from "./pages/StcTemperatura";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/equipment-tree" element={<EquipmentTree />} />
          <Route path="/data-entry" element={<DataEntry />} />
          <Route path="/history" element={<History />} />
          <Route path="/work-orders" element={<WorkOrders />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/lubricacion-equipos" element={<LubricacionEquipos />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/admin" element={<AdminSettings />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

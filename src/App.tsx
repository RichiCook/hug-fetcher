import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ProductPage from "./pages/ProductPage";
import ProductEditPage from "./pages/ProductEditPage";
import ActivationsPage from "./pages/ActivationsPage";
import ShortUrlRedirect from "./pages/ShortUrlRedirect";
import LooksPage from "./pages/LooksPage";
import LookGroupsSettingsPage from "./pages/LookGroupsSettingsPage";
import AIGenerationSettingsPage from "./pages/AIGenerationSettingsPage";
import LeadsPage from "./pages/LeadsPage";
import ApiSettingsPage from "./pages/ApiSettingsPage";
import SettingsPage from "./pages/SettingsPage";
import ScanAnalyticsPage from "./pages/ScanAnalyticsPage";
import CelebrityContentPage from "./pages/CelebrityContentPage";
import AuthPage from "./pages/AuthPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PlatformSettingsProvider } from "./contexts/PlatformSettingsContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes - QR scans outside PlatformSettingsProvider for performance */}
          <Route path="/p/:code" element={<ShortUrlRedirect />} />
          
          {/* All other routes wrapped in PlatformSettingsProvider */}
          <Route path="/product/:slug" element={<PlatformSettingsProvider><ProductPage /></PlatformSettingsProvider>} />
          <Route path="/auth" element={<PlatformSettingsProvider><AuthPage /></PlatformSettingsProvider>} />
          
          {/* Protected dashboard routes */}
          <Route path="/" element={<PlatformSettingsProvider><ProtectedRoute><Index /></ProtectedRoute></PlatformSettingsProvider>} />
          <Route path="/product/:slug/edit" element={<PlatformSettingsProvider><ProtectedRoute><ProductEditPage /></ProtectedRoute></PlatformSettingsProvider>} />
          <Route path="/activations" element={<PlatformSettingsProvider><ProtectedRoute><ActivationsPage /></ProtectedRoute></PlatformSettingsProvider>} />
          <Route path="/looks" element={<PlatformSettingsProvider><ProtectedRoute><LooksPage /></ProtectedRoute></PlatformSettingsProvider>} />
          <Route path="/looks/settings" element={<PlatformSettingsProvider><ProtectedRoute><LookGroupsSettingsPage /></ProtectedRoute></PlatformSettingsProvider>} />
          <Route path="/looks/ai-settings" element={<PlatformSettingsProvider><ProtectedRoute><AIGenerationSettingsPage /></ProtectedRoute></PlatformSettingsProvider>} />
          <Route path="/leads" element={<PlatformSettingsProvider><ProtectedRoute><LeadsPage /></ProtectedRoute></PlatformSettingsProvider>} />
          <Route path="/api-settings" element={<PlatformSettingsProvider><ProtectedRoute><ApiSettingsPage /></ProtectedRoute></PlatformSettingsProvider>} />
          <Route path="/settings" element={<PlatformSettingsProvider><ProtectedRoute><SettingsPage /></ProtectedRoute></PlatformSettingsProvider>} />
          <Route path="/scan-analytics" element={<PlatformSettingsProvider><ProtectedRoute><ScanAnalyticsPage /></ProtectedRoute></PlatformSettingsProvider>} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;


import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { usePageLeaveConfirmation, cleanupGeneratedFiles } from "@/hooks/use-page-leave";
import Index from "./pages/Index";
import CreatorProfile from "./pages/CreatorProfile";
import Analysis from "./pages/Analysis";
import AnalysisWithRealTimeLogs from "./pages/AnalysisWithRealTimeLogs";
import FullScreenDashboard from "./components/FullScreenDashboard";
import RealAnalyticsDashboard from "./components/RealAnalyticsDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  // Enable page leave confirmation with file cleanup
  usePageLeaveConfirmation({
    message: "Do u want to leave the page. You will lose ur data?",
    cleanupFiles: cleanupGeneratedFiles,
    onBeforeUnload: () => {
      console.log("User is leaving the page, triggering cleanup...");
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/creator-profile" element={<CreatorProfile />} />
            <Route path="/analysis" element={<Analysis />} />
            <Route path="/analysis-realtime" element={<AnalysisWithRealTimeLogs />} />
            <Route path="/dashboard" element={<FullScreenDashboard onNewAnalysis={() => window.location.href = '/creator-profile'} />} />
            <Route path="/real-analytics" element={<RealAnalyticsDashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

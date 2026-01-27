import { Switch, Route, Router } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import VocalAnalyzer from "@/pages/VocalAnalyzer";

// Get base path for GitHub Pages deployment
const base = import.meta.env.BASE_URL.replace(/\/$/, "") || "";

function AppRouter() {
  return (
    <Router base={base}>
      <Switch>
        <Route path="/" component={VocalAnalyzer} />
      </Switch>
    </Router>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppRouter />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

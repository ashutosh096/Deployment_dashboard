import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/Dashboard";
import History from "@/pages/History";
import ChecklistView from "@/pages/ChecklistView";
import AdminPanel from "@/pages/AdminPanel";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import { SessionProvider, useSession } from "@/contexts/SessionContext";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/history" component={History} />
      <Route path="/deployment/:id" component={ChecklistView} />
      <Route path="/admin" component={AdminPanel} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useSession();
  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Login />;
  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SessionProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthGate>
              <Router />
            </AuthGate>
          </WouterRouter>
          <Toaster />
        </SessionProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

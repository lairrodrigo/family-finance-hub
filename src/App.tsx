import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { lazy, Suspense, useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Loader2 } from "lucide-react";

// Lazy loading pages for better performance
const Auth = lazy(() => import("./pages/Auth"));
const Home = lazy(() => import("./pages/Home"));
const Transactions = lazy(() => import("./pages/Transactions"));
const AddTransaction = lazy(() => import("./pages/AddTransaction"));
const History = lazy(() => import("./pages/History"));
const Budgets = lazy(() => import("./pages/Budgets"));
const Metas = lazy(() => import("./pages/Metas"));
const CreateGoal = lazy(() => import("./pages/CreateGoal"));
const FamilySettings = lazy(() => import("./pages/FamilySettings"));
const Shopping = lazy(() => import("./pages/Shopping"));
const ShoppingListDetail = lazy(() => import("./pages/ShoppingListDetail"));
const Cards = lazy(() => import("./pages/Cards"));
const More = lazy(() => import("./pages/More"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes globally
      retry: 1,
    },
  },
});

function LoadingScreen() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowPrompt(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#050505] p-6 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary mb-6" />
      {showPrompt && (
        <div className="space-y-4 animate-in fade-in zoom-in duration-500">
          <p className="text-muted-foreground text-sm max-w-xs font-medium leading-relaxed">
            A conexão está demorando mais que o esperado. Verifique sua internet ou as configurações do projeto.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white hover:bg-white/10 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      )}
    </div>
  );
}

const PageLoader = () => (
  <div className="flex h-[50vh] items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <SidebarProvider>
      <AppLayout>{children}</AppLayout>
    </SidebarProvider>
  );
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (user) return <Navigate to="/" replace />;

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SettingsProvider>
          <AuthProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
                <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
                <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
                <Route path="/add" element={<ProtectedRoute><AddTransaction /></ProtectedRoute>} />
                <Route path="/budgets" element={<ProtectedRoute><Budgets /></ProtectedRoute>} />
                <Route path="/metas" element={<ProtectedRoute><Metas /></ProtectedRoute>} />
                <Route path="/metas/new" element={<ProtectedRoute><CreateGoal /></ProtectedRoute>} />
                <Route path="/shopping" element={<ProtectedRoute><Shopping /></ProtectedRoute>} />
                <Route path="/shopping/:id" element={<ProtectedRoute><ShoppingListDetail /></ProtectedRoute>} />
                <Route path="/cards" element={<ProtectedRoute><Cards /></ProtectedRoute>} />
                <Route path="/family" element={<ProtectedRoute><FamilySettings /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/more" element={<ProtectedRoute><More /></ProtectedRoute>} />
                <Route path="*" element={<Suspense fallback={<Loader2 className="animate-spin h-8 w-8 m-auto" />}><NotFound /></Suspense>} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </SettingsProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;


import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import AppLayout from "@/components/layout/AppLayout";
import { Loader2 } from "lucide-react";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Transactions from "./pages/Transactions";
import AddTransaction from "./pages/AddTransaction";
import History from "./pages/History";
import Budgets from "./pages/Budgets";
import Metas from "./pages/Metas";
import CreateGoal from "./pages/CreateGoal";
import FamilySettings from "./pages/FamilySettings";
import Shopping from "./pages/Shopping";
import ShoppingListDetail from "./pages/ShoppingListDetail";
import Cards from "./pages/Cards";
import More from "./pages/More";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <Loader2 className="h-10 w-10 animate-spin text-white/10" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppLayout>{children}</AppLayout>
    </SidebarProvider>
  );
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <Loader2 className="h-10 w-10 animate-spin text-white/10" />
      </div>
    );
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
              <Route path="/accounts" element={<ProtectedRoute><div className="p-8 text-center"><h2 className="text-xl font-bold">Contas em breve</h2></div></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/more" element={<ProtectedRoute><More /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </SettingsProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

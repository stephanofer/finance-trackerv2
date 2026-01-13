import { StrictMode, lazy, Suspense, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
  useNavigate,
  useLocation,
} from "react-router";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { Loader2 } from "lucide-react";
import "./index.css";

// ============================================
// Lazy load pages for code splitting
// ============================================

const LoginPage = lazy(() => import("@/pages/login"));
const RegisterPage = lazy(() => import("@/pages/register"));
const DashboardPage = lazy(() => import("@/pages/dashboard"));
const MorePage = lazy(() => import("@/pages/more"));
const ProfilePage = lazy(() => import("@/pages/profile"));
const SettingsPage = lazy(() => import("@/pages/settings"));

// ============================================
// Loading fallback
// ============================================

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

// ============================================
// Auth guard - redirects to login if not authenticated
// ============================================

function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <>
      <Outlet />
      <BottomNavigation />
    </>
  );
}

// ============================================
// Guest guard - redirects to dashboard if authenticated
// ============================================

function GuestRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // Redirect to the page they tried to visit or dashboard
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, location]);

  if (isLoading) {
    return <PageLoader />;
  }

  if (isAuthenticated) {
    return null;
  }

  return <Outlet />;
}

// ============================================
// Root layout with theme initialization
// ============================================

function RootLayout() {
  useEffect(() => {
    // Check for saved theme preference or system preference
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  return (
    <Suspense fallback={<PageLoader />}>
      <Outlet />
    </Suspense>
  );
}

// ============================================
// Router configuration
// ============================================

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      // Guest routes (login, register)
      {
        element: <GuestRoute />,
        children: [
          {
            path: "/login",
            element: <LoginPage />,
          },
          {
            path: "/register",
            element: <RegisterPage />,
          },
        ],
      },
      // Protected routes (require authentication)
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: "/",
            element: <Navigate to="/dashboard" replace />,
          },
          {
            path: "/dashboard",
            element: <DashboardPage />,
          },
          {
            path: "/more",
            element: <MorePage />,
          },
          // Placeholder routes - will be implemented
          {
            path: "/scheduled-payments",
            element: (
              <div className="px-4 pt-6 pb-24">
                <h1 className="text-2xl font-bold mb-4">Pagos Programados</h1>
                <p className="text-muted-foreground">Próximamente...</p>
              </div>
            ),
          },
          {
            path: "/debts",
            element: (
              <div className="px-4 pt-6 pb-24">
                <h1 className="text-2xl font-bold mb-4">Deudas</h1>
                <p className="text-muted-foreground">Próximamente...</p>
              </div>
            ),
          },
          {
            path: "/transactions",
            element: (
              <div className="px-4 pt-6 pb-24">
                <h1 className="text-2xl font-bold mb-4">Transacciones</h1>
                <p className="text-muted-foreground">Próximamente...</p>
              </div>
            ),
          },
          {
            path: "/goals",
            element: (
              <div className="px-4 pt-6 pb-24">
                <h1 className="text-2xl font-bold mb-4">Metas</h1>
                <p className="text-muted-foreground">Próximamente...</p>
              </div>
            ),
          },
          {
            path: "/accounts",
            element: (
              <div className="px-4 pt-6 pb-24">
                <h1 className="text-2xl font-bold mb-4">Cuentas</h1>
                <p className="text-muted-foreground">Próximamente...</p>
              </div>
            ),
          },
          {
            path: "/categories",
            element: (
              <div className="px-4 pt-6 pb-24">
                <h1 className="text-2xl font-bold mb-4">Categorías</h1>
                <p className="text-muted-foreground">Próximamente...</p>
              </div>
            ),
          },
          {
            path: "/settings",
            element: <SettingsPage />,
          },
          {
            path: "/scan",
            element: (
              <div className="px-4 pt-6 pb-32">
                <h1 className="text-2xl font-bold mb-4">Escanear Recibo</h1>
                <p className="text-muted-foreground">Próximamente - Escanea tus recibos para registrar transacciones automáticamente</p>
              </div>
            ),
          },
          {
            path: "/profile",
            element: <ProfilePage />,
          },
        ],
      },
      // Catch-all redirect
      {
        path: "*",
        element: <Navigate to="/dashboard" replace />,
      },
    ],
  },
]);

// ============================================
// Query Client configuration
// ============================================

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// ============================================
// App render
// ============================================

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
);

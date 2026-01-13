import { NavLink, useLocation } from "react-router";
import { useState } from "react";
import {
  LayoutDashboard,
  CalendarClock,
  Plus,
  Users,
  MoreHorizontal,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Target,
  CreditCard,
  ScanLine,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Link } from "react-router";

// ============================================
// Navigation Items
// ============================================

const navItems = [
  {
    to: "/dashboard",
    icon: LayoutDashboard,
    label: "Inicio",
  },
  {
    to: "/scheduled-payments",
    icon: CalendarClock,
    label: "Programados",
  },
  // Center button handled separately
  {
    to: "/debts",
    icon: Users,
    label: "Deudas",
  },
  {
    to: "/more",
    icon: MoreHorizontal,
    label: "Más",
  },
];

// ============================================
// Quick Action Items
// ============================================

const quickActions = [
  {
    to: "/transactions/new?type=expense",
    icon: ArrowDownLeft,
    label: "Registrar gasto",
    description: "Añade un nuevo gasto",
    color: "bg-expense/10 text-expense",
  },
  {
    to: "/transactions/new?type=income",
    icon: ArrowUpRight,
    label: "Registrar ingreso",
    description: "Añade un nuevo ingreso",
    color: "bg-income/10 text-income",
  },
  {
    to: "/transactions/new?type=transfer",
    icon: ArrowLeftRight,
    label: "Transferencia",
    description: "Entre tus cuentas",
    color: "bg-primary/10 text-primary",
  },
  {
    to: "/goals/contribute",
    icon: Target,
    label: "Aportar a meta",
    description: "Ahorra para tus objetivos",
    color: "bg-chart-2/10 text-chart-2",
  },
  {
    to: "/debts/payment",
    icon: CreditCard,
    label: "Registrar pago",
    description: "Paga una deuda",
    color: "bg-chart-4/10 text-chart-4",
  },
];

// ============================================
// Bottom Navigation Component
// ============================================

export function BottomNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Don't show on auth pages
  if (
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    location.pathname === "/forgot-password"
  ) {
    return null;
  }

  return (
    <>
      {/* Floating Scan Button */}
      <Link
        to="/scan"
        className="scan-button animate-in fade-in slide-in-from-bottom-4 duration-500"
        style={{ animationDelay: "0.2s" }}
      >
        <ScanLine className="w-5 h-5" />
        <span>Scan</span>
      </Link>

      <nav className="bottom-nav animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* First two items */}
        {navItems.slice(0, 2).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `bottom-nav-item ${isActive ? "active" : ""}`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
          </NavLink>
        ))}

        {/* Center Action Button */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <button className="bottom-nav-center">
              <Plus className="w-6 h-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl border-t border-border bg-card">
            <SheetHeader className="pb-4">
              <SheetTitle className="text-left text-lg">Acción rápida</SheetTitle>
            </SheetHeader>
            <div className="grid gap-2 pb-8">
              {quickActions.map((action, index) => (
                <Link
                  key={action.to}
                  to={action.to}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-4 p-4 rounded-2xl hover:bg-muted/50 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] animate-in fade-in slide-in-from-bottom-2"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${action.color}`}
                  >
                    <action.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{action.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </SheetContent>
        </Sheet>

        {/* Last two items */}
        {navItems.slice(2).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `bottom-nav-item ${isActive ? "active" : ""}`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}

export default BottomNavigation;
